import dotenv from 'dotenv'
dotenv.config()

import { generateSQLByLLM } from './sql-generator.js'

async function testLLMSQL() {
  const intent = {
    intent_type: 'QUERY',
    table_name: null,
    select_columns: ['sales_amount'],
    conditions: [],
    user_input: '查询销售额',
  }

  console.log('🧪 测试 LLM SQL 生成\n')
  
  try {
    const result = await generateSQLByLLM(intent)
    
    if (result.success) {
      console.log('✅ LLM 生成成功')
      console.log('生成的 SQL:', result.sql)
      console.log('\nLLM 原始响应:')
      console.log(result.reasoning)
    } else {
      console.log('❌ LLM 生成失败:', result.error)
    }
  } catch (error) {
    console.error('❌ 错误:', error.message)
  }
}

testLLMSQL().catch(console.error)
