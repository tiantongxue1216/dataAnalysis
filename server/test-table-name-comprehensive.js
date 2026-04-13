// Node.js 18+ 内置 fetch，无需额外导入

const API_URL = 'http://localhost:3001/api/intent/recognize'

async function testTableNameClarification() {
  const testCases = [
    {
      name: '测试1: LLM能推断表名（销售额→orders）',
      query: '上个月销售额趋势',
      expectClarification: false,
      expectedTable: 'orders',
    },
    {
      name: '测试2: LLM能推断表名（产品→products）',
      query: '产品销量排行',
      expectClarification: false,
      expectedTable: 'products',
    },
    {
      name: '测试3: 规则引擎匹配但无实体（缺少select_columns）',
      query: '订单数量统计',
      expectClarification: true,
      expectedMissingSlots: ['select_columns'],
    },
    {
      name: '测试4: 模糊查询（缺少select_columns和table_name）',
      query: '数据统计',
      expectClarification: true,
      expectedMissingSlots: ['select_columns'],
    },
    {
      name: '测试5: 明确提到表名但缺少具体指标（应触发澄清）',
      query: '查询orders表中上个月的数据',
      expectClarification: true,
      expectedMissingSlots: ['select_columns'],
    },
  ]

  console.log('🧪 测试 table_name 关键槽位行为\n')
  console.log('=' .repeat(70))

  let passedTests = 0
  let totalTests = testCases.length

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`)
    console.log('-'.repeat(70))
    console.log(`查询: "${testCase.query}"`)
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: testCase.query,
        }),
      })

      const result = await response.json()

      let testPassed = true

      if (result.success) {
        console.log('✅ 意图识别成功')
        console.log(`   意图类型: ${result.intent?.intent_type}`)
        console.log(`   置信度: ${(result.intent?.confidence * 100).toFixed(1)}%`)
        console.log(`   表名: ${result.intent?.table_name || '❌ 未设置'}`)
        console.log(`   查询字段: ${result.intent?.select_columns?.join(', ') || '无'}`)
        
        // 检查是否需要澄清
        if (result.need_clarification) {
          console.log('❌ 需要澄清:', result.message)
          console.log('   缺失槽位:', result.missing_slots?.join(', '))
          
          if (!testCase.expectClarification) {
            console.log('⚠️  测试失败: 预期不需要澄清，但实际触发了澄清！')
            testPassed = false
          } else {
            console.log('✅ 符合预期：触发了澄清')
          }
        } else {
          console.log('✅ 无需澄清，可以直接执行')
          
          if (testCase.expectClarification) {
            console.log('⚠️  测试失败: 预期需要澄清，但实际未触发！')
            testPassed = false
          } else {
            console.log('✅ 符合预期：未触发澄清')
          }
          
          // 检查表名是否符合预期
          if (testCase.expectedTable) {
            if (result.intent?.table_name === testCase.expectedTable) {
              console.log(`✅ 表名推断正确: ${testCase.expectedTable}`)
            } else {
              console.log(`❌ 表名推断错误: 期望 ${testCase.expectedTable}，实际 ${result.intent?.table_name || '未设置'}`)
              testPassed = false
            }
          }
        }
        
        // 显示 LLM 推断的槽位
        if (result.intent?.inferred_slots && Object.keys(result.intent.inferred_slots).length > 0) {
          console.log('🔍 LLM 推断的槽位:')
          console.log('   ', JSON.stringify(result.intent.inferred_slots, null, 2).split('\n').join('\n    '))
        }
      } else {
        console.log('❌ 意图识别失败:', result.error || result.message)
        
        if (testCase.expectClarification) {
          console.log('✅ 符合预期：触发了澄清')
        } else {
          console.log('⚠️  测试失败: 预期成功，但实际失败！')
          testPassed = false
        }
      }

      if (testPassed) {
        passedTests++
        console.log('\n✅ 测试通过')
      } else {
        console.log('\n❌ 测试失败')
      }
    } catch (error) {
      console.log('❌ 请求失败:', error.message)
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

testTableNameClarification().catch(console.error)
