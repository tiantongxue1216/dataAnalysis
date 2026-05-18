/**
 * NL2SQL 系统自动化测试脚本
 */

import { TEST_CASES, runAllTests } from './test-cases.js'
import { recognizeIntent } from './intent-service.js'
import { generateSQL } from './sql-generator.js'

console.log('=== NL2SQL 自动化测试系统 ===\n')
console.log(`测试用例总数: ${TEST_CASES.length}`)
console.log(`测试分类: ${[...new Set(TEST_CASES.map(t => t.category))].join(', ')}\n`)

// 测试结果统计
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  byCategory: {},
}

/**
 * 验证意图识别结果
 */
function validateIntent(testCase, result) {
  const errors = []
  
  // 检查是否需要澄清
  if (testCase.expected.need_clarification) {
    if (!result.need_clarification) {
      errors.push('应该返回需要澄清但未返回')
    }
    return errors
  }
  
  // 检查意图类型
  if (testCase.expected.intent_type && result.intent?.intent_type !== testCase.expected.intent_type) {
    errors.push(`意图类型不匹配: 期望 ${testCase.expected.intent_type}, 实际 ${result.intent?.intent_type}`)
  }
  
  // 检查表名
  if (testCase.expected.table_name && result.intent?.table_name !== testCase.expected.table_name) {
    errors.push(`表名不匹配: 期望 ${testCase.expected.table_name}, 实际 ${result.intent?.table_name}`)
  }
  
  // 检查聚合函数
  if (testCase.expected.aggregation && result.intent?.aggregation !== testCase.expected.aggregation) {
    errors.push(`聚合函数不匹配: 期望 ${testCase.expected.aggregation}, 实际 ${result.intent?.aggregation}`)
  }
  
  // 检查分组字段
  if (testCase.expected.group_by) {
    const actualGroupBy = result.intent?.group_by || []
    const expectedGroupBy = testCase.expected.group_by
    if (JSON.stringify(actualGroupBy.sort()) !== JSON.stringify(expectedGroupBy.sort())) {
      errors.push(`分组字段不匹配: 期望 ${JSON.stringify(expectedGroupBy)}, 实际 ${JSON.stringify(actualGroupBy)}`)
    }
  }
  
  // 检查排序
  if (testCase.expected.order_by) {
    if (!result.intent?.order_by) {
      errors.push('缺少排序信息')
    } else {
      if (testCase.expected.order_by.direction && 
          result.intent.order_by.direction !== testCase.expected.order_by.direction) {
        errors.push(`排序方向不匹配: 期望 ${testCase.expected.order_by.direction}, 实际 ${result.intent.order_by.direction}`)
      }
    }
  }
  
  // 检查限制数量
  if (testCase.expected.limit && result.intent?.limit !== testCase.expected.limit) {
    errors.push(`限制数量不匹配: 期望 ${testCase.expected.limit}, 实际 ${result.intent?.limit}`)
  }
  
  return errors
}

/**
 * 运行单个测试
 */
async function runSingleTest(testCase, index) {
  stats.total++
  
  // 初始化分类统计
  if (!stats.byCategory[testCase.category]) {
    stats.byCategory[testCase.category] = { total: 0, passed: 0, failed: 0 }
  }
  stats.byCategory[testCase.category].total++
  
  console.log(`\n[${index}/${TEST_CASES.length}] ${testCase.id} - ${testCase.description}`)
  console.log(`   查询: "${testCase.query}"`)
  
  try {
    // 步骤1: 意图识别
    const intentResult = await recognizeIntent(testCase.query)
    
    if (testCase.expected.need_clarification) {
      // 验证是否需要澄清
      if (intentResult.need_clarification) {
        console.log('   ✅ 正确识别为需要澄清')
        stats.passed++
        stats.byCategory[testCase.category].passed++
        return { id: testCase.id, passed: true }
      } else {
        console.log('   ❌ 应该返回需要澄清但未返回')
        stats.failed++
        stats.byCategory[testCase.category].failed++
        return { id: testCase.id, passed: false, error: '未返回澄清请求' }
      }
    }
    
    // 验证意图识别结果
    const intentErrors = validateIntent(testCase, intentResult)
    
    if (intentErrors.length > 0) {
      console.log('   ❌ 意图识别失败:')
      intentErrors.forEach(err => console.log(`      - ${err}`))
      stats.failed++
      stats.byCategory[testCase.category].failed++
      return { id: testCase.id, passed: false, errors: intentErrors }
    }
    
    // 步骤2: SQL 生成（如果有完整的意图对象）
    if (intentResult.success && intentResult.intent) {
      const sqlResult = await generateSQL(intentResult.intent)
      
      if (sqlResult.success) {
        console.log('   ✅ 意图识别成功')
        console.log(`   📝 SQL: ${sqlResult.sql}`)
        stats.passed++
        stats.byCategory[testCase.category].passed++
        return { id: testCase.id, passed: true, sql: sqlResult.sql }
      } else {
        console.log('   ⚠️  意图识别成功但 SQL 生成失败')
        console.log(`   错误: ${sqlResult.error}`)
        stats.failed++
        stats.byCategory[testCase.category].failed++
        return { id: testCase.id, passed: false, error: sqlResult.error }
      }
    }
    
    console.log('   ✅ 测试通过')
    stats.passed++
    stats.byCategory[testCase.category].passed++
    return { id: testCase.id, passed: true }
    
  } catch (error) {
    console.log(`   ❌ 执行错误: ${error.message}`)
    stats.failed++
    stats.byCategory[testCase.category].failed++
    return { id: testCase.id, passed: false, error: error.message }
  }
}

/**
 * 打印测试报告
 */
function printReport() {
  console.log('\n' + '='.repeat(60))
  console.log('                    测试报告')
  console.log('='.repeat(60))
  
  console.log(`\n📊 总体统计:`)
  console.log(`   总测试数: ${stats.total}`)
  console.log(`   通过: ${stats.passed} ✅`)
  console.log(`   失败: ${stats.failed} ❌`)
  console.log(`   通过率: ${(stats.passed / stats.total * 100).toFixed(2)}%`)
  
  console.log(`\n📈 分类统计:`)
  for (const [category, data] of Object.entries(stats.byCategory)) {
    const rate = (data.passed / data.total * 100).toFixed(2)
    const icon = rate === '100.00' ? '✅' : rate >= '50.00' ? '⚠️ ' : '❌'
    console.log(`   ${icon} ${category}: ${data.passed}/${data.total} (${rate}%)`)
  }
  
  console.log('\n' + '='.repeat(60))
}

/**
 * 主函数
 */
async function main() {
  const startTime = Date.now()
  
  console.log('开始执行测试...\n')
  
  const results = []
  for (let i = 0; i < TEST_CASES.length; i++) {
    const result = await runSingleTest(TEST_CASES[i], i + 1)
    results.push(result)
    
    // 每个测试之间稍微延迟，避免 API 限流
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)
  
  console.log(`\n⏱️  测试耗时: ${duration} 秒`)
  
  // 打印报告
  printReport()
  
  // 保存测试结果到文件
  import('fs').then(fs => {
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      summary: stats,
      results: results,
    }
    fs.default.writeFileSync(
      'test-results.json',
      JSON.stringify(report, null, 2)
    )
    console.log('\n💾 测试结果已保存到 test-results.json')
  })
  
  // 退出码
  process.exit(stats.failed > 0 ? 1 : 0)
}

// 运行测试
main().catch(error => {
  console.error('测试执行失败:', error)
  process.exit(1)
})
