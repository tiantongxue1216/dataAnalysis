/**
 * Agent 引擎 - 基于 LangChain + LangGraph
 * 实现规划-执行-反思循环，管理工具调用
 */

import dotenv from 'dotenv'
dotenv.config()

import { StateGraph, START, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'

import { allTools as rawTools } from '../tools.js'
import { getReActPrompt } from './prompts.js'
import { AgentState } from './state.js'
import { handleError, generateErrorReport } from './error-handler.js'

/**
 * 初始化 LLM
 */
function initLLM() {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.DASHSCOPE_API_KEY
  const baseUrl = process.env.DEEPSEEK_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v3.2'

  console.log('[Agent] 初始化 LLM')
  console.log('  API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : '未设置')
  console.log('  Base URL:', baseUrl)
  console.log('  Model:', model)

  if (!apiKey) {
    throw new Error('API Key 未配置，请设置 DEEPSEEK_API_KEY 或 DASHSCOPE_API_KEY 环境变量')
  }

  return new ChatOpenAI({
    modelName: model,
    apiKey: apiKey,  // 使用 apiKey 而不是 openAIApiKey
    configuration: {
      baseURL: baseUrl
    },
    temperature: 0.7,
    maxTokens: 4000
  })
}

/**
 * 将标准化工具转换为 LangChain Tool 格式
 */
function convertToLangChainTools(tools) {
  return tools.map(rawTool => {
    // 构建 Zod schema
    const schemaProperties = {}
    const requiredFields = []
    
    for (const [paramName, paramDef] of Object.entries(rawTool.parameters)) {
      let zodType
      switch (paramDef.type) {
        case 'string':
          zodType = z.string().describe(paramDef.description || '')
          break
        case 'number':
          zodType = z.number().describe(paramDef.description || '')
          break
        case 'boolean':
          zodType = z.boolean().describe(paramDef.description || '')
          break
        case 'object':
          zodType = z.object({}).describe(paramDef.description || '')
          break
        case 'array':
          zodType = z.array(z.any()).describe(paramDef.description || '')
          break
        default:
          zodType = z.any().describe(paramDef.description || '')
      }
      
      if (paramDef.required) {
        schemaProperties[paramName] = zodType
        requiredFields.push(paramName)
      } else {
        schemaProperties[paramName] = zodType.optional()
      }
    }

    const schema = z.object(schemaProperties)

    return tool(
      async (input) => {
        try {
          console.log(`[Agent Tool] 调用: ${rawTool.name}`, JSON.stringify(input))
          const result = await rawTool.execute(input)
          console.log(`[Agent Tool] 结果: ${rawTool.name}`, JSON.stringify(result).substring(0, 200))
          return JSON.stringify(result)
        } catch (error) {
          console.error(`[Agent Tool] 错误: ${rawTool.name}`, error)
          return JSON.stringify({
            success: false,
            error: error.message
          })
        }
      },
      {
        name: rawTool.name,
        description: rawTool.description,
        schema
      }
    )
  })
}

/**
 * Agent 引擎类
 */
export class DataAnalysisAgent {
  constructor() {
    this.llm = initLLM()
    this.tools = convertToLangChainTools(rawTools)
    this.graph = this.buildGraph()
  }

  /**
   * 构建 LangGraph 状态图
   * 
   * 状态流转:
   * START → planner → executor → reflector → [loop back or END]
   * 
   * 节点说明:
   * - planner: 规划下一步行动
   * - executor: 执行工具调用
   * - reflector: 反思结果，决定继续或结束
   */
  buildGraph() {
    const workflow = new StateGraph(AgentState)

    // 添加节点
    workflow.addNode('planner', this.plannerNode.bind(this))
    workflow.addNode('executor', this.executorNode.bind(this))
    workflow.addNode('reflector', this.reflectorNode.bind(this))

    // 定义边
    workflow.addEdge(START, 'planner')
    workflow.addEdge('planner', 'executor')
    workflow.addEdge('executor', 'reflector')

    // 条件边：反思后决定是否继续
    workflow.addConditionalEdges(
      'reflector',
      this.shouldContinue.bind(this),
      {
        continue: 'planner',
        end: END
      }
    )

    // 编译图，设置更高的递归限制
    // LangGraph将每个节点执行都计为一次递归，一个完整循环包含3个节点
    // 设置100次递归限制，允许约30次完整循环（足够我们的maxIterations=10）
    return workflow.compile({
      recursionLimit: 100
    })
  }

  /**
   * 规划器节点
   * 决定下一步行动
   */
  async plannerNode(state) {
    console.log('\n=== [Planner] 规划下一步 ===')
    console.log('当前步骤:', state.steps.length)
    console.log('历史消息:', state.messages.length)
    console.log('可用工具:', this.tools.map(t => t.name).join(', '))
    console.log('数据源ID:', state.datasourceId || '未指定')
    console.log('已调用工具历史:', state.toolCallHistory.length, '次')

    // 首先尝试使用 bindTools（结构化调用）
    const llmWithTools = this.llm.bindTools(this.tools, {
      tool_choice: 'auto'
    })
    
    // 构建更丰富的系统提示词
    const systemPrompt = `${getReActPrompt(this.tools)}

重要信息：
- 当前数据源 ID: ${state.datasourceId || '未指定'}
- 如果需要使用 sql_generation、query_execution 或 complete_query 工具，请使用上述 datasourceId
- 不要假设 datasourceId，直接使用提供的值

⚠️ 防止重复调用：
- 以下工具已经被调用过，请不要重复调用：
${state.toolCallHistory.map((h, i) => `  ${i + 1}. ${h}`).join('\n')}
- 如果某个工具已经成功返回结果，不要再调用它
- 只有在需要获取新的信息时才能调用工具`
    
    // 构建消息
    const messages = [
      new SystemMessage({
        content: systemPrompt
      }),
      ...state.messages,
      new HumanMessage({
        content: `请分析当前状态并决定下一步行动。\n\n当前思考: ${state.thoughts.join(' → ')}`
      })
    ]

    const response = await llmWithTools.invoke(messages)
    
    console.log('Planner 响应类型:', response.constructor.name)
    console.log('Planner 响应内容:', response.content?.substring(0, 200) || '(无)')
    console.log('Planner 工具调用数量:', response.tool_calls?.length || 0)
    
    // 如果有结构化的工具调用，直接使用
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log('✅ 检测到结构化工具调用:', JSON.stringify(response.tool_calls, null, 2))
      // 提取工具调用信息作为思考内容
      const toolCallInfo = response.tool_calls.map(tc => 
        `调用工具: ${tc.name}(${JSON.stringify(tc.args)})`
      ).join('\n')
      return {
        messages: [response],
        thoughts: [...state.thoughts, toolCallInfo]
      }
    }
    
    // 如果没有结构化调用，尝试从文本中解析工具调用
    console.log('⚠️ 未检测到结构化工具调用，尝试从文本中解析...')
    const textContent = response.content || ''
    const parsedToolCall = this.parseToolCallFromText(textContent)
    
    if (parsedToolCall) {
      console.log('✅ 从文本中解析到工具调用:', JSON.stringify(parsedToolCall))
      // 创建一个带有工具调用的AIMessage
      const messageWithToolCall = new AIMessage({
        content: textContent,
        tool_calls: [parsedToolCall]
      })
      return {
        messages: [messageWithToolCall],
        thoughts: [...state.thoughts, `调用工具: ${parsedToolCall.name}`]
      }
    }
    
    console.log('❌ 未能解析到工具调用')
    // 如果既没有工具调用，也没有解析成功，记录完整的思考内容（限制长度避免过长）
    const thinkingContent = textContent.length > 200 
      ? textContent.substring(0, 200) + '...' 
      : textContent
    return {
      messages: [response],
      thoughts: [...state.thoughts, thinkingContent || '思考中...']
    }
  }

  /**
   * 执行器节点
   * 执行工具调用
   */
  async executorNode(state) {
    console.log('\n=== [Executor] 执行工具 ===')
    
    const lastMessage = state.messages[state.messages.length - 1]
    
    if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
      console.log('无工具调用，跳过执行')
      return {
        toolResults: [...state.toolResults, { type: 'no_tool_call', message: '无工具需要执行' }],
        toolCallHistory: state.toolCallHistory  // 保持历史不变
      }
    }

    const toolResults = []
    const newToolCalls = []  // 记录本次调用的工具

    for (const toolCall of lastMessage.tool_calls) {
      console.log(`执行工具: ${toolCall.name}`)
      console.log('参数:', JSON.stringify(toolCall.args))

      // 记录工具调用
      const callSignature = `${toolCall.name}(${JSON.stringify(toolCall.args)})`
      newToolCalls.push(callSignature)

      try {
        // 查找对应的工具
        const langchainTool = this.tools.find(t => t.name === toolCall.name)
        
        if (!langchainTool) {
          throw new Error(`工具 ${toolCall.name} 不存在`)
        }

        // 执行工具
        const result = await langchainTool.invoke(toolCall.args)
        
        toolResults.push({
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          result,
          success: true
        })

        console.log(`工具 ${toolCall.name} 执行成功`)
      } catch (error) {
        console.error(`工具 ${toolCall.name} 执行失败:`, error)
        
        // 使用错误处理模块分析错误
        const errorInfo = await handleError({
          toolName: toolCall.name,
          toolArgs: toolCall.args,
          errorMessage: error.message,
          question: state.question,
          previousThoughts: state.thoughts,
          llm: this.llm
        })
        
        // 生成错误报告
        const errorReport = generateErrorReport(errorInfo)
        console.log('\n错误分析报告:')
        console.log(errorReport)
        
        // 将错误分析添加到思考过程
        const thoughts = [
          ...state.thoughts,
          `[错误分析] 工具 ${toolCall.name} 执行失败`,
          `错误类型: ${errorInfo.strategy.description}`,
          `修复方案: ${errorInfo.llmAnalysis.analysis}`
        ]
        
        toolResults.push({
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          result: JSON.stringify({ 
            success: false, 
            error: error.message,
            errorType: errorInfo.errorType,
            analysis: errorInfo.llmAnalysis.analysis,
            shouldRetry: errorInfo.shouldRetry,
            maxRetries: errorInfo.maxRetries
          }),
          success: false,
          errorInfo
        })
        
        // 如果需要重试且未达到最大重试次数，添加重试提示到消息中
        if (errorInfo.shouldRetry) {
          const retryMessage = new SystemMessage({
            content: `工具执行失败。错误分析：${errorInfo.llmAnalysis.analysis}\n\n请根据分析结果调整策略，重新尝试。`
          })
          
          return {
            toolResults: [...state.toolResults, ...toolResults],
            thoughts,
            messages: [...state.messages, retryMessage],
            toolCallHistory: [...state.toolCallHistory, ...newToolCalls]  // 更新工具调用历史
          }
        }
      }
    }

    return {
      toolResults: [...state.toolResults, ...toolResults],
      toolCallHistory: [...state.toolCallHistory, ...newToolCalls]  // 更新工具调用历史
    }
  }

  /**
   * 反思器节点
   * 评估结果，决定继续或结束
   */
  async reflectorNode(state) {
    console.log('\n=== [Reflector] 反思结果 ===')
    
    const lastToolResults = state.toolResults.slice(-1)[0]
    
    if (!lastToolResults || lastToolResults.type === 'no_tool_call') {
      console.log('无工具结果，可能已得到答案')
      // 即使没有工具调用，也要增加迭代次数
      return { iterations: state.iterations + 1 }
    }

    // 检查工具执行结果
    const resultsArray = Array.isArray(lastToolResults) ? lastToolResults : [lastToolResults]
    const allSuccessful = resultsArray.every(r => r.success)

    console.log('工具执行成功:', allSuccessful)

    // 如果有失败的工具，检查是否需要重试
    if (!allSuccessful) {
      const failedTools = resultsArray.filter(r => !r.success)
      const canRetry = failedTools.some(r => r.errorInfo?.shouldRetry)
      
      if (canRetry && state.iterations < state.maxIterations) {
        console.log('检测到可重试的错误，将继续尝试')
        // 添加错误分析到思考过程
        const errorAnalyses = failedTools.map(r => 
          `[错误修复] ${r.toolName}: ${r.errorInfo?.llmAnalysis?.analysis || '未知错误'}`
        )
        
        return {
          thoughts: [...state.thoughts, ...errorAnalyses],
          iterations: state.iterations + 1
        }
      } else if (!canRetry) {
        console.log('检测到不可恢复的错误，将尝试其他方法')
        const errorMessages = failedTools.map(r => 
          `${r.toolName} 失败: ${r.errorInfo?.strategy?.description || r.error}`
        ).join('; ')
        
        // 添加错误信息到消息中，让 LLM 决定下一步
        const errorMessage = new SystemMessage({
          content: `以下工具执行失败且无法自动重试：${errorMessages}\n\n请尝试使用其他工具或方法来解决问题。`
        })
        
        return {
          messages: [errorMessage],
          thoughts: [...state.thoughts, `[错误] ${errorMessages}`],
          iterations: state.iterations + 1
        }
      }
    }

    // 构建反思消息
    const toolMessages = resultsArray.map(r => 
      new ToolMessage({
        content: r.result,
        tool_call_id: r.toolCallId,
        name: r.toolName
      })
    )

    return {
      messages: toolMessages,
      iterations: state.iterations + 1
    }
  }

  /**
   * 判断是否继续执行
   */
  shouldContinue(state) {
    console.log('\n=== [Router] 路由决策 ===')
    console.log('当前迭代次数:', state.iterations)
    console.log('工具调用历史:', state.toolCallHistory.length, '次')
    
    // 检查最大迭代次数
    if (state.iterations >= state.maxIterations) {
      console.log('达到最大迭代次数，结束')
      return 'end'
    }

    // 检查最后一条消息是否包含工具调用
    const lastMessage = state.messages[state.messages.length - 1]
    const hasToolCalls = lastMessage?.tool_calls?.length > 0

    if (hasToolCalls) {
      // 检查是否有重复的工具调用
      const currentCalls = lastMessage.tool_calls.map(tc => 
        `${tc.name}(${JSON.stringify(tc.args)})`
      )
      
      const duplicateCalls = currentCalls.filter(call => 
        state.toolCallHistory.includes(call)
      )
      
      if (duplicateCalls.length > 0) {
        console.log('⚠️ 检测到重复的工具调用:', duplicateCalls)
        console.log('强制结束以避免无限循环')
        return 'end'
      }
      
      console.log('有待执行的工具调用，继续')
      return 'continue'
    }

    // 检查是否包含最终答案
    const lastContent = lastMessage?.content || ''
    if (lastContent.includes('最终答案') || lastContent.includes('Final Answer')) {
      console.log('已得到最终答案，结束')
      return 'end'
    }

    // 检查是否有工具执行结果
    const lastToolResult = state.toolResults.slice(-1)[0]
    const hasNoToolCall = lastToolResult?.type === 'no_tool_call'
    
    // 如果检测到没有工具调用，说明 Agent 陷入了纯思考循环，应该结束
    if (hasNoToolCall) {
      console.log('⚠️ 检测到 Agent 陷入纯思考循环（无工具调用），强制结束')
      return 'end'
    }

    // 检查最后一条消息是否是 ToolMessage（工具执行结果）
    // 如果是，且已经有足够的信息，可以考虑结束
    const isToolMessage = lastMessage?.constructor?.name === 'ToolMessage'
    if (isToolMessage && state.iterations >= 5) {
      // 检查最近的思考内容是否包含明确的结论
      const recentThoughts = state.thoughts.slice(-3).join(' ')
      // 只有当思考中包含明确的最终答案或查询结果时才结束
      if (recentThoughts.includes('最终答案') || 
          recentThoughts.includes('查询完成') || 
          recentThoughts.includes('分析完成')) {
        console.log('✅ 工具执行完成且有明确结论，结束')
        return 'end'
      }
    }

    console.log('默认继续')
    return 'continue'
  }

  /**
   * 执行查询
   * @param {string} question - 用户问题
   * @param {object} options - 选项
   * @returns {Promise<object>} 执行结果
   */
  async execute(question, options = {}) {
    const startTime = Date.now()
    
    const initialState = {
      messages: [
        new HumanMessage({
          content: `用户问题: ${question}`
        })
      ],
      question,
      thoughts: [],
      toolResults: [],
      steps: [],
      iterations: 0,
      maxIterations: options.maxIterations || 10,
      datasourceId: options.datasourceId
    }

    console.log('\n🚀 开始执行 Agent 查询')
    console.log('问题:', question)
    console.log('数据源:', options.datasourceId || '未指定')
    console.log('最大迭代次数:', initialState.maxIterations)

    try {
      // 执行图
      const result = await this.graph.invoke(initialState)

      const duration = Date.now() - startTime

      console.log('\n✅ Agent 执行完成')
      console.log('耗时:', duration, 'ms')
      console.log('迭代次数:', result.iterations)
      console.log('工具调用次数:', result.toolResults.length)

      // 提取最终答案
      const finalAnswer = this.extractFinalAnswer(result)

      // 提取图表推荐数据
      const chartData = this.extractChartData(result)

      return {
        success: true,
        question,
        answer: finalAnswer,
        thoughts: result.thoughts,
        toolResults: result.toolResults,
        iterations: result.iterations,
        duration,
        // 添加图表相关数据
        data: chartData.data,
        recommendation: chartData.recommendation,
        rawState: result
      }
    } catch (error) {
      console.error('❌ Agent 执行失败:', error)
      return {
        success: false,
        error: error.message,
        answer: `执行失败: ${error.message}`,
        thoughts: [`错误: ${error.message}`],
        toolResults: [],
        iterations: 0,
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * 提取最终答案
   */
  extractFinalAnswer(state) {
    // 从消息中提取最后一条 AI 消息的内容
    for (let i = state.messages.length - 1; i >= 0; i--) {
      const msg = state.messages[i]
      if (msg instanceof AIMessage && msg.content) {
        // 提取"最终答案"部分
        const match = msg.content.match(/最终答案[:：]\s*(.*)/s)
        if (match) {
          return match[1].trim()
        }
        return msg.content
      }
    }

    return '抱歉，未能生成回答'
  }

  /**
   * 提取图表数据
   * 从工具执行结果中查找查询结果和图表推荐
   */
  extractChartData(state) {
    // 遍历工具执行结果，查找包含数据的结果
    for (const toolResult of state.toolResults) {
      if (!toolResult.result) continue
      
      try {
        const result = typeof toolResult.result === 'string' 
          ? JSON.parse(toolResult.result) 
          : toolResult.result
        
        // 如果结果中包含 data 和 recommendation，说明是查询执行的结果
        if (result.data && Array.isArray(result.data) && result.recommendation) {
          return {
            data: result.data,
            recommendation: result.recommendation
          }
        }
        
        // 兼容 complete_query 工具的返回格式
        if (result.success && result.data && result.recommendation) {
          return {
            data: result.data,
            recommendation: result.recommendation
          }
        }
      } catch (e) {
        // 忽略解析错误，继续查找
      }
    }
    
    // 如果没有找到图表数据，返回空
    return {
      data: null,
      recommendation: null
    }
  }

  /**
   * 获取工具描述（用于提示词）
   */
  getToolsDescription() {
    return this.tools.map(t => 
      `- ${t.name}: ${t.description}\n  参数: ${JSON.stringify(t.schema.shape)}`
    ).join('\n')
  }

  /**
   * 从文本中解析工具调用
   * 支持格式：行动: tool_name({"param": "value"})
   */
  parseToolCallFromText(text) {
    if (!text) return null
    
    // 匹配模式：行动: tool_name({...}) 或 Action: tool_name({...})
    const patterns = [
      /行动:\s*(\w+)\((\{[^}]*\})\)/,
      /Action:\s*(\w+)\((\{[^}]*\})\)/,
      /行动:\s*(\w+)\s+([\s\S]*?)(?=\n|$)/,
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        const toolName = match[1]
        let argsStr = match[2]
        
        // 检查工具是否存在
        const tool = this.tools.find(t => t.name === toolName)
        if (!tool) {
          console.log(`⚠️ 工具 ${toolName} 不存在`)
          continue
        }
        
        try {
          // 尝试解析 JSON 参数
          let args = {}
          if (argsStr.startsWith('{')) {
            args = JSON.parse(argsStr)
          } else {
            // 如果不是 JSON，尝试作为字符串参数
            args = { input: argsStr.trim() }
          }
          
          return {
            name: toolName,
            args: args,
            id: `call_${Date.now()}`
          }
        } catch (e) {
          console.error('解析工具参数失败:', e)
          continue
        }
      }
    }
    
    return null
  }
}

/**
 * 创建 Agent 实例
 */
export function createAgent() {
  return new DataAnalysisAgent()
}
