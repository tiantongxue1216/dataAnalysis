import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('../smart_analyst.db', { readOnly: true })

console.log('=== 测试时间查询 ===\n')

// 1. 直接执行用户提供的 SQL
console.log('1. 执行 SQL: SELECT SUM(total_amount) FROM orders WHERE created_at >= \'上个月\'')
try {
  const result = db.prepare("SELECT SUM(total_amount) as sum_total_amount FROM orders WHERE created_at >= '上个月'").all()
  console.log('   结果:', result)
} catch (error) {
  console.log('   错误:', error.message)
}

console.log()

// 2. 查看所有订单的时间范围
console.log('2. 所有订单的时间范围:')
const timeRange = db.prepare('SELECT MIN(created_at) as min_date, MAX(created_at) as max_date, COUNT(*) as count FROM orders').get()
console.log('   最早时间:', timeRange.min_date)
console.log('   最晚时间:', timeRange.max_date)
console.log('   订单总数:', timeRange.count)

console.log()

// 3. 查看"上个月"会被转换成什么
console.log('3. 时间映射测试:')
console.log('   "上个月" 应该转换为: 2026-03 (假设当前是 2026-04)')
console.log('   但数据库中所有数据都是: 2026-04-12')
console.log('   所以 WHERE created_at >= \'上个月\' 会匹配到所有数据')

console.log()

// 4. 实际测试不同的时间条件
console.log('4. 不同时间条件的结果:')

const tests = [
  "SELECT COUNT(*) as count FROM orders WHERE created_at >= '2026-03-01'",
  "SELECT COUNT(*) as count FROM orders WHERE created_at >= '2026-04-01'",
  "SELECT COUNT(*) as count FROM orders WHERE created_at >= '2026-04-12'",
  "SELECT COUNT(*) as count FROM orders",
]

tests.forEach((sql, idx) => {
  const result = db.prepare(sql).get()
  console.log(`   ${idx + 1}. ${sql.split('WHERE')[1] || '无条件'}: ${result.count} 条`)
})

console.log()

// 5. 销售额统计
console.log('5. 销售额统计:')
const salesResult = db.prepare('SELECT SUM(total_amount) as total, AVG(total_amount) as avg, COUNT(*) as count FROM orders').get()
console.log('   销售总额:', salesResult.total)
console.log('   平均订单:', salesResult.avg?.toFixed(2))
console.log('   订单数量:', salesResult.count)

db.close()
console.log('\n=== 完成 ===')
