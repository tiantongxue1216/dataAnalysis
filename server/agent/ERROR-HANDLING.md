# Agent 错误处理机制

## 概述

Agent 引擎集成了智能错误处理系统，结合 **LLM 智能分析**和**规则引擎**的结构化处理能力，能够在工具执行失败时自动分析错误原因并尝试修正。

## 技术架构

```
┌─────────────────────────────────────────────┐
│          工具执行失败                         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│     步骤 1: 错误分类（规则引擎）              │
│  - 模式匹配错误消息                          │
│  - 识别错误类型                              │
│  - 9 种预定义错误类型                        │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│     步骤 2: 获取修复策略（规则引擎）          │
│  - 查找对应的修复策略                        │
│  - 确定是否可自动重试                        │
│  - 设置最大重试次数                          │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│     步骤 3: LLM 深度分析                     │
│  - 分析错误上下文                            │
│  - 生成具体修复方案                          │
│  - 提供下一步行动建议                        │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│     步骤 4: 执行修复                         │
│  - 可重试：添加到思考过程，继续循环           │
│  - 不可重试：通知 LLM 尝试其他方法           │
└─────────────────────────────────────────────┘
```

## 错误类型分类

### 1. SQL_SYNTAX_ERROR - SQL 语法错误
- **检测模式**: `syntax`, `sql syntax`, `parse error`
- **自动重试**: ✅ 是（最多 2 次）
- **修复策略**: 让 LLM 重新生成正确的 SQL 语句
- **常见原因**:
  - SQL 关键字拼写错误
  - 表名或列名不正确
  - 括号不匹配
  - 逗号使用错误

### 2. TABLE_NOT_FOUND - 表不存在
- **检测模式**: `table not exist`, `table not found`, `no such table`
- **自动重试**: ✅ 是（最多 1 次）
- **修复策略**: 先获取可用表列表，然后重新生成 SQL
- **常见原因**:
  - 表名拼写错误
  - 使用了错误的数据源
  - 表已被删除

### 3. COLUMN_NOT_FOUND - 列不存在
- **检测模式**: `column not exist`, `column not found`, `invalid column`
- **自动重试**: ✅ 是（最多 1 次）
- **修复策略**: 获取表的实际列名，然后修正 SQL
- **常见原因**:
  - 列名拼写错误
  - 列不属于该表
  - 大小写敏感性

### 4. PERMISSION_DENIED - 权限不足
- **检测模式**: `permission`, `access denied`, `unauthorized`
- **自动重试**: ❌ 否
- **修复策略**: 无法自动修复，需要联系管理员
- **常见原因**:
  - 用户没有查询权限
  - 数据源访问受限
  - 操作被禁止（如 DELETE/UPDATE）

### 5. TIMEOUT_ERROR - 查询超时
- **检测模式**: `timeout`, `timed out`, `execution time exceeded`
- **自动重试**: ✅ 是（最多 1 次）
- **修复策略**: 优化 SQL，添加 LIMIT，简化查询
- **常见原因**:
  - 查询过于复杂
  - 数据量过大
  - 缺少索引

### 6. CONNECTION_ERROR - 连接错误
- **检测模式**: `connection`, `connect`, `network`
- **自动重试**: ✅ 是（最多 2 次）
- **修复策略**: 等待后重试
- **常见原因**:
  - 数据库服务未运行
  - 网络问题
  - 连接池耗尽

### 7. EMPTY_RESULT - 查询结果为空
- **检测模式**: `empty result`, `no data`, `no rows`
- **自动重试**: ✅ 是（最多 1 次）
- **修复策略**: 放宽查询条件
- **常见原因**:
  - WHERE 条件过于严格
  - 数据不存在
  - 查询逻辑错误

### 8. INVALID_PARAMETER - 参数错误
- **检测模式**: `invalid parameter`, `missing parameter`
- **自动重试**: ✅ 是（最多 1 次）
- **修复策略**: 检查参数是否符合 schema 要求
- **常见原因**:
  - 缺少必填参数
  - 参数类型错误
  - 参数格式不正确

### 9. UNKNOWN_ERROR - 未知错误
- **检测模式**: 未匹配到上述任何模式
- **自动重试**: ✅ 是（最多 1 次）
- **修复策略**: 分析错误详情，尝试不同方法
- **常见原因**:
  - 未预期的错误
  - 系统异常

## 工作流程示例

### 场景 1: SQL 语法错误自动修复

```
用户: 查询所有员工的姓名和部门

[Planner] 思考: 需要查询员工信息，调用 sql_generation 工具
[Executor] 执行: sql_generation({ question: "..." })
[Executor] 错误: SQL 语法错误 - SELECT name, dept FROM employes (表名拼写错误)

[Error Handler] 开始错误处理
  ├─ 分类错误: SQL_SYNTAX_ERROR
  ├─ 获取策略: 让 LLM 重新生成正确的 SQL
  └─ LLM 分析: 检测到表名 "employes" 可能拼写错误，应该是 "employees"

[Reflector] 反思: 检测到可重试的错误，将继续尝试
[Planner] 思考: 根据错误分析，重新生成 SQL，使用正确的表名 "employees"
[Executor] 执行: sql_generation({ question: "...", table_name: "employees" })
[Executor] 成功: 生成正确的 SQL

✅ 问题解决
```

### 场景 2: 表不存在错误处理

```
用户: 从 userss 表中查询所有数据

[Planner] 思考: 需要查询 userss 表
[Executor] 执行: query_execution({ sql: "SELECT * FROM userss" })
[Executor] 错误: Table 'userss' doesn't exist

[Error Handler] 开始错误处理
  ├─ 分类错误: TABLE_NOT_FOUND
  ├─ 获取策略: 先获取可用表列表
  └─ LLM 分析: 表名 "userss" 可能拼写错误，应该先获取表结构确认正确表名

[Reflector] 反思: 检测到可重试的错误
[Planner] 思考: 先调用 get_table_schema 获取可用表
[Executor] 执行: get_table_schema({ datasource_id: "..." })
[Executor] 成功: 返回可用表列表 ["users", "orders", "products"]

[Planner] 思考: 发现正确的表名是 "users"，重新生成查询
[Executor] 执行: query_execution({ sql: "SELECT * FROM users" })
[Executor] 成功: 返回查询结果

✅ 问题解决
```

### 场景 3: 权限错误（不可恢复）

```
用户: 删除所有用户数据

[Planner] 思考: 用户请求删除操作，但这是危险操作
[Executor] 执行: query_execution({ sql: "DELETE FROM users" })
[Executor] 错误: Access denied - 只允许 SELECT 操作

[Error Handler] 开始错误处理
  ├─ 分类错误: PERMISSION_DENIED
  ├─ 获取策略: 无法自动修复
  └─ LLM 分析: 系统禁止 DELETE 操作，只能执行 SELECT 查询

[Reflector] 反思: 检测到不可恢复的错误，将尝试其他方法
[Planner] 思考: 无法执行删除操作，告知用户系统限制
[Planner] 最终答案: 抱歉，系统只允许执行 SELECT 查询操作...

⚠️ 问题无法按原意解决，但给出了合理解释
```

## 代码实现

### 核心模块

#### 1. 错误分类器 (`error-handler.js`)

```javascript
export function classifyError(errorMessage) {
  const errorLower = errorMessage.toLowerCase()
  
  // SQL 语法错误
  if (errorLower.includes('syntax') || 
      errorLower.includes('sql syntax')) {
    return ErrorTypes.SQL_SYNTAX_ERROR
  }
  
  // 表不存在
  if (errorLower.includes('table') && errorLower.includes('not exist')) {
    return ErrorTypes.TABLE_NOT_FOUND
  }
  
  // ... 其他错误类型
  
  return ErrorTypes.UNKNOWN_ERROR
}
```

#### 2. 修复策略引擎

```javascript
export const ErrorFixStrategies = {
  [ErrorTypes.SQL_SYNTAX_ERROR]: {
    description: 'SQL 语法错误',
    autoRetry: true,
    maxRetries: 2,
    fixStrategy: '让 LLM 重新生成正确的 SQL 语句',
    suggestions: [
      '检查 SQL 关键字拼写',
      '验证表名和列名是否正确',
      '确保括号匹配'
    ]
  },
  // ... 其他策略
}
```

#### 3. LLM 错误分析

```javascript
export async function analyzeErrorWithLLM({
  question,
  toolName,
  toolArgs,
  errorMessage,
  errorType,
  previousThoughts,
  llm
}) {
  const strategy = ErrorFixStrategies[errorType]
  
  const systemPrompt = `你是一个智能错误分析助手...
当前错误信息：
- 工具名称: ${toolName}
- 错误类型: ${strategy.description}
- 错误消息: ${errorMessage}

修复策略：${strategy.fixStrategy}
...`

  const response = await llm.invoke(messages)
  
  return {
    success: true,
    analysis: response.content,
    errorType,
    canAutoFix: strategy.autoRetry,
    maxRetries: strategy.maxRetries
  }
}
```

#### 4. 集成到执行器节点

```javascript
async executorNode(state) {
  try {
    const result = await langchainTool.invoke(toolCall.args)
    // ... 成功处理
  } catch (error) {
    // 使用错误处理模块分析错误
    const errorInfo = await handleError({
      toolName: toolCall.name,
      toolArgs: toolCall.args,
      errorMessage: error.message,
      question: state.question,
      previousThoughts: state.thoughts,
      llm: this.llm
    })
    
    // 生成错误报告
    const errorReport = generateErrorReport(errorInfo)
    
    // 如果需要重试，添加提示消息
    if (errorInfo.shouldRetry) {
      const retryMessage = new SystemMessage({
        content: `工具执行失败。错误分析：${errorInfo.llmAnalysis.analysis}\n\n请根据分析结果调整策略，重新尝试。`
      })
      
      return {
        toolResults: [...state.toolResults, ...toolResults],
        thoughts,
        messages: [...state.messages, retryMessage]
      }
    }
  }
}
```

#### 5. 集成到反思器节点

```javascript
async reflectorNode(state) {
  // 检查是否有失败的工具
  if (!allSuccessful) {
    const failedTools = resultsArray.filter(r => !r.success)
    const canRetry = failedTools.some(r => r.errorInfo?.shouldRetry)
    
    if (canRetry && state.iterations < state.maxIterations) {
      console.log('检测到可重试的错误，将继续尝试')
      // 添加错误分析到思考过程
      const errorAnalyses = failedTools.map(r => 
        `[错误修复] ${r.toolName}: ${r.errorInfo?.llmAnalysis?.analysis}`
      )
      
      return {
        thoughts: [...state.thoughts, ...errorAnalyses],
        iterations: state.iterations + 1
      }
    } else if (!canRetry) {
      console.log('检测到不可恢复的错误，将尝试其他方法')
      // 通知 LLM 尝试其他方法
      const errorMessage = new SystemMessage({
        content: `以下工具执行失败且无法自动重试：${errorMessages}\n\n请尝试使用其他工具或方法来解决问题。`
      })
      
      return {
        messages: [errorMessage],
        thoughts: [...state.thoughts, `[错误] ${errorMessages}`],
        iterations: state.iterations + 1
      }
    }
  }
}
```

## 测试

运行错误处理测试脚本：

```bash
cd server
node test-error-handling.js
```

测试场景包括：
1. SQL 语法错误自动修复
2. 表不存在错误处理
3. 权限错误（不可恢复）

## 优势

### 1. 智能化
- LLM 深度分析错误上下文
- 生成具体的修复方案
- 理解业务逻辑和意图

### 2. 结构化
- 规则引擎提供标准化的错误分类
- 预定义的修复策略
- 可控的重试机制

### 3. 透明化
- 详细的错误分析报告
- 清晰的思考过程记录
- 可追溯的决策路径

### 4. 灵活性
- 可扩展的错误类型
- 可配置的修复策略
- 支持自定义错误处理逻辑

## 最佳实践

### 1. 错误日志记录
```javascript
console.log('错误类型:', errorInfo.errorType)
console.log('修复策略:', errorInfo.strategy.description)
console.log('LLM 分析:', errorInfo.llmAnalysis.analysis)
```

### 2. 重试控制
- 设置合理的 `maxIterations`（建议 5-10）
- 每种错误类型配置适当的重试次数
- 避免无限循环

### 3. 用户体验
- 向用户展示错误分析过程
- 提供清晰的错误说明
- 给出可行的替代方案

### 4. 监控和优化
- 记录常见错误类型
- 分析错误频率
- 持续优化修复策略

## 扩展方向

### 1. 学习机制
- 记录成功的修复案例
- 建立错误修复知识库
- 基于历史数据优化策略

### 2. 预防机制
- SQL 预验证
- 参数预检查
- 权限预校验

### 3. 协作机制
- 多 Agent 协作处理复杂错误
- 专家系统辅助诊断
- 人工干预接口

### 4. 性能优化
- 缓存常见错误的修复方案
- 并行执行多个修复尝试
- 异步错误分析

## 总结

Agent 错误处理机制通过结合 **LLM 的智能分析能力**和**规则引擎的结构化处理**，实现了：

✅ **自动错误分类** - 9 种预定义错误类型  
✅ **智能修复分析** - LLM 深度理解错误上下文  
✅ **可控重试机制** - 防止无限循环  
✅ **透明决策过程** - 完整的思考过程记录  
✅ **灵活扩展能力** - 易于添加新的错误类型和策略  

这大大提高了 Agent 系统的鲁棒性和用户体验，使其能够优雅地处理各种异常情况。
