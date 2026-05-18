/**
 * 快速测试 Agent 错误处理功能
 */

import dotenv from 'dotenv'
dotenv.config()

import { createAgent } from './agent/index.js'

console.log('=== Agent 错误处理快速测试 ===\n')

async function quickTest() {
  const agent = createAgent()
  
  console.log('✅ Agent 创建成功')
  console.log('📊 可用工具数量:', agent.tools.length)
  console.log('🔧 工具列表:')
  agent.tools.forEach((tool, i) => {
    console.log(`   ${i + 1}. ${tool.name}: ${tool.description.substring(0, 50)}...`)
  })

  // 测试场景：查询员工信息（可能会遇到表名错误）
  console.log('\n\n📋 测试场景: 查询所有员工的姓名和部门')
  console.log('=' .repeat(60))
  
  try {
    const result = await agent.execute(
      '查询所有员工的姓名和部门',
      { 
        datasourceId: 'test_db',
        maxIterations: 3
      }
    )
    
    console.log('\n✅ 执行完成')
    console.log('⏱️  耗时:', result.duration, 'ms')
    console.log('🔄 迭代次数:', result.iterations)
    
    if (result.thoughts && result.thoughts.length > 0) {
      console.log('\n💭 思考过程:')
      result.thoughts.forEach((thought, i) => {
        console.log(`   ${i + 1}. ${thought}`)
      })
    }
    
    if (result.toolResults && result.toolResults.length > 0) {
      console.log('\n🛠️  工具执行结果:')
      result.toolResults.forEach((toolResult, i) => {
        if (Array.isArray(toolResult)) {
          toolResult.forEach((r, j) => {
            const status = r.success ? '✅ 成功' : '❌ 失败'
            console.log(`   ${i + 1}.${j + 1}. ${r.toolName}: ${status}`)
            
            if (!r.success && r.errorInfo) {
              console.log(`       错误类型: ${r.errorInfo.strategy.description}`)
              console.log(`       可重试: ${r.errorInfo.shouldRetry ? '是' : '否'}`)
              if (r.errorInfo.llmAnalysis) {
                const analysis = r.errorInfo.llmAnalysis.analysis
                console.log(`       分析: ${analysis.substring(0, 100)}${analysis.length > 100 ? '...' : ''}`)
              }
            }
          })
        }
      })
    }
    
    console.log('\n📝 最终答案:')
    console.log(result.answer)
    
  } catch (error) {
    console.error('\n❌ 执行失败:', error.message)
    console.error('错误堆栈:', error.stack)
  }
}

// 运行测试
quickTest().catch(error => {
  console.error('测试脚本执行失败:', error)
  process.exit(1)
})
