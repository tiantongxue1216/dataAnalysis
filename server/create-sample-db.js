/**
 * 创建示例 SQLite 数据库
 * 用于测试 Agent 的完整数据查询流程
 */

import { DatabaseSync } from 'node:sqlite'
import fs from 'fs'
import path from 'path'

const dbPath = path.join(process.cwd(), 'smart_analyst.db')

console.log('📊 开始创建示例数据库...')
console.log('数据库路径:', dbPath)

// 如果数据库已存在，先删除
if (fs.existsSync(dbPath)) {
  console.log('⚠️  检测到已存在的数据库，正在删除...')
  fs.unlinkSync(dbPath)
}

// 创建新数据库
const db = new DatabaseSync(dbPath)

console.log('✅ 数据库文件创建成功\n')

// 创建表结构
console.log('📋 创建表结构...')

// 1. 部门表
db.exec(`
  CREATE TABLE departments (
    dept_id INTEGER PRIMARY KEY AUTOINCREMENT,
    dept_name TEXT NOT NULL,
    location TEXT,
    manager TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)
console.log('  ✅ departments (部门表)')

// 2. 员工表
db.exec(`
  CREATE TABLE employees (
    emp_id INTEGER PRIMARY KEY AUTOINCREMENT,
    emp_name TEXT NOT NULL,
    gender TEXT CHECK(gender IN ('男', '女')),
    age INTEGER,
    dept_id INTEGER,
    position TEXT,
    salary REAL,
    hire_date DATE,
    email TEXT,
    phone TEXT,
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
  )
`)
console.log('  ✅ employees (员工表)')

// 3. 产品表
db.exec(`
  CREATE TABLE products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    category TEXT,
    price REAL,
    stock_quantity INTEGER,
    supplier TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)
console.log('  ✅ products (产品表)')

// 4. 销售记录表
db.exec(`
  CREATE TABLE sales (
    sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    customer_name TEXT,
    quantity INTEGER,
    amount REAL,
    sale_date DATE,
    region TEXT,
    salesperson TEXT,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
  )
`)
console.log('  ✅ sales (销售记录表)')

console.log('\n💾 插入测试数据...\n')

// 插入部门数据
console.log('插入部门数据...')
const insertDept = db.prepare('INSERT INTO departments (dept_name, location, manager) VALUES (?, ?, ?)')
insertDept.run('技术部', '北京', '张三')
insertDept.run('销售部', '上海', '李四')
insertDept.run('财务部', '北京', '王五')
insertDept.run('人力资源部', '广州', '赵六')
insertDept.run('市场部', '深圳', '孙七')
console.log('  ✅ 5 个部门')

// 插入员工数据
console.log('插入员工数据...')
const insertEmp = db.prepare(`
  INSERT INTO employees (emp_name, gender, age, dept_id, position, salary, hire_date, email, phone)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const employees = [
  ['张三', '男', 35, 1, '技术总监', 25000, '2018-03-15', 'zhangsan@company.com', '13800138001'],
  ['李四', '男', 32, 2, '销售经理', 20000, '2019-06-20', 'lisi@company.com', '13800138002'],
  ['王五', '女', 28, 3, '财务主管', 18000, '2020-01-10', 'wangwu@company.com', '13800138003'],
  ['赵六', '女', 30, 4, 'HR经理', 19000, '2019-09-05', 'zhaoliu@company.com', '13800138004'],
  ['孙七', '男', 29, 5, '市场主管', 17000, '2020-05-12', 'sunqi@company.com', '13800138005'],
  ['周八', '男', 26, 1, '软件工程师', 15000, '2021-07-01', 'zhouba@company.com', '13800138006'],
  ['吴九', '女', 25, 1, '软件工程师', 14000, '2021-09-15', 'wujiu@company.com', '13800138007'],
  ['郑十', '男', 27, 2, '销售代表', 12000, '2021-03-20', 'zhengshi@company.com', '13800138008'],
  ['钱十一', '女', 24, 2, '销售代表', 11000, '2022-01-10', 'qianshiyi@company.com', '13800138009'],
  ['陈十二', '男', 31, 3, '会计师', 16000, '2020-06-15', 'chenshier@company.com', '13800138010'],
  ['刘十三', '女', 26, 4, 'HR专员', 13000, '2021-11-20', 'liushisan@company.com', '13800138011'],
  ['杨十四', '男', 28, 5, '市场专员', 12500, '2021-04-18', 'yangshisi@company.com', '13800138012'],
  ['黄十五', '女', 23, 1, '实习生', 8000, '2023-07-01', 'huangshiwu@company.com', '13800138013'],
  ['林十六', '男', 29, 2, '销售主管', 16000, '2020-08-25', 'linshiliu@company.com', '13800138014'],
  ['何十七', '女', 27, 3, '出纳', 13500, '2021-02-14', 'heshiqi@company.com', '13800138015'],
]

employees.forEach(emp => {
  insertEmp.run(...emp)
})
console.log(`  ✅ ${employees.length} 名员工`)

// 插入产品数据
console.log('插入产品数据...')
const insertProduct = db.prepare(`
  INSERT INTO products (product_name, category, price, stock_quantity, supplier)
  VALUES (?, ?, ?, ?, ?)
`)

const products = [
  ['笔记本电脑', '电子产品', 5999, 150, '联想集团'],
  ['台式电脑', '电子产品', 4599, 200, '戴尔公司'],
  ['打印机', '办公设备', 1299, 80, '惠普公司'],
  ['投影仪', '办公设备', 3299, 50, '爱普生'],
  ['办公桌椅套装', '办公家具', 1899, 300, '宜家家居'],
  ['文件柜', '办公家具', 899, 250, '宜家家居'],
  ['A4打印纸', '办公用品', 25, 1000, '晨光文具'],
  ['签字笔套装', '办公用品', 15, 2000, '得力集团'],
  ['白板', '办公用品', 199, 150, '齐心集团'],
  ['计算器', '办公用品', 45, 500, '卡西欧'],
]

products.forEach(prod => {
  insertProduct.run(...prod)
})
console.log(`  ✅ ${products.length} 种产品`)

// 插入销售记录数据
console.log('插入销售记录数据...')
const insertSale = db.prepare(`
  INSERT INTO sales (product_id, customer_name, quantity, amount, sale_date, region, salesperson)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const sales = [
  [1, '客户A', 2, 11998, '2024-01-15', '华北', '李四'],
  [1, '客户B', 1, 5999, '2024-01-20', '华东', '郑十'],
  [2, '客户C', 3, 13797, '2024-02-05', '华南', '钱十一'],
  [3, '客户D', 1, 1299, '2024-02-10', '华北', '李四'],
  [4, '客户E', 2, 6598, '2024-02-15', '华东', '林十六'],
  [5, '客户F', 5, 9495, '2024-03-01', '华南', '郑十'],
  [6, '客户G', 3, 2697, '2024-03-10', '华北', '钱十一'],
  [7, '客户H', 10, 250, '2024-03-15', '华东', '李四'],
  [8, '客户I', 20, 300, '2024-03-20', '华南', '林十六'],
  [9, '客户J', 2, 398, '2024-04-01', '华北', '郑十'],
  [10, '客户K', 5, 225, '2024-04-05', '华东', '钱十一'],
  [1, '客户L', 1, 5999, '2024-04-10', '华南', '李四'],
  [2, '客户M', 2, 9198, '2024-04-15', '华北', '林十六'],
  [3, '客户N', 1, 1299, '2024-04-20', '华东', '郑十'],
  [5, '客户O', 4, 7596, '2024-05-01', '华南', '钱十一'],
]

sales.forEach(sale => {
  insertSale.run(...sale)
})
console.log(`  ✅ ${sales.length} 条销售记录`)

// 验证数据
console.log('\n🔍 验证数据...\n')

const tables = ['departments', 'employees', 'products', 'sales']
tables.forEach(table => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get()
  console.log(`  ${table}: ${count.count} 条记录`)
})

// 显示示例查询
console.log('\n📝 示例查询:\n')

const sampleQueries = [
  'SELECT * FROM employees LIMIT 3',
  'SELECT dept_name, COUNT(*) as emp_count FROM employees e JOIN departments d ON e.dept_id = d.dept_id GROUP BY dept_name',
  'SELECT AVG(salary) as avg_salary FROM employees',
  'SELECT product_name, SUM(quantity) as total_sold FROM sales s JOIN products p ON s.product_id = p.product_id GROUP BY product_name ORDER BY total_sold DESC LIMIT 5',
]

sampleQueries.forEach((query, i) => {
  console.log(`${i + 1}. ${query}`)
  try {
    const result = db.prepare(query).all()
    console.log(`   结果: ${result.length} 行`)
    if (result.length > 0) {
      console.log(`   示例:`, JSON.stringify(result[0]))
    }
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}`)
  }
  console.log()
})

db.close()

console.log('✅ 数据库创建完成！\n')
console.log('📂 数据库文件位置:', dbPath)
console.log('📊 文件大小:', (fs.statSync(dbPath).size / 1024).toFixed(2), 'KB')
console.log('\n🎯 可以开始测试 Agent 了！')
console.log('\n可用的测试问题:')
console.log('  - 查询所有员工的姓名和部门')
console.log('  - 统计每个部门的员工数量')
console.log('  - 查询平均工资最高的部门')
console.log('  - 查看销售额最高的产品')
console.log('  - 统计各地区的销售情况')
