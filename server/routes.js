import express from 'express'
import cors from 'cors'
import storage from './storage.js'
import databaseManager from './database.js'
import { recognizeIntent, clarifyIntent } from './intent-service.js'
import { generateSQL } from './sql-generator.js'
import { executeAndRecommend } from './query-executor.js'
import { DATABASE_SCHEMA } from './db-schema.js'
import { createAgent } from './agent/index.js'

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
 * 测试数据库连接
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

    const result = await databaseManager.testConnection(config)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

/**
 * 获取数据库元数据
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

    const metadata = await databaseManager.getMetadata(config)
    res.json({ success: true, data: metadata })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
})

// ==================== 意图识别 API ====================

/**
 * 意图识别主接口
 * POST /api/intent/recognize
 */
app.post('/api/intent/recognize', async (req, res) => {
  try {
    const { query } = req.body

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: '查询内容不能为空',
      })
    }

    // 获取数据源元数据（优先使用 Schema 配置）
    const metadata = {
      tables: Object.values(DATABASE_SCHEMA).map(schema => ({
        name: schema.name,
        columns: Object.entries(schema.columns).map(([name, info]) => ({
          name,
          type: info.type,
          description: info.description,
          primaryKey: info.primaryKey || false,
        })),
      })),
      totalTables: Object.keys(DATABASE_SCHEMA).length,
    }

    const result = await recognizeIntent(query, metadata)
    res.json(result)
  } catch (error) {
    console.error('[API] 意图识别失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '意图识别失败',
    })
  }
})

/**
 * 澄清对话接口
 * POST /api/intent/clarify
 */
app.post('/api/intent/clarify', async (req, res) => {
  try {
    const { query, missing_slots, user_response, partial_intent } = req.body

    if (!query || !missing_slots || !user_response) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: query, missing_slots, user_response',
      })
    }

    // TODO: 获取元数据
    const metadata = null

    const result = await clarifyIntent(
      query,
      missing_slots,
      user_response,
      partial_intent,
      metadata
    )
    res.json(result)
  } catch (error) {
    console.error('[API] 澄清对话失败:', error)
    res.status(500).json({
      success: false,
      error: error.message || '澄清对话处理失败',
    })
  }
})

// ==================== SQL 生成 API ====================

/**
 * 生成 SQL 查询
 * POST /api/sql/generate
 */
app.post('/api/sql/generate', async (req, res) => {
  try {
    const { intent, datasource_id, metadata: directMetadata } = req.body

    if (!intent) {
      return res.status(400).json({
        success: false,
        error: '意图对象不能为空',
      })
    }

    // 获取数据源元数据
    let metadata = directMetadata || null // 优先使用直接传入的元数据
    
    // 如果没有元数据，使用 Schema 配置
    if (!metadata) {
      metadata = {
        tables: Object.values(DATABASE_SCHEMA).map(schema => ({
          name: schema.name,
          columns: Object.entries(schema.columns).map(([name, info]) => ({
            name,
            type: info.type,
            description: info.description,
            primaryKey: info.primaryKey || false,
          })),
        })),
        totalTables: Object.keys(DATABASE_SCHEMA).length,
      }
    } else if (datasource_id && !directMetadata) {
      // 如果有 datasource_id，尝试从数据库获取实际元数据
      const datasource = storage.getById(datasource_id)
      if (datasource) {
        try {
          const dbMetadata = await databaseManager.getMetadata(datasource)
          console.log('[API] 获取到数据库元数据:', dbMetadata.totalTables, '个表')
          metadata = dbMetadata // 使用实际数据库元数据覆盖
        } catch (error) {
          console.warn('[API] 获取数据库元数据失败，使用 Schema 配置:', error.message)
          // 继续使用 Schema 配置的元数据
        }
      }
    }

    // 生成 SQL
    const result = await generateSQL(intent, metadata)
    res.json(result)
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
