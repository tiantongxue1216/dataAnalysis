/**
 * NL2SQL 系统测试集
 * 覆盖各种查询场景、边界情况和异常处理
 */

export const TEST_CASES = [
  // ==================== 基础查询类 ====================
  {
    id: 'basic-001',
    category: '基础查询',
    query: '各地区的销售额排名',
    expected: {
      intent_type: 'SORT',
      table_name: 'orders',
      select_columns: ['region', 'total_amount'],
      aggregation: 'SUM',
      group_by: ['region'],
      order_by: { column: 'sum_total_amount', direction: 'DESC' },
      conditions: [],
    },
    description: '全量地区分组排序查询',
  },
  {
    id: 'basic-002',
    category: '基础查询',
    query: '华东区的销售额',
    expected: {
      intent_type: 'QUERY',
      table_name: 'orders',
      select_columns: ['total_amount'],
      aggregation: 'SUM',
      conditions: [
        { column: 'region', operator: '=', value: '华东区' },
      ],
    },
    description: '单地区过滤查询',
  },
  {
    id: 'basic-003',
    category: '基础查询',
    query: '订单总数',
    expected: {
      intent_type: 'COUNT',
      table_name: 'orders',
      select_columns: ['id'],
      aggregation: 'COUNT',
      conditions: [],
    },
    description: '简单计数查询',
  },

  // ==================== 时间相关查询 ====================
  {
    id: 'time-001',
    category: '时间查询',
    query: '上个月的销售额',
    expected: {
      intent_type: 'QUERY',
      table_name: 'orders',
      select_columns: ['total_amount'],
      aggregation: 'SUM',
      conditions: [
        { column: 'created_at', operator: '>=', value: expect.any(String) },
      ],
    },
    description: '相对时间查询',
  },
  {
    id: 'time-002',
    category: '时间查询',
    query: '最近7天的订单数量',
    expected: {
      intent_type: 'COUNT',
      table_name: 'orders',
      select_columns: ['id'],
      aggregation: 'COUNT',
      conditions: [
        { column: 'created_at', operator: '>=', value: expect.any(String) },
      ],
    },
    description: '最近N天查询',
  },
  {
    id: 'time-003',
    category: '时间查询',
    query: '各月份的销售趋势',
    expected: {
      intent_type: 'QUERY',
      table_name: 'orders',
      select_columns: ['created_at', 'total_amount'],
      aggregation: 'SUM',
      group_by: ['created_at'],
    },
    description: '时间趋势分析',
  },

  // ==================== 多维度查询 ====================
  {
    id: 'multi-001',
    category: '多维度',
    query: '各地区各产品类别的销售额',
    expected: {
      intent_type: 'QUERY',
      table_name: 'orders',
      select_columns: ['region', 'product_category', 'total_amount'],
      aggregation: 'SUM',
      group_by: ['region', 'product_category'],
    },
    description: '双维度分组查询',
  },
  {
    id: 'multi-002',
    category: '多维度',
    query: '华东区电子产品的销售额',
    expected: {
      intent_type: 'QUERY',
      table_name: 'order_items',
      select_columns: ['total_amount'],
      aggregation: 'SUM',
      conditions: [
        { column: 'region', operator: '=', value: '华东区' },
        { column: 'product_category', operator: '=', value: '电子产品' },
      ],
    },
    description: '多条件过滤查询',
  },

  // ==================== 排序和限制 ====================
  {
    id: 'sort-001',
    category: '排序',
    query: '销量最高的前5个产品',
    expected: {
      intent_type: 'SORT',
      table_name: 'order_items',
      select_columns: ['product_name', 'quantity'],
      aggregation: 'SUM',
      group_by: ['product_name'],
      order_by: { column: 'sum_quantity', direction: 'DESC' },
      limit: 5,
    },
    description: 'Top N 查询',
  },
  {
    id: 'sort-002',
    category: '排序',
    query: '按销售额从低到高排列各地区',
    expected: {
      intent_type: 'SORT',
      table_name: 'orders',
      select_columns: ['region', 'total_amount'],
      aggregation: 'SUM',
      group_by: ['region'],
      order_by: { column: 'sum_total_amount', direction: 'ASC' },
    },
    description: '升序排序查询',
  },

  // ==================== 聚合函数 ====================
  {
    id: 'agg-001',
    category: '聚合',
    query: '平均订单金额',
    expected: {
      intent_type: 'QUERY',
      table_name: 'orders',
      select_columns: ['total_amount'],
      aggregation: 'AVG',
    },
    description: '平均值查询',
  },
  {
    id: 'agg-002',
    category: '聚合',
    query: '最高单笔订单金额',
    expected: {
      intent_type: 'QUERY',
      table_name: 'orders',
      select_columns: ['total_amount'],
      aggregation: 'MAX',
    },
    description: '最大值查询',
  },
  {
    id: 'agg-003',
    category: '聚合',
    query: '最低单价的产品',
    expected: {
      intent_type: 'QUERY',
      table_name: 'order_items',
      select_columns: ['unit_price'],
      aggregation: 'MIN',
    },
    description: '最小值查询',
  },

  // ==================== 产品分类查询 ====================
  {
    id: 'product-001',
    category: '产品',
    query: '电子产品的销售情况',
    expected: {
      intent_type: 'QUERY',
      table_name: 'order_items',
      select_columns: ['total_amount'],
      aggregation: 'SUM',
      conditions: [
        { column: 'product_category', operator: '=', value: '电子产品' },
      ],
    },
    description: '单类别产品查询',
  },
  {
    id: 'product-002',
    category: '产品',
    query: '各个产品类别的销售额排名',
    expected: {
      intent_type: 'SORT',
      table_name: 'order_items',
      select_columns: ['product_category', 'total_amount'],
      aggregation: 'SUM',
      group_by: ['product_category'],
      order_by: { column: 'sum_total_amount', direction: 'DESC' },
    },
    description: '产品类别排名',
  },

  // ==================== 用户相关查询 ====================
  {
    id: 'user-001',
    category: '用户',
    query: '用户总数',
    expected: {
      intent_type: 'COUNT',
      table_name: 'users',
      select_columns: ['id'],
      aggregation: 'COUNT',
    },
    description: '用户计数',
  },
  {
    id: 'user-002',
    category: '用户',
    query: '上个月注册的用户数量',
    expected: {
      intent_type: 'COUNT',
      table_name: 'users',
      select_columns: ['id'],
      aggregation: 'COUNT',
      conditions: [
        { column: 'created_at', operator: '>=', value: expect.any(String) },
      ],
    },
    description: '时间范围用户统计',
  },

  // ==================== 订单状态查询 ====================
  {
    id: 'status-001',
    category: '订单状态',
    query: '已完成的订单数量',
    expected: {
      intent_type: 'COUNT',
      table_name: 'orders',
      select_columns: ['id'],
      aggregation: 'COUNT',
      conditions: [
        { column: 'status', operator: '=', value: 'completed' },
      ],
    },
    description: '特定状态订单统计',
  },
  {
    id: 'status-002',
    category: '订单状态',
    query: '各状态的订单数量分布',
    expected: {
      intent_type: 'QUERY',
      table_name: 'orders',
      select_columns: ['status', 'id'],
      aggregation: 'COUNT',
      group_by: ['status'],
    },
    description: '状态分布统计',
  },

  // ==================== 复杂组合查询 ====================
  {
    id: 'complex-001',
    category: '复杂查询',
    query: '上个月华东区各产品类别的销售额排名',
    expected: {
      intent_type: 'SORT',
      table_name: 'order_items',
      select_columns: ['product_category', 'total_amount'],
      aggregation: 'SUM',
      group_by: ['product_category'],
      order_by: { column: 'sum_total_amount', direction: 'DESC' },
      conditions: [
        { column: 'created_at', operator: '>=', value: expect.any(String) },
        { column: 'region', operator: '=', value: '华东区' },
      ],
    },
    description: '时间+地区+类别+排序的组合查询',
  },
  {
    id: 'complex-002',
    category: '复杂查询',
    query: '销售额大于1000的订单中，各地区的平均订单金额',
    expected: {
      intent_type: 'QUERY',
      table_name: 'orders',
      select_columns: ['region', 'total_amount'],
      aggregation: 'AVG',
      group_by: ['region'],
      conditions: [
        { column: 'total_amount', operator: '>', value: 1000 },
      ],
    },
    description: '数值条件+分组聚合',
  },

  // ==================== 边界情况 ====================
  {
    id: 'edge-001',
    category: '边界情况',
    query: '所有地区的销售额',
    expected: {
      intent_type: 'QUERY',
      table_name: 'orders',
      select_columns: ['total_amount'],
      aggregation: 'SUM',
      conditions: [], // "所有地区"不应添加过滤条件
    },
    description: '"所有"关键词处理',
  },
  {
    id: 'edge-002',
    category: '边界情况',
    query: '每个地区的销售总额',
    expected: {
      intent_type: 'QUERY',
      table_name: 'orders',
      select_columns: ['region', 'total_amount'],
      aggregation: 'SUM',
      group_by: ['region'],
    },
    description: '"每个"关键词处理',
  },
  {
    id: 'edge-003',
    category: '边界情况',
    query: '全部产品类别的平均价格',
    expected: {
      intent_type: 'QUERY',
      table_name: 'order_items',
      select_columns: ['unit_price'],
      aggregation: 'AVG',
      conditions: [], // "全部"不应添加过滤
    },
    description: '"全部"关键词处理',
  },

  // ==================== 模糊/不完整查询（需要澄清）====================
  {
    id: 'clarify-001',
    category: '需要澄清',
    query: '查询数据',
    expected: {
      need_clarification: true,
      missing_slots: ['select_columns', 'table_name'],
    },
    description: '过于模糊的查询',
  },
  {
    id: 'clarify-002',
    category: '需要澄清',
    query: '销售额',
    expected: {
      need_clarification: true,
      missing_slots: expect.arrayContaining(['table_name']),
    },
    description: '缺少上下文的指标查询',
  },
]

/**
 * 运行单个测试用例
 */
export async function runTestCase(testCase) {
  console.log(`\n🧪 测试: ${testCase.id} - ${testCase.description}`)
  console.log(`   查询: "${testCase.query}"`)
  
  try {
    // TODO: 调用实际的意图识别 API
    // const result = await recognizeIntent(testCase.query)
    
    console.log('   ⏳ 待实现...')
    return {
      id: testCase.id,
      passed: false,
      message: '测试尚未实现',
    }
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}`)
    return {
      id: testCase.id,
      passed: false,
      message: error.message,
    }
  }
}

/**
 * 运行所有测试
 */
export async function runAllTests() {
  console.log('=== 开始运行 NL2SQL 测试集 ===\n')
  
  const results = []
  for (const testCase of TEST_CASES) {
    const result = await runTestCase(testCase)
    results.push(result)
  }
  
  const passed = results.filter(r => r.passed).length
  const total = results.length
  
  console.log('\n=== 测试结果汇总 ===')
  console.log(`总计: ${total} 个测试`)
  console.log(`通过: ${passed} 个`)
  console.log(`失败: ${total - passed} 个`)
  console.log(`通过率: ${(passed / total * 100).toFixed(2)}%`)
  
  return results
}

// 导出测试用例分类
export const TEST_CATEGORIES = [
  '基础查询',
  '时间查询',
  '多维度',
  '排序',
  '聚合',
  '产品',
  '用户',
  '订单状态',
  '复杂查询',
  '边界情况',
  '需要澄清',
]
