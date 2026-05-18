/**
 * 意图识别主服务
 * 编排规则引擎、LLM分类器和实体提取器的完整流程
 */

import { matchRules, isHighConfidence } from './rules-engine.js'
import { classifyIntent, validateClassification } from './intent-classifier.js'
import { extractAndFillSlots, getSlotDescription } from './entity-extractor.js'

/**
 * 意图识别主流程
 * 按照流程图执行：
 * 用户输入 → 规则引擎过滤 →
 *   匹配明显模式 → 实体识别 → 输出结构化意图对象
 *   复杂/模糊查询 → LLM分类 → 置信度校验 →
 *     高置信度 → 实体识别 → 输出结构化意图对象
 *     低置信度 → 启动澄清对话
 *
 * @param {string} userInput - 用户输入
 * @param {Object} metadata - 数据库元数据（可选）
 * @returns {Object} 意图识别结果
 */
export async function recognizeIntent(userInput, metadata = null) {
  console.log('[Intent Recognition] 开始识别意图:', userInput)

  try {
    // 第一步：规则引擎过滤
    const ruleMatch = matchRules(userInput)
    console.log('[Intent Recognition] 规则匹配结果:', ruleMatch)

    if (ruleMatch.matched && isHighConfidence(ruleMatch.confidence)) {
      // 高置信度规则匹配，但仍需要 LLM 提取实体和推断槽位
      console.log('[Intent Recognition] 高置信度规则匹配，使用 LLM 提取实体')

      // 调用 LLM 进行实体识别和槽位推断
      const classification = await classifyIntent(userInput)
      console.log('[Intent Recognition] LLM 实体提取结果:', classification)

      const intentObject = extractAndFillSlots(
        userInput,
        ruleMatch.intent,  // 使用规则引擎的意图类型
        classification.entities || [],  // 使用 LLM 提取的实体
        classification.inferred_slots || null,  // 使用 LLM 推断的槽位
        metadata
      )

      // 如果是 INCOMPLETE 意图，返回需要澄清
      if (ruleMatch.intent === 'INCOMPLETE') {
        return {
          success: false,
          need_clarification: true,
          missing_slots: ['select_columns', 'table_name'],
          message: '请提供更详细的查询信息，例如：您想查询什么指标？在哪个表中？',
        }
      }

      // 检查是否有缺失的关键槽位
      if (intentObject.missing_slots.length > 0) {
        // 定义关键槽位：如果这些缺失，才需要澄清
        const criticalSlots = ['select_columns', 'table_name']  // 查询字段和表名都是必须的
        const hasCriticalMissing = intentObject.missing_slots.some(slot => 
          criticalSlots.includes(slot)
        )
        
        if (hasCriticalMissing) {
          // 缺少关键槽位，需要澄清
          const missingDescriptions = intentObject.missing_slots.map(getSlotDescription)
          return {
            success: false,
            need_clarification: true,
            missing_slots: intentObject.missing_slots,
            message: `我还缺少一些信息：${missingDescriptions.join('、')}。请补充这些信息。`,
            intent: intentObject,
          }
        }
      }

      return {
        success: true,
        intent: {
          ...intentObject,
          confidence: ruleMatch.confidence,
          reasoning: `通过规则引擎匹配到 ${ruleMatch.rule_name} 模式`,
        },
      }
    }

    // 第二步：LLM 分类（复杂或低置信度查询）
    console.log('[Intent Recognition] 调用 LLM 进行意图分类')
    const classification = await classifyIntent(userInput)
    console.log('[Intent Recognition] LLM 分类结果:', classification)

    // 第三步：验证分类结果
    if (!validateClassification(classification)) {
      throw new Error('LLM 分类结果格式不正确')
    }

    // 第四步：置信度校验
    if (!isHighConfidence(classification.confidence, 0.7)) {
      // 低置信度，需要澄清
      console.log('[Intent Recognition] 置信度较低，启动澄清对话')
      return {
        success: false,
        need_clarification: true,
        missing_slots: ['table_name', 'select_columns'],
        message: '我不太确定您的查询意图。请提供更多信息，例如：您想查询哪个表？需要哪些字段？',
      }
    }

    // 第五步：实体识别与槽位填充
    console.log('[Intent Recognition] 进行实体识别和槽位填充')
    const intentObject = extractAndFillSlots(
      userInput,
      classification.intent_type,
      classification.entities,
      classification.inferred_slots,  // 传入 LLM 推断的槽位
      metadata
    )

    // 检查是否有缺失的槽位
    if (intentObject.missing_slots.length > 0) {
      // 定义关键槽位：如果这些缺失，才需要澄清
      const criticalSlots = ['select_columns', 'table_name']  // 查询字段和表名都是必须的
      const hasCriticalMissing = intentObject.missing_slots.some(slot => 
        criticalSlots.includes(slot)
      )
      
      if (hasCriticalMissing) {
        // 缺少关键槽位，需要澄清
        const missingDescriptions = intentObject.missing_slots.map(getSlotDescription)
        return {
          success: false,
          need_clarification: true,
          missing_slots: intentObject.missing_slots,
          message: `我还缺少一些信息：${missingDescriptions.join('、')}。请补充这些信息。`,
          intent: intentObject,
        }
      }
      
      // 非关键槽位缺失，仍然返回成功结果（带警告）
      console.log('[Intent Recognition] 非关键槽位缺失，继续处理:', intentObject.missing_slots)
    }

    // 第六步：返回完整的意图对象
    console.log('[Intent Recognition] 意图识别成功')
    return {
      success: true,
      intent: {
        ...intentObject,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
      },
    }
  } catch (error) {
    console.error('[Intent Recognition] 意图识别失败:', error.message)

    // 如果 LLM 调用失败，尝试降级到规则引擎结果
    const ruleMatch = matchRules(userInput)
    if (ruleMatch.matched) {
      console.log('[Intent Recognition] 降级使用规则引擎结果')
      
      // 对于 COUNT 意图，自动填充 selectColumns
      let missingSlots = ['select_columns', 'table_name']
      let selectColumns = []
      let aggregation = undefined
      
      if (ruleMatch.intent === 'COUNT') {
        selectColumns = ['id']
        aggregation = 'COUNT'
        missingSlots = ['table_name']  // COUNT 不需要 select_columns
      }
      
      return {
        success: true,
        intent: {
          intent_type: ruleMatch.intent,
          confidence: 0.5, // 降低置信度
          entities: [],
          select_columns: selectColumns,
          conditions: [],
          aggregation: aggregation,
          missing_slots: missingSlots,
          reasoning: `LLM 调用失败，使用规则引擎结果 (${ruleMatch.rule_name})`,
        },
      }
    }

    throw error
  }
}

/**
 * 处理澄清对话
 * @param {string} originalQuery - 原始查询
 * @param {Array} missingSlots - 缺失的槽位
 * @param {string} userResponse - 用户补充的信息
 * @param {Object} partialIntent - 部分识别的意图对象
 * @param {Object} metadata - 数据库元数据
 * @returns {Object} 更新后的意图识别结果
 */
export async function clarifyIntent(
  originalQuery,
  missingSlots,
  userResponse,
  partialIntent = null,
  metadata = null
) {
  console.log('[Intent Clarification] 处理澄清对话:', {
    originalQuery,
    missingSlots,
    userResponse,
  })

  try {
    // 构建完整的查询（原始查询 + 用户补充）
    const fullQuery = `${originalQuery}。${userResponse}`

    // 重新进行意图识别
    const result = await recognizeIntent(fullQuery, metadata)

    // 如果仍然不完整，继续澄清
    if (!result.success && result.need_clarification) {
      // 过滤掉已经澄清过的槽位
      const newMissingSlots = result.missing_slots.filter(
        (slot) => !missingSlots.includes(slot)
      )

      if (newMissingSlots.length === 0) {
        // 所有槽位都已澄清，但仍然不完整
        return {
          success: false,
          need_clarification: true,
          missing_slots: [],
          message: '抱歉，我仍然无法理解您的查询。请尝试用更完整的方式描述您的问题。',
        }
      }

      const missingDescriptions = newMissingSlots.map(getSlotDescription)
      return {
        success: false,
        need_clarification: true,
        missing_slots: newMissingSlots,
        message: `还需要补充：${missingDescriptions.join('、')}`,
      }
    }

    return result
  } catch (error) {
    console.error('[Intent Clarification] 澄清对话处理失败:', error.message)
    throw error
  }
}

/**
 * 批量识别意图（用于测试）
 * @param {Array} queries - 查询列表
 * @param {Object} metadata - 数据库元数据
 * @returns {Array} 识别结果列表
 */
export async function batchRecognizeIntents(queries, metadata = null) {
  const results = []

  for (const query of queries) {
    try {
      const result = await recognizeIntent(query, metadata)
      results.push({
        query,
        ...result,
      })
    } catch (error) {
      results.push({
        query,
        success: false,
        error: error.message,
      })
    }
  }

  return results
}
