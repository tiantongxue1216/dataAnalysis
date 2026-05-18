import { recognizeIntent } from './intent-service.js'

console.log('=== 测试"订单总数"查询 ===\n')

const result = await recognizeIntent('订单总数')

console.log('需要澄清:', result.need_clarification)
console.log('缺失槽位:', result.missing_slots)
console.log('意图类型:', result.intent?.intent_type)
console.log('表名:', result.intent?.table_name)
console.log('查询字段:', result.intent?.select_columns)
console.log('聚合函数:', result.intent?.aggregation)

if (!result.need_clarification && result.intent) {
  console.log('\n✅ 不需要澄清，可以直接生成 SQL')
  
  // 尝试生成 SQL
  import('./sql-generator.js').then(async ({ generateSQL }) => {
    const sqlResult = await generateSQL(result.intent)
    console.log('\n生成的 SQL:', sqlResult.sql)
  })
} else {
  console.log('\n❌ 需要澄清')
  console.log('消息:', result.message)
}
