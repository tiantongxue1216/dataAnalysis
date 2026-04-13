/**
 * 测试 LLM 调用
 */
import dotenv from 'dotenv'
import { recognizeIntent } from './intent-service.js'

// 加载环境变量
dotenv.config()

const testQueries = [
  '上个月华东地区销售额趋势',
  '今天的销量是多少？',
  '华东区有多少订单？',
  '按销售额排序，显示前10名',
]

console.log('API Key:', process.env.DEEPSEEK_API_KEY ? '已配置' : '未配置')
console.log('API URL:', process.env.DEEPSEEK_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions')
console.log('Model:', process.env.DEEPSEEK_MODEL || 'deepseek-v3.2')
console.log('='.repeat(60))

for (const testQuery of testQueries) {
  console.log(`\n📝 测试查询: "${testQuery}"`)
  console.log('-'.repeat(60))
  
  try {
    const startTime = Date.now()
    const result = await recognizeIntent(testQuery)
    const duration = Date.now() - startTime
    
    if (result.success && result.intent) {
      console.log(`✅ 意图识别成功 (${duration}ms)`)
      console.log(`   意图类型: ${result.intent.intent_type}`)
      console.log(`   置信度: ${(result.intent.confidence * 100).toFixed(1)}%`)
      if (result.intent.reasoning) {
        console.log(`   推理: ${result.intent.reasoning}`)
      }
    } else if (result.need_clarification) {
      console.log(`❓ 需要澄清 (${duration}ms)`)
      console.log(`   消息: ${result.message}`)
    } else {
      console.log(`❌ 识别失败 (${duration}ms)`)
    }
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`)
  }
}
