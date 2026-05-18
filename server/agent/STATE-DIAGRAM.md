# Agent 引擎状态图

## 状态流转图

```
┌─────────────┐
│   START     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│          Planner Node (规划器)          │
│  - 分析用户问题                         │
│  - 理解当前状态                         │
│  - 决定下一步行动                       │
│  - 生成工具调用指令                     │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│         Executor Node (执行器)          │
│  - 接收工具调用指令                     │
│  - 调用对应的工具                       │
│  - 捕获执行结果                         │
│  - 处理异常情况                         │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│        Reflector Node (反思器)          │
│  - 评估工具执行结果                     │
│  - 判断是否满足需求                     │
│  - 决定是否继续迭代                     │
│  - 更新状态信息                         │
└──────────────────┬──────────────────────┘
                   │
                   ▼
          ┌────────┴────────┐
          │  shouldContinue │
          │   (路由决策)    │
          └────────┬────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
  ┌──────────┐         ┌──────────┐
  │ Continue │         │   END    │
  │ (继续)   │         │  (结束)  │
  └────┬─────┘         └──────────
       │
       ▼
  (返回 Planner)
```

## 状态定义

### AgentState 状态对象

```typescript
interface AgentState {
  // 消息历史（LangChain Message 对象数组）
  messages: Array<HumanMessage | AIMessage | ToolMessage | SystemMessage>
  
  // 用户原始问题
  question: string
  
  // 思考过程记录
  thoughts: Array<string>
  
  // 工具执行结果
  toolResults: Array<{
    toolCallId: string
    toolName: string
    result: string
    success: boolean
  }>
  
  // 执行步骤记录
  steps: Array<string>
  
  // 当前迭代次数
  iterations: number
  
  // 最大迭代次数（默认 10）
  maxIterations: number
  
  // 数据源 ID（可选）
  datasourceId?: string
}
```

## 节点详细说明

### 1. Planner Node（规划器）

**职责：**
- 分析用户问题和当前状态
- 决定下一步需要调用的工具
- 准备工具调用参数

**输入：**
- 当前 AgentState
- 用户问题
- 历史消息
- 工具描述

**输出：**
- 更新 messages（添加 AIMessage）
- 更新 thoughts（添加思考过程）
- 可能包含 tool_calls

**决策逻辑：**
```
if (需要调用工具) {
  生成 tool_calls
} else {
  生成最终答案
}
```

### 2. Executor Node（执行器）

**职责：**
- 执行 Planner 生成的工具调用
- 捕获工具执行结果
- 处理执行异常

**输入：**
- 当前 AgentState
- 最后一条消息中的 tool_calls

**输出：**
- 更新 toolResults（添加工具执行结果）

**执行流程：**
```
for each tool_call in tool_calls:
  查找对应工具
  调用工具
  捕获结果
  记录成功/失败状态
```

### 3. Reflector Node（反思器）

**职责：**
- 评估工具执行结果
- 判断是否满足用户需求
- 决定是否继续迭代

**输入：**
- 当前 AgentState
- 最新的 toolResults

**输出：**
- 更新 messages（添加 ToolMessage）
- 更新 iterations（迭代次数 +1）

**反思逻辑：**
```
if (工具执行失败) {
  分析失败原因
  准备重试或调整策略
}

if (结果满意) {
  准备结束
} else {
  准备继续迭代
}
```

### 4. Router（路由决策）

**职责：**
- 根据当前状态决定下一步走向
- 控制循环终止条件

**决策规则：**

```javascript
function shouldContinue(state) {
  // 规则 1: 检查最大迭代次数
  if (state.iterations >= state.maxIterations) {
    return 'end'
  }
  
  // 规则 2: 检查是否有待执行的工具调用
  const lastMessage = state.messages[state.messages.length - 1]
  if (lastMessage?.tool_calls?.length > 0) {
    return 'continue'
  }
  
  // 规则 3: 检查是否包含最终答案
  const lastContent = lastMessage?.content || ''
  if (lastContent.includes('最终答案') || 
      lastContent.includes('Final Answer')) {
    return 'end'
  }
  
  // 默认继续
  return 'continue'
}
```

## ReAct 提示词模板

```
你是一个智能数据分析助手。你有以下工具可用：
{tools_description}

请严格按照以下格式回答：
思考: 你当前需要做什么？
行动: 工具名称(参数JSON)
观察: 工具返回的结果
... (重复思考/行动/观察，直到问题解决)
最终答案: 给用户的最终回答

注意：
1. 所有SQL必须只包含SELECT，禁止其他操作（INSERT/UPDATE/DELETE等）
2. 每次只能调用一个工具
3. 必须等待工具返回结果后再进行下一步思考
4. 如果工具执行失败，分析失败原因并调整策略
5. 最多执行 10 次迭代，超过后必须给出最终答案
6. 回答用户问题时，提供清晰的数据分析和可视化建议

当前时间: {current_time}
```

## 执行示例

### 示例：查询"按地区统计用户数量"

```
[START]
  ↓
[Planner] 
思考: 需要按地区统计用户数量，应该调用 complete_query 工具
行动: complete_query({"query": "按地区统计用户数量", "datasourceId": "sqlite-local-1"})
  ↓
[Executor]
执行工具: complete_query
参数: {"query": "按地区统计用户数量", "datasourceId": "sqlite-local-1"}
结果: {success: true, data: [...], recommendation: {...}}
  ↓
[Reflector]
评估: 工具执行成功，获得了查询结果和图表推荐
迭代次数: 1/10
  ↓
[Router]
决策: 结果完整，无需继续 → END
  ↓
[END]
最终答案: 按地区统计用户数量的查询已完成，共返回 X 条记录...
```

## 错误处理机制

### 工具执行失败
```
Executor 捕获异常
  → 记录错误信息到 toolResults
  → Reflector 分析错误
  → Planner 调整策略重试
  → 最多重试 maxIterations 次
```

### 达到最大迭代次数
```
iterations >= maxIterations
  → Router 返回 'end'
  → 提取当前最佳答案
  → 返回给用户
```

### LLM 调用失败
```
LLM API 错误
  → 捕获异常
  → 返回错误信息
  → Agent 执行终止
```

## 性能优化

1. **工具缓存**: 避免重复调用相同工具
2. **消息压缩**: 限制消息历史长度
3. **并行执行**: 支持多个独立工具调用并行执行
4. **超时控制**: 为工具执行设置超时限制

## 扩展点

1. **添加新工具**: 在 `tools.js` 中定义，自动注册
2. **自定义提示词**: 修改 `prompts.js` 中的模板
3. **调整状态结构**: 扩展 `state.js` 中的 AgentState
4. **添加新节点**: 在 `engine.js` 的 `buildGraph` 中添加
5. **自定义路由逻辑**: 修改 `shouldContinue` 方法
