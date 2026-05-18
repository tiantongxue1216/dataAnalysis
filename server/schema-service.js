/**
 * Schema 服务
 * 提供获取表结构的能力
 */

import { DATABASE_SCHEMA } from './db-schema.js'

/**
 * 获取所有表的概要信息
 * @returns {Array<object>} 所有表的概要列表
 */
export function getAllTables() {
  return Object.values(DATABASE_SCHEMA).map(schema => ({
    name: schema.name,
    description: schema.description,
    columnCount: Object.keys(schema.columns).length,
    dimensions: schema.dimensions || [],
    metrics: Object.keys(schema.metrics || {}),
    timeColumn: schema.timeColumn || null
  }))
}

/**
 * 获取指定表的详细结构信息
 * @param {string} tableName - 表名
 * @returns {Promise<object>} 表结构详细信息
 */
export async function getTableSchema(tableName) {
  const schema = DATABASE_SCHEMA[tableName]
  
  if (!schema) {
    return {
      success: false,
      error: `表 ${tableName} 不存在`,
      availableTables: Object.keys(DATABASE_SCHEMA)
    }
  }

  return {
    success: true,
    data: {
      name: schema.name,
      description: schema.description,
      columns: Object.entries(schema.columns).map(([name, info]) => ({
        name,
        type: info.type,
        description: info.description,
        primaryKey: info.primaryKey || false,
        nullable: info.nullable !== false
      })),
      dimensions: schema.dimensions || [],
      metrics: Object.entries(schema.metrics || {}).map(([name, info]) => ({
        name,
        column: info.column,
        aggregation: info.aggregation,
        description: schema.columns[info.column]?.description || name
      })),
      timeColumn: schema.timeColumn || null,
      timeFields: schema.timeColumn ? [{
        name: schema.timeColumn,
        description: schema.columns[schema.timeColumn]?.description || schema.timeColumn
      }] : [],
      relationships: schema.relationships || []
    }
  }
}

/**
 * 获取表的字段列表
 * @param {string} tableName - 表名
 * @returns {Promise<Array<object>>} 字段列表
 */
export async function getTableColumns(tableName) {
  const schema = DATABASE_SCHEMA[tableName]
  
  if (!schema) {
    return []
  }

  return Object.entries(schema.columns).map(([name, info]) => ({
    name,
    type: info.type,
    description: info.description,
    primaryKey: info.primaryKey || false
  }))
}

/**
 * 获取表的维度列表
 * @param {string} tableName - 表名
 * @returns {Promise<Array<string>>} 维度字段列表
 */
export async function getTableDimensions(tableName) {
  const schema = DATABASE_SCHEMA[tableName]
  return schema?.dimensions || []
}

/**
 * 获取表的度量列表
 * @param {string} tableName - 表名
 * @returns {Promise<Array<object>>} 度量列表
 */
export async function getTableMetrics(tableName) {
  const schema = DATABASE_SCHEMA[tableName]
  
  if (!schema || !schema.metrics) {
    return []
  }

  return Object.entries(schema.metrics).map(([name, info]) => ({
    name,
    column: info.column,
    aggregation: info.aggregation,
    description: schema.columns[info.column]?.description || name
  }))
}
