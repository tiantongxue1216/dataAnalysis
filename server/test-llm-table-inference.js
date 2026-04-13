import dotenv from 'dotenv'
dotenv.config()

import { generateSQL } from './sql-generator.js'

async function testLLMWithMetadata() {
  // 模拟元数据
  const metadata = {
    tables: [
      {
        name: 'orders',
        columns: [
          { name: 'order_id', type: 'INTEGER', primaryKey: true, nullable: false },
          { name: 'user_id', type: 'INTEGER', primaryKey: false, nullable: false },
          { name: 'product_id', type: 'INTEGER', primaryKey: false, nullable: false },
          { name: 'sales_amount', type: 'DECIMAL', primaryKey: false, nullable: false },
          { name: 'quantity', type: 'INTEGER', primaryKey: false, nullable: false },
          { name: 'order_date', type: 'DATE', primaryKey: false, nullable: false },
          { name: 'region', type: 'VARCHAR', primaryKey: false, nullable: true },
          { name: 'status', type: 'VARCHAR', primaryKey: false, nullable: true },
        ],
      },
      {
        name: 'products',
        columns: [
          { name: 'product_id', type: 'INTEGER', primaryKey: true, nullable: false },
          { name: 'product_name', type: 'VARCHAR', primaryKey: false, nullable: false },
          { name: 'category', type: 'VARCHAR', primaryKey: false, nullable: true },
          { name: 'price', type: 'DECIMAL', primaryKey: false, nullable: false },
          { name: 'stock', type: 'INTEGER', primaryKey: false, nullable: false },
        ],
      },
      {
        name: 'users',
        columns: [
          { name: 'user_id', type: 'INTEGER', primaryKey: true, nullable: false },
          { name: 'username', type: 'VARCHAR', primaryKey: false, nullable: false },
          { name: 'email', type: 'VARCHAR', primaryKey: false, nullable: false },
          { name: 'register_date', type: 'DATE', primaryKey: false, nullable: false },
          { name: 'region', type: 'VARCHAR', primaryKey: false, nullable: true },
        ],
      },
    ],
  }

  const testCases = [
    {
      name: '测试1: 缺少表名，但有销售额指标（应推断为 orders）',
      intent: {
        intent_type: 'QUERY',
        table_name: null,
        select_columns: ['sales_amount'],
        conditions: [],
        user_input: '查询销售额',
      },
      expectedTable: 'orders',
    },
    {
      name: '测试2: 缺少表名，但有产品相关字段（应推断为 products）',
      intent: {
        intent_type: 'SORT',
        table_name: null,
        select_columns: ['product_name', 'price'],
        conditions: [],
        order_by: { column: 'price', direction: 'DESC' },
        limit: 10,
        user_input: '产品价格排行',
      },
      expectedTable: 'products',
    },
    {
      name: '测试3: 缺少表名，但有用户相关字段（应推断为 users）',
      intent: {
        intent_type: 'COUNT',
        table_name: null,
        select_columns: ['user_id'],
        aggregation: 'COUNT',
        conditions: [],
        user_input: '用户数量统计',
      },
      expectedTable: 'users',
    },
  ]

  console.log('🧪 测试 LLM 表名推断功能（带元数据）\n')
  console.log('=' .repeat(70))

  let passedTests = 0
  let totalTests = testCases.length

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`)
    console.log('-'.repeat(70))
    
    try {
      const result = await generateSQL(testCase.intent, metadata)

      if (result.success) {
        console.log('✅ SQL 生成成功')
        console.log(`   生成方式: ${result.method === 'rule-based' ? '📋 规则引擎' : '🤖 LLM'}`)
        console.log(`   意图类型: ${result.intent_type}`)
        console.log('\n   生成的 SQL:')
        console.log('   ' + '='.repeat(66))
        console.log('   ' + result.sql)
        console.log('   ' + '='.repeat(66))

        // 检查是否推断出正确的表
        const sqlUpper = result.sql.toUpperCase()
        const expectedTableUpper = testCase.expectedTable.toUpperCase()
        
        if (sqlUpper.includes(`FROM ${expectedTableUpper}`) || 
            sqlUpper.includes(`FROM "${expectedTableUpper}"`)) {
          console.log(`\n✅ 表名推断正确: ${testCase.expectedTable}`)
          passedTests++
          console.log('\n✅ 测试通过')
        } else {
          console.log(`\n❌ 表名推断错误: 期望 ${testCase.expectedTable}，但 SQL 中未找到`)
          console.log('\n❌ 测试失败')
        }
      } else {
        console.log('❌ SQL 生成失败:', result.error)
        console.log('\n❌ 测试失败')
      }
    } catch (error) {
      console.log('❌ 错误:', error.message)
      console.log('\n❌ 测试失败')
    }

    console.log('=' .repeat(70))
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1500))
  }

  console.log(`\n\n📊 测试结果汇总`)
  console.log('=' .repeat(70))
  console.log(`总测试数: ${totalTests}`)
  console.log(`通过: ${passedTests}`)
  console.log(`失败: ${totalTests - passedTests}`)
  console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试通过！')
  } else {
    console.log('\n⚠️  部分测试失败，请检查上述结果')
  }
}

testLLMWithMetadata().catch(console.error)
