/**
 * 意图识别功能测试脚本
 */

import { recognizeIntent } from './intent-service.js'
import { matchRules } from './rules-engine.js'

console.log('========================================')
console.log('   Intent Recognition Test Suite')
console.log('========================================\n')

const testCases = [
  {
    name: '测试 1: 简单查询 - 今天的销量',
    query: '今天的销量是多少？',
    expected: {
      intent: 'QUERY',
      hasTime: true,
      hasMetric: true,
    },
  },
  {
    name: '测试 2: 计数查询 - 华东区有多少订单',
    query: '华东区有多少订单？',
    expected: {
      intent: 'COUNT',
      hasRegion: true,
    },
  },
  {
    name: '测试 3: 排序查询 - 按销售额排序',
    query: '按销售额排序，显示前10名',
    expected: {
      intent: 'SORT',
      hasLimit: true,
    },
  },
  {
    name: '测试 4: 过滤查询 - 销售额大于1000',
    query: '查找销售额大于1000的订单',
    expected: {
      intent: 'FILTER',
      hasCondition: true,
    },
  },
  {
    name: '测试 5: 不完整查询 - 只有关键词',
    query: '销量',
    expected: {
      intent: 'INCOMPLETE',
      needsClarification: true,
    },
  },
  {
    name: '测试 6: 复杂查询 - 多条件',
    query: '上个月华东区的销售额是多少？',
    expected: {
      intent: 'QUERY',
      hasTime: true,
      hasRegion: true,
      hasMetric: true,
    },
  },
]

let passed = 0
let failed = 0

for (const testCase of testCases) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`📝 ${testCase.name}`)
  console.log(`   查询: "${testCase.query}"`)
  console.log(`${'─'.repeat(60)}`)

  try {
    const startTime = Date.now()
    const result = await recognizeIntent(testCase.query)
    const duration = Date.now() - startTime

    console.log(`⏱️  耗时: ${duration}ms`)
    console.log(`✅ 识别成功: ${result.success ? '是' : '否'}`)

    if (result.success && result.intent) {
      console.log(`🎯 意图类型: ${result.intent.intent_type}`)
      console.log(`📊 置信度: ${(result.intent.confidence * 100).toFixed(1)}%`)
      console.log(`🔍 实体数量: ${result.intent.entities.length}`)
      
      if (result.intent.entities.length > 0) {
        console.log(`📦 实体列表:`)
        result.intent.entities.forEach(entity => {
          console.log(`   - ${entity.entity_type}: ${entity.value}${entity.normalized ? ` → ${entity.normalized}` : ''}`)
        })
      }

      if (result.intent.select_columns.length > 0) {
        console.log(`📋 查询字段: ${result.intent.select_columns.join(', ')}`)
      }

      if (result.intent.conditions.length > 0) {
        console.log(`🔧 查询条件: ${result.intent.conditions.length} 个`)
      }

      if (result.intent.reasoning) {
        console.log(`💡 推理过程: ${result.intent.reasoning}`)
      }

      // 验证预期结果
      const matchesExpected = testCase.expected.intent === result.intent.intent_type
      if (matchesExpected) {
        console.log(`\n✓ 测试通过: 意图类型匹配 (${testCase.expected.intent})`)
        passed++
      } else {
        console.log(`\n✗ 测试失败: 期望 ${testCase.expected.intent}，实际 ${result.intent.intent_type}`)
        failed++
      }
    } else if (result.need_clarification) {
      console.log(`❓ 需要澄清: 是`)
      console.log(`📝 缺失槽位: ${result.missing_slots?.join(', ') || '无'}`)
      console.log(`💬 提示消息: ${result.message}`)

      if (testCase.expected.needsClarification) {
        console.log(`\n✓ 测试通过: 正确识别为需要澄清的查询`)
        passed++
      } else {
        console.log(`\n✗ 测试失败: 不应该需要澄清`)
        failed++
      }
    } else {
      console.log(`\n✗ 测试失败: 未知结果`)
      failed++
    }
  } catch (error) {
    console.log(`\n✗ 测试失败: ${error.message}`)
    console.log(`   堆栈: ${error.stack}`)
    failed++
  }
}

console.log(`\n\n${'='.repeat(60)}`)
console.log(`📊 测试总结`)
console.log(`${'='.repeat(60)}`)
console.log(`✅ 通过: ${passed}/${testCases.length}`)
console.log(`❌ 失败: ${failed}/${testCases.length}`)
console.log(`📈 成功率: ${((passed / testCases.length) * 100).toFixed(1)}%`)
console.log(`${'='.repeat(60)}\n`)
