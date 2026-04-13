// Node.js 18+ 内置 fetch，无需额外导入

const API_URL = 'http://localhost:3001/api/intent/recognize'

async function testTableNameAsCriticalSlot() {
  const testCases = [
    {
      name: '测试1: 有明确指标但无表名（应该触发澄清）',
      query: '上个月销售额趋势',
      expectClarification: true,
    },
    {
      name: '测试2: 有产品相关指标（LLM应推断表名）',
      query: '产品销量排行',
      expectClarification: false,
    },
    {
      name: '测试3: 有订单相关指标（LLM应推断表名）',
      query: '订单数量统计',
      expectClarification: false,
    },
    {
      name: '测试4: 模糊查询（应该触发澄清）',
      query: '数据统计',
      expectClarification: true,
    },
  ]

  console.log('🧪 开始测试 table_name 作为关键槽位\n')
  console.log('=' .repeat(70))

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

      if (result.success) {
        console.log('✅ 意图识别成功')
        console.log(`   意图类型: ${result.intent?.intent_type}`)
        console.log(`   置信度: ${(result.intent?.confidence * 100).toFixed(1)}%`)
        console.log(`   表名: ${result.intent?.table_name || '❌ 未设置'}`)
        console.log(`   查询字段: ${result.intent?.select_columns?.join(', ') || '无'}`)
        
        if (result.need_clarification) {
          console.log('❌ 需要澄清:', result.message)
          console.log('   缺失槽位:', result.missing_slots?.join(', '))
          
          if (!testCase.expectClarification) {
            console.log('⚠️  警告: 预期不需要澄清，但实际触发了澄清！')
          }
        } else {
          console.log('✅ 无需澄清，可以直接执行')
          
          if (testCase.expectClarification) {
            console.log('⚠️  警告: 预期需要澄清，但实际未触发！')
          }
        }
        
        // 检查是否有推断的槽位
        if (result.intent?.inferred_slots && Object.keys(result.intent.inferred_slots).length > 0) {
          console.log('🔍 LLM 推断的槽位:')
          console.log('   ', JSON.stringify(result.intent.inferred_slots, null, 2).split('\n').join('\n    '))
        }
      } else {
        console.log('❌ 意图识别失败:', result.error || result.message)
      }
    } catch (error) {
      console.log('❌ 请求失败:', error.message)
    }

    console.log('=' .repeat(70))
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1500))
  }

  console.log('\n✨ 测试完成')
}

testTableNameAsCriticalSlot().catch(console.error)
