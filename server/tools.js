/**
 * Agent 工具定义
 * 封装标准化的能力，方便 Agent 调用
 */

import { recognizeIntent } from './intent-service.js'
import { generateSQL } from './sql-generator.js'
import { executeAndRecommend } from './query-executor.js'
import { getTableSchema } from './schema-service.js'

/**
 * 意图识别工具
 * @param {string} query - 用户查询文本
 * @param {object} metadata - 数据库元数据
 * @returns {Promise<object>} 意图识别结果
 */
export const intentRecognitionTool = {
  name: 'intent_recognition',
  description: '识别用户查询的意图，包括表名、查询字段、条件、排序等',
  
  parameters: {
    query: {
      type: 'string',
      required: true,
      description: '用户输入的查询文本'
    },
    metadata: {
      type: 'object',
      required: false,
      description: '数据库元数据（表结构信息）'
    }
  },

  async execute({ query, metadata }) {
    if (!query) {
      throw new Error('查询文本不能为空')
    }

    return await recognizeIntent(query, metadata)
  }
}

/**
 * 获取表结构工具
 * @param {string} tableName - 表名
 * @returns {Promise<object>} 表结构信息
 */
export const getTableSchemaTool = {
  name: 'get_table_schema',
  description: '获取指定表的详细结构信息，包括字段、维度、度量、时间字段等',
  
  parameters: {
    tableName: {
      type: 'string',
      required: true,
      description: '表名'
    }
  },

  async execute({ tableName }) {
    if (!tableName) {
      throw new Error('表名不能为空')
    }

    return await getTableSchema(tableName)
  }
}

/**
 * SQL 生成工具
 * @param {object} intent - 意图识别结果
 * @param {string} datasourceId - 数据源 ID
 * @returns {Promise<object>} SQL 生成结果
 */
export const sqlGenerationTool = {
  name: 'sql_generation',
  description: '根据意图识别结果生成 SQL 查询语句',
  
  parameters: {
    intent: {
      type: 'object',
      required: true,
      description: '意图识别结果对象'
    },
    datasourceId: {
      type: 'string',
      required: true,
      description: '数据源 ID'
    }
  },

  async execute({ intent, datasourceId }) {
    if (!intent) {
      throw new Error('意图识别结果不能为空')
    }
    if (!datasourceId) {
      throw new Error('数据源 ID 不能为空')
    }

    return await generateSQL(intent, datasourceId)
  }
}

/**
 * 查询执行工具
 * @param {string} sql - SQL 查询语句
 * @param {string} datasourceId - 数据源 ID
 * @param {string} intentType - 意图类型
 * @returns {Promise<object>} 查询结果和图表推荐
 */
export const queryExecutionTool = {
  name: 'query_execution',
  description: '执行 SQL 查询并推荐合适的图表类型',
  
  parameters: {
    sql: {
      type: 'string',
      required: true,
      description: 'SQL 查询语句'
    },
    datasourceId: {
      type: 'string',
      required: true,
      description: '数据源 ID'
    },
    intentType: {
      type: 'string',
      required: false,
      description: '意图类型（用于图表推荐）'
    }
  },

  async execute({ sql, datasourceId, intentType }) {
    if (!sql) {
      throw new Error('SQL 语句不能为空')
    }
    if (!datasourceId) {
      throw new Error('数据源 ID 不能为空')
    }

    // 导入数据源存储
    const dataSourceStorage = (await import('./storage.js')).default
    
    // 获取完整的数据源配置
    const datasource = dataSourceStorage.getById(datasourceId)
    if (!datasource) {
      throw new Error(`数据源 ${datasourceId} 不存在`)
    }

    return await executeAndRecommend(datasource, sql, intentType)
  }
}

/**
 * 图表推荐工具
 * @param {Array<object>} data - 查询结果数据
 * @param {string} intentType - 意图类型
 * @returns {Promise<object>} 图表推荐结果
 */
export const chartRecommendationTool = {
  name: 'chart_recommendation',
  description: '根据查询结果数据推荐最合适的图表类型',
  
  parameters: {
    data: {
      type: 'array',
      required: true,
      description: '查询结果数据'
    },
    intentType: {
      type: 'string',
      required: false,
      description: '意图类型'
    }
  },

  async execute({ data, intentType }) {
    if (!data || !Array.isArray(data)) {
      throw new Error('查询数据必须是数组')
    }

    const { recommendChart } = await import('./chart-recommender.js')
    return await recommendChart(data, intentType)
  }
}

/**
 * 完整查询流程工具（组合工具）
 * @param {string} query - 用户查询文本
 * @param {string} datasourceId - 数据源 ID
 * @returns {Promise<object>} 完整的查询结果
 */
export const completeQueryTool = {
  name: 'complete_query',
  description: '执行完整的查询流程：意图识别 → SQL 生成 → 查询执行 → 图表推荐',
  
  parameters: {
    query: {
      type: 'string',
      required: true,
      description: '用户输入的查询文本'
    },
    datasourceId: {
      type: 'string',
      required: true,
      description: '数据源 ID'
    }
  },

  async execute({ query, datasourceId }) {
    const startTime = Date.now()
    const steps = []

    try {
      // 1. 意图识别
      console.log('[Tool] 步骤 1: 意图识别')
      const intentResult = await intentRecognitionTool.execute({ query })
      steps.push({
        step: 'intent_recognition',
        success: intentResult.success,
        result: intentResult
      })

      if (!intentResult.success || !intentResult.intent) {
        return {
          success: false,
          error: intentResult.message || '意图识别失败',
          steps,
          duration: Date.now() - startTime
        }
      }

      const intent = intentResult.intent

      // 2. SQL 生成
      console.log('[Tool] 步骤 2: SQL 生成')
      const sqlResult = await sqlGenerationTool.execute({
        intent,
        datasourceId
      })
      steps.push({
        step: 'sql_generation',
        success: sqlResult.success,
        result: sqlResult
      })

      if (!sqlResult.success || !sqlResult.sql) {
        return {
          success: false,
          error: sqlResult.error || 'SQL 生成失败',
          steps,
          duration: Date.now() - startTime
        }
      }

      // 3. 查询执行
      console.log('[Tool] 步骤 3: 查询执行')
      const queryResult = await queryExecutionTool.execute({
        sql: sqlResult.sql,
        datasourceId,
        intentType: intent.intent_type
      })
      steps.push({
        step: 'query_execution',
        success: queryResult.success,
        result: queryResult
      })

      return {
        success: true,
        query,
        intent,
        sql: sqlResult.sql,
        data: queryResult.data,
        recommendation: queryResult.recommendation,
        rowCount: queryResult.rowCount,
        steps,
        duration: Date.now() - startTime
      }

    } catch (error) {
      return {
        success: false,
        error: error.message,
        steps,
        duration: Date.now() - startTime
      }
    }
  }
}

/**
 * 导出所有工具
 */
export const allTools = [
  intentRecognitionTool,
  getTableSchemaTool,
  sqlGenerationTool,
  queryExecutionTool,
  chartRecommendationTool,
  completeQueryTool
]

/**
 * 工具注册表（按名称索引）
 */
export const toolRegistry = allTools.reduce((registry, tool) => {
  registry[tool.name] = tool
  return registry
}, {})
