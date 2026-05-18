/**
 * 测试 Agent 完整数据查询流程
 * 使用真实的 SQLite 数据库
 */

import dotenv from 'dotenv'
dotenv.config()

import { createAgent } from './agent/index.js'
import databaseManager from './database.js'
import fs from 'fs'

console.log('=== Agent 完整数据查询流程测试 ===\n')

// 检查数据库文件
const dbPath = './smart_analyst.db'
if (!fs.existsSync(dbPath)) {
  console.error('❌ 数据库文件不存在，请先运行: node create-sample-db.js')
  process.exit(1)
}

console.log('✅ 数据库文件存在')
console.log('📊 数据库路径:', dbPath)
console.log('📦 文件大小:', (fs.statSync(dbPath).size / 1024).toFixed(2), 'KB\n')

async function testAgentWithRealDB() {
  // 创建 Agent
  const agent = createAgent()
  
  console.log('✅ Agent 创建成功')
  console.log('🔧 可用工具:', agent.tools.map(t => t.name).join(', '))
  console.log()

  // 测试场景
  const testCases = [
    {
      name: '简单查询 - 员工姓名和部门',
      question: '查询所有员工的姓名和部门',
      expectedTables: ['employees', 'departments']
    },
    {
      name: '聚合查询 - 部门统计',
      question: '统计每个部门的员工数量',
      expectedTables: ['employees', 'departments']
    },
    {
      name: '数值计算 - 平均工资',
      question: '查询公司的平均工资是多少',
      expectedTables: ['employees']
    },
    {
      name: '排序查询 - 最高工资',
      question: '找出工资最高的3名员工',
      expectedTables: ['employees']
    },
    {
      name: '关联查询 - 产品销售',
      question: '查看销售额最高的产品',
      expectedTables: ['sales', 'products']
    }
  ]

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]
    
    console.log('=' .repeat(70))
    console.log(`📋 测试 ${i + 1}/${testCases.length}: ${testCase.name}`)
    console.log('=' .repeat(70))
    console.log(`❓ 问题: ${testCase.question}`)
    console.log(`🎯 预期表: ${testCase.expectedTables.join(', ')}`)
    console.log()

    try {
      // 执行 Agent 查询
      const result = await agent.execute(testCase.question, {
        datasourceId: 'test_db',
        maxIterations: 5
      })

      console.log('✅ 执行完成')
      console.log(`⏱️  耗时: ${result.duration} ms`)
      console.log(`🔄 迭代次数: ${result.iterations}`)
      
      // 显示思考过程
      if (result.thoughts && result.thoughts.length > 0) {
        console.log('\n💭 思考过程:')
        result.thoughts.forEach((thought, idx) => {
          // 限制每条思考的长度
          const displayThought = thought.length > 100 
            ? thought.substring(0, 100) + '...' 
            : thought
          console.log(`   ${idx + 1}. ${displayThought}`)
        })
      }

      // 显示工具执行情况
      if (result.toolResults && result.toolResults.length > 0) {
        console.log('\n🛠️  工具执行:')
        result.toolResults.forEach((toolResult, idx) => {
          if (Array.isArray(toolResult)) {
            toolResult.forEach((r, jdx) => {
              const status = r.success ? '✅' : '❌'
              console.log(`   ${idx + 1}.${jdx + 1}. ${status} ${r.toolName}`)
              
              // 如果失败且包含错误信息，显示简要分析
              if (!r.success && r.errorInfo) {
                console.log(`       类型: ${r.errorInfo.strategy.description}`)
                console.log(`       可重试: ${r.errorInfo.shouldRetry ? '是' : '否'}`)
              }
            })
          }
        })
      }

      // 显示最终答案
      console.log('\n📝 最终答案:')
      if (result.answer) {
        // 格式化显示答案
        const answerLines = result.answer.split('\n').filter(line => line.trim())
        answerLines.forEach(line => {
          console.log(`   ${line}`)
        })
      } else {
        console.log('   ⚠️  未生成答案')
      }

      console.log()

    } catch (error) {
      console.error(`❌ 测试失败: ${error.message}`)
      console.error('错误堆栈:', error.stack)
      console.log()
    }
  }

  console.log('=' .repeat(70))
  console.log('✅ 所有测试完成！')
  console.log('=' .repeat(70))
}

// 运行测试
testAgentWithRealDB().catch(error => {
  console.error('测试脚本执行失败:', error)
  process.exit(1)
})
