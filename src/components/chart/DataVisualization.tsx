import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { TrendingUp, BarChart3, PieChart, Table2, CircleDot } from 'lucide-react'

// 图表类型定义（避免导入后端文件）
const CHART_TYPES = [
  { value: 'line', label: '折线图', icon: '📈' },
  { value: 'bar', label: '柱状图', icon: '📊' },
  { value: 'horizontal_bar', label: '条形图', icon: '📊' },
  { value: 'pie', label: '饼图', icon: '🥧' },
  { value: 'scatter', label: '散点图', icon: '⚬' },
  { value: 'grouped_bar', label: '分组柱状图', icon: '📊' },
  { value: 'stacked_bar', label: '堆叠柱状图', icon: '📊' },
  { value: 'table', label: '表格', icon: '📋' },
]

interface DataVisualizationProps {
  data: any[]
  recommendation: {
    chartType: string
    reason: string
    canRender: boolean
    message?: string
    xAxis?: string
    yAxis?: string | string[]
    groupBy?: string
  }
  currentChartType: string
  onChartTypeChange: (type: string) => void
}

export default function DataVisualization({
  data,
  recommendation,
  currentChartType,
  onChartTypeChange,
}: DataVisualizationProps) {
  // 智能推断 xAxis 和 yAxis（如果 recommendation 中没有）
  const inferredAxes = useMemo(() => {
    if (!data || data.length === 0) return { xAxis: null, yAxis: null }

    const columns = Object.keys(data[0])
    
    // 如果 recommendation 中已有，直接使用
    if (recommendation.xAxis && recommendation.yAxis) {
      return {
        xAxis: recommendation.xAxis,
        yAxis: Array.isArray(recommendation.yAxis) ? recommendation.yAxis[0] : recommendation.yAxis,
      }
    }

    // 否则尝试智能推断
    if (columns.length >= 2) {
      // 找到第一个可能是分类/时间的列作为 xAxis
      let xAxisCol = columns[0]
      // 找到第一个数值列作为 yAxis
      let yAxisCol = columns[1]

      // 检查数据类型
      for (const col of columns) {
        const sampleValue = data[0][col]
        if (typeof sampleValue === 'number' || !isNaN(Number(sampleValue))) {
          // 这是数值列
          if (!yAxisCol) yAxisCol = col
        } else {
          // 这是分类/文本列
          if (xAxisCol === columns[0] || typeof data[0][xAxisCol] === 'number') {
            xAxisCol = col
          }
        }
      }

      return { xAxis: xAxisCol, yAxis: yAxisCol }
    }

    return { xAxis: columns[0], yAxis: columns[1] }
  }, [data, recommendation])

  // 图表配置
  const chartOption = useMemo(() => {
    if (!data || data.length === 0) return null

    const { xAxis, yAxis, groupBy } = recommendation
    const { xAxis: inferredX, yAxis: inferredY } = inferredAxes

    // 使用 recommendation 中的字段，如果没有则使用推断的字段
    const finalXAxis = xAxis || inferredX || undefined
    // yAxis 可能是字符串或数组，需要统一处理
    const finalYAxisSingle = Array.isArray(yAxis) ? yAxis[0] : (yAxis || inferredY || undefined)

    switch (currentChartType) {
      case 'line':
        return getLineChartOption(data, finalXAxis, finalYAxisSingle)
      case 'bar':
        return getBarChartOption(data, finalXAxis, finalYAxisSingle)
      case 'horizontal_bar':
        return getHorizontalBarChartOption(data, finalXAxis, finalYAxisSingle)
      case 'pie':
        return getPieChartOption(data, finalXAxis, finalYAxisSingle)
      case 'scatter':
        return getScatterChartOption(data, finalXAxis, finalYAxisSingle)
      case 'grouped_bar':
        return getGroupedBarChartOption(data, finalXAxis, finalYAxisSingle, groupBy || recommendation.groupBy)
      case 'stacked_bar':
        // yAxis 可能是数组，直接使用；否则使用推断的单值
        const stackedYAxis = Array.isArray(yAxis) 
          ? yAxis.filter((v): v is string => typeof v === 'string')
          : (yAxis ? [yAxis] : (finalYAxisSingle ? [finalYAxisSingle] : []))
        return getStackedBarChartOption(data, finalXAxis, stackedYAxis)
      default:
        return null
    }
  }, [data, recommendation, currentChartType, inferredAxes])

  // 表格渲染
  if (currentChartType === 'table' || !chartOption) {
    return (
      <div className="h-full flex flex-col">
        {/* 工具栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <Table2 className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">数据表格</span>
          </div>
          <ChartTypeSelector
            currentType={currentChartType}
            onTypeChange={onChartTypeChange}
          />
        </div>

        {/* 表格内容 */}
        <div className="flex-1 overflow-auto bg-white">
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              暂无数据
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {Object.keys(data[0]).map(col => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left font-medium text-gray-700 border-b border-gray-200"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {Object.values(row).map((val, colIdx) => (
                      <td
                        key={colIdx}
                        className="px-4 py-3 border-b border-gray-100 text-gray-600"
                      >
                        {val !== null && val !== undefined ? String(val) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  // 图表渲染
  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {getChartIcon(currentChartType)}
            <span className="text-sm font-medium text-gray-700">
              {getChartLabel(currentChartType)}
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {recommendation.reason}
          </span>
        </div>
        <ChartTypeSelector
          currentType={currentChartType}
          onTypeChange={onChartTypeChange}
        />
      </div>

      {/* 图表容器 */}
      <div className="flex-1 p-4 min-h-0">
        {chartOption ? (
          <ReactECharts
            option={chartOption}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            {recommendation.message || '无法渲染图表'}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 图表类型选择器
 */
function ChartTypeSelector({
  currentType,
  onTypeChange,
}: {
  currentType: string
  onTypeChange: (type: string) => void
}) {
  // 显示所有图表类型
  const visibleTypes = CHART_TYPES.filter(t => 
    t.value === 'line' || 
    t.value === 'bar' || 
    t.value === 'pie' || 
    t.value === 'scatter' || 
    t.value === 'table'
  )

  return (
    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg">
      {visibleTypes.map((type: any) => {
        const isActive = currentType === type.value
        return (
          <button
            key={type.value}
            onClick={() => onTypeChange(type.value)}
            className={`px-2.5 py-1.5 rounded-md transition-all text-xs font-medium flex items-center gap-1 ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
            title={type.label}
          >
            {getChartIcon(type.value, 14)}
            <span className="hidden sm:inline">{type.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * 获取图表图标
 */
function getChartIcon(type: string, size: number = 16) {
  const iconProps = { size, className: 'inline-block' }
  switch (type) {
    case 'line':
      return <TrendingUp {...iconProps} />
    case 'bar':
    case 'horizontal_bar':
    case 'grouped_bar':
    case 'stacked_bar':
      return <BarChart3 {...iconProps} />
    case 'pie':
      return <PieChart {...iconProps} />
    case 'scatter':
      return <CircleDot {...iconProps} />
    default:
      return <BarChart3 {...iconProps} />
  }
}

/**
 * 获取图表标签
 */
function getChartLabel(type: string) {
  const typeMap: Record<string, string> = {
    line: '折线图',
    bar: '柱状图',
    horizontal_bar: '条形图',
    pie: '饼图',
    scatter: '散点图',
    grouped_bar: '分组柱状图',
    stacked_bar: '堆叠柱状图',
    table: '表格',
  }
  return typeMap[type] || '图表'
}

/**
 * 折线图配置
 */
function getLineChartOption(data: any[], xAxis?: string, yAxis?: string) {
  if (!data.length || !xAxis || !yAxis) return null

  return {
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item[xAxis]),
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      name: yAxis,
    },
    series: [
      {
        name: yAxis,
        type: 'line',
        data: data.map(item => Number(item[yAxis]) || 0),
        smooth: true,
        areaStyle: {
          opacity: 0.1,
        },
      },
    ],
  }
}

/**
 * 柱状图配置
 */
function getBarChartOption(data: any[], xAxis?: string, yAxis?: string) {
  if (!data.length || !xAxis || !yAxis) return null

  return {
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item[xAxis]),
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      name: yAxis,
    },
    series: [
      {
        name: yAxis,
        type: 'bar',
        data: data.map(item => Number(item[yAxis]) || 0),
        itemStyle: {
          color: '#1890ff',
        },
      },
    ],
  }
}

/**
 * 横向条形图配置
 */
function getHorizontalBarChartOption(data: any[], xAxis?: string, yAxis?: string) {
  if (!data.length || !xAxis || !yAxis) return null

  return {
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'value',
      name: yAxis,
    },
    yAxis: {
      type: 'category',
      data: data.map(item => item[xAxis]),
    },
    series: [
      {
        name: yAxis,
        type: 'bar',
        data: data.map(item => Number(item[yAxis]) || 0),
        itemStyle: {
          color: '#1890ff',
        },
      },
    ],
  }
}

/**
 * 饼图配置
 */
function getPieChartOption(data: any[], xAxis?: string, yAxis?: string) {
  if (!data.length || !xAxis || !yAxis) return null

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '10%',
      top: 'center',
    },
    series: [
      {
        name: yAxis,
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        data: data.map(item => ({
          name: item[xAxis],
          value: Number(item[yAxis]) || 0,
        })),
      },
    ],
  }
}

/**
 * 散点图配置
 */
function getScatterChartOption(data: any[], xAxis?: string, yAxis?: string) {
  if (!data.length || !xAxis || !yAxis) return null

  return {
    tooltip: {
      trigger: 'item',
    },
    xAxis: {
      type: 'value',
      name: xAxis,
      scale: true,
    },
    yAxis: {
      type: 'value',
      name: yAxis,
      scale: true,
    },
    series: [
      {
        type: 'scatter',
        data: data.map(item => [
          Number(item[xAxis]) || 0,
          Number(item[yAxis]) || 0,
        ]),
        symbolSize: 10,
        itemStyle: {
          color: '#1890ff',
          opacity: 0.6,
        },
      },
    ],
  }
}

/**
 * 分组柱状图配置
 */
function getGroupedBarChartOption(
  data: any[],
  xAxis?: string,
  yAxis?: string,
  groupBy?: string
) {
  if (!data.length || !xAxis || !yAxis || !groupBy) return null

  // 分组数据
  const groups: Record<string, any[]> = {}
  data.forEach(item => {
    const group = item[groupBy]
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(item)
  })

  const categories = Object.keys(groups)
  const xAxisData = [...new Set(data.map(item => item[xAxis]))]

  const series = categories.map((group, idx) => ({
    name: group,
    type: 'bar',
    data: xAxisData.map(xVal => {
      const item = groups[group].find(d => d[xAxis] === xVal)
      return item ? Number(item[yAxis]) || 0 : 0
    }),
  }))

  return {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: categories,
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      name: yAxis,
    },
    series,
  }
}

/**
 * 堆叠柱状图配置
 */
function getStackedBarChartOption(
  data: any[],
  xAxis?: string,
  yAxis?: string | string[]
) {
  if (!data.length || !xAxis || !yAxis) return null

  const yAxes = Array.isArray(yAxis) ? yAxis : [yAxis]
  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1']

  const series = yAxes.map((yCol, idx) => ({
    name: yCol,
    type: 'bar',
    stack: 'total',
    data: data.map(item => Number(item[yCol]) || 0),
    itemStyle: {
      color: colors[idx % colors.length],
    },
  }))

  return {
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: yAxes,
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item[xAxis]),
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      name: '数值',
    },
    series,
  }
}
