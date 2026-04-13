// Node.js 18+ 内置 fetch，无需额外导入

const API_URL = 'http://localhost:3001/api/sql/generate'

// 模拟元数据（用于测试 LLM 回退）
const mockMetadata = {
  tables: [
    {
      name: 'orders',
      columns: [
        { name: 'order_id', type: 'INTEGER' },
        { name: 'sales_amount', type: 'DECIMAL' },
        { name: 'quantity', type: 'INTEGER' },
        { name: 'order_date', type: 'DATE' },
        { name: 'region', type: 'VARCHAR' },
        { name: 'status', type: 'VARCHAR' },
      ],
    },
    {
      name: 'products',
      columns: [
        { name: 'product_id', type: 'INTEGER' },
        { name: 'product_name', type: 'VARCHAR' },
        { name: 'price', type: 'DECIMAL' },
        { name: 'category', type: 'VARCHAR' },
      ],
    },
    {
      name: 'users',
      columns: [
        { name: 'user_id', type: 'INTEGER' },
        { name: 'username', type: 'VARCHAR' },
        { name: 'email', type: 'VARCHAR' },
      ],
    },
  ],
}

async function testSQLGeneration() {
  const testCases = [
    {
      name: '测试1: 简单查询（规则生成）',
      intent: {
        intent_type: 'QUERY',
        table_name: 'orders',
        select_columns: ['sales_amount'],
        aggregation: 'SUM',
        conditions: [
          { column: 'date', operator: '=', value: '上个月' },
          { column: 'region', operator: '=', value: '华东' },
        ],
        group_by: ['region'],
      },
    },
    {
      name: '测试2: 排序查询（规则生成）',
      intent: {
        intent_type: 'SORT',
        table_name: 'products',
        select_columns: ['product_name', 'sales_volume'],
        conditions: [],
        order_by: { column: 'sales_volume', direction: 'DESC' },
        limit: 10,
      },
    },
    {
      name: '测试3: 计数查询（规则生成）',
      intent: {
        intent_type: 'COUNT',
        table_name: 'orders',
        select_columns: ['order_id'],
        aggregation: 'COUNT',
        conditions: [
          { column: 'status', operator: '=', value: 'completed' },
        ],
      },
    },
    {
      name: '测试4: 缺少表名（应回退到LLM并推断）',
      intent: {
        intent_type: 'QUERY',
        table_name: null,
        select_columns: ['sales_amount'],
        conditions: [],
        user_input: '查询销售额',
      },
      metadata: mockMetadata, // 提供元数据
      expectedTable: 'orders',
    },
    {
      name: '测试5: 复杂查询（规则生成）',
      intent: {
        intent_type: 'QUERY',
        table_name: 'orders',
        select_columns: ['region', 'product_category'],
        aggregation: 'SUM',
        conditions: [
          { column: 'date', operator: '>=', value: '2024-01-01' },
          { column: 'amount', operator: '>', value: 1000 },
        ],
        group_by: ['region', 'product_category'],
        order_by: { column: 'sales_amount', direction: 'DESC' },
        limit: 20,
      },
    },
  ]

  console.log('🧪 开始测试 SQL 生成功能\n')
  console.log('=' .repeat(70))

  let passedTests = 0
  let totalTests = testCases.length

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`)
    console.log('-'.repeat(70))
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: testCase.intent,
          metadata: testCase.metadata, // 传递元数据
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log('✅ SQL 生成成功')
        console.log(`   生成方式: ${result.method === 'rule-based' ? '📋 规则引擎' : '🤖 LLM'}`)
        console.log(`   意图类型: ${result.intent_type}`)
        console.log('\n   生成的 SQL:')
        console.log('   ' + '='.repeat(66))
        
        // 格式化显示 SQL
        const formattedSQL = result.sql
          .split('\n')
          .map(line => '   ' + line)
          .join('\n')
        console.log(formattedSQL)
        
        console.log('   ' + '='.repeat(66))
        
        // 检查表名是否符合预期
        if (testCase.expectedTable) {
          const sqlUpper = result.sql.toUpperCase()
          const expectedTableUpper = testCase.expectedTable.toUpperCase()
          
          if (sqlUpper.includes(`FROM ${expectedTableUpper}`) || 
              sqlUpper.includes(`FROM "${expectedTableUpper}"`)) {
            console.log(`✅ 表名推断正确: ${testCase.expectedTable}`)
          } else {
            console.log(`❌ 表名推断错误: 期望 ${testCase.expectedTable}，但 SQL 中未找到`)
            passedTests-- // 减少计数
          }
        }
        
        passedTests++
        console.log('\n✅ 测试通过')
      } else {
        console.log('❌ SQL 生成失败:', result.error)
        console.log('\n❌ 测试失败')
      }
    } catch (error) {
      console.log('❌ 请求失败:', error.message)
      console.log('\n❌ 测试失败')
    }

    console.log('=' .repeat(70))
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000))
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

testSQLGeneration().catch(console.error)
