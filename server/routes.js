import express from 'express'
import cors from 'cors'
import storage from './storage.js'
import databaseManager from './database.js'
// 注意：旧的意图识别和 SQL 生成模块已被 LangChain NL2SQL Agent 替代
// import { recognizeIntent, clarifyIntent } from './intent-service.js'
// import { generateSQL } from './sql-generator.js'
import { executeAndRecommend } from './query-executor.js'
import { DATABASE_SCHEMA } from './db-schema.js'
import { createAgent } from './agent/index.js'
// 新的 NL2SQL Agent
import { createNL2SQLAgent } from './nl2sql-agent.js'
import { testConnection as lcTestConnection, getDatabaseMetadata as lcGetMetadata } from './langchain-sql-database.js'

const app = express()

// 中间件
app.use(cors())
app.use(express.json())

// ==================== 数据源管理 API ====================

/**
 * 获取所有数据源
 * GET /api/datasources
 */
app.get('/api/datasources', (req, res) => {
  try {
    const datasources = storage.getAll()
    // 隐藏密码等敏感信息
    const safeDatasources = datasources.map(ds => ({
      ...ds,
      password: ds.password ? '********' : null,
    }))
    res.json({ success: true, data: safeDatasources })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 获取单个数据源
 * GET /api/datasources/:id
 */
app.get('/api/datasources/:id', (req, res) => {
  try {
    const datasource = storage.getById(req.params.id)
    if (!datasource) {
      return res.status(404).json({ success: false, error: '数据源不存在' })
    }
    
    // 隐藏密码
    const safeDatasource = {
      ...datasource,
      password: datasource.password ? '********' : null,
    }
    
    res.json({ success: true, data: safeDatasource })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 创建数据源
 * POST /api/datasources
 */
app.post('/api/datasources', async (req, res) => {
  try {
    const { name, type, host, port, database, username, password, filePath } = req.body

    // 验证必填字段
    if (!name || !type) {
      return res.status(400).json({ 
        success: false, 
        error: '数据源名称和类型不能为空' 
      })
    }

    // 根据数据库类型验证字段
    if (type === 'SQLite') {
      if (!filePath && !database) {
        return res.status(400).json({ 
          success: false, 
          error: 'SQLite 数据库文件路径不能为空' 
        })
      }
    } else {
      if (!host || !database) {
        return res.status(400).json({ 
          success: false, 
          error: 'Host 和数据库名不能为空' 
        })
      }
    }

    const datasource = storage.add({
      name,
      type,
      host: host || null,
      port: port || null,
      database: database || null,
      username: username || null,
      password: password || null,
      filePath: filePath || null,
    })

    res.status(201).json({ success: true, data: datasource })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 更新数据源
 * PUT /api/datasources/:id
 */
app.put('/api/datasources/:id', (req, res) => {
  try {
    const updates = req.body
    
    const datasource = storage.update(req.params.id, updates)
    res.json({ success: true, data: datasource })
  } catch (error) {
    if (error.message === '数据源不存在') {
      res.status(404).json({ success: false, error: error.message })
    } else {
      res.status(500).json({ success: false, error: error.message })
    }
  }
})

/**
 * 删除数据源
 * DELETE /api/datasources/:id
 */
app.delete('/api/datasources/:id', (req, res) => {
  try {
    storage.delete(req.params.id)
    res.json({ success: true, message: '数据源已删除' })
  } catch (error) {
    if (error.message === '数据源不存在') {
      res.status(404).json({ success: false, error: error.message })
    } else {
      res.status(500).json({ success: false, error: error.message })
    }
  }
})

// ==================== 数据库连接测试 API ====================

/**
 * 测试数据库连接（使用 LangChain SQLDatabase）
 * POST /api/datasources/test
 */
app.post('/api/datasources/test', async (req, res) => {
  try {
    const config = req.body

    // 验证必填字段
    if (!config.type) {
      return res.status(400).json({ 
        success: false, 
        error: '数据库类型不能为空' 
      })
    }

    // 优先使用 LangChain SQLDatabase 进行测试
    try {
      const result = await lcTestConnection(config)
      res.json({ success: true, data: result })
    } catch (lcError) {
      console.warn('[API] LangChain 连接测试失败，回退到传统方式:', lcError.message)
      // 回退到原有的测试方式
      const result = await databaseManager.testConnection(config)
      res.json({ success: true, data: result })
    }
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

/**
 * 获取数据库元数据（使用 LangChain SQLDatabase）
 * POST /api/datasources/metadata
 */
app.post('/api/datasources/metadata', async (req, res) => {
  try {
    const config = req.body

    if (!config.type) {
      return res.status(400).json({ 
        success: false, 
        error: '数据库类型不能为空' 
      })
    }

    // 优先使用 LangChain SQLDatabase 获取元数据
    try {
      const metadata = await lcGetMetadata(config)
      res.json({ success: true, data: metadata })
    } catch (lcError) {
      console.warn('[API] LangChain 元数据获取失败，回退到传统方式:', lcError.message)
      // 回退到原有的方式
      const metadata = await databaseManager.getMetadata(config)
      res.json({ success: true, data: metadata })
    }
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

// ==================== 意图识别 API (已废弃，使用 /api/nl2sql/query) ====================

/**
 * 意图识别主接口（已废弃）
 * POST /api/intent/recognize
 * @deprecated 请使用 /api/nl2sql/query 替代
 */
app.post('/api/intent/recognize', async (req, res) => {
  try {
    console.warn('[API] ⚠️  /api/intent/recognize 已废弃，请使用 /api/nl2sql/query')
    return res.status(410).json({
      success: false,
      error: '此接口已废弃，请使用 /api/nl2sql/query 进行自然语言查询',
      migration_guide: 'POST /api/nl2sql/query { question, datasource_id }'
    })
  } catch (error) {
    console.error('[API] 意图识别失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '意图识别失败',
    })
  }
})

/**
 * 澄清对话接口（已废弃）
 * POST /api/intent/clarify
 * @deprecated 请使用 /api/nl2sql/query 替代
 */
app.post('/api/intent/clarify', async (req, res) => {
  try {
    console.warn('[API] ⚠️  /api/intent/clarify 已废弃，请使用 /api/nl2sql/query')
    return res.status(410).json({
      success: false,
      error: '此接口已废弃，请使用 /api/nl2sql/query 进行自然语言查询',
      migration_guide: 'POST /api/nl2sql/query { question, datasource_id }'
    })
  } catch (error) {
    console.error('[API] 澄清对话处理失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '澄清对话处理失败',
    })
  }
})

// ==================== SQL 生成 API (已废弃) ====================

/**
 * 生成 SQL 查询（已废弃）
 * POST /api/sql/generate
 * @deprecated 请使用 /api/nl2sql/query 替代
 */
app.post('/api/sql/generate', async (req, res) => {
  try {
    console.warn('[API] ⚠️  /api/sql/generate 已废弃，请使用 /api/nl2sql/query')
    return res.status(410).json({
      success: false,
      error: '此接口已废弃，请使用 /api/nl2sql/query 进行自然语言查询',
      migration_guide: 'POST /api/nl2sql/query { question, datasource_id }'
    })
  } catch (error) {
    console.error('[API] SQL 生成失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'SQL 生成失败',
    })
  }
})

// ==================== 查询执行 API ====================

/**
 * 执行 SQL 查询并推荐图表
 * POST /api/query/execute
 */
app.post('/api/query/execute', async (req, res) => {
  try {
    const { sql, datasource_id, intent_type } = req.body

    if (!sql) {
      return res.status(400).json({
        success: false,
        error: 'SQL 语句不能为空',
      })
    }

    if (!datasource_id) {
      return res.status(400).json({
        success: false,
        error: '数据源 ID 不能为空',
      })
    }

    // 获取数据源
    const datasource = storage.getById(datasource_id)
    if (!datasource) {
      return res.status(404).json({
        success: false,
        error: '数据源不存在',
      })
    }

    console.log('[API] 执行查询:', sql)

    // 执行查询并推荐图表
    const result = await executeAndRecommend(datasource, sql, intent_type)
    
    res.json(result)
  } catch (error) {
    console.error('[API] 查询执行失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '查询执行失败',
      data: [],
      recommendation: {
        chartType: 'table',
        reason: '执行失败',
        canRender: false,
      },
      rowCount: 0,
    })
  }
})

// ==================== Schema 信息 API ====================

/**
 * 获取数据库 Schema 信息（用于数据树展示）
 * GET /api/schema
 */
app.get('/api/schema', (req, res) => {
  try {
    const schemaData = {
      tables: [],
    }

    for (const [tableName, schema] of Object.entries(DATABASE_SCHEMA)) {
      const tableInfo = {
        name: tableName,
        description: schema.description,
        dimensions: [],
        measures: [],
        timeFields: [],
      }

      // 添加维度字段
      if (schema.dimensions && schema.dimensions.length > 0) {
        schema.dimensions.forEach(dim => {
          const colInfo = schema.columns[dim]
          if (colInfo) {
            tableInfo.dimensions.push({
              name: dim,
              description: colInfo.description || dim,
              type: colInfo.type,
            })
          }
        })
      }

      // 添加度量字段（从 metrics 和 columns 中获取）
      if (schema.metrics && Object.keys(schema.metrics).length > 0) {
        for (const [metricName, metricInfo] of Object.entries(schema.metrics)) {
          const colInfo = schema.columns[metricInfo.column]
          tableInfo.measures.push({
            name: metricName,
            column: metricInfo.column,
            aggregation: metricInfo.aggregation,
            description: colInfo?.description || metricName,
            type: colInfo?.type || 'UNKNOWN',
          })
        }
      }

      // 添加其他数值字段作为度量
      for (const [colName, colInfo] of Object.entries(schema.columns)) {
        if (['REAL', 'INTEGER', 'FLOAT', 'DECIMAL', 'DOUBLE', 'NUMERIC'].includes(colInfo.type) &&
            !tableInfo.measures.some(m => m.column === colName)) {
          tableInfo.measures.push({
            name: colInfo.description || colName,
            column: colName,
            aggregation: 'SUM',
            description: colInfo.description || colName,
            type: colInfo.type,
          })
        }
      }

      // 添加时间字段
      if (schema.timeColumn) {
        const timeColInfo = schema.columns[schema.timeColumn]
        if (timeColInfo) {
          tableInfo.timeFields.push({
            name: schema.timeColumn,
            description: timeColInfo.description || schema.timeColumn,
          })
        }
      }

      schemaData.tables.push(tableInfo)
    }

    res.json({ success: true, data: schemaData })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * 获取数据库 Schema 信息（用于数据树展示）
 * GET /api/schema
 */
app.get('/api/schema', (req, res) => {
  try {
    const schemaData = {
      tables: [],
    }

    for (const [tableName, schema] of Object.entries(DATABASE_SCHEMA)) {
      const tableInfo = {
        name: tableName,
        description: schema.description,
        dimensions: [],
        measures: [],
        timeFields: [],
      }

      // 添加维度字段
      if (schema.dimensions && schema.dimensions.length > 0) {
        schema.dimensions.forEach(dim => {
          const colInfo = schema.columns[dim]
          if (colInfo) {
            tableInfo.dimensions.push({
              name: dim,
              description: colInfo.description || dim,
              type: colInfo.type,
            })
          }
        })
      }

      // 添加度量字段（从 metrics 和 columns 中获取）
      if (schema.metrics && Object.keys(schema.metrics).length > 0) {
        for (const [metricName, metricInfo] of Object.entries(schema.metrics)) {
          const colInfo = schema.columns[metricInfo.column]
          tableInfo.measures.push({
            name: metricName,
            column: metricInfo.column,
            aggregation: metricInfo.aggregation,
            description: colInfo?.description || metricName,
            type: colInfo?.type || 'UNKNOWN',
          })
        }
      }

      // 添加其他数值字段作为度量
      for (const [colName, colInfo] of Object.entries(schema.columns)) {
        if (['REAL', 'INTEGER', 'FLOAT', 'DECIMAL', 'DOUBLE', 'NUMERIC'].includes(colInfo.type) &&
            !tableInfo.measures.some(m => m.column === colName)) {
          tableInfo.measures.push({
            name: colInfo.description || colName,
            column: colName,
            aggregation: 'SUM',
            description: colInfo.description || colName,
            type: colInfo.type,
          })
        }
      }

      // 添加时间字段
      if (schema.timeColumn) {
        const timeColInfo = schema.columns[schema.timeColumn]
        if (timeColInfo) {
          tableInfo.timeFields.push({
            name: schema.timeColumn,
            description: timeColInfo.description || schema.timeColumn,
          })
        }
      }

      schemaData.tables.push(tableInfo)
    }

    res.json({ success: true, data: schemaData })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ==================== 健康检查 ====================

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  })
})

// ==================== Agent API ====================

/**
 * Agent 查询接口
 * POST /api/agent/query
 * 使用 Agent 引擎执行完整的查询流程
 */
app.post('/api/agent/query', async (req, res) => {
  try {
    const { question, datasource_id, max_iterations } = req.body

    if (!question) {
      return res.status(400).json({
        success: false,
        error: '问题不能为空'
      })
    }

    if (!datasource_id) {
      return res.status(400).json({
        success: false,
        error: '数据源 ID 不能为空'
      })
    }

    console.log('[Agent API] 收到查询请求:', question)
    console.log('[Agent API] 数据源:', datasource_id)

    // 创建 Agent 实例
    const agent = createAgent()

    // 执行查询
    const result = await agent.execute(question, {
      datasourceId: datasource_id,
      maxIterations: max_iterations || 10
    })

    console.log('[Agent API] 执行结果:', JSON.stringify({
      success: result.success,
      answer: result.answer ? result.answer.substring(0, 100) : 'undefined',
      iterations: result.iterations,
      toolResults: result.toolResults?.length || 0,
      error: result.error
    }, null, 2))

    res.json(result)
  } catch (error) {
    console.error('[Agent API] 查询失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Agent 查询失败'
    })
  }
})

/**
 * NL2SQL Agent 查询接口（新）
 * POST /api/nl2sql/query
 * 使用 LangChain ReAct Agent 执行自然语言到 SQL 的转换
 */
app.post('/api/nl2sql/query', async (req, res) => {
  try {
    const { question, datasource_id, max_iterations, top_k } = req.body

    if (!question) {
      return res.status(400).json({
        success: false,
        error: '问题不能为空'
      })
    }

    if (!datasource_id) {
      return res.status(400).json({
        success: false,
        error: '数据源 ID 不能为空'
      })
    }

    console.log('[NL2SQL API] 收到 NL2SQL 查询请求:', question)
    console.log('[NL2SQL API] 数据源 ID:', datasource_id)

    // 获取数据源配置
    const datasource = storage.getById(datasource_id)
    if (!datasource) {
      return res.status(404).json({
        success: false,
        error: '数据源不存在'
      })
    }

    // 创建 NL2SQL Agent 实例
    const nl2sqlAgent = createNL2SQLAgent()

    // 执行查询
    const result = await nl2sqlAgent.execute(question, datasource, {
      topK: top_k || 5,
      maxIterations: max_iterations || 10
    })

    console.log('[NL2SQL API] 执行结果:', JSON.stringify({
      success: result.success,
      answer: result.answer ? result.answer.substring(0, 100) : 'undefined',
      iterations: result.iterations,
      error: result.error
    }, null, 2))

    res.json(result)
  } catch (error) {
    console.error('[NL2SQL API] 查询失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'NL2SQL 查询失败'
    })
  }
})

/**
 * NL2SQL Agent 流式查询接口
 * POST /api/nl2sql/query/stream
 * 使用 Server-Sent Events (SSE) 实时推送执行步骤
 */
app.post('/api/nl2sql/query/stream', async (req, res) => {
  try {
    const { question, datasource_id, max_iterations, top_k } = req.body

    if (!question) {
      return res.status(400).json({
        success: false,
        error: '问题不能为空'
      })
    }

    if (!datasource_id) {
      return res.status(400).json({
        success: false,
        error: '数据源 ID 不能为空'
      })
    }

    console.log('[NL2SQL Stream API] 收到流式查询请求:', question)

    // 获取数据源配置
    const datasource = storage.getById(datasource_id)
    if (!datasource) {
      return res.status(404).json({
        success: false,
        error: '数据源不存在'
      })
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // 发送事件辅助函数
    const sendEvent = (event, data) => {
      res.write(`event: ${event}\n`)
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    // 创建 NL2SQL Agent 实例
    const nl2sqlAgent = createNL2SQLAgent()

    // 执行流式查询
    const result = await nl2sqlAgent.executeStream(question, datasource, {
      topK: top_k || 5,
      maxIterations: max_iterations || 10,
      onStep: (step) => {
        // 实时推送每个执行步骤
        sendEvent('step', step)
      }
    })

    // 发送最终结果
    sendEvent('complete', result)
    res.end()
  } catch (error) {
    console.error('[NL2SQL Stream API] 查询失败:', error)
    res.write(`event: error\n`)
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
    res.end()
  }
})

/**
 * 获取可用工具列表
 * GET /api/agent/tools
 */
app.get('/api/agent/tools', (req, res) => {
  try {
    const agent = createAgent()
    const tools = agent.tools.map(tool => ({
      name: tool.name,
      description: tool.description
    }))

    res.json({
      success: true,
      data: tools
    })
  } catch (error) {
    console.error('[Agent API] 获取工具列表失败:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ==================== 错误处理 ====================

app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  })
})

export default app
