import express from 'express'
import cors from 'cors'
import storage from './storage.js'
import databaseManager from './database.js'
import { recognizeIntent, clarifyIntent } from './intent-service.js'
import { generateSQL } from './sql-generator.js'

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

    // TODO: 从请求中获取当前数据源的元数据
    // const metadata = await getDataSourceMetadata(req.body.datasource_id)
    const metadata = null

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
    
    if (!metadata && datasource_id) {
      const datasource = storage.getById(datasource_id)
      if (datasource) {
        try {
          metadata = await databaseManager.getMetadata(datasource)
          console.log('[API] 获取到元数据:', metadata.totalTables, '个表')
        } catch (error) {
          console.warn('[API] 获取元数据失败:', error.message)
          // 继续执行，不使用元数据
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

// ==================== 健康检查 ====================

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  })
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
