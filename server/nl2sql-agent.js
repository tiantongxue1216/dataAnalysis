/**
 * LangChain NL2SQL Agent
 * 基于 create_react_agent 实现的智能数据分析助手
 * 参考文档：langChian-SQLDatabaseToolkit.md
 */

import { ChatOpenAI } from '@langchain/openai'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { createSQLDatabaseToolkit, getDefaultSystemPrompt } from './langchain-sql-toolkit.js'

/**
 * 初始化 LLM
 */
function initLLM() {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.DASHSCOPE_API_KEY
  const baseUrl = process.env.DEEPSEEK_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'

  console.log('[NL2SQL Agent] 初始化 LLM')
  console.log('  API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : '未设置')
  console.log('  Base URL:', baseUrl)
  console.log('  Model:', model)

  if (!apiKey) {
    throw new Error('API Key 未配置，请设置 DEEPSEEK_API_KEY 或 DASHSCOPE_API_KEY 环境变量')
  }

  return new ChatOpenAI({
    modelName: model,
    apiKey: apiKey,
    configuration: {
      baseURL: baseUrl,
    },
    temperature: 0, // 设置为0以保证输出更精准（参考文档建议）
    maxTokens: 4000,
  })
}

/**
 * NL2SQL Agent 类
 */
export class NL2SQLAgent {
  constructor() {
    this.llm = initLLM()
    this.activeConnections = new Map() // 管理活跃的数据库连接
  }

  /**
   * 执行自然语言查询
   * @param {string} question - 用户问题
   * @param {Object} dbConfig - 数据库配置
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 执行结果
   */
  async execute(question, dbConfig, options = {}) {
    const startTime = Date.now()
    let toolkitConnection = null

    try {
      console.log('\n🚀 开始 NL2SQL Agent 查询')
      console.log('问题:', question)
      console.log('数据库类型:', dbConfig.type)

      // 1. 创建 SQLDatabase Toolkit
      toolkitConnection = await createSQLDatabaseToolkit(dbConfig)
      const { tools, close } = toolkitConnection

      // 保存关闭函数以便后续清理
      this.activeConnections.set(question, close)

      console.log('可用工具:', tools.map(t => t.name).join(', '))

      // 2. 获取数据库方言
      const dialect = dbConfig.type === 'SQLite' ? 'SQLite' 
        : dbConfig.type === 'MySQL' ? 'MySQL' 
        : dbConfig.type === 'PostgreSQL' ? 'PostgreSQL' 
        : 'SQLite'

      // 3. 构建系统提示词
      const systemPrompt = getDefaultSystemPrompt(dialect, options.topK || 5)
      
      // 如果有自定义提示词，可以追加
      const customPrompt = options.customPrompt
      const finalSystemPrompt = customPrompt 
        ? `${systemPrompt}\n\n${customPrompt}`
        : systemPrompt

      console.log('系统提示词长度:', finalSystemPrompt.length)

      // 4. 创建 ReAct Agent
      const agent = createReactAgent({
        llm: this.llm,
        tools,
        stateModifier: new SystemMessage(finalSystemPrompt),
      })

      // 5. 执行查询
      const result = await agent.invoke({
        messages: [new HumanMessage(question)],
      })

      const duration = Date.now() - startTime

      console.log('\n✅ NL2SQL Agent 执行完成')
      console.log('耗时:', duration, 'ms')
      console.log('消息数量:', result.messages?.length || 0)

      // 6. 提取最终答案
      const finalAnswer = this.extractFinalAnswer(result)

      // 7. 提取中间步骤（思考过程）
      const thoughts = this.extractThoughts(result)

      // 8. 提取查询结果数据
      const queryData = this.extractQueryData(result)

      // 9. 提取生成的 SQL
      const generatedSQL = this.extractGeneratedSQL(result)

      // 10. 生成图表推荐（如果有数据）
      let chartRecommendation = null
      if (queryData && queryData.length > 0) {
        try {
          const { recommendChart } = await import('./chart-recommender.js')
          chartRecommendation = recommendChart(queryData, null)
        } catch (error) {
          console.warn('[NL2SQL] 图表推荐失败:', error.message)
          chartRecommendation = {
            chartType: 'table',
            reason: '图表推荐失败',
            canRender: false,
            message: error.message,
          }
        }
      }

      return {
        success: true,
        question,
        answer: finalAnswer,
        thoughts,
        data: queryData,
        sql: generatedSQL,  // 新增：返回生成的 SQL
        recommendation: chartRecommendation,  // 新增：图表推荐
        iterations: result.messages?.length || 0,
        duration,
        metadata: {
          dialect,
          tools_used: tools.map(t => t.name),
        },
      }
    } catch (error) {
      console.error('❌ NL2SQL Agent 执行失败:', error)
      return {
        success: false,
        error: error.message,
        answer: `执行失败: ${error.message}`,
        thoughts: [`错误: ${error.message}`],
        data: null,
        duration: Date.now() - startTime,
      }
    } finally {
      // 清理数据库连接
      if (toolkitConnection && toolkitConnection.close) {
        await toolkitConnection.close()
        this.activeConnections.delete(question)
      }
    }
  }

  /**
   * 提取最终答案
   */
  extractFinalAnswer(result) {
    if (!result.messages || result.messages.length === 0) {
      return '抱歉，未能生成回答'
    }

    // 从最后一条 AI 消息中提取答案
    const lastMessage = result.messages[result.messages.length - 1]
    
    if (lastMessage.content) {
      const content = lastMessage.content
      
      // 尝试提取"最终答案"部分
      const match = content.match(/最终答案[:：]\s*([\s\S]*?)(?:\n|$)/)
      if (match) {
        return match[1].trim()
      }

      // 如果没有找到标记，返回整个内容（限制长度）
      return content.length > 1000 
        ? content.substring(0, 1000) + '...' 
        : content
    }

    return '抱歉，未能生成回答'
  }

  /**
   * 提取思考过程
   */
  extractThoughts(result) {
    const thoughts = []

    if (!result.messages) {
      return thoughts
    }

    for (const message of result.messages) {
      // 提取 AI 的思考过程
      if (message.constructor.name === 'AIMessage' && message.content) {
        const content = message.content
        
        // 提取"思考过程"部分
        const thinkingMatch = content.match(/思考过程[:：]\s*([\s\S]*?)(?=最终答案|$)/)
        if (thinkingMatch) {
          thoughts.push(thinkingMatch[1].trim())
        } else if (!content.includes('最终答案')) {
          // 如果不是最终答案，可能是中间思考
          thoughts.push(content.substring(0, 500))
        }
      }
    }

    return thoughts
  }

  /**
   * 提取生成的 SQL
   */
  extractGeneratedSQL(result) {
    if (!result.messages) {
      return null
    }

    // 查找 sql_db_query 工具调用中的 SQL
    for (const message of result.messages) {
      if (message.constructor.name === 'ToolMessage' && message.content) {
        try {
          const content = JSON.parse(message.content)
          
          // 如果包含成功执行的查询
          if (content.success && content.data) {
            // 从工具调用历史中找到对应的 SQL
            const toolCall = result.messages.find(m => 
              m.constructor.name === 'AIMessage' && 
              m.tool_calls && 
              m.tool_calls.some(tc => tc.name === 'sql_db_query')
            )
            
            if (toolCall && toolCall.tool_calls) {
              const sqlCall = toolCall.tool_calls.find(tc => tc.name === 'sql_db_query')
              if (sqlCall && sqlCall.args && sqlCall.args.query) {
                return sqlCall.args.query
              }
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    return null
  }

  /**
   * 提取查询结果数据
   */
  extractQueryData(result) {
    if (!result.messages) {
      return null
    }

    // 查找工具调用结果中的查询数据
    for (const message of result.messages) {
      if (message.constructor.name === 'ToolMessage' && message.content) {
        try {
          const content = JSON.parse(message.content)
          
          // 如果包含查询结果数据
          if (content.success && content.data && Array.isArray(content.data)) {
            return {
              rows: content.data,
              rowCount: content.rowCount || content.data.length,
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    return null
  }

  /**
   * 流式执行查询（支持实时输出）
   * @param {string} question - 用户问题
   * @param {Object} dbConfig - 数据库配置
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 执行结果
   */
  async executeStream(question, dbConfig, options = {}) {
    const { topK = 5, maxIterations = 10, onStep } = options
    const startTime = Date.now()
    let toolkitConnection = null
    const steps = []

    try {
      console.log('\n🚀 开始 NL2SQL Agent 流式查询')

      // 步骤 1: 开始查询
      const step1Start = Date.now()
      if (onStep) {
        onStep({
          id: 'start',
          title: '开始查询',
          status: 'completed',
          duration: 0,
          details: '初始化查询流程'
        })
      }

      // 步骤 2: 进入数据洞察
      const step2Start = Date.now()
      if (onStep) {
        onStep({
          id: 'data-insight',
          title: '进入数据洞察',
          status: 'completed',
          duration: ((Date.now() - step2Start) / 1000).toFixed(3),
          details: '分析用户问题，确定数据需求'
        })
      }

      // 步骤 3: 创建 SQLDatabase Toolkit
      const step3Start = Date.now()
      toolkitConnection = await createSQLDatabaseToolkit(dbConfig)
      const { tools, close } = toolkitConnection
      this.activeConnections.set(question, close)
      
      if (onStep) {
        onStep({
          id: 'get-fields',
          title: '获取字段信息',
          status: 'completed',
          duration: ((Date.now() - step3Start) / 1000).toFixed(3),
          details: `加载数据库 schema，可用工具: ${tools.map(t => t.name).join(', ')}`
        })
      }

      // 步骤 4: 知识库检索
      const step4Start = Date.now()
      const dialect = dbConfig.type === 'SQLite' ? 'SQLite' 
        : dbConfig.type === 'MySQL' ? 'MySQL' 
        : dbConfig.type === 'PostgreSQL' ? 'PostgreSQL' 
        : 'SQLite'
      const systemPrompt = getDefaultSystemPrompt(dialect, topK)
      
      if (onStep) {
        onStep({
          id: 'knowledge-search',
          title: '知识库检索',
          status: 'completed',
          duration: ((Date.now() - step4Start) / 1000).toFixed(3),
          details: '检索相关表结构和字段信息'
        })
      }

      // 步骤 5: 筛选知识
      const step5Start = Date.now()
      if (onStep) {
        onStep({
          id: 'filter-knowledge',
          title: '筛选知识',
          status: 'completed',
          duration: ((Date.now() - step5Start) / 1000).toFixed(3),
          details: '筛选与问题相关的表',
          collapsible: true,
          children: []
        })
      }

      // 步骤 6: 创建 ReAct Agent
      const agent = createReactAgent({
        llm: this.llm,
        tools,
        stateModifier: new SystemMessage(systemPrompt),
      })

      // 步骤 7: 流式执行 ReAct Agent
      const step7Start = Date.now()
      if (onStep) {
        onStep({
          id: 'react-mode',
          title: 'ReAct模式',
          status: 'running',
          duration: '0.000',
          details: '开始执行 ReAct 循环',
          collapsible: true,
          children: []
        })
      }

      const stream = await agent.stream(
        { messages: [new HumanMessage(question)] },
        { streamMode: 'values' }
      )

      let finalResult = null
      let reactChildren = []
      let stepIndex = 0

      for await (const chunk of stream) {
        finalResult = chunk
        
        // 处理每个消息，提取步骤信息
        if (chunk.messages && chunk.messages.length > 0) {
          const lastMessage = chunk.messages[chunk.messages.length - 1]
          
          // 处理 AI 消息（思考过程）
          if (lastMessage.constructor.name === 'AIMessage' && lastMessage.content) {
            const thinkingMatch = lastMessage.content.match(/思考过程[:：]\s*([\s\S]*?)(?=最终答案|$)/)
            if (thinkingMatch) {
              const thinkingContent = thinkingMatch[1].trim()
              const stepThought = {
                id: `react-thought-${stepIndex++}`,
                title: thinkingContent.split('\n')[0].substring(0, 50),
                status: 'completed',
                duration: '0.000',
                details: thinkingContent,
                collapsible: true
              }
              reactChildren.push(stepThought)
              
              if (onStep) {
                onStep({
                  id: 'react-mode',
                  title: 'ReAct模式',
                  status: 'running',
                  duration: ((Date.now() - step7Start) / 1000).toFixed(3),
                  details: '执行 ReAct 循环',
                  collapsible: true,
                  children: [...reactChildren]
                })
              }
            }
          }
          
          // 处理工具调用
          if (lastMessage.constructor.name === 'AIMessage' && lastMessage.tool_calls) {
            for (const toolCall of lastMessage.tool_calls) {
              const toolStep = {
                id: `tool-${toolCall.id || stepIndex++}`,
                title: `调用工具: ${toolCall.name}`,
                status: 'completed',
                duration: '0.000',
                details: JSON.stringify(toolCall.args, null, 2),
                collapsible: true
              }
              reactChildren.push(toolStep)
              
              if (onStep) {
                onStep({
                  id: 'react-mode',
                  title: 'ReAct模式',
                  status: 'running',
                  duration: ((Date.now() - step7Start) / 1000).toFixed(3),
                  details: '执行 ReAct 循环',
                  collapsible: true,
                  children: [...reactChildren]
                })
              }
            }
          }
          
          // 处理工具结果
          if (lastMessage.constructor.name === 'ToolMessage') {
            const toolResultStep = {
              id: `result-${stepIndex++}`,
              title: '工具执行结果',
              status: 'completed',
              duration: '0.000',
              details: lastMessage.content.substring(0, 500),
              collapsible: true
            }
            reactChildren.push(toolResultStep)
            
            if (onStep) {
              onStep({
                id: 'react-mode',
                title: 'ReAct模式',
                status: 'running',
                duration: ((Date.now() - step7Start) / 1000).toFixed(3),
                details: '执行 ReAct 循环',
                collapsible: true,
                children: [...reactChildren]
              })
            }
          }
        }
      }

      // 更新 ReAct 模式为完成状态
      console.log('[NL2SQL Agent] 准备发送 ReAct completed 状态')
      if (onStep) {
        const completedStep = {
          id: 'react-mode',
          title: 'ReAct模式',
          status: 'completed',
          duration: ((Date.now() - step7Start) / 1000).toFixed(3),
          details: 'ReAct 循环执行完成',
          collapsible: true,
          children: reactChildren
        }
        console.log('[NL2SQL Agent] 发送步骤:', JSON.stringify(completedStep, null, 2))
        onStep(completedStep)
      } else {
        console.log('[NL2SQL Agent] onStep 回调不存在')
      }

      const duration = Date.now() - startTime

      // 步骤 8: 提取结果
      const finalAnswer = this.extractFinalAnswer(finalResult)
      const queryData = this.extractQueryData(finalResult)
      const generatedSQL = this.extractGeneratedSQL(finalResult)

      // 步骤 9: 结束
      if (onStep) {
        onStep({
          id: 'end',
          title: '结束',
          status: 'completed',
          duration: ((Date.now() - startTime) / 1000).toFixed(3),
          details: '查询执行完成'
        })
      }

      // 生成图表推荐
      let chartRecommendation = null
      if (queryData && queryData.length > 0) {
        try {
          const { recommendChart } = await import('./chart-recommender.js')
          chartRecommendation = recommendChart(queryData, null)
        } catch (error) {
          console.warn('[NL2SQL] 图表推荐失败:', error.message)
          chartRecommendation = {
            chartType: 'table',
            reason: '图表推荐失败',
            canRender: false,
            message: error.message,
          }
        }
      }

      return {
        success: true,
        question,
        answer: finalAnswer,
        data: queryData,
        sql: generatedSQL,
        recommendation: chartRecommendation,
        steps: steps,
        duration,
      }
    } catch (error) {
      console.error('❌ NL2SQL Agent 流式执行失败:', error)
      
      if (onStep) {
        onStep({
          id: 'error',
          title: '错误',
          status: 'error',
          duration: ((Date.now() - startTime) / 1000).toFixed(3),
          details: error.message
        })
      }
      
      return {
        success: false,
        error: error.message,
        answer: `执行失败: ${error.message}`,
        duration: Date.now() - startTime,
      }
    } finally {
      // 清理数据库连接
      if (toolkitConnection && toolkitConnection.close) {
        await toolkitConnection.close()
        this.activeConnections.delete(question)
      }
    }
  }
}

/**
 * 创建 NL2SQL Agent 实例
 */
export function createNL2SQLAgent() {
  return new NL2SQLAgent()
}
