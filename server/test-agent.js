/**
 * Agent 引擎测试脚本
 */

import dotenv from 'dotenv'
import { createAgent } from './agent/index.js'

// 加载环境变量
dotenv.config()

async function testAgent() {
  console.log('🚀 开始测试 Agent 引擎\n')

  try {
    // 创建 Agent 实例
    const agent = createAgent()
    console.log('✅ Agent 实例创建成功')
    console.log('可用工具:', agent.tools.map(t => t.name).join(', '))
    console.log()

    // 测试问题列表
    const testQuestions = [
      {
        question: '按地区统计用户数量',
        datasourceId: 'sqlite-local-1',
        description: '测试完整查询流程'
      },
      {
        question: '查询所有订单',
        datasourceId: 'sqlite-local-1',
        description: '测试简单查询'
      }
    ]

    // 执行测试
    for (let i = 0; i < testQuestions.length; i++) {
      const test = testQuestions[i]
      console.log(`\n${'='.repeat(60)}`)
      console.log(`测试 ${i + 1}: ${test.description}`)
      console.log(`问题: ${test.question}`)
      console.log(`${'='.repeat(60)}\n`)

      const startTime = Date.now()
      
      // 执行 Agent 查询
      const result = await agent.execute(test.question, {
        datasourceId: test.datasourceId,
        maxIterations: 5
      })

      const duration = Date.now() - startTime

      console.log('\n' + '='.repeat(60))
      console.log('测试结果:')
      console.log('='.repeat(60))
      console.log('成功:', result.success)
      console.log('耗时:', duration, 'ms')
      
      if (result.success) {
        console.log('迭代次数:', result.iterations)
        console.log('工具调用次数:', result.toolResults.length)
        console.log('\n思考过程:')
        result.thoughts.forEach((thought, idx) => {
          console.log(`  ${idx + 1}. ${thought}`)
        })
        console.log('\n最终答案:')
        console.log(result.answer)
      } else {
        console.log('错误:', result.error)
      }
      console.log()
    }

    console.log('\n✅ 所有测试完成')
  } catch (error) {
    console.error('\n❌ 测试失败:', error)
    console.error(error.stack)
  }
}

testAgent()
