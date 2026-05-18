/**
 * Agent 工具定义（已废弃）
 * @deprecated 请使用 langchain-sql-toolkit.js 替代
 * 
 * 此文件中的工具已被 LangChain SQLDatabaseToolkit 替代
 * 保留此文件仅为向后兼容
 */

import { executeAndRecommend } from './query-executor.js'
import { getTableSchema } from './schema-service.js'

/**
 * 获取表结构工具（保留）
 */
export const getTableSchemaTool = {
  name: 'get_table_schema',
  description: '获取指定表的详细结构信息',
  
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
 * 查询执行工具（保留）
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
 * 导出可用的工具（仅保留未废弃的工具）
 */
export const allTools = [
  getTableSchemaTool,
  queryExecutionTool
]

/**
 * 工具注册表
 */
export const toolRegistry = allTools.reduce((registry, tool) => {
  registry[tool.name] = tool
  return registry
}, {})

// 输出废弃提示
console.warn('⚠️  tools.js 中的部分工具已废弃，请使用 langchain-sql-toolkit.js')
