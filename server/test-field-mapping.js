/**
 * 测试字段映射修复
 */

import { DATABASE_SCHEMA, findMetricColumn, findDimensionTable } from './db-schema.js'

console.log('=== 测试数据库 Schema 配置 ===\n')

// 测试1: 查看所有表
console.log('1. 所有表:')
console.log(Object.keys(DATABASE_SCHEMA).join(', '))
console.log()

// 测试2: 查看 orders 表结构
console.log('2. orders 表结构:')
const ordersSchema = DATABASE_SCHEMA.orders
console.log('  时间字段:', ordersSchema.timeColumn)
console.log('  金额字段:', ordersSchema.metrics['销售额']?.column)
console.log('  维度字段:', ordersSchema.dimensions.join(', '))
console.log()

// 测试3: 查找指标对应的列
console.log('3. 指标映射测试:')
const testMetrics = ['销售额', '销量', '订单数', '用户数', '价格', '数量']
testMetrics.forEach(metric => {
  const result = findMetricColumn(metric)
  if (result) {
    console.log(`  ${metric} → ${result.tableName}.${result.column} (${result.aggregation})`)
  } else {
    console.log(`  ${metric} → 未找到`)
  }
})
console.log()

// 测试4: 查找维度对应的表
console.log('4. 维度映射测试:')
const testDimensions = ['region', 'product_category', 'status', 'product_name']
testDimensions.forEach(dim => {
  const table = findDimensionTable(dim)
  console.log(`  ${dim} → ${table || '未找到'}`)
})
console.log()

// 测试5: 检查是否有错误的字段名
console.log('5. 错误字段名检查:')
const wrongFields = ['date', 'sales_amount', 'order_id', 'price', 'amount', 'sales_volume']
wrongFields.forEach(field => {
  let found = false
  for (const [tableName, schema] of Object.entries(DATABASE_SCHEMA)) {
    if (schema.columns[field]) {
      console.log(`  ⚠️  警告: ${field} 存在于 ${tableName} 表中`)
      found = true
    }
  }
  if (!found) {
    console.log(`  ✅ ${field} - 不存在于任何表中（正确）`)
  }
})
console.log()

// 测试6: 正确的字段名
console.log('6. 正确字段名验证:')
const correctFields = {
  'created_at': ['orders', 'order_items', 'users', 'product_categories'],
  'total_amount': ['orders'],
  'unit_price': ['order_items'],
  'region': ['orders'],
}

for (const [field, expectedTables] of Object.entries(correctFields)) {
  const actualTables = []
  for (const [tableName, schema] of Object.entries(DATABASE_SCHEMA)) {
    if (schema.columns[field]) {
      actualTables.push(tableName)
    }
  }
  const match = JSON.stringify(actualTables.sort()) === JSON.stringify(expectedTables.sort())
  console.log(`  ${match ? '✅' : '❌'} ${field}: ${actualTables.join(', ') || '未找到'}`)
}

console.log('\n=== 测试完成 ===')
