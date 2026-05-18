/**
 * Agent 工具使用示例
 * 展示如何调用标准化工具
 */

import { 
  intentRecognitionTool,
  getTableSchemaTool,
  sqlGenerationTool,
  queryExecutionTool,
  chartRecommendationTool,
  completeQueryTool,
  toolRegistry
} from './tools.js'

/**
 * 示例 1: 使用组合工具执行完整查询流程
 */
async function example1_CompleteQuery() {
  console.log('=== 示例 1: 完整查询流程 ===')
  
  const result = await completeQueryTool.execute({
    query: '最近 12 个月的订单趋势',
    datasourceId: 'sqlite-local-1'
  })
  
  console.log('结果:', JSON.stringify(result, null, 2))
  return result
}

/**
 * 示例 2: 分步执行各个工具
 */
async function example2_StepByStep() {
  console.log('\n=== 示例 2: 分步执行 ===')
  
  // 步骤 1: 意图识别
  console.log('步骤 1: 意图识别')
  const intentResult = await intentRecognitionTool.execute({
    query: '按地区统计用户数量'
  })
  console.log('意图识别结果:', JSON.stringify(intentResult, null, 2))
  
  if (!intentResult.success || !intentResult.intent) {
    console.error('意图识别失败')
    return
  }
  
  // 步骤 2: 获取表结构（可选）
  console.log('\n步骤 2: 获取表结构')
  const schemaResult = await getTableSchemaTool.execute({
    tableName: intentResult.intent.table_name
  })
  console.log('表结构:', JSON.stringify(schemaResult, null, 2))
  
  // 步骤 3: SQL 生成
  console.log('\n步骤 3: SQL 生成')
  const sqlResult = await sqlGenerationTool.execute({
    intent: intentResult.intent,
    datasourceId: 'sqlite-local-1'
  })
  console.log('SQL 结果:', JSON.stringify(sqlResult, null, 2))
  
  if (!sqlResult.success || !sqlResult.sql) {
    console.error('SQL 生成失败')
    return
  }
  
  // 步骤 4: 查询执行
  console.log('\n步骤 4: 查询执行')
  const queryResult = await queryExecutionTool.execute({
    sql: sqlResult.sql,
    datasourceId: 'sqlite-local-1',
    intentType: intentResult.intent.intent_type
  })
  console.log('查询结果:', JSON.stringify(queryResult, null, 2))
  
  // 步骤 5: 图表推荐（查询执行已包含）
  console.log('\n步骤 5: 图表推荐')
  if (queryResult.recommendation) {
    console.log('推荐图表:', queryResult.recommendation.chartType)
    console.log('推荐理由:', queryResult.recommendation.reason)
  }
  
  return {
    intent: intentResult,
    schema: schemaResult,
    sql: sqlResult,
    query: queryResult
  }
}

/**
 * 示例 3: 使用工具注册表动态调用
 */
async function example3_ToolRegistry() {
  console.log('\n=== 示例 3: 使用工具注册表 ===')
  
  // 查看所有可用工具
  console.log('可用工具:', Object.keys(toolRegistry))
  
  // 通过名称调用工具
  const toolName = 'intent_recognition'
  const tool = toolRegistry[toolName]
  
  if (tool) {
    console.log(`调用工具：${tool.name}`)
    console.log(`描述：${tool.description}`)
    
    const result = await tool.execute({
      query: '查询所有订单'
    })
    console.log('结果:', JSON.stringify(result, null, 2))
  }
  
  return toolRegistry
}

/**
 * 示例 4: 错误处理
 */
async function example4_ErrorHandling() {
  console.log('\n=== 示例 4: 错误处理 ===')
  
  try {
    // 故意传入错误参数
    const result = await intentRecognitionTool.execute({
      query: ''  // 空查询
    })
    console.log('结果:', result)
  } catch (error) {
    console.error('捕获到错误:', error.message)
  }
  
  // 测试无效的表名
  const schemaResult = await getTableSchemaTool.execute({
    tableName: 'nonexistent_table'
  })
  console.log('不存在的表:', JSON.stringify(schemaResult, null, 2))
  
  return schemaResult
}

/**
 * 示例 5: Agent 模式 - 智能选择工具
 */
async function example5_AgentMode() {
  console.log('\n=== 示例 5: Agent 模式 ===')
  
  const userQuery = '按地区统计用户数量'
  const datasourceId = 'sqlite-local-1'
  
  // Agent 决策流程
  console.log('Agent 接收到查询:', userQuery)
  
  // 1. 首先进行意图识别
  const intentResult = await intentRecognitionTool.execute({ query: userQuery })
  
  if (!intentResult.success) {
    console.log('意图识别失败，请求用户澄清')
    return { action: 'clarify', message: intentResult.message }
  }
  
  const intent = intentResult.intent
  
  // 2. 检查是否有缺失的槽位
  if (intent.missing_slots && intent.missing_slots.length > 0) {
    console.log('缺少必要信息:', intent.missing_slots)
    return { 
      action: 'clarify', 
      message: `请提供以下信息：${intent.missing_slots.join(', ')}`,
      missingSlots: intent.missing_slots
    }
  }
  
  // 3. 获取表结构（Agent 可以根据需要决定是否获取）
  const schemaResult = await getTableSchemaTool.execute({
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
  
  // 6. 返回完整结果
  return {
    action: 'complete',
    query: userQuery,
    intent,
    sql: sqlResult.sql,
    data: queryResult.data,
    recommendation: queryResult.recommendation,
    rowCount: queryResult.rowCount
  }
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  console.log('🚀 开始运行 Agent 工具示例\n')
  
  try {
    // await example1_CompleteQuery()
    // await example2_StepByStep()
    // await example3_ToolRegistry()
    // await example4_ErrorHandling()
    await example5_AgentMode()
    
    console.log('\n✅ 所有示例运行完成')
  } catch (error) {
    console.error('❌ 示例运行失败:', error)
    console.error(error.stack)
  }
}

// 导出所有示例函数
export {
  example1_CompleteQuery,
  example2_StepByStep,
  example3_ToolRegistry,
  example4_ErrorHandling,
  example5_AgentMode,
  runAllExamples
}

// 如果直接运行此文件，执行所有示例
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples()
}
