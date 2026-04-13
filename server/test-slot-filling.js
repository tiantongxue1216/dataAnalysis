// Node.js 18+ 内置 fetch，无需额外导入

const API_URL = 'http://localhost:3001/api/intent/recognize'

async function testSlotFilling() {
  const testCases = [
    {
      name: '测试1: 上个月华东地区销售额趋势',
      query: '上个月华东地区销售额趋势',
      expectedTable: 'orders',
    },
    {
      name: '测试2: 用户数量统计',
      query: '用户数量统计',
      expectedTable: 'users',
    },
    {
      name: '测试3: 产品销量排行',
      query: '产品销量排行',
      expectedTable: 'products',
    },
  ]

  console.log('🧪 开始测试 LLM 槽位填充功能\n')
  console.log('=' .repeat(60))

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`)
    console.log('-'.repeat(60))
    
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
      
      console.log('📡 API 响应状态:', response.status)
      console.log('📦 完整响应:', JSON.stringify(result, null, 2))

      if (result.success) {
        console.log('✅ 意图识别成功')
        console.log(`   意图类型: ${result.intent?.intent_type}`)
        console.log(`   置信度: ${(result.intent?.confidence * 100).toFixed(1)}%`)
        console.log(`   表名: ${result.intent?.table_name || '未设置'}`)
        console.log(`   查询字段: ${result.intent?.select_columns?.join(', ') || '无'}`)
        
        if (result.need_clarification) {
          console.log('❌ 需要澄清:', result.message)
        } else {
          console.log('✅ 无需澄清，可以直接执行')
        }
        
        // 检查是否有推断的槽位
        if (result.intent?.inferred_slots) {
          console.log('🔍 LLM 推断的槽位:', JSON.stringify(result.intent.inferred_slots, null, 2))
        }
      } else {
        console.log('❌ 意图识别失败:', result.message)
      }
    } catch (error) {
      console.log('❌ 请求失败:', error.message)
    }

    console.log('=' .repeat(60))
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n✨ 测试完成')
}

testSlotFilling().catch(console.error)
