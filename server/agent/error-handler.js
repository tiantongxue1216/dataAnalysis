/**
 * Agent 错误分析与修正引擎
 * 结合 LLM 智能分析和规则引擎的结构化处理
 */

import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'

/**
 * 常见错误类型定义
 */
export const ErrorTypes = {
  SQL_SYNTAX_ERROR: 'sql_syntax_error',
  TABLE_NOT_FOUND: 'table_not_found',
  COLUMN_NOT_FOUND: 'column_not_found',
  PERMISSION_DENIED: 'permission_denied',
  TIMEOUT_ERROR: 'timeout_error',
  CONNECTION_ERROR: 'connection_error',
  EMPTY_RESULT: 'empty_result',
  INVALID_PARAMETER: 'invalid_parameter',
  UNKNOWN_ERROR: 'unknown_error'
}

/**
 * 错误分类规则引擎
 * 根据错误消息模式自动分类
 */
export function classifyError(errorMessage) {
  const errorLower = errorMessage.toLowerCase()
  
  // SQL 语法错误
  if (errorLower.includes('syntax') || 
      errorLower.includes('sql syntax') ||
      errorLower.includes('parse error')) {
    return ErrorTypes.SQL_SYNTAX_ERROR
  }
  
  // 表不存在
  if (errorLower.includes('table') && errorLower.includes('not exist') ||
      errorLower.includes('table not found') ||
      errorLower.includes('no such table')) {
    return ErrorTypes.TABLE_NOT_FOUND
  }
  
  // 列不存在
  if (errorLower.includes('column') && errorLower.includes('not exist') ||
      errorLower.includes('column not found') ||
      errorLower.includes('no such column') ||
      errorLower.includes('invalid column')) {
    return ErrorTypes.COLUMN_NOT_FOUND
  }
  
  // 权限错误
  if (errorLower.includes('permission') ||
      errorLower.includes('access denied') ||
      errorLower.includes('unauthorized') ||
      errorLower.includes('forbidden')) {
    return ErrorTypes.PERMISSION_DENIED
  }
  
  // 超时错误
  if (errorLower.includes('timeout') ||
      errorLower.includes('timed out') ||
      errorLower.includes('execution time exceeded')) {
    return ErrorTypes.TIMEOUT_ERROR
  }
  
  // 连接错误
  if (errorLower.includes('connection') ||
      errorLower.includes('connect') ||
      errorLower.includes('network') ||
      errorLower.includes('database is not available')) {
    return ErrorTypes.CONNECTION_ERROR
  }
  
  // 空结果
  if (errorLower.includes('empty result') ||
      errorLower.includes('no data') ||
      errorLower.includes('no rows')) {
    return ErrorTypes.EMPTY_RESULT
  }
  
  // 参数错误
  if (errorLower.includes('invalid parameter') ||
      errorLower.includes('missing parameter') ||
      errorLower.includes('required parameter')) {
    return ErrorTypes.INVALID_PARAMETER
  }
  
  return ErrorTypes.UNKNOWN_ERROR
}

/**
 * 错误修复策略（规则引擎）
 */
export const ErrorFixStrategies = {
  [ErrorTypes.SQL_SYNTAX_ERROR]: {
    description: 'SQL 语法错误',
    autoRetry: true,
    maxRetries: 2,
    fixStrategy: '让 LLM 重新生成正确的 SQL 语句，注意检查语法',
    suggestions: [
      '检查 SQL 关键字拼写',
      '验证表名和列名是否正确',
      '确保括号匹配',
      '检查逗号使用是否正确'
    ]
  },
  
  [ErrorTypes.TABLE_NOT_FOUND]: {
    description: '表不存在',
    autoRetry: true,
    maxRetries: 1,
    fixStrategy: '先调用 get_table_schema 获取可用表列表，然后重新生成 SQL',
    suggestions: [
      '确认表名是否正确',
      '检查是否使用了正确的数据源',
      '查看可用的表列表'
    ]
  },
  
  [ErrorTypes.COLUMN_NOT_FOUND]: {
    description: '列不存在',
    autoRetry: true,
    maxRetries: 1,
    fixStrategy: '调用 get_table_schema 获取表的实际列名，然后修正 SQL',
    suggestions: [
      '检查列名拼写',
      '确认列是否存在于该表中',
      '注意大小写敏感性'
    ]
  },
  
  [ErrorTypes.PERMISSION_DENIED]: {
    description: '权限不足',
    autoRetry: false,
    maxRetries: 0,
    fixStrategy: '无法自动修复，需要联系管理员授予权限',
    suggestions: [
      '联系数据库管理员',
      '确认当前用户是否有查询权限',
      '尝试使用其他有权限的数据源'
    ]
  },
  
  [ErrorTypes.TIMEOUT_ERROR]: {
    description: '查询超时',
    autoRetry: true,
    maxRetries: 1,
    fixStrategy: '优化 SQL 查询，添加 LIMIT 限制返回行数，或简化查询条件',
    suggestions: [
      '添加 LIMIT 子句限制返回行数',
      '减少 JOIN 操作',
      '简化 WHERE 条件',
      '避免 SELECT *，只选择需要的列'
    ]
  },
  
  [ErrorTypes.CONNECTION_ERROR]: {
    description: '连接错误',
    autoRetry: true,
    maxRetries: 2,
    fixStrategy: '等待后重试，如果仍然失败则报告连接问题',
    suggestions: [
      '检查数据库服务是否正常运行',
      '检查网络连接',
      '稍后重试'
    ]
  },
  
  [ErrorTypes.EMPTY_RESULT]: {
    description: '查询结果为空',
    autoRetry: true,
    maxRetries: 1,
    fixStrategy: '放宽查询条件，或者询问用户是否需要调整查询范围',
    suggestions: [
      '检查 WHERE 条件是否过于严格',
      '确认数据是否存在',
      '尝试移除部分过滤条件'
    ]
  },
  
  [ErrorTypes.INVALID_PARAMETER]: {
    description: '参数错误',
    autoRetry: true,
    maxRetries: 1,
    fixStrategy: '检查工具调用参数是否符合 schema 要求',
    suggestions: [
      '确认必填参数是否提供',
      '检查参数类型是否正确',
      '验证参数格式'
    ]
  },
  
  [ErrorTypes.UNKNOWN_ERROR]: {
    description: '未知错误',
    autoRetry: true,
    maxRetries: 1,
    fixStrategy: '分析错误详情，尝试不同的方法或工具',
    suggestions: [
      '查看详细错误信息',
      '尝试使用其他工具',
      '简化操作步骤'
    ]
  }
}

/**
 * 使用 LLM 分析错误并生成修复建议
 */
export async function analyzeErrorWithLLM({
  question,
  toolName,
  toolArgs,
  errorMessage,
  errorType,
  previousThoughts = [],
  llm
}) {
  try {
    const strategy = ErrorFixStrategies[errorType] || ErrorFixStrategies[ErrorTypes.UNKNOWN_ERROR]
    
    const systemPrompt = `你是一个智能错误分析助手。当工具执行失败时，你需要分析错误原因并提供修复方案。

当前错误信息：
- 工具名称: ${toolName}
- 错误类型: ${strategy.description}
- 错误消息: ${errorMessage}

修复策略：${strategy.fixStrategy}

建议的修复步骤：
${strategy.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

请分析这个错误，并提供具体的修复方案。如果需要重新调用工具，请说明应该使用什么参数。`

    const userPrompt = `原始问题: ${question}

之前的思考过程:
${previousThoughts.slice(-3).map((t, i) => `${i + 1}. ${t}`).join('\n')}

工具调用参数:
${JSON.stringify(toolArgs, null, 2)}

错误详情:
${errorMessage}

请提供：
1. 错误原因分析
2. 具体的修复方案
3. 如果需要重新调用工具，应该使用什么参数`

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]

    const response = await llm.invoke(messages)
    
    return {
      success: true,
      analysis: response.content,
      errorType,
      strategy: strategy.fixStrategy,
      canAutoFix: strategy.autoRetry,
      maxRetries: strategy.maxRetries,
      suggestions: strategy.suggestions
    }
  } catch (error) {
    console.error('LLM 错误分析失败:', error)
    return {
      success: false,
      analysis: `错误分析失败: ${error.message}`,
      errorType,
      canAutoFix: false,
      suggestions: ['请稍后重试或联系技术支持']
    }
  }
}

/**
 * 完整的错误处理流程
 * 1. 分类错误
 * 2. 应用规则引擎策略
 * 3. 使用 LLM 深入分析
 * 4. 生成修复方案
 */
export async function handleError({
  toolName,
  toolArgs,
  errorMessage,
  question,
  previousThoughts = [],
  llm
}) {
  console.log('\n=== [Error Handler] 开始错误处理 ===')
  console.log('工具:', toolName)
  console.log('错误消息:', errorMessage)
  
  // 步骤 1: 分类错误
  const errorType = classifyError(errorMessage)
  console.log('错误类型:', errorType)
  
  // 步骤 2: 获取规则引擎策略
  const strategy = ErrorFixStrategies[errorType]
  console.log('修复策略:', strategy.description)
  console.log('是否可自动修复:', strategy.autoRetry)
  
  // 步骤 3: 使用 LLM 深入分析
  const llmAnalysis = await analyzeErrorWithLLM({
    question,
    toolName,
    toolArgs,
    errorMessage,
    errorType,
    previousThoughts,
    llm
  })
  
  console.log('LLM 分析完成')
  
  return {
    errorType,
    strategy,
    llmAnalysis,
    shouldRetry: strategy.autoRetry && llmAnalysis.success,
    maxRetries: strategy.maxRetries
  }
}

/**
 * 生成错误报告
 */
export function generateErrorReport(errorInfo) {
  const { errorType, strategy, llmAnalysis } = errorInfo
  
  return `
## 错误分析报告

**错误类型**: ${strategy.description}
**错误详情**: ${llmAnalysis.analysis}

### 修复方案
${llmAnalysis.strategy}

### 建议步骤
${strategy.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

### 自动修复
- 是否可以自动修复: ${strategy.autoRetry ? '是' : '否'}
- 最大重试次数: ${strategy.maxRetries}
  `.trim()
}
