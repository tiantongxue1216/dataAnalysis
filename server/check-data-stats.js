import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', 'smart_analyst.db')
const db = new DatabaseSync(dbPath, { readOnly: true })

console.log('=== 数据库数据统计 ===\n')

// 1. orders 表统计
console.log('📊 orders 表（订单表）')
const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get()
console.log(`   总订单数: ${orderCount.count}`)

const regions = db.prepare('SELECT DISTINCT region FROM orders').all()
console.log(`   地区分布: ${regions.map(r => r.region).join(', ')}`)

const statuses = db.prepare('SELECT DISTINCT status FROM orders').all()
console.log(`   订单状态: ${statuses.map(s => s.status).join(', ')}`)

const dateRange = db.prepare('SELECT MIN(created_at) as min_date, MAX(created_at) as max_date FROM orders').get()
console.log(`   时间范围: ${dateRange.min_date} ~ ${dateRange.max_date}`)

const totalSales = db.prepare('SELECT SUM(total_amount) as total FROM orders').get()
console.log(`   销售总额: ¥${totalSales.total?.toFixed(2) || 0}`)
console.log()

// 2. order_items 表统计
console.log('📦 order_items 表（订单明细）')
const itemCount = db.prepare('SELECT COUNT(*) as count FROM order_items').get()
console.log(`   总记录数: ${itemCount.count}`)

const categories = db.prepare('SELECT DISTINCT product_category FROM order_items').all()
console.log(`   产品类别: ${categories.map(c => c.product_category).join(', ')}`)

const products = db.prepare('SELECT DISTINCT product_name FROM order_items LIMIT 10').all()
console.log(`   产品名称（前10个）: ${products.map(p => p.product_name).join(', ')}`)
console.log()

// 3. users 表统计
console.log('👥 users 表（用户表）')
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()
console.log(`   总用户数: ${userCount.count}`)
console.log()

// 4. product_categories 表统计
console.log('🏷️  product_categories 表（产品分类）')
const catCount = db.prepare('SELECT COUNT(*) as count FROM product_categories').get()
console.log(`   分类数量: ${catCount.count}`)
const cats = db.prepare('SELECT name FROM product_categories').all()
console.log(`   分类列表: ${cats.map(c => c.name).join(', ')}`)
console.log()

// 5. 示例查询建议
console.log('💡 可以查询的示例:')
console.log('   1. "各地区的销售额排名"')
console.log('   2. "上个月华东区销售额趋势"')
console.log('   3. "销量最高的前5个产品"')
console.log('   4. "不同订单状态的订单数量"')
console.log('   5. "电子产品的平均单价"')
console.log('   6. "用户注册数量统计"')
console.log('   7. "各个产品类别的销售情况"')
console.log()

db.close()
console.log('=== 完成 ===')
