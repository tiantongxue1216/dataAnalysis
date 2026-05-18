/**
 * 测试 Agent 错误处理功能
 */

import dotenv from 'dotenv'
dotenv.config()

import { createAgent } from './agent/index.js'

console.log('=== Agent 错误处理测试 ===\n')

async function testErrorHandling() {
  const agent = createAgent()

  // 测试场景 1: SQL 语法错误（故意使用错误的 SQL）
  console.log('\n📋 测试场景 1: SQL 语法错误')
  console.log('问题: 查询所有员工的姓名和部门，但使用错误的表名')
  
  try {
    const result1 = await agent.execute(
      '查询所有员工的姓名和部门',
      { 
        datasourceId: 'test_db',
        maxIterations: 5
      }
    )
    
    console.log('\n✅ 执行完成')
    console.log('迭代次数:', result1.iterations)
    console.log('耗时:', result1.duration, 'ms')
    console.log('\n思考过程:')
    result1.thoughts.forEach((thought, i) => {
      console.log(`  ${i + 1}. ${thought}`)
    })
    
    if (result1.toolResults.length > 0) {
      console.log('\n工具执行结果:')
      result1.toolResults.forEach((toolResult, i) => {
        if (Array.isArray(toolResult)) {
          toolResult.forEach((r, j) => {
            console.log(`  ${i + 1}.${j + 1}. ${r.toolName}: ${r.success ? '成功' : '失败'}`)
            if (!r.success && r.errorInfo) {
              console.log(`      错误类型: ${r.errorInfo.strategy.description}`)
              console.log(`      分析: ${r.errorInfo.llmAnalysis.analysis.substring(0, 100)}...`)
            }
          })
        }
      })
    }
    
    console.log('\n最终答案:')
    console.log(result1.answer)
    
  } catch (error) {
    console.error('❌ 执行失败:', error.message)
  }

  // 测试场景 2: 表不存在错误
  console.log('\n\n📋 测试场景 2: 表不存在')
  console.log('问题: 查询不存在的表')
  
  try {
    const result2 = await agent.execute(
      '从 nonexistent_table 表中查询所有数据',
      { 
        datasourceId: 'test_db',
        maxIterations: 5
      }
    )
    
    console.log('\n✅ 执行完成')
    console.log('迭代次数:', result2.iterations)
    console.log('耗时:', result2.duration, 'ms')
    console.log('\n思考过程:')
    result2.thoughts.forEach((thought, i) => {
      console.log(`  ${i + 1}. ${thought}`)
    })
    
    console.log('\n最终答案:')
    console.log(result2.answer)
    
  } catch (error) {
    console.error('❌ 执行失败:', error.message)
  }

  // 测试场景 3: 权限错误
  console.log('\n\n📋 测试场景 3: 权限错误模拟')
  console.log('问题: 尝试执行需要特殊权限的操作')
  
  try {
    const result3 = await agent.execute(
      '删除 users 表中的所有数据',
      { 
        datasourceId: 'test_db',
        maxIterations: 5
      }
    )
    
    console.log('\n✅ 执行完成')
    console.log('迭代次数:', result3.iterations)
    console.log('耗时:', result3.duration, 'ms')
    console.log('\n思考过程:')
    result3.thoughts.forEach((thought, i) => {
      console.log(`  ${i + 1}. ${thought}`)
    })
    
    console.log('\n最终答案:')
    console.log(result3.answer)
    
  } catch (error) {
    console.error('❌ 执行失败:', error.message)
  }

  console.log('\n\n=== 测试完成 ===')
}

// 运行测试
testErrorHandling().catch(error => {
  console.error('测试脚本执行失败:', error)
  process.exit(1)
})
