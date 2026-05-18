/**
 * NL2SQL Agent 测试脚本
 * 测试基于 LangChain SQLDatabaseToolkit 的新功能
 */

import dotenv from 'dotenv'
dotenv.config()

import { createNL2SQLAgent } from './nl2sql-agent.js'
import storage from './storage.js'

async function testNL2SQL() {
  console.log('=== NL2SQL Agent 测试 ===\n')

  // 获取第一个数据源
  const datasources = storage.getAll()
  if (datasources.length === 0) {
    console.error('❌ 没有可用的数据源')
    return
  }

  const datasource = datasources[0]
  console.log('使用数据源:', datasource.name, `(${datasource.type})`)
  console.log('')

  // 创建 NL2SQL Agent
  const agent = createNL2SQLAgent()

  // 测试问题列表
  const testQuestions = [
    '有多少个订单？',
    '显示销售额最高的前5个产品',
    '上个月的总销售额是多少？',
    '按地区统计订单数量',
  ]

  for (const question of testQuestions) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`📝 问题: ${question}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    try {
      const result = await agent.execute(question, datasource, {
        topK: 5,
      })

      console.log('\n✅ 执行成功')
      console.log('耗时:', result.duration, 'ms')
      console.log('迭代次数:', result.iterations)
      
      if (result.answer) {
        console.log('\n💡 答案:')
        console.log(result.answer.substring(0, 500))
      }

      if (result.thoughts && result.thoughts.length > 0) {
        console.log('\n🤔 思考过程:')
        result.thoughts.forEach((thought, i) => {
          console.log(`  ${i + 1}. ${thought.substring(0, 200)}...`)
        })
      }

      if (result.data) {
        console.log('\n📊 查询结果:')
        console.log(`  行数: ${result.data.rowCount}`)
        if (result.data.rows && result.data.rows.length > 0) {
          console.log('  示例数据:', JSON.stringify(result.data.rows[0], null, 2))
        }
      }
    } catch (error) {
      console.error('❌ 执行失败:', error.message)
    }

    console.log('\n')
  }

  console.log('=== 测试完成 ===')
}

// 运行测试
testNL2SQL().catch(console.error)
