import { DatabaseSync } from 'node:sqlite'
import mysql from 'mysql2/promise'
import pg from 'pg'
import fs from 'fs'

/**
 * 数据库连接管理器
 * 支持多种数据库类型
 */
class DatabaseConnectionManager {
  /**
   * 测试数据库连接
   */
  async testConnection(config) {
    const { type, host, port, database, username, password, filePath } = config

    try {
      switch (type) {
        case 'SQLite':
          return await this.testSQLite(filePath || database)
        
        case 'MySQL':
          return await this.testMySQL({ host, port, database, username, password })
        
        case 'PostgreSQL':
          return await this.testPostgreSQL({ host, port, database, username, password })
        
        case 'SQL Server':
          return await this.testSQLServer({ host, port, database, username, password })
        
        default:
          throw new Error(`不支持的数据库类型: ${type}`)
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 测试 SQLite 连接
   */
  testSQLite(filePath) {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        throw new Error(`数据库文件不存在: ${filePath}`)
      }

      // 使用 Node.js 内置的 SQLite 模块
      const db = new DatabaseSync(filePath, { readOnly: true })
      
      // 测试查询
      const result = db.prepare('SELECT 1 as test').get()
      
      // 获取表列表
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()
      const tableNames = tables.map(t => t.name)
      
      db.close()
      
      return {
        success: true,
        message: 'SQLite 连接成功',
        tables: tableNames,
      }
    } catch (error) {
      throw new Error(`SQLite 连接失败: ${error.message}`)
    }
  }

  /**
   * 测试 MySQL 连接
   */
  async testMySQL(config) {
    try {
      const connection = await mysql.createConnection({
        host: config.host,
        port: parseInt(config.port) || 3306,
        user: config.username,
        password: config.password,
        database: config.database,
      })

      // 获取表列表
      const [tables] = await connection.query('SHOW TABLES')
      await connection.end()

      return {
        success: true,
        message: 'MySQL 连接成功',
        tables: tables.map(t => Object.values(t)[0]),
      }
    } catch (error) {
      throw new Error(`MySQL 连接失败: ${error.message}`)
    }
  }

  /**
   * 测试 PostgreSQL 连接
   */
  async testPostgreSQL(config) {
    const client = new pg.Client({
      host: config.host,
      port: parseInt(config.port) || 5432,
      database: config.database,
      user: config.username,
      password: config.password,
    })

    try {
      await client.connect()
      
      // 获取表列表
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `)
      
      await client.end()

      return {
        success: true,
        message: 'PostgreSQL 连接成功',
        tables: result.rows.map(r => r.table_name),
      }
    } catch (error) {
      await client.end().catch(() => {})
      throw new Error(`PostgreSQL 连接失败: ${error.message}`)
    }
  }

  /**
   * 测试 SQL Server 连接
   * 注意: 需要安装 mssql 包
   */
  async testSQLServer(config) {
    throw new Error('SQL Server 连接需要安装 mssql 包，暂未实现')
  }

  /**
   * 获取数据库元数据
   */
  async getMetadata(config) {
    const { type, host, port, database, username, password, filePath } = config

    switch (type) {
      case 'SQLite':
        return this.getSQLiteMetadata(filePath || database)
      
      case 'MySQL':
        return this.getMySQLMetadata({ host, port, database, username, password })
      
      case 'PostgreSQL':
        return this.getPostgreSQLMetadata({ host, port, database, username, password })
      
      default:
        throw new Error(`不支持的数据库类型: ${type}`)
    }
  }

  /**
   * 获取 SQLite 元数据
   */
  getSQLiteMetadata(filePath) {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        throw new Error(`数据库文件不存在: ${filePath}`)
      }

      const db = new DatabaseSync(filePath, { readOnly: true })

      // 获取所有表
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()
      const tableNames = tables.map(t => t.name)
      
      const metadata = { tables: [], totalTables: tableNames.length }

      // 获取每个表的结构
      for (const tableName of tableNames) {
        const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all()
        
        metadata.tables.push({
          name: tableName,
          columns: columns.map(col => ({
            name: col.name,
            type: col.type,
            nullable: col.notnull === 0,
            primaryKey: col.pk === 1,
          })),
        })
      }

      db.close()
      return metadata
    } catch (error) {
      throw new Error(`获取 SQLite 元数据失败: ${error.message}`)
    }
  }

  /**
   * 获取 MySQL 元数据
   */
  async getMySQLMetadata(config) {
    const connection = await mysql.createConnection({
      host: config.host,
      port: parseInt(config.port) || 3306,
      user: config.username,
      password: config.password,
      database: config.database,
    })

    try {
      // 获取所有表
      const [tables] = await connection.query('SHOW TABLES')
      const tableNames = tables.map(t => Object.values(t)[0])
      
      const metadata = { tables: [], totalTables: tableNames.length }

      // 获取每个表的结构
      for (const tableName of tableNames) {
        const [columns] = await connection.query(`
          SELECT 
            COLUMN_NAME as name,
            DATA_TYPE as type,
            IS_NULLABLE as nullable,
            COLUMN_KEY as key
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        `, [config.database, tableName])

        metadata.tables.push({
          name: tableName,
          columns: columns.map(col => ({
            name: col.name,
            type: col.type,
            nullable: col.nullable === 'YES',
            primaryKey: col.key === 'PRI',
          })),
        })
      }

      return metadata
    } finally {
      await connection.end()
    }
  }

  /**
   * 获取 PostgreSQL 元数据
   */
  async getPostgreSQLMetadata(config) {
    const client = new pg.Client({
      host: config.host,
      port: parseInt(config.port) || 5432,
      database: config.database,
      user: config.username,
      password: config.password,
    })

    try {
      await client.connect()

      // 获取所有表
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `)
      
      const tableNames = tablesResult.rows.map(r => r.table_name)
      const metadata = { tables: [], totalTables: tableNames.length }

      // 获取每个表的结构
      for (const tableName of tableNames) {
        const columnsResult = await client.query(`
          SELECT 
            column_name as name,
            data_type as type,
            is_nullable as nullable,
            column_key as key
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
        `, [tableName])

        metadata.tables.push({
          name: tableName,
          columns: columnsResult.rows.map(col => ({
            name: col.name,
            type: col.type,
            nullable: col.nullable === 'YES',
            primaryKey: false, // PostgreSQL 需要通过其他方式获取主键信息
          })),
        })
      }

      return metadata
    } finally {
      await client.end()
    }
  }
}

export default new DatabaseConnectionManager()
