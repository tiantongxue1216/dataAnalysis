# Agent 标准化工具

本目录包含一组标准化的 Agent 工具，封装了数据分析的核心能力，方便后续 Agent 版本调用。

## 📚 工具列表

### 1. intent_recognition - 意图识别工具

识别用户查询的意图，包括表名、查询字段、条件、排序等。

**输入参数：**
```javascript
{
  query: "按地区统计用户数量",  // 用户查询文本（必填）
  metadata: {...}                // 数据库元数据（可选）
}
```

**输出结果：**
```javascript
{
  success: true,
  intent: {
    intent_type: "COUNT",
    table_name: "users",
    select_columns: ["id"],
    conditions: [],
    confidence: 0.85
  },
  message: "意图识别成功"
}
```

**使用示例：**
```javascript
import { intentRecognitionTool } from './tools.js'

const result = await intentRecognitionTool.execute({
  query: '最近 12 个月的订单趋势'
})
```

---

### 2. get_table_schema - 获取表结构工具

获取指定表的详细结构信息，包括字段、维度、度量、时间字段等。

**输入参数：**
```javascript
{
  tableName: "users"  // 表名（必填）
}
```

**输出结果：**
```javascript
{
  success: true,
  data: {
    name: "users",
    description: "用户表",
    columns: [...],
    dimensions: ["region", "city"],
    metrics: [...],
    timeColumn: "created_at"
  }
}
```

**使用示例：**
```javascript
import { getTableSchemaTool } from './tools.js'

const result = await getTableSchemaTool.execute({
  tableName: 'users'
})
```

---

### 3. sql_generation - SQL 生成工具

根据意图识别结果生成 SQL 查询语句。

**输入参数：**
```javascript
{
  intent: {...},           // 意图识别结果（必填）
  datasourceId: "sqlite-1" // 数据源 ID（必填）
}
```

**输出结果：**
```javascript
{
  success: true,
  sql: "SELECT region, COUNT(id) FROM users GROUP BY region ORDER BY COUNT(id) DESC",
  method: "rule-based"
}
```

**使用示例：**
```javascript
import { sqlGenerationTool } from './tools.js'

const result = await sqlGenerationTool.execute({
  intent: recognizedIntent,
  datasourceId: 'sqlite-local-1'
})
```

---

### 4. query_execution - 查询执行工具

执行 SQL 查询并推荐合适的图表类型。

**输入参数：**
```javascript
{
  sql: "SELECT ...",        // SQL 语句（必填）
  datasourceId: "sqlite-1", // 数据源 ID（必填）
  intentType: "COUNT"       // 意图类型（可选）
}
```

**输出结果：**
```javascript
{
  success: true,
  data: [...],
  recommendation: {
    chartType: "bar",
    reason: "按类别统计数量，适合使用柱状图",
    canRender: true
  },
  rowCount: 10
}
```

**使用示例：**
```javascript
import { queryExecutionTool } from './tools.js'

const result = await queryExecutionTool.execute({
  sql: 'SELECT region, COUNT(*) FROM users GROUP BY region',
  datasourceId: 'sqlite-local-1',
  intentType: 'COUNT'
})
```

---

### 5. chart_recommendation - 图表推荐工具

根据查询结果数据推荐最合适的图表类型。

**输入参数：**
```javascript
{
  data: [...],          // 查询结果数据（必填）
  intentType: "COUNT"   // 意图类型（可选）
}
```

**输出结果：**
```javascript
{
  chartType: "pie",
  reason: "占比分析，适合使用饼图",
  canRender: true,
  xAxis: "region",
  yAxis: "count"
}
```

**使用示例：**
```javascript
import { chartRecommendationTool } from './tools.js'

const result = await chartRecommendationTool.execute({
  data: queryResults,
  intentType: 'COUNT'
})
```

---

### 6. complete_query - 完整查询流程工具（推荐）

执行完整的查询流程：意图识别 → SQL 生成 → 查询执行 → 图表推荐。

**输入参数：**
```javascript
{
  query: "按地区统计用户数量", // 用户查询（必填）
  datasourceId: "sqlite-1"     // 数据源 ID（必填）
}
```

**输出结果：**
```javascript
{
  success: true,
  query: "按地区统计用户数量",
  intent: {...},
  sql: "SELECT ...",
  data: [...],
  recommendation: {...},
  rowCount: 10,
  steps: [
    { step: 'intent_recognition', success: true, result: {...} },
    { step: 'sql_generation', success: true, result: {...} },
    { step: 'query_execution', success: true, result: {...} }
  ],
  duration: 1234
}
```

**使用示例：**
```javascript
import { completeQueryTool } from './tools.js'

const result = await completeQueryTool.execute({
  query: '最近 12 个月的订单趋势',
  datasourceId: 'sqlite-local-1'
})
```

---

## 🔧 使用方式

### 方式 1: 导入单个工具

```javascript
import { 
  intentRecognitionTool,
  sqlGenerationTool,
  queryExecutionTool 
} from './tools.js'

// 分步调用
const intent = await intentRecognitionTool.execute({ query: '...' })
const sql = await sqlGenerationTool.execute({ intent, datasourceId: '...' })
const result = await queryExecutionTool.execute({ sql, datasourceId: '...' })
```

### 方式 2: 使用完整查询工具（推荐）

```javascript
import { completeQueryTool } from './tools.js'

const result = await completeQueryTool.execute({
  query: '按地区统计用户数量',
  datasourceId: 'sqlite-local-1'
})
```

### 方式 3: 使用工具注册表

```javascript
import { toolRegistry } from './tools.js'

// 查看所有可用工具
console.log(Object.keys(toolRegistry))

// 动态调用工具
const tool = toolRegistry['intent_recognition']
const result = await tool.execute({ query: '...' })
```

### 方式 4: Agent 模式

```javascript
import { 
  intentRecognitionTool,
  getTableSchemaTool,
  sqlGenerationTool,
  queryExecutionTool 
} from './tools.js'

async function agentQuery(userQuery, datasourceId) {
  // 1. 意图识别
  const intentResult = await intentRecognitionTool.execute({ query: userQuery })
  
  if (!intentResult.success) {
    return { action: 'clarify', message: intentResult.message }
  }
  
  const intent = intentResult.intent
  
  // 2. 检查缺失信息
  if (intent.missing_slots?.length > 0) {
    return { 
      action: 'clarify', 
      message: `请提供：${intent.missing_slots.join(', ')}` 
    }
  }
  
  // 3. 获取表结构（可选）
  const schema = await getTableSchemaTool.execute({
    tableName: intent.table_name
  })
  
  // 4. 生成 SQL
  const sqlResult = await sqlGenerationTool.execute({
    intent,
    datasourceId
  })
  
  // 5. 执行查询
  const queryResult = await queryExecutionTool.execute({
    sql: sqlResult.sql,
    datasourceId,
    intentType: intent.intent_type
  })
  
  return {
    action: 'complete',
    data: queryResult.data,
    recommendation: queryResult.recommendation
  }
}
```

---

## 📦 工具架构

```
server/
├── tools.js                  # 工具定义和注册表
├── schema-service.js         # Schema 服务
├── intent-service.js         # 意图识别服务
├── sql-generator.js          # SQL 生成服务
├── query-executor.js         # 查询执行服务
├── chart-recommender.js      # 图表推荐服务
├── agent-tools-example.js    # 使用示例
└── test-tools.js             # 测试脚本
```

---

## 🎯 最佳实践

1. **优先使用 complete_query 工具**：对于大多数场景，一个工具调用即可完成整个查询流程
2. **分步调用**：需要细粒度控制时，可以分步调用各个工具
3. **错误处理**：每个工具都会返回 success 字段，调用方应该检查并处理错误
4. **参数验证**：工具内部会验证必填参数，调用前确保参数完整
5. **Agent 集成**：工具设计符合 Agent 调用规范，支持动态发现和调用

---

## 🧪 测试工具

运行测试脚本验证工具功能：

```bash
cd server
node test-tools.js
```

---

## 📝 扩展新工具

添加新工具的步骤：

1. 在 `tools.js` 中定义工具对象：

```javascript
export const myNewTool = {
  name: 'my_tool',
  description: '工具描述',
  parameters: {
    param1: { type: 'string', required: true, description: '参数说明' }
  },
  async execute({ param1 }) {
    // 实现逻辑
    return { success: true, data: ... }
  }
}
```

2. 将工具添加到 `allTools` 数组中：

```javascript
export const allTools = [
  // ... 现有工具
  myNewTool
]
```

工具会自动注册到 `toolRegistry` 中。

---

## 🔐 环境要求

- Node.js >= 18（支持 ESM）
- 配置 DeepSeek API Key（用于 LLM 功能）

```bash
export DEEPSEEK_API_KEY=your-api-key
```

---

## 📞 支持

如有问题，请查看：
- `agent-tools-example.js` - 详细的使用示例
- `test-tools.js` - 测试脚本
