# 数据库配置指南

## 📊 示例数据库已创建

我们已经为您创建了一个完整的 SQLite 示例数据库，包含以下数据：

### 数据库信息
- **文件位置**: `server/smart_analyst.db`
- **数据库类型**: SQLite
- **文件大小**: ~24 KB
- **表数量**: 4 张表

### 数据表结构

#### 1. departments (部门表) - 5 条记录
| 字段 | 类型 | 说明 |
|------|------|------|
| dept_id | INTEGER | 部门ID（主键） |
| dept_name | TEXT | 部门名称 |
| location | TEXT | 所在地 |
| manager | TEXT | 经理姓名 |
| created_at | DATETIME | 创建时间 |

**示例数据**:
- 技术部（北京，张三）
- 销售部（上海，李四）
- 财务部（北京，王五）
- 人力资源部（广州，赵六）
- 市场部（深圳，孙七）

#### 2. employees (员工表) - 15 条记录
| 字段 | 类型 | 说明 |
|------|------|------|
| emp_id | INTEGER | 员工ID（主键） |
| emp_name | TEXT | 员工姓名 |
| gender | TEXT | 性别（男/女） |
| age | INTEGER | 年龄 |
| dept_id | INTEGER | 部门ID（外键） |
| position | TEXT | 职位 |
| salary | REAL | 工资 |
| hire_date | DATE | 入职日期 |
| email | TEXT | 邮箱 |
| phone | TEXT | 电话 |

**示例数据**: 包含不同部门、职位、薪资水平的15名员工

#### 3. products (产品表) - 10 条记录
| 字段 | 类型 | 说明 |
|------|------|------|
| product_id | INTEGER | 产品ID（主键） |
| product_name | TEXT | 产品名称 |
| category | TEXT | 类别 |
| price | REAL | 价格 |
| stock_quantity | INTEGER | 库存数量 |
| supplier | TEXT | 供应商 |
| created_at | DATETIME | 创建时间 |

**示例数据**: 电子产品、办公设备、办公家具、办公用品等10种产品

#### 4. sales (销售记录表) - 15 条记录
| 字段 | 类型 | 说明 |
|------|------|------|
| sale_id | INTEGER | 销售ID（主键） |
| product_id | INTEGER | 产品ID（外键） |
| customer_name | TEXT | 客户名称 |
| quantity | INTEGER | 数量 |
| amount | REAL | 金额 |
| sale_date | DATE | 销售日期 |
| region | TEXT | 地区 |
| salesperson | TEXT | 销售人员 |

**示例数据**: 涵盖华北、华东、华南地区的15条销售记录

## 🔧 当前配置

### .env 配置
```env
# 数据库配置（SQLite 示例数据库）
DB_TYPE=SQLite
DB_PATH=./smart_analyst.db
```

### 数据源配置
已在 `datasources.json` 中配置：
```json
{
  "id": "e7e67aa4-9403-4096-9b65-fdd1eb77a662",
  "name": "本地测试数据库",
  "type": "SQLite",
  "filePath": "D:\\qoderWS\\dataAnalysis\\smart_analyst.db"
}
```

## 🚀 快速开始

### 1. 验证数据库
```bash
cd server
node create-sample-db.js
```

输出应显示：
```
✅ 数据库创建完成！
📂 数据库文件位置: D:\qoderWS\dataAnalysis\server\smart_analyst.db
📊 文件大小: 24.00 KB
```

### 2. 测试 Agent 查询
```bash
node test-agent-with-db.js
```

这将执行 5 个测试场景：
1. ✅ 简单查询 - 员工姓名和部门
2. ✅ 聚合查询 - 部门统计
3. ✅ 数值计算 - 平均工资
4. ✅ 排序查询 - 最高工资
5. ✅ 关联查询 - 产品销售

### 3. 通过前端界面测试

启动服务：
```bash
# 后端
npm run dev

# 前端（新终端）
cd ..
npm run dev
```

访问 http://localhost:5175，开启 "Agent 模式"，尝试以下问题：

**基础查询**:
- "查询所有员工的姓名和部门"
- "列出技术部的所有员工"
- "查看工资高于15000的员工"

**统计分析**:
- "统计每个部门的员工数量"
- "查询公司的平均工资"
- "找出年龄最大的员工"

**复杂查询**:
- "查询销售额最高的产品"
- "统计各地区的销售总额"
- "查看每个部门的平均工资"

## 💡 可用的测试问题

### 员工相关
```sql
-- 查询所有员工
SELECT * FROM employees

-- 按部门分组统计
SELECT d.dept_name, COUNT(*) as emp_count 
FROM employees e 
JOIN departments d ON e.dept_id = d.dept_id 
GROUP BY d.dept_name

-- 平均工资
SELECT AVG(salary) as avg_salary FROM employees

-- 最高工资的3名员工
SELECT emp_name, position, salary 
FROM employees 
ORDER BY salary DESC 
LIMIT 3
```

### 销售相关
```sql
-- 销售额最高的产品
SELECT p.product_name, SUM(s.amount) as total_sales
FROM sales s
JOIN products p ON s.product_id = p.product_id
GROUP BY p.product_name
ORDER BY total_sales DESC

-- 各地区销售统计
SELECT region, COUNT(*) as sale_count, SUM(amount) as total_amount
FROM sales
GROUP BY region

-- 月度销售趋势
SELECT strftime('%Y-%m', sale_date) as month, SUM(amount) as monthly_sales
FROM sales
GROUP BY month
ORDER BY month
```

## 🔌 配置其他数据库

### MySQL 配置

1. 安装 MySQL 驱动（已安装）
2. 更新 `.env`:
```env
DB_TYPE=MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=analytics
```

3. 或在 `datasources.json` 中添加：
```json
{
  "id": "mysql-001",
  "name": "MySQL 测试库",
  "type": "MySQL",
  "host": "localhost",
  "port": 3306,
  "database": "analytics",
  "username": "root",
  "password": "your_password"
}
```

### PostgreSQL 配置

1. PostgreSQL 驱动已安装
2. 更新 `.env`:
```env
DB_TYPE=PostgreSQL
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_password
PG_DATABASE=analytics
```

3. 或在 `datasources.json` 中添加：
```json
{
  "id": "pg-001",
  "name": "PostgreSQL 测试库",
  "type": "PostgreSQL",
  "host": "localhost",
  "port": 5432,
  "database": "analytics",
  "username": "postgres",
  "password": "your_password"
}
```

## 📝 创建自定义数据库

如果需要创建自己的测试数据库：

### 方法 1: 修改现有脚本
编辑 `create-sample-db.js`，修改表结构和数据。

### 方法 2: 使用 SQL 文件
创建 `init.sql` 文件：
```sql
CREATE TABLE my_table (
  id INTEGER PRIMARY KEY,
  name TEXT,
  value REAL
);

INSERT INTO my_table VALUES (1, 'test', 100.5);
```

然后运行：
```javascript
import { DatabaseSync } from 'node:sqlite'
import fs from 'fs'

const db = new DatabaseSync('./mydb.db')
const sql = fs.readFileSync('init.sql', 'utf-8')
db.exec(sql)
db.close()
```

### 方法 3: 使用数据库管理工具
- **SQLite**: DB Browser for SQLite, SQLiteStudio
- **MySQL**: MySQL Workbench, phpMyAdmin
- **PostgreSQL**: pgAdmin, DBeaver

## 🐛 故障排查

### 问题 1: 数据库文件不存在
```
❌ 数据库文件不存在
```

**解决方案**:
```bash
node create-sample-db.js
```

### 问题 2: 无法连接数据库
```
❌ 数据库连接失败
```

**检查**:
1. 数据库文件路径是否正确
2. 文件权限是否可读
3. 数据库文件是否损坏

**解决方案**:
```bash
# 重新创建数据库
rm smart_analyst.db
node create-sample-db.js
```

### 问题 3: 查询返回空结果
```
⚠️  未生成答案
```

**可能原因**:
1. Agent 未能正确识别表名
2. SQL 生成有误
3. 数据库中没有匹配的数据

**调试步骤**:
1. 查看思考过程，确认表名识别
2. 检查生成的 SQL 语句
3. 手动执行 SQL 验证数据

### 问题 4: API 调用失败
```
❌ Agent 执行失败: AuthenticationError
```

**解决方案**:
1. 检查 `.env` 中的 API Key
2. 确认网络连接正常
3. 验证阿里云百炼账户余额

## 📊 数据库性能优化

对于大型数据库：

### 1. 添加索引
```sql
CREATE INDEX idx_emp_dept ON employees(dept_id);
CREATE INDEX idx_sale_product ON sales(product_id);
CREATE INDEX idx_sale_date ON sales(sale_date);
```

### 2. 限制查询结果
```sql
-- 添加 LIMIT
SELECT * FROM employees LIMIT 100

-- 分页查询
SELECT * FROM employees LIMIT 50 OFFSET 0
```

### 3. 优化复杂查询
```sql
-- 使用子查询
SELECT * FROM (
  SELECT dept_id, AVG(salary) as avg_sal
  FROM employees
  GROUP BY dept_id
) WHERE avg_sal > 15000
```

## 🎯 最佳实践

### 1. 数据备份
定期备份数据库文件：
```bash
cp smart_analyst.db smart_analyst.backup.db
```

### 2. 版本控制
将数据库 schema 保存在 Git 中：
```bash
git add schema.sql
git commit -m "Update database schema"
```

### 3. 测试数据隔离
为不同环境使用不同的数据库：
- 开发: `dev.db`
- 测试: `test.db`
- 生产: `production.db`

### 4. 监控查询性能
记录慢查询：
```javascript
const startTime = Date.now()
const result = db.prepare(sql).all()
const duration = Date.now() - startTime
if (duration > 1000) {
  console.warn('慢查询:', sql, '耗时:', duration, 'ms')
}
```

## 📚 相关资源

- [SQLite 官方文档](https://www.sqlite.org/docs.html)
- [Node.js SQLite 模块](https://nodejs.org/api/sqlite.html)
- [SQL 教程](https://www.w3schools.com/sql/)
- [Agent 错误处理](./agent/ERROR-HANDLING.md)
- [Agent 状态图](./agent/STATE-DIAGRAM.md)

## 🔄 下一步

1. ✅ 示例数据库已创建
2. ✅ 数据库配置已完成
3. 🔄 运行测试验证功能
4. 📝 根据实际需求调整数据结构
5. 🚀 部署到生产环境

---

**创建时间**: 2026-04-21  
**数据库版本**: SQLite 3.x  
**状态**: ✅ 已就绪
