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
 * 地区名称映射表（标准化地区名称）
 */
const REGION_MAPPINGS = {
  '华东区': '华东',
  '华南区': '华南',
  '华北区': '华北',
  '华中区': '华中',
  '西南区': '西南',
  '西北区': '西北',
  '东北区': '东北',
}

/**
 * 将相对时间转换为具体日期
 */
function normalizeTimeValue(timeKey) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-11
  
  switch (timeKey) {
    case 'LAST_MONTH':
      // 上个月的第一天
      const lastMonth = month === 0 ? 11 : month - 1
      const lastMonthYear = month === 0 ? year - 1 : year
      return `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}-01`
    
    case 'LAST_WEEK':
      // 7天前
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return lastWeek.toISOString().split('T')[0]
    
    case 'LAST_7_DAYS':
      // 7天前
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return sevenDaysAgo.toISOString().split('T')[0]
    
    case 'LAST_30_DAYS':
      // 30天前
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return thirtyDaysAgo.toISOString().split('T')[0]
    
    case 'LAST_3_MONTHS':
      // 3个月前
      const threeMonthsAgo = new Date(year, month - 3, 1)
      return threeMonthsAgo.toISOString().split('T')[0]
    
    case 'CURRENT_MONTH':
      // 本月第一天
      return `${year}-${String(month + 1).padStart(2, '0')}-01`
    
    case 'CURRENT_YEAR':
      // 今年第一天
      return `${year}-01-01`
    
    case 'LAST_YEAR':
      // 去年第一天
      return `${year - 1}-01-01`
    
    default:
      // 如果已经是具体日期，直接返回
      return timeKey
  }
}

/**
 * 指标映射表（常见指标的聚合函数）
 * 注意：某些指标在不同表中对应不同字段
 */
const METRIC_AGGREGATIONS = {
  // 通用指标
  '销售额': { column: 'total_amount', aggregation: 'SUM' },
  '订单数': { column: 'id', aggregation: 'COUNT' },
  '用户数': { column: 'user_id', aggregation: 'COUNT' },
  '平均价格': { column: 'unit_price', aggregation: 'AVG' },
  '利润': { column: 'profit', aggregation: 'SUM' },
  '金额': { column: 'total_amount', aggregation: 'SUM' },
  
  // 销量/数量 - 需要根据表名动态选择
  '销量': { dynamic: true, defaultColumn: 'quantity', aggregation: 'SUM' },
  '数量': { dynamic: true, defaultColumn: 'quantity', aggregation: 'SUM' },
}

/**
 * 根据表名获取指标的实际字段
 */
function getMetricColumn(metricName, tableName) {
  const metricInfo = METRIC_AGGREGATIONS[metricName]
  if (!metricInfo) return null
  
  // 如果是动态字段，根据表名选择
  if (metricInfo.dynamic) {
    // order_items 表使用 quantity
    if (tableName === 'order_items') {
      return { column: 'quantity', aggregation: metricInfo.aggregation }
    }
    // orders 表如果有 quantity 字段也用 quantity，否则用默认值
    if (tableName === 'orders') {
      return { column: metricInfo.defaultColumn || 'quantity', aggregation: metricInfo.aggregation }
    }
    // 其他表使用默认值
    return { column: metricInfo.defaultColumn, aggregation: metricInfo.aggregation }
  }
  
  // 静态字段直接返回
  return { column: metricInfo.column, aggregation: metricInfo.aggregation }
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
 * @param {Object} inferredSlots - LLM 推断的槽位（可选）
 * @returns {Object} 查询条件和字段信息
 */
function buildQueryStructure(entities, limits, inferredSlots = null) {
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
        // 获取表名（从 inferredSlots 或 entities 中推断）
        const tableName = inferredSlots?.table_name || 
                         entities.find(e => e.entity_type === 'DIMENSION' && e.value.includes('订单')) ? 'orders' :
                         'orders'
        
        // 使用动态字段映射
        const metricInfo = getMetricColumn(entity.value, tableName) || {
          column: entity.column_name || entity.value,
          aggregation: 'SUM',
        }
        selectColumns.push(metricInfo.column)
        aggregation = metricInfo.aggregation
        break

      case 'TIME':
        // 时间实体 - 添加到条件
        let timeValue
        
        // 优先使用 LLM 返回的 normalized 值
        if (entity.normalized) {
          // 将 normalized 转换为大写以匹配映射表
          const normalizedUpper = entity.normalized.toUpperCase()
          timeValue = TIME_MAPPINGS[entity.value] || normalizedUpper
        } else {
          // 先尝试直接匹配，如果失败则去除空格后再次匹配
          timeValue = TIME_MAPPINGS[entity.value] || entity.value
          if (timeValue === entity.value) {
            // 直接匹配失败，尝试去除空格
            const normalizedKey = entity.value.replace(/\s+/g, '')
            timeValue = TIME_MAPPINGS[normalizedKey] || entity.value
          }
        }
        
        // 将相对时间转换为具体日期
        const normalizedTime = normalizeTimeValue(timeValue)
        // 根据推断的表名选择正确的时间字段
        const timeColumn = inferredSlots?.table_name === 'users' ? 'created_at' : 
                          inferredSlots?.table_name === 'order_items' ? 'created_at' :
                          'created_at' // orders 表默认
        conditions.push({
          column: timeColumn,
          operator: '>=',
          value: normalizedTime,
        })
        break

      case 'REGION':
        // 地域实体 - 添加到条件
        // 标准化地区名称（如“华东区” → “华东”）
        const normalizedRegion = REGION_MAPPINGS[entity.value] || entity.value
        
        // 如果是“各地区”、“所有地区”等表示全部的词，不添加过滤条件，只添加到 GROUP BY
        const allRegionKeywords = ['各地区', '所有地区', '全部地区', '每个地区']
        if (!allRegionKeywords.includes(entity.value)) {
          conditions.push({
            column: 'region',
            operator: '=',
            value: normalizedRegion,
          })
        }
        // 始终添加到 GROUP BY（如果还没有）
        if (!groupBy.includes('region')) {
          groupBy.push('region')
        }
        break

      case 'DIMENSION':
        // 维度实体 - 用于分组
        // 只添加有效的数据库字段名，忽略“趋势”等抽象概念
        const validDimensions = ['region', 'status', 'product_name', 'product_category', 'created_at']
        if (validDimensions.includes(entity.value)) {
          groupBy.push(entity.value)
        } else if (entity.column_name && validDimensions.includes(entity.column_name)) {
          // 如果 LLM 提供了 column_name，使用它
          groupBy.push(entity.column_name)
        }
        // 否则忽略该维度（如“趋势”）
        break

      case 'VALUE':
        // 数值实体 - 可能是比较条件
        if (limits.greater_than) {
          conditions.push({
            column: selectColumns[0] || 'total_amount',
            operator: '>',
            value: limits.greater_than,
          })
        } else if (limits.less_than) {
          conditions.push({
            column: selectColumns[0] || 'total_amount',
            operator: '<',
            value: limits.less_than,
          })
        }
        break

      case 'OPERATION':
        // 操作实体 - 修改聚合函数或排序
        const opMap = {
          '求和': 'SUM',
          '平均': 'AVG',
          '最大': 'MAX',
          '最小': 'MIN',
          '计数': 'COUNT',
        }
        
        // 检查是否是排序操作
        const sortKeywords = ['排名', '排序', '降序', '升序']
        if (sortKeywords.includes(entity.value)) {
          // 设置排序方向
          const direction = (entity.normalized === 'DESC' || entity.value === '降序') ? 'DESC' : 'ASC'
          // 稍后在 orderBy 中处理
          if (!orderBy) {
            orderBy = {
              column: null, // 稍后填充
              direction: direction,
            }
          } else {
            orderBy.direction = direction
          }
        } else {
          // 聚合操作
          aggregation = opMap[entity.value] || aggregation
        }
        break
    }
  }

  // 处理排序
  if (limits.limit) {
    orderBy = {
      column: selectColumns[0] || 'total_amount',
      direction: 'DESC',
    }
  } else if (orderBy && orderBy.column === null) {
    // 如果有排序操作但没有指定列，使用聚合字段
    orderBy.column = selectColumns[selectColumns.length - 1] || 'total_amount'
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

  // 构建查询结构（传入 inferredSlots）
  const queryStructure = buildQueryStructure(entities, limits, inferredSlots)

  // 使用 LLM 推断的槽位（如果有）
  if (inferredSlots) {
    console.log('[Slot Filling] 使用 LLM 推断的槽位:', inferredSlots)
    if (inferredSlots.table_name) {
      queryStructure.table_name = inferredSlots.table_name
    }
  }

  // 确定缺失的槽位
  const missingSlots = []
  
  // 特殊处理：COUNT 意图如果没有 selectColumns，自动设置为 id
  if (intentType === 'COUNT' && !queryStructure.selectColumns.length) {
    queryStructure.selectColumns = ['id']
    queryStructure.aggregation = 'COUNT'
  }
  
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
