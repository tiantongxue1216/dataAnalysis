/**
 * 实体识别与槽位填充器
 * 从用户查询中提取实体并填充到结构化的意图对象中
 */

/**
 * 时间表达式映射表（常见时间表达的标准化）
 */
const TIME_MAPPINGS = {
  '今天': 'CURRENT_DATE',
  '昨天': 'DATE_SUB(CURRENT_DATE, 1)',
  '前天': 'DATE_SUB(CURRENT_DATE, 2)',
  '明天': 'DATE_ADD(CURRENT_DATE, 1)',
  '本周': 'CURRENT_WEEK',
  '上周': 'LAST_WEEK',
  '本月': 'CURRENT_MONTH',
  '上月': 'LAST_MONTH',
  '今年': 'CURRENT_YEAR',
  '去年': 'LAST_YEAR',
  '最近7天': 'LAST_7_DAYS',
  '最近30天': 'LAST_30_DAYS',
  '最近三个月': 'LAST_3_MONTHS',
  '最近一年': 'LAST_YEAR',
}

/**
 * 指标映射表（常见指标的聚合函数）
 */
const METRIC_AGGREGATIONS = {
  '销量': { column: 'sales_amount', aggregation: 'SUM' },
  '销售额': { column: 'sales_amount', aggregation: 'SUM' },
  '订单数': { column: 'order_id', aggregation: 'COUNT' },
  '用户数': { column: 'user_id', aggregation: 'COUNT' },
  '平均价格': { column: 'price', aggregation: 'AVG' },
  '利润': { column: 'profit', aggregation: 'SUM' },
  '数量': { column: 'quantity', aggregation: 'SUM' },
  '金额': { column: 'amount', aggregation: 'SUM' },
}

/**
 * 提取数字和限制条件
 * @param {string} userInput - 用户输入
 * @returns {Object} 提取的限制条件
 */
function extractLimits(userInput) {
  const limits = {}

  // 匹配 "前N名"、"Top N"
  const topMatch = userInput.match(/(?:前|top)[:：\s]*(\d+)(?:名)?/i)
  if (topMatch) {
    limits.limit = parseInt(topMatch[1])
  }

  // 匹配 "大于N"、"超过N"
  const greaterMatch = userInput.match(/(?:大于|超过|高于)[:：\s]*(\d+)/)
  if (greaterMatch) {
    limits.greater_than = parseInt(greaterMatch[1])
  }

  // 匹配 "小于N"、"低于N"
  const lessMatch = userInput.match(/(?:小于|低于)[:：\s]*(\d+)/)
  if (lessMatch) {
    limits.less_than = parseInt(lessMatch[1])
  }

  return limits
}

/**
 * 从实体列表构建查询条件
 * @param {Array} entities - 实体列表
 * @param {Object} limits - 限制条件
 * @returns {Object} 查询条件和字段信息
 */
function buildQueryStructure(entities, limits) {
  const conditions = []
  const selectColumns = []
  let aggregation = 'NONE'
  let groupBy = []
  let orderBy = null

  // 处理每个实体
  for (const entity of entities) {
    switch (entity.entity_type) {
      case 'METRIC':
        // 指标实体
        const metricInfo = METRIC_AGGREGATIONS[entity.value] || {
          column: entity.value,
          aggregation: 'SUM',
        }
        selectColumns.push(metricInfo.column)
        aggregation = metricInfo.aggregation
        break

      case 'TIME':
        // 时间实体 - 添加到条件
        const timeValue = TIME_MAPPINGS[entity.value] || entity.value
        conditions.push({
          column: 'date',
          operator: '=',
          value: timeValue,
        })
        break

      case 'REGION':
        // 地域实体 - 添加到条件
        conditions.push({
          column: 'region',
          operator: '=',
          value: entity.value,
        })
        groupBy.push('region')
        break

      case 'DIMENSION':
        // 维度实体 - 用于分组
        groupBy.push(entity.value)
        break

      case 'VALUE':
        // 数值实体 - 可能是比较条件
        if (limits.greater_than) {
          conditions.push({
            column: selectColumns[0] || 'amount',
            operator: '>',
            value: limits.greater_than,
          })
        } else if (limits.less_than) {
          conditions.push({
            column: selectColumns[0] || 'amount',
            operator: '<',
            value: limits.less_than,
          })
        }
        break

      case 'OPERATION':
        // 操作实体 - 修改聚合函数
        const opMap = {
          '求和': 'SUM',
          '平均': 'AVG',
          '最大': 'MAX',
          '最小': 'MIN',
          '计数': 'COUNT',
        }
        aggregation = opMap[entity.value] || aggregation
        break
    }
  }

  // 处理排序
  if (limits.limit) {
    orderBy = {
      column: selectColumns[0] || 'amount',
      direction: 'DESC',
    }
  }

  return {
    selectColumns,
    conditions,
    aggregation,
    groupBy: groupBy.length > 0 ? groupBy : undefined,
    orderBy,
    limit: limits.limit,
  }
}

/**
 * 识别实体并填充槽位
 * @param {string} userInput - 用户输入
 * @param {string} intentType - 意图类型
 * @param {Array} entities - 已识别的实体列表
 * @param {Object} inferredSlots - LLM 推断的槽位（可选）
 * @param {Object} metadata - 数据库元数据（可选）
 * @returns {Object} 完整的意图对象
 */
export function extractAndFillSlots(userInput, intentType, entities, inferredSlots = null, metadata = null) {
  // 如果传入了 metadata，将 inferredSlots 放在后面
  if (arguments.length === 4 && typeof arguments[3] === 'object' && !Array.isArray(arguments[3]) && arguments[3].apiKey === undefined) {
    // 旧版本调用兼容：extractAndFillSlots(userInput, intentType, entities, metadata)
    metadata = arguments[3]
    inferredSlots = null
  }
  
  // 提取限制条件
  const limits = extractLimits(userInput)

  // 构建查询结构
  const queryStructure = buildQueryStructure(entities, limits)

  // 使用 LLM 推断的槽位（如果有）
  if (inferredSlots) {
    console.log('[Slot Filling] 使用 LLM 推断的槽位:', inferredSlots)
    if (inferredSlots.table_name) {
      queryStructure.table_name = inferredSlots.table_name
    }
  }

  // 确定缺失的槽位
  const missingSlots = []
  
  // 检查查询字段
  if (!queryStructure.selectColumns.length) {
    missingSlots.push('select_columns')
  }
  
  // 检查表名（仅在提供元数据时才严格要求）
  if (metadata && !queryStructure.table_name) {
    missingSlots.push('table_name')
  }
  
  // 如果没有元数据且没有 LLM 推断，尝试从实体中推断表名
  if (!metadata && !inferredSlots && !queryStructure.table_name && entities.length > 0) {
    // 根据实体类型推断可能的表
    const hasOrderEntity = entities.some(e => 
      e.value.includes('订单') || e.value.includes('order')
    )
    const hasUserEntity = entities.some(e => 
      e.value.includes('用户') || e.value.includes('user')
    )
    const hasProductEntity = entities.some(e => 
      e.value.includes('产品') || e.value.includes('商品')
    )
    
    if (hasOrderEntity) {
      queryStructure.table_name = 'orders'
    } else if (hasUserEntity) {
      queryStructure.table_name = 'users'
    } else if (hasProductEntity) {
      queryStructure.table_name = 'products'
    }
  }

  // 构建完整的意图对象
  const intentObject = {
    intent_type: intentType,
    confidence: 0.85,
    entities,
    table_name: queryStructure.table_name,  // 添加表名字段
    select_columns: queryStructure.selectColumns,
    aggregation: queryStructure.aggregation !== 'NONE' ? queryStructure.aggregation : undefined,
    conditions: queryStructure.conditions,
    group_by: queryStructure.groupBy,
    order_by: queryStructure.orderBy,
    limit: queryStructure.limit,
    missing_slots: missingSlots,
    inferred_slots: inferredSlots || {},  // 添加 LLM 推断的槽位信息
  }

  return intentObject
}

/**
 * 检查意图对象是否完整（所有必需槽位已填充）
 * @param {Object} intentObject - 意图对象
 * @returns {boolean}
 */
export function isIntentComplete(intentObject) {
  return intentObject.missing_slots.length === 0
}

/**
 * 获取槽位描述（用于向用户询问缺失信息）
 * @param {string} slotName - 槽位名称
 * @returns {string} 槽位的中文描述
 */
export function getSlotDescription(slotName) {
  const descriptions = {
    select_columns: '要查询的指标或字段',
    table_name: '要查询的表名',
    conditions: '筛选条件',
    time_range: '时间范围',
  }
  return descriptions[slotName] || slotName
}
