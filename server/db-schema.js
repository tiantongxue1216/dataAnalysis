/**
 * 数据库 Schema 配置
 * 定义所有表的字段映射关系
 */

export const DATABASE_SCHEMA = {
  // orders 表（订单表）
  orders: {
    name: 'orders',
    description: '订单主表',
    columns: {
      id: { type: 'INTEGER', description: '订单ID', primaryKey: true },
      order_number: { type: 'TEXT', description: '订单号' },
      user_id: { type: 'INTEGER', description: '用户ID' },
      total_amount: { type: 'REAL', description: '订单总金额' },
      status: { type: 'TEXT', description: '订单状态' },
      region: { type: 'TEXT', description: '地区' },
      created_at: { type: 'TIMESTAMP', description: '创建时间' },
      updated_at: { type: 'TIMESTAMP', description: '更新时间' },
    },
    // 业务指标映射
    metrics: {
      '销售额': { column: 'total_amount', aggregation: 'SUM' },
      '销量': { column: 'total_amount', aggregation: 'SUM' },
      '金额': { column: 'total_amount', aggregation: 'SUM' },
      '订单数': { column: 'id', aggregation: 'COUNT' },
      '订单数量': { column: 'id', aggregation: 'COUNT' },
    },
    // 维度字段
    dimensions: ['region', 'status'],
    // 时间字段
    timeColumn: 'created_at',
  },

  // order_items 表（订单明细表）
  order_items: {
    name: 'order_items',
    description: '订单明细表',
    columns: {
      id: { type: 'INTEGER', description: '明细ID', primaryKey: true },
      order_id: { type: 'INTEGER', description: '订单ID' },
      product_name: { type: 'TEXT', description: '产品名称' },
      product_category: { type: 'TEXT', description: '产品类别' },
      quantity: { type: 'INTEGER', description: '数量' },
      unit_price: { type: 'REAL', description: '单价' },
      subtotal: { type: 'REAL', description: '小计' },
      created_at: { type: 'TIMESTAMP', description: '创建时间' },
    },
    metrics: {
      '数量': { column: 'quantity', aggregation: 'SUM' },
      '单价': { column: 'unit_price', aggregation: 'AVG' },
      '价格': { column: 'unit_price', aggregation: 'AVG' },
      '小计': { column: 'subtotal', aggregation: 'SUM' },
    },
    dimensions: ['product_name', 'product_category'],
    timeColumn: 'created_at',
  },

  // users 表（用户表）
  users: {
    name: 'users',
    description: '用户表',
    columns: {
      id: { type: 'INTEGER', description: '用户ID', primaryKey: true },
      username: { type: 'TEXT', description: '用户名' },
      email: { type: 'TEXT', description: '邮箱' },
      created_at: { type: 'TIMESTAMP', description: '注册时间' },
      updated_at: { type: 'TIMESTAMP', description: '更新时间' },
    },
    metrics: {
      '用户数': { column: 'id', aggregation: 'COUNT' },
      '客户数': { column: 'id', aggregation: 'COUNT' },
    },
    dimensions: [],
    timeColumn: 'created_at',
  },

  // product_categories 表（产品分类表）
  product_categories: {
    name: 'product_categories',
    description: '产品分类表',
    columns: {
      id: { type: 'INTEGER', description: '分类ID', primaryKey: true },
      name: { type: 'TEXT', description: '分类名称' },
      description: { type: 'TEXT', description: '分类描述' },
      created_at: { type: 'TIMESTAMP', description: '创建时间' },
    },
    metrics: {},
    dimensions: ['name'],
    timeColumn: 'created_at',
  },
}

/**
 * 获取表的字段信息
 */
export function getTableSchema(tableName) {
  return DATABASE_SCHEMA[tableName] || null
}

/**
 * 获取所有表名
 */
export function getAllTableNames() {
  return Object.keys(DATABASE_SCHEMA)
}

/**
 * 根据指标名称查找对应的表和字段
 */
export function findMetricColumn(metricName) {
  for (const [tableName, schema] of Object.entries(DATABASE_SCHEMA)) {
    if (schema.metrics && schema.metrics[metricName]) {
      return {
        tableName,
        ...schema.metrics[metricName],
      }
    }
  }
  return null
}

/**
 * 根据维度名称查找对应的表
 */
export function findDimensionTable(dimensionName) {
  for (const [tableName, schema] of Object.entries(DATABASE_SCHEMA)) {
    if (schema.dimensions && schema.dimensions.includes(dimensionName)) {
      return tableName
    }
  }
  return null
}

/**
 * 生成表的 Schema 描述文本（用于 LLM 提示词）
 */
export function generateSchemaDescription() {
  let description = '**数据库表结构**:\n\n'

  for (const [tableName, schema] of Object.entries(DATABASE_SCHEMA)) {
    description += `### ${tableName} (${schema.description})\n`
    description += '字段:\n'
    
    for (const [colName, colInfo] of Object.entries(schema.columns)) {
      const pk = colInfo.primaryKey ? ' (主键)' : ''
      description += `  - ${colName}: ${colInfo.type}${pk} - ${colInfo.description}\n`
    }

    if (Object.keys(schema.metrics).length > 0) {
      description += '\n常用指标:\n'
      for (const [metricName, metricInfo] of Object.entries(schema.metrics)) {
        description += `  - ${metricName}: ${metricInfo.aggregation}(${metricInfo.column})\n`
      }
    }

    if (schema.dimensions.length > 0) {
      description += `\n可用维度: ${schema.dimensions.join(', ')}\n`
    }

    description += `\n时间字段: ${schema.timeColumn}\n\n`
  }

  return description
}
