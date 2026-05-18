/**
 * LangChain SQLDatabase 适配器
 * 基于 langchain-community 的 SQLDatabase 封装
 * 支持 SQLite、MySQL、PostgreSQL
 */

import { SQLDatabase } from '@langchain/community/sql_db'
import { DataSource } from 'typeorm'

/**
 * 创建 SQLDatabase 实例
 * @param {Object} config - 数据库配置
 * @returns {Promise<SQLDatabase>} SQLDatabase 实例
 */
export async function createSQLDatabase(config) {
  const { type, host, port, database, username, password, filePath } = config

  let dataSource

  try {
    switch (type) {
      case 'SQLite': {
        // SQLite 使用文件路径
        const dbPath = filePath || database
        dataSource = new DataSource({
          type: 'sqlite',
          database: dbPath,
        })
        break
      }

      case 'MySQL': {
        dataSource = new DataSource({
          type: 'mysql',
          host: host || 'localhost',
          port: parseInt(port) || 3306,
          username: username,
          password: password,
          database: database,
        })
        break
      }

      case 'PostgreSQL': {
        dataSource = new DataSource({
          type: 'postgres',
          host: host || 'localhost',
          port: parseInt(port) || 5432,
          username: username,
          password: password,
          database: database,
        })
        break
      }

      default:
        throw new Error(`不支持的数据库类型: ${type}`)
    }

    // 初始化数据源
    await dataSource.initialize()

    // 创建 SQLDatabase 实例
    const db = await SQLDatabase.fromDataSource(dataSource, {
      sampleRowsInTableInfo: 3, // 显示3条样本数据
      includesTables: [], // 空数组表示包含所有表
      ignoreTables: [], // 忽略的表列表
    })

    console.log(`[SQLDatabase] 成功连接到 ${type} 数据库`)
    console.log(`[SQLDatabase] 可用表:`, await db.getUsableTableNames())

    return {
      db,
      dataSource, // 返回数据源以便后续关闭
    }
  } catch (error) {
    console.error('[SQLDatabase] 连接失败:', error.message)
    if (dataSource) {
      await dataSource.destroy().catch(() => {})
    }
    throw new Error(`数据库连接失败: ${error.message}`)
  }
}

/**
 * 关闭数据库连接
 * @param {Object} connection - createSQLDatabase 返回的对象
 */
export async function closeDatabase(connection) {
  if (connection && connection.dataSource) {
    await connection.dataSource.destroy()
    console.log('[SQLDatabase] 数据库连接已关闭')
  }
}

/**
 * 获取数据库元数据（兼容旧接口）
 * @param {Object} config - 数据库配置
 * @returns {Promise<Object>} 元数据
 */
export async function getDatabaseMetadata(config) {
  const { db, dataSource } = await createSQLDatabase(config)

  try {
    const tableNames = await db.getUsableTableNames()
    const tables = []

    for (const tableName of tableNames) {
      const tableInfo = await db.getTableInfo([tableName])
      tables.push({
        name: tableName,
        schema: tableInfo,
      })
    }

    return {
      tables,
      totalTables: tables.length,
    }
  } finally {
    await closeDatabase({ dataSource })
  }
}

/**
 * 执行 SQL 查询
 * @param {Object} config - 数据库配置
 * @param {string} sql - SQL 查询语句
 * @returns {Promise<Array>} 查询结果
 */
export async function executeQuery(config, sql) {
  const { db, dataSource } = await createSQLDatabase(config)

  try {
    // 使用 SQLDatabase 执行查询
    const result = await db.run(sql)
    return result
  } catch (error) {
    console.error('[SQLDatabase] 查询执行失败:', error.message)
    throw error
  } finally {
    await closeDatabase({ dataSource })
  }
}

/**
 * 测试数据库连接
 * @param {Object} config - 数据库配置
 * @returns {Promise<Object>} 测试结果
 */
export async function testConnection(config) {
  let connection

  try {
    connection = await createSQLDatabase(config)
    const tableNames = await connection.db.getUsableTableNames()

    return {
      success: true,
      message: `${config.type} 连接成功`,
      tables: tableNames,
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
      tables: [],
    }
  } finally {
    if (connection) {
      await closeDatabase(connection)
    }
  }
}
