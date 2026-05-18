# Agent 引擎集成文档

## 概述

已完成基于 LangChain + LangGraph 的 Agent 引擎的完整集成，包括后端 API、前端 UI 和文档。

## 完成的工作

### 1. 后端集成

#### 1.1 安装依赖
```bash
npm install @langchain/core @langchain/langgraph @langchain/openai
```

#### 1.2 Agent 引擎模块 (`server/agent/`)
- **`engine.js`** (393 行): Agent 引擎核心实现
  - DataAnalysisAgent 类
  - LangGraph 状态图构建（Planner → Executor → Reflector 循环）
  - 工具转换逻辑
  - 执行方法和结果提取
  
- **`state.js`** (65 行): Agent 状态定义
  - AgentState 接口
  - 状态初始化方法
  
- **`prompts.js`** (108 行): ReAct 提示词模板
  - getReActPrompt() 函数
  - SYSTEM_PROMPT, PLANNER_PROMPT, REFLECTOR_PROMPT
  
- **`index.js`** (8 行): 模块入口

#### 1.3 API 路由集成 (`server/routes.js`)
新增两个 Agent API 端点：

```javascript
// POST /api/agent/query - Agent 查询接口
app.post('/api/agent/query', async (req, res) => {
  const { question, datasource_id, max_iterations } = req.body
  const agent = createAgent()
  const result = await agent.execute(question, {
    datasourceId: datasource_id,
    maxIterations: max_iterations || 10
  })
  res.json(result)
})

// GET /api/agent/tools - 获取可用工具列表
app.get('/api/agent/tools', (req, res) => {
  const agent = createAgent()
  const tools = agent.tools.map(tool => ({
    name: tool.name,
    description: tool.description
  }))
  res.json({ success: true, data: tools })
})
```

#### 1.4 启动横幅更新 (`server/index.js`)
更新了服务启动时的 API 端点列表，包含新的 Agent API。

### 2. 前端集成

#### 2.1 API 服务层 (`src/services/api.ts`)
新增 `agentApi` 对象：

```typescript
export const agentApi = {
  // 使用 Agent 引擎执行查询
  query(question: string, datasourceId: string, maxIterations?: number) {
    return request('/agent/query', {
      method: 'POST',
      body: JSON.stringify({ 
        question,
        datasource_id: datasourceId,
        max_iterations: maxIterations
      })
    })
  },
  
  // 获取可用工具列表
  getTools() {
    return request('/agent/tools')
  }
}
```

#### 2.2 主页组件 (`src/pages/NewHomePage.tsx`)

**新增功能：**
1. **Agent 模式切换开关**
   - 底部工具栏添加切换按钮
   - 使用蓝色主题，带 Sparkles 图标
   - 切换状态保存在 `useAgentMode` state

2. **双模式查询支持**
   - `handleAgentQuery()`: Agent 模式查询
   - `handleTraditionalQuery()`: 传统分步查询
   
3. **ChatMessage 接口扩展**
   - 新增 `agentMode?: boolean` 字段

**UI 布局：**
```
┌─────────────────────────────────────────┐
│  [Agent 模式] [数据源选择] [其他按钮]   │  ← 底部工具栏
└─────────────────────────────────────────┘
```

### 3. 文档

#### 3.1 状态图设计 (`server/agent/STATE-DIAGRAM.md`)
- ASCII 艺术状态流转图
- 节点详细说明（Planner, Executor, Reflector）
- 路由决策逻辑
- ReAct 提示词模板
- 执行示例
- 错误处理机制
- 扩展点说明

#### 3.2 Agent 工具文档 (`server/AGENT-TOOLS.md`)
- 6 个标准化工具的详细文档
- 使用示例（5 种方式）
- 工具架构说明
- 最佳实践
- 扩展指南

### 4. 测试脚本

- **`server/test-agent.js`**: Agent 引擎测试脚本
- **`server/agent-tools-example.js`**: 工具使用示例
- **`server/test-tools.js`**: 工具功能测试

## 技术架构

### Agent 引擎状态图

```
START
  ↓
[Planner] → 分析用户问题，决定下一步行动
  ↓
[Executor] → 执行工具调用
  ↓
[Reflector] → 评估结果，决定继续或结束
  ↓
[Router] → 条件判断
  ├─ continue → 返回 Planner
  └─ end → END
```

### 查询模式对比

| 特性 | 传统模式 | Agent 模式 |
|------|---------|-----------|
| 执行方式 | 分步调用 | LangGraph 循环 |
| 意图识别 | 单独调用 | Agent 自动决策 |
| SQL 生成 | 单独调用 | Agent 自动决策 |
| 工具调用 | 手动管理 | Agent 自动管理 |
| 错误处理 | 手动处理 | Agent 自动重试 |
| 思考过程 | 固定步骤 | 动态推理 |
| 适用场景 | 简单查询 | 复杂多步查询 |

### API 端点

#### 传统 API
- `POST /api/intent/recognize` - 意图识别
- `POST /api/sql/generate` - SQL 生成
- `POST /api/query/execute` - 查询执行
- `GET /api/schema` - 获取 Schema

#### Agent API
- `POST /api/agent/query` - Agent 查询
- `GET /api/agent/tools` - 获取工具列表

## 使用方式

### 前端使用

1. 访问 http://localhost:5175
2. 在底部工具栏切换 Agent 模式
3. 选择数据源
4. 输入查询问题
5. 查看 Agent 执行结果

### 后端 API 调用

```bash
# Agent 查询
curl -X POST http://localhost:3001/api/agent/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "按地区统计用户数量",
    "datasource_id": "sqlite-local-1",
    "max_iterations": 10
  }'

# 获取工具列表
curl http://localhost:3001/api/agent/tools
```

### Node.js 调用

```javascript
import { createAgent } from './server/agent/index.js'

const agent = createAgent()
const result = await agent.execute('按地区统计用户数量', {
  datasourceId: 'sqlite-local-1',
  maxIterations: 10
})
```

## Agent 可用工具

1. **intent_recognition** - 意图识别
2. **get_table_schema** - 获取表结构
3. **sql_generation** - SQL 生成
4. **query_execution** - 查询执行
5. **chart_recommendation** - 图表推荐
6. **complete_query** - 完整查询流程（组合工具）

## 配置要求

### 环境变量
```bash
# .env 文件
DEEPSEEK_API_KEY=your-api-key
DEEPSEEK_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DEEPSEEK_MODEL=deepseek-v3.2
```

### Node.js 版本
- Node.js >= 18（支持 ESM）

## 服务启动

```bash
# 后端服务
cd server
npm start

# 前端服务
cd dataAnalysis
npm run dev
```

## 已知限制

1. **LLM 调用依赖 API Key**: 需要配置有效的 DeepSeek API Key
2. **最大迭代次数**: 默认 10 次，防止无限循环
3. **SQL 安全限制**: Agent 生成的 SQL 只包含 SELECT 操作
4. **工具调用限制**: 每次只能调用一个工具

## 未来改进

1. **流式输出**: 支持 Agent 思考过程实时显示
2. **工具缓存**: 避免重复调用相同工具
3. **并行执行**: 支持多个独立工具调用并行执行
4. **超时控制**: 为工具执行设置超时限制
5. **对话历史**: 支持多轮对话上下文
6. **工具扩展**: 添加更多专业分析工具

## 故障排查

### 问题：Agent 执行失败
- 检查 API Key 是否正确配置
- 查看后端控制台日志
- 确认数据源 ID 是否有效

### 问题：前端无法连接后端
- 确认后端服务运行在 3001 端口
- 检查 CORS 配置
- 查看浏览器控制台错误

### 问题：工具调用失败
- 查看 `server/agent/engine.js` 中的日志输出
- 检查工具参数是否符合 schema 要求
- 验证数据源连接是否正常

## 相关文档

- [Agent 工具文档](./AGENT-TOOLS.md)
- [Agent 状态图设计](./agent/STATE-DIAGRAM.md)
- [工具使用示例](./agent-tools-example.js)
- [测试脚本](./test-agent.js)
