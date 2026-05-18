/**
 * 快速测试脚本 - 手动验证关键查询场景
 * 使用方法: node quick-test.js
 */

import { recognizeIntent } from './intent-service.js'
import { generateSQL } from './sql-generator.js'

// 关键测试场景
const QUICK_TESTS = [
  // 基础查询
  '各地区的销售额排名',
  '华东区的销售额',
  '订单总数',
  
  // 时间查询
  '上个月的销售额',
  '最近7天的订单数量',
  
  // 产品查询
  '销量最高的前5个产品',
  '各个产品类别的销售额排名',
  
  // 复杂查询
  '上个月华东区各产品类别的销售额排名',
  '已完成的订单中各地区的平均订单金额',
  
  // 边界情况
  '所有地区的销售额',
  '每个地区的销售总额',
]

console.log('=== NL2SQL 快速测试 ===\n')

async function testQuery(query, index) {
  console.log(`\n[${index}/${QUICK_TESTS.length}] 查询: "${query}"`)
  console.log('-'.repeat(60))
  
  try {
    // 步骤1: 意图识别
    console.log('\n📋 步骤1: 意图识别...')
    const intentResult = await recognizeIntent(query)
    
    if (intentResult.need_clarification) {
      console.log('   ⚠️  需要澄清')
      console.log(`   缺失槽位: ${intentResult.missing_slots?.join(', ')}`)
      console.log(`   提示: ${intentResult.message}`)
      return
    }
    
    if (!intentResult.success) {
      console.log('   ❌ 意图识别失败')
      console.log(`   错误: ${intentResult.error}`)
      return
    }
    
    const intent = intentResult.intent
    console.log('   ✅ 意图识别成功')
    console.log(`   类型: ${intent.intent_type}`)
    console.log(`   表名: ${intent.table_name || '未推断'}`)
    console.log(`   聚合: ${intent.aggregation || '无'}`)
    if (intent.group_by?.length > 0) {
      console.log(`   分组: ${intent.group_by.join(', ')}`)
    }
    if (intent.order_by) {
      console.log(`   排序: ${intent.order_by.column} ${intent.order_by.direction}`)
    }
    if (intent.conditions?.length > 0) {
      console.log(`   条件: ${intent.conditions.map(c => `${c.column} ${c.operator} '${c.value}'`).join(', ')}`)
    }
    
    // 步骤2: SQL 生成
    console.log('\n💻 步骤2: SQL 生成...')
    const sqlResult = await generateSQL(intent)
    
    if (!sqlResult.success) {
      console.log('   ❌ SQL 生成失败')
      console.log(`   错误: ${sqlResult.error}`)
      return
    }
    
    console.log('   ✅ SQL 生成成功')
    console.log(`\n   📝 生成的 SQL:`)
    console.log('   ' + sqlResult.sql.split('\n').join('\n   '))
    
    // 步骤3: 评估结果
    console.log('\n📊 评估:')
    
    // 检查常见问题
    const issues = []
    
    if (sqlResult.sql.includes("'各地区'") || 
        sqlResult.sql.includes("'所有地区'") ||
        sqlResult.sql.includes("'全部地区'")) {
      issues.push('⚠️  "各地区"等词被当作具体值')
    }
    
    if (intent.group_by?.length > 0 && !sqlResult.sql.toLowerCase().includes('order by')) {
      if (intent.intent_type === 'SORT') {
        issues.push('⚠️  排序查询缺少 ORDER BY')
      }
    }
    
    if (intent.group_by?.length > 0) {
      const groupFields = intent.group_by
      const hasGroupInSelect = groupFields.every(field => 
        sqlResult.sql.toUpperCase().includes(field.toUpperCase())
      )
      if (!hasGroupInSelect) {
        issues.push('⚠️  SELECT 中缺少 GROUP BY 字段')
      }
    }
    
    if (issues.length === 0) {
      console.log('   ✅ 无明显问题')
    } else {
      issues.forEach(issue => console.log(`   ${issue}`))
    }
    
  } catch (error) {
    console.log(`   ❌ 执行错误: ${error.message}`)
    console.log(error.stack)
  }
}

async function main() {
  console.log(`测试场景数: ${QUICK_TESTS.length}\n`)
  console.log('开始测试...\n')
  
  for (let i = 0; i < QUICK_TESTS.length; i++) {
    await testQuery(QUICK_TESTS[i], i + 1)
    // 延迟避免 API 限流
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('测试完成！')
  console.log('='.repeat(60))
}

main().catch(error => {
  console.error('测试失败:', error)
  process.exit(1)
})
