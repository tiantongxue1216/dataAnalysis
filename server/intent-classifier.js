/**
 * 意图分类器
 * 使用 DeepSeek API 对复杂查询进行意图分类
 */

import { callDeepSeekAPI, parseDeepSeekResponse } from './deepseek-client.js'

/**
 * 意图分类系统提示词
 */
const SYSTEM_PROMPT = `你是一个专业的数据分析助手，负责理解用户的数据查询意图。

你的任务是将用户的自然语言查询分类为以下意图类型之一：

1. **QUERY** (查询): 用户想要查看/获取某些数据
   - 示例: "今天的销量是多少？", "显示上个月的订单"

2. **COUNT** (计数): 用户想要统计数据数量
   - 示例: "有多少订单？", "统计用户数量"

3. **FILTER** (过滤): 用户想要筛选特定条件的数据
   - 示例: "查找销售额大于1000的订单", "筛选华东区的记录"

4. **SORT** (排序): 用户想要按某个字段排序
   - 示例: "按销售额排序", "显示前10名", "最高销量的产品"

5. **INCOMPLETE** (信息不完整): 查询缺少关键信息，需要用户补充
   - 示例: "销量", "订单", "用户"

识别用户查询中提到的实体，实体类型包括：
- **TIME**: 时间相关（今天、昨天、上个月、2024年等）
- **REGION**: 地域相关（华东、华南、北京等）
- **METRIC**: 指标/度量（销量、金额、利润等）
- **DIMENSION**: 维度（产品、用户、订单等）
- **VALUE**: 具体数值（1000、top 10等）
- **OPERATION**: 操作（求和、平均、最大、最小等）

**重要：槽位填充规则**
当检测到槽位缺失时，请根据上下文和常识进行智能推断：
1. 如果用户提到"订单"相关指标，推断表名为 "orders"
2. 如果用户提到"用户"相关指标，推断表名为 "users"
3. 如果用户提到"产品"相关指标，推断表名为 "products"
4. 如果用户提到"销售"相关指标，推断表名为 "orders"
5. 时间实体如果没有明确年份，推断为当前年份
6. 地域实体请保持原始值，不要自行标准化

请以 JSON 格式返回结果，格式如下：
{
  "intent_type": "QUERY|COUNT|FILTER|SORT|INCOMPLETE",
  "confidence": 0.95,
  "entities": [
    {"entity_type": "TIME", "value": "上个月", "normalized": "2024-03", "inferred": false},
    {"entity_type": "METRIC", "value": "销售额", "column_name": "total_amount", "inferred": false}
  ],
  "inferred_slots": {
    "table_name": "orders",
    "reason": "查询包含销售额指标，推断为订单表"
  },
  "reasoning": "简要说明分类理由、实体识别过程和槽位推断逻辑"
}

**重要提示**:
- 时间字段统一使用 created_at（所有表）
- 订单金额字段使用 total_amount（orders 表）
- 产品单价使用 unit_price（order_items 表）
- 不要使用 date、sales_amount、price 等不存在的字段

要求：
1. confidence 是一个 0-1 之间的数字，表示你对分类结果的信心程度
2. entities 数组包含识别到的所有实体
3. normalized 字段用于时间类实体的标准化（如果适用）
4. column_name 是实体对应的数据库列名（如果已知）
5. inferred_slots 包含你推断出的缺失槽位及其原因
6. inferred 字段标记该实体是否为推断得出（true/false）
7. reasoning 要简洁明了，包含推断逻辑
8. 只返回 JSON，不要其他任何内容
9. 尽量通过推断补全缺失槽位，减少用户澄清次数`

/**
 * 分类用户查询的意图
 * @param {string} userInput - 用户输入
 * @returns {Object} 分类结果
 */
export async function classifyIntent(userInput) {
  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userInput },
    ]

    const response = await callDeepSeekAPI(messages, {
      temperature: 0.2, // 低温度以获得更稳定的输出
      maxTokens: 1500,
      response_format: { type: 'json_object' }, // 意图分类需要 JSON 格式
    })

    // 解析返回结果
    const content = response.choices[0].message.content
    const result = parseDeepSeekResponse(content)

    // 验证返回结果格式
    if (!result.intent_type || !result.entities || result.confidence === undefined) {
      throw new Error('DeepSeek 返回的结果格式不正确')
    }

    return {
      intent_type: result.intent_type,
      confidence: result.confidence,
      entities: result.entities || [],
      inferred_slots: result.inferred_slots || {},  // LLM 推断的槽位
      reasoning: result.reasoning || '',
    }
  } catch (error) {
    console.error('意图分类失败:', error.message)
    throw error
  }
}

/**
 * 验证意图分类结果
 * @param {Object} classification - 分类结果
 * @returns {boolean} 是否有效
 */
export function validateClassification(classification) {
  const validIntents = ['QUERY', 'COUNT', 'FILTER', 'SORT', 'INCOMPLETE']
  const validEntityTypes = ['TIME', 'REGION', 'METRIC', 'DIMENSION', 'VALUE', 'OPERATION']

  if (!validIntents.includes(classification.intent_type)) {
    return false
  }

  if (classification.confidence < 0 || classification.confidence > 1) {
    return false
  }

  if (!Array.isArray(classification.entities)) {
    return false
  }

  // 验证实体格式
  for (const entity of classification.entities) {
    if (!entity.entity_type || !entity.value) {
      return false
    }
    if (!validEntityTypes.includes(entity.entity_type)) {
      return false
    }
  }

  // 验证 inferred_slots 格式（可选字段）
  if (classification.inferred_slots && typeof classification.inferred_slots !== 'object') {
    return false
  }

  return true
}
