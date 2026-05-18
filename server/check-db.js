import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', 'smart_analyst.db')
const db = new DatabaseSync(dbPath, { readOnly: true })

console.log('=== 数据库表结构 ===\n')

// 获取所有表
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
console.log('所有表:', tables.map(t => t.name).join(', '))
console.log()

// 遍历每个表，显示列信息
tables.forEach(table => {
  console.log(`\n--- 表: ${table.name} ---`)
  const columns = db.prepare(`PRAGMA table_info(${table.name})`).all()
  
  columns.forEach(col => {
    console.log(`  - ${col.name}: ${col.type}${col.notnull ? ' (NOT NULL)' : ''}${col.pk ? ' (PRIMARY KEY)' : ''}`)
  })
  
  // 显示前3条数据样例
  const sampleData = db.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all()
  if (sampleData.length > 0) {
    console.log('\n  样例数据:')
    sampleData.forEach((row, idx) => {
      console.log(`    [${idx + 1}]`, JSON.stringify(row))
    })
  }
})

db.close()
console.log('\n=== 完成 ===')
