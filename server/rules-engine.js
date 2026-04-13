/**
 * 规则引擎 - 第一道防线
 * 通过关键词匹配和正则表达式快速判断意图
 */

/**
 * 规则定义
 * 注意：规则顺序很重要，更具体的规则应该放在前面
 */
const RULES = [
  // 计数类规则（优先级更高，更具体）
  {
    name: 'count_pattern',
    patterns: [
      /.*多少个.*/,
      /.*有多少.*/,  // 移到这里，优先于 QUERY 的“有多少”
      /.*几个.*/,
      /.*统计.*/,
      /.*数量.*/,
      /.*计数.*/,
      /.*总数.*/,
      /.*一共.*/,
      /.*总计.*/,
    ],
    intent_type: 'COUNT',
    confidence: 0.85,
  },

  // 查询类规则
  {
    name: 'query_pattern',
    patterns: [
      /.*是多少.*/,
      /.*显示.*/,
      /.*查询.*/,
      /.*看一下.*/,
      /.*看看.*/,
      /.*告诉我.*/,
    ],
    intent_type: 'QUERY',
    confidence: 0.8,
  },

  // 排序类规则
  {
    name: 'sort_pattern',
    patterns: [
      /.*排名.*/,
      /.*排序.*/,
      /.*最高.*/,
      /.*最低.*/,
      /.*前.*名.*/,
      /.*top.*/i,
      /.*最.*的.*/,
    ],
    intent_type: 'SORT',
    confidence: 0.85,
  },

  // 过滤类规则
  {
    name: 'filter_pattern',
    patterns: [
      /.*筛选.*/,
      /.*过滤.*/,
      /.*查找.*等于.*/,
      /.*查找.*大于.*/,
      /.*查找.*小于.*/,
      /.*大于.*/,
      /.*小于.*/,
      /.*等于.*/,
      /.*不等于.*/,
      /.*包含.*/,
    ],
    intent_type: 'FILTER',
    confidence: 0.8,
  },
]

/**
 * 匹配用户输入的规则
 * @param {string} userInput - 用户输入
 * @returns {Object} 匹配结果 { matched: boolean, intent: string, confidence: number, rule_name: string }
 */
export function matchRules(userInput) {
  if (!userInput || userInput.trim().length === 0) {
    return { matched: false, intent: null, confidence: 0, rule_name: null }
  }

  const input = userInput.trim().toLowerCase()

  // 如果输入太短（小于3个字），可能是信息不完整
  if (input.length < 3) {
    return {
      matched: true,
      intent: 'INCOMPLETE',
      confidence: 0.9,
      rule_name: 'short_input',
    }
  }

  let bestMatch = {
    matched: false,
    intent: null,
    confidence: 0,
    rule_name: null,
  }

  // 遍历所有规则
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(input)) {
        // 如果找到更高的置信度匹配，更新最佳匹配
        if (rule.confidence > bestMatch.confidence) {
          bestMatch = {
            matched: true,
            intent: rule.intent_type,
            confidence: rule.confidence,
            rule_name: rule.name,
          }
        }
        // 如果置信度相同，保持第一个匹配
        break
      }
    }
  }

  // 如果没有匹配到任何规则，返回 INCOMPLETE
  if (!bestMatch.matched) {
    return {
      matched: true,
      intent: 'INCOMPLETE',
      confidence: 0.6,
      rule_name: 'no_pattern_matched',
    }
  }

  return bestMatch
}

/**
 * 检查是否需要进一步处理
 * 高置信度的规则匹配可以直接输出，低置信度需要 LLM 确认
 * @param {number} confidence - 置信度
 * @returns {boolean}
 */
export function isHighConfidence(confidence, threshold = 0.8) {
  return confidence >= threshold
}

/**
 * 获取规则列表（用于调试）
 */
export function getRules() {
  return RULES
}
