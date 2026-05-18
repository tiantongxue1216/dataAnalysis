/**
 * LangChain SQLDatabase Toolkit
 * 基于文档中的核心工具集实现
 * 提供 list_tables, get_schema, query_checker, execute_query 等工具
 */

import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { createSQLDatabase, closeDatabase } from './langchain-sql-database.js'

/**
 * 创建 SQLDatabase Toolkit
 * @param {Object} dbConfig - 数据库配置
 * @returns {Promise<Array>} 工具列表
 */
export async function createSQLDatabaseToolkit(dbConfig) {
  // 创建数据库连接（保持连接以便工具复用）
  const connection = await createSQLDatabase(dbConfig)
  const { db } = connection

  /**
   * 工具1: 列出所有表
   */
  const listTablesTool = tool(
    async () => {
      try {
        const tables = await db.getUsableTableNames()
        return JSON.stringify({
          success: true,
          tables,
          message: `找到 ${tables.length} 个表`,
        })
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error.message,
        })
      }
    },
    {
      name: 'sql_db_list_tables',
      description: '列出数据库中所有可用的表名。在开始查询之前，首先使用此工具了解有哪些表可用。',
      schema: z.object({}),
    }
  )

  /**
   * 工具2: 获取表结构信息
   */
  const getSchemaTool = tool(
    async ({ table_names }) => {
      try {
        if (!table_names || table_names.length === 0) {
          return JSON.stringify({
            success: false,
            error: '请指定要查询的表名',
          })
        }

        // 获取表的详细信息（包括字段、类型、示例数据）
        const tableInfo = await db.getTableInfo(table_names)
        
        return JSON.stringify({
          success: true,
          table_names,
          schema: tableInfo,
          message: `获取了 ${table_names.length} 个表的结构信息`,
        })
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error.message,
        })
      }
    },
    {
      name: 'sql_db_schema',
      description: '获取指定表的详细结构信息，包括字段名、数据类型和示例数据。在生成 SQL 查询之前使用此工具了解表结构。',
      schema: z.object({
        table_names: z.array(z.string()).describe('要查询结构的表名列表'),
      }),
    }
  )

  /**
   * 工具3: 执行 SQL 查询
   */
  const executeQueryTool = tool(
    async ({ query }) => {
      try {
        if (!query) {
          return JSON.stringify({
            success: false,
            error: 'SQL 查询语句不能为空',
          })
        }

        // 安全检查：只允许 SELECT 查询
        const normalizedQuery = query.trim().toUpperCase()
        if (!normalizedQuery.startsWith('SELECT')) {
          return JSON.stringify({
            success: false,
            error: '只允许执行 SELECT 查询',
          })
        }

        // 执行查询
        const result = await db.run(query)
        
        return JSON.stringify({
          success: true,
          data: result,
          rowCount: result?.length || 0,
          message: `查询成功，返回 ${result?.length || 0} 条记录`,
        })
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error.message,
          query,
        })
      }
    },
    {
      name: 'sql_db_query',
      description: '执行 SQL 查询并返回结果。只允许执行 SELECT 查询。在了解表结构后，使用此工具执行实际的查询。',
      schema: z.object({
        query: z.string().describe('要执行的 SQL SELECT 查询语句'),
      }),
    }
  )

  /**
   * 工具4: 查询校验器（检查查询是否正确）
   */
  const queryCheckerTool = tool(
    async ({ query }) => {
      try {
        if (!query) {
          return JSON.stringify({
            success: false,
            error: 'SQL 查询语句不能为空',
          })
        }

        // 尝试解释查询计划（EXPLAIN）来验证 SQL 语法
        const explainQuery = `EXPLAIN ${query}`
        await db.run(explainQuery)

        return JSON.stringify({
          success: true,
          message: 'SQL 查询语法正确',
          query,
        })
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error.message,
          query,
          suggestion: '请检查表名、字段名是否正确，以及 SQL 语法是否符合数据库方言',
        })
      }
    },
    {
      name: 'sql_db_query_checker',
      description: '在执行查询之前，先使用此工具检查 SQL 查询的语法是否正确。这可以避免执行错误的查询。',
      schema: z.object({
        query: z.string().describe('要检查的 SQL 查询语句'),
      }),
    }
  )

  /**
   * 工具5: 获取数据库信息（方言、版本等）
   */
  const getDatabaseInfoTool = tool(
    async () => {
      try {
        const info = {
          dialect: db.appDataSource.options.type,
          tables: await db.getUsableTableNames(),
        }

        return JSON.stringify({
          success: true,
          database_info: info,
        })
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error.message,
        })
      }
    },
    {
      name: 'sql_db_info',
      description: '获取数据库的基本信息，包括数据库类型（方言）、所有可用表等。',
      schema: z.object({}),
    }
  )

  const tools = [
    listTablesTool,
    getSchemaTool,
    executeQueryTool,
    queryCheckerTool,
    getDatabaseInfoTool,
  ]

  // 返回工具和关闭函数
  return {
    tools,
    close: async () => {
      await closeDatabase(connection)
    },
  }
}

/**
 * 获取默认的系统提示词模板
 * 参考文档中的进阶技巧
 * @param {string} dialect - 数据库方言
 * @param {number} topK - 默认限制数量
 * @returns {string} 系统提示词
 */
export function getDefaultSystemPrompt(dialect = 'SQLite', topK = 5) {
  return `你是一个专业的 SQL 数据库查询助手。你的任务是将用户的自然语言问题转化为准确的 SQL 查询，并基于查询结果给出答案。

当前数据库的方言是: ${dialect}

**工作流程**:
1. 首先，使用 \`sql_db_list_tables\` 工具了解数据库中有哪些表
2. 然后，根据用户问题，使用 \`sql_db_schema\` 工具获取相关表的详细结构
3. 接着，构建准确的 SQL 查询，并使用 \`sql_db_query_checker\` 验证语法
4. 最后，使用 \`sql_db_query\` 工具执行查询，并根据结果用中文给出最终答案

**重要规则**:
- 只执行 SELECT 查询，不允许修改数据
- 生成的 SQL 必须符合 ${dialect} 的语法规范
- 如果查询结果很多，使用 LIMIT ${topK} 限制返回数量
- 时间字段处理时要注意数据库方言的差异
- 字符串值必须用单引号包裹
- 如果表名或字段名包含特殊字符，使用双引号包裹
- 回答时要基于实际查询结果，不要编造数据

**输出格式**:
在给出最终答案时，请使用以下格式：
"""
思考过程: [简要说明你的推理过程]
最终答案: [基于查询结果的准确回答]
"""

记住：你的目标是帮助用户通过自然语言查询数据库，并获得准确的答案。`
}
