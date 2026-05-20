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
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v3'

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

      return {
        success: true,
        question,
        answer: finalAnswer,
        thoughts,
        data: queryData,
        sql: generatedSQL,  // 新增：返回生成的 SQL
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
   * @param {Function} onChunk - 每个chunk的回调
   * @returns {Promise<Object>} 执行结果
   */
  async executeStream(question, dbConfig, onChunk) {
    const startTime = Date.now()
    let toolkitConnection = null

    try {
      console.log('\n🚀 开始 NL2SQL Agent 流式查询')

      // 1. 创建 SQLDatabase Toolkit
      toolkitConnection = await createSQLDatabaseToolkit(dbConfig)
      const { tools, close } = toolkitConnection

      this.activeConnections.set(question, close)

      // 2. 获取数据库方言
      const dialect = dbConfig.type === 'SQLite' ? 'SQLite' 
        : dbConfig.type === 'MySQL' ? 'MySQL' 
        : dbConfig.type === 'PostgreSQL' ? 'PostgreSQL' 
        : 'SQLite'

      // 3. 构建系统提示词
      const systemPrompt = getDefaultSystemPrompt(dialect)

      // 4. 创建 ReAct Agent
      const agent = createReactAgent({
        llm: this.llm,
        tools,
        stateModifier: new SystemMessage(systemPrompt),
      })

      // 5. 流式执行
      const stream = await agent.stream(
        { messages: [new HumanMessage(question)] },
        { streamMode: 'values' }
      )

      let finalResult = null

      for await (const chunk of stream) {
        // 通知上层有新的chunk
        if (onChunk) {
          onChunk(chunk)
        }
        finalResult = chunk
      }

      const duration = Date.now() - startTime

      // 6. 提取结果
      const finalAnswer = this.extractFinalAnswer(finalResult)
      const thoughts = this.extractThoughts(finalResult)
      const queryData = this.extractQueryData(finalResult)

      return {
        success: true,
        question,
        answer: finalAnswer,
        thoughts,
        data: queryData,
        duration,
      }
    } catch (error) {
      console.error('❌ NL2SQL Agent 流式执行失败:', error)
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
