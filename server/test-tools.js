/**
 * Agent 工具测试脚本
 */

import { 
  completeQueryTool,
  toolRegistry
} from './tools.js'

async function testTools() {
  console.log('🚀 测试 Agent 工具\n')
  
  try {
    // 测试 1: 完整查询
    console.log('=== 测试 1: 完整查询流程 ===')
    const result1 = await completeQueryTool.execute({
      query: '按地区统计用户数量',
      datasourceId: 'sqlite-local-1'
    })
    console.log('✅ 成功:', result1.success)
    console.log('意图类型:', result1.intent?.intent_type)
    console.log('生成 SQL:', result1.sql)
    console.log('返回行数:', result1.rowCount)
    console.log('推荐图表:', result1.recommendation?.chartType)
    console.log('耗时:', result1.duration, 'ms\n')
    
    // 测试 2: 查看工具注册表
    console.log('=== 测试 2: 可用工具列表 ===')
    console.log('已注册工具:', Object.keys(toolRegistry))
    console.log('工具数量:', Object.keys(toolRegistry).length)
    
    console.log('\n✅ 所有测试完成')
  } catch (error) {
    console.error('❌ 测试失败:', error)
    console.error(error.stack)
  }
}

testTools()
