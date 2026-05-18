/**
 * 可视化图表推荐引擎
 * 根据数据特征和意图类型自动推荐最合适的图表类型
 */

/**
 * 推荐图表类型
 * @param {Array} data - 查询结果数据（数组对象）
 * @param {string} intentType - 意图类型
 * @returns {Object} 推荐结果 { chartType, reason, canRender }
 */
export function recommendChart(data, intentType = null) {
  // 异常处理：数据为空
  if (!data || data.length === 0) {
    return {
      chartType: 'table',
      reason: '结果集为空',
      canRender: false,
      message: '暂无数据',
    }
  }

  const rows = data.length
  const columns = Object.keys(data[0])
  const cols = columns.length

  // 异常处理：只有一列数据
  if (cols === 1) {
    return {
      chartType: 'table',
      reason: '数据维度不足，只有一列',
      canRender: false,
      message: '数据维度不足，无法生成图表',
    }
  }

  // 异常处理：行数过多
  if (rows > 500) {
    return {
      chartType: 'table',
      reason: '数据量过大（>500行）',
      canRender: true,
      message: '数据量较大，建议过滤或聚合',
    }
  }

  // 分析列的数据类型
  const analysis = analyzeColumns(data, columns)
  const { numericCols, datetimeCols, categoricalCols, textCols } = analysis

  // 异常处理：全文本数据
  if (numericCols.length === 0 && datetimeCols.length === 0 && textCols.length >= 2) {
    return {
      chartType: 'table',
      reason: '数据类型无法识别（全文本）',
      canRender: false,
      message: '数据类型不适合图表展示',
    }
  }

  // ====== 规则优先级判断 ======

  // 规则1：基于用户明确意图
  if (intentType) {
    const intentChartMap = {
      'TREND': 'line',
      'COMPARE': 'bar',
      'RATIO': 'pie',
      'CORRELATION': 'scatter',
      'QUERY': null, // 不指定，继续判断
      'COUNT': null,
      'FILTER': null,
      'SORT': null,
    }
    
    if (intentChartMap[intentType]) {
      return {
        chartType: intentChartMap[intentType],
        reason: `基于意图类型 ${intentType} 推荐`,
        canRender: true,
      }
    }
  }

  // 规则2：时间列 + 数值列 → 折线图
  if (datetimeCols.length > 0 && numericCols.length > 0) {
    return {
      chartType: 'line',
      reason: '检测到时间列和数值列，适合趋势展示',
      canRender: true,
      xAxis: datetimeCols[0],
      yAxis: numericCols[0],
    }
  }

  // 规则3：多个分类列（≥2） + 数值列 → 分组柱状图
  if (categoricalCols.length >= 2 && numericCols.length > 0) {
    return {
      chartType: 'grouped_bar',
      reason: '多维度对比，推荐分组柱状图',
      canRender: true,
      xAxis: categoricalCols[0],
      yAxis: numericCols[0],
      groupBy: categoricalCols[1],
    }
  }

  // 规则4：单个分类列 + 单个数值列
  if (categoricalCols.length === 1 && numericCols.length === 1) {
    const categoryCol = categoricalCols[0]
    const numericCol = numericCols[0]
    const uniqueCount = new Set(data.map(row => row[categoryCol])).size

    // 规则4a：少量分类（≤6） + 占比关系 → 饼图
    if (uniqueCount <= 6) {
      const total = data.reduce((sum, row) => sum + (Number(row[numericCol]) || 0), 0)
      // 检查是否接近 100（百分比数据）
      if (total > 0 && Math.abs(total - 100) < 0.1) {
        return {
          chartType: 'pie',
          reason: '少量分类且数据为占比关系，推荐饼图',
          canRender: true,
          xAxis: categoryCol,
          yAxis: numericCol,
        }
      }
    }

    // 规则4b：多维度对比（≥3个分类） → 条形图（横向）
    if (uniqueCount >= 3) {
      return {
        chartType: 'horizontal_bar',
        reason: '多维度对比，推荐横向条形图',
        canRender: true,
        xAxis: categoryCol,
        yAxis: numericCol,
      }
    }

    // 规则4c：默认柱状图
    return {
      chartType: 'bar',
      reason: '单个分类列 + 单个数值列，推荐柱状图',
      canRender: true,
      xAxis: categoryCol,
      yAxis: numericCol,
    }
  }

  // 规则5：两个或多个数值列 → 散点图
  if (numericCols.length >= 2 && rows > 5) {
    return {
      chartType: 'scatter',
      reason: '多个数值列，适合散点图展示相关性',
      canRender: true,
      xAxis: numericCols[0],
      yAxis: numericCols[1],
    }
  }

  // 规则6：单个分类列 + 多个数值列 → 堆叠柱状图
  if (categoricalCols.length === 1 && numericCols.length > 1) {
    return {
      chartType: 'stacked_bar',
      reason: '单个分类 + 多个数值列，推荐堆叠柱状图',
      canRender: true,
      xAxis: categoricalCols[0],
      yAxis: numericCols,
    }
  }

  // 默认回退：表格 + 简单柱状图
  return {
    chartType: 'bar',
    reason: '默认推荐柱状图',
    canRender: true,
    xAxis: categoricalCols[0] || columns[0],
    yAxis: numericCols[0] || columns[1],
  }
}

/**
 * 分析列的数据类型
 */
function analyzeColumns(data, columns) {
  const numericCols = []
  const datetimeCols = []
  const categoricalCols = []
  const textCols = []

  columns.forEach(col => {
    const sampleValues = data.slice(0, 10).map(row => row[col]).filter(v => v !== null && v !== undefined)
    
    if (sampleValues.length === 0) {
      textCols.push(col)
      return
    }

    // 检查是否为数值类型
    const allNumeric = sampleValues.every(v => {
      if (typeof v === 'number') return true
      if (typeof v === 'string') {
        const num = Number(v)
        return !isNaN(num) && isFinite(num)
      }
      return false
    })

    if (allNumeric) {
      numericCols.push(col)
      return
    }

    // 检查是否为日期类型
    const datePattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/
    const allDate = sampleValues.every(v => {
      if (typeof v === 'string') {
        return datePattern.test(v) || !isNaN(Date.parse(v))
      }
      return false
    })

    if (allDate) {
      datetimeCols.push(col)
      return
    }

    // 检查是否为分类类型（唯一值较少）
    const uniqueCount = new Set(sampleValues).size
    if (uniqueCount < 20 && uniqueCount <= sampleValues.length) {
      categoricalCols.push(col)
    } else {
      textCols.push(col)
    }
  })

  return { numericCols, datetimeCols, categoricalCols, textCols }
}

/**
 * 支持的图表类型列表
 */
export const CHART_TYPES = [
  { value: 'line', label: '折线图', icon: '📈' },
  { value: 'bar', label: '柱状图', icon: '📊' },
  { value: 'horizontal_bar', label: '条形图', icon: '📊' },
  { value: 'pie', label: '饼图', icon: '🥧' },
  { value: 'scatter', label: '散点图', icon: '⚬' },
  { value: 'grouped_bar', label: '分组柱状图', icon: '📊' },
  { value: 'stacked_bar', label: '堆叠柱状图', icon: '📊' },
  { value: 'table', label: '表格', icon: '📋' },
]
