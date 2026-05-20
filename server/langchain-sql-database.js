/**
 * 简化版 SQLDatabase 适配器
 * 由于 @langchain/community 的 SQLDatabase 可能不兼容，使用自定义实现
 * 支持 SQLite、MySQL、PostgreSQL
 */

import { DataSource } from 'typeorm'
import databaseManager from './database.js'

/**
 * 简化的 SQLDatabase 类（模拟 LangChain 的接口）
 */
class SimpleSQLDatabase {
  constructor(dataSource) {
    this.dataSource = dataSource
    this.appDataSource = dataSource
  }

  /**
   * 获取可用的表名列表
   */
  async getUsableTableNames() {
    const queryRunner = this.dataSource.createQueryRunner()
    try {
      const tables = await queryRunner.getTables()
      return tables.map(t => t.name)
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * 获取表的详细信息
   */
  async getTableInfo(tableNames) {
    const queryRunner = this.dataSource.createQueryRunner()
    try {
      const info = {}
      for (const tableName of tableNames) {
        const table = await queryRunner.getTable(tableName)
        if (table) {
          info[tableName] = {
            name: tableName,
            columns: table.columns.map(col => ({
              name: col.name,
              type: col.type,
              nullable: col.isNullable,
              primaryKey: col.isPrimary,
            })),
          }
        }
      }
      return info
    } finally {
      await queryRunner.release()
    }
  }

  /**
   * 执行 SQL 查询
   */
  async run(sql) {
    const queryRunner = this.dataSource.createQueryRunner()
    try {
      const result = await queryRunner.query(sql)
      return result
    } finally {
      await queryRunner.release()
    }
  }
}

/**
 * 创建 SQLDatabase 实例
 * @param {Object} config - 数据库配置
 * @returns {Promise<Object>} SQLDatabase 实例和连接对象
 */
export async function createSQLDatabase(config) {
  const { type, host, port, database, username, password, filePath } = config

  let dataSource

  try {
    switch (type) {
      case 'SQLite': {
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

    // 创建简化的 SQLDatabase 实例
    const db = new SimpleSQLDatabase(dataSource)

    console.log(`[SQLDatabase] 成功连接到 ${type} 数据库`)
    console.log(`[SQLDatabase] 可用表:`, await db.getUsableTableNames())

    return {
      db,
      dataSource,
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
 */
export async function closeDatabase(connection) {
  if (connection && connection.dataSource) {
    await connection.dataSource.destroy()
    console.log('[SQLDatabase] 数据库连接已关闭')
  }
}

/**
 * 获取数据库元数据（兼容旧接口）
 */
export async function getDatabaseMetadata(config) {
  const { db, dataSource } = await createSQLDatabase(config)

  try {
    const tableNames = await db.getUsableTableNames()
    const tables = []

    for (const tableName of tableNames) {
      // 跳过 SQLite 系统表
      if (tableName === 'sqlite_sequence') continue
      
      const tableInfo = await db.getTableInfo([tableName])
      const tableSchema = tableInfo[tableName]
      
      tables.push({
        name: tableName,
        columns: tableSchema.columns.map(col => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          primaryKey: col.primaryKey,
        })),
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
 */
export async function executeQuery(config, sql) {
  const { db, dataSource } = await createSQLDatabase(config)

  try {
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
