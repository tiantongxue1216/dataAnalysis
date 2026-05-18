# NL2SQL 系统测试指南

## 📋 测试集概览

本测试集包含 **40+** 个测试用例，覆盖以下场景：

### 测试分类

| 分类 | 数量 | 说明 |
|------|------|------|
| 基础查询 | 3 | 简单查询、过滤、计数 |
| 时间查询 | 3 | 相对时间、趋势分析 |
| 多维度 | 2 | 多条件、多分组 |
| 排序 | 2 | Top N、升序/降序 |
| 聚合 | 3 | SUM、AVG、MAX、MIN |
| 产品 | 2 | 产品分类查询 |
| 用户 | 2 | 用户统计 |
| 订单状态 | 2 | 状态分布 |
| 复杂查询 | 2 | 多条件组合 |
| 边界情况 | 3 | "所有"、"每个"等关键词 |
| 需要澄清 | 2 | 模糊查询处理 |

---

## 🚀 快速开始

### 方法1: 快速测试（推荐）

运行关键场景的手动验证：

```bash
cd d:\qoderWS\dataAnalysis\server
node quick-test.js
```

**特点**：
- ✅ 只测试 10 个关键场景
- ✅ 详细的分步输出
- ✅ 自动检测常见问题
- ⏱️ 耗时约 15-20 秒

### 方法2: 完整自动化测试

运行全部 40+ 测试用例：

```bash
cd d:\qoderWS\dataAnalysis\server
node run-tests.js
```

**特点**：
- ✅ 覆盖所有测试场景
- ✅ 自动生成测试报告
- ✅ 保存结果到 `test-results.json`
- ⏱️ 耗时约 2-3 分钟

---

## 📊 测试用例详解

### 1. 基础查询类

#### basic-001: 各地区的销售额排名
```
查询: "各地区的销售额排名"
期望: 
  - 表: orders
  - 字段: region, total_amount
  - 聚合: SUM
  - 分组: region
  - 排序: DESC
```

#### basic-002: 华东区的销售额
```
查询: "华东区的销售额"     测试结果：返回0行数据不符合实际
期望:
  - 表: orders
  - 字段: total_amount
  - 聚合: SUM
  - 条件: region = '华东区'
```

#### basic-003: 订单总数
```
查询: "订单总数"    测试结果：需要澄清
期望:
  - 表: orders
  - 字段: id
  - 聚合: COUNT
```

### 2. 时间相关查询

#### time-001: 上个月的销售额   
```
查询: "上个月的销售额"          测试结果：返回了列名，但是没有返回数据
期望:
  - 时间条件: created_at >= '2024-03' (动态计算)
```

#### time-002: 最近7天的订单数量
```
查询: "最近7天的订单数量"               测试结果：需要澄清
期望:
  - 时间条件: created_at >= 7天前
```

### 3. 多维度查询

#### multi-001: 各地区各产品类别的销售额
```
查询: "各地区各产品类别的销售额"        测试结果：正常返回数据
期望:
  - 双维度分组: region, product_category
```

### 4. 排序和限制

#### sort-001: 销量最高的前5个产品
```
查询: "销量最高的前5个产品"               测试结果： **查询失败**: SQLite 查询失败: no such column: total_amount
期望:
  - 排序: DESC
  - 限制: LIMIT 5
```

### 5. 边界情况

#### edge-001: 所有地区的销售额
```
查询: "所有地区的销售额"
期望:
  - ❌ 不应该有 WHERE region = '所有地区'
  - ✅ 应该返回全部数据
```

#### edge-002: 每个地区的销售总额
```
查询: "每个地区的销售总额"       测试结果： **查询失败**: SQLite 查询失败: no such column: 销售总额
期望:
  - ✅ GROUP BY region
  - ❌ 不应该有 WHERE 条件
```

---

## 🔍 常见问题检测

测试脚本会自动检测以下问题：

### 1. "各地区"被当作具体值
```sql
-- ❌ 错误
WHERE region = '各地区'

-- ✅ 正确
GROUP BY region
```

### 2. SELECT 缺少 GROUP BY 字段
```sql
-- ❌ 错误
SELECT SUM(total_amount) FROM orders GROUP BY region

-- ✅ 正确
SELECT region, SUM(total_amount) FROM orders GROUP BY region
```

### 3. 排序查询缺少 ORDER BY
```sql
-- ❌ 错误
SELECT region, SUM(total_amount) FROM orders GROUP BY region

-- ✅ 正确
SELECT region, SUM(total_amount) FROM orders GROUP BY region ORDER BY sum_total_amount DESC
```

### 4. 时间值未加引号
```sql
-- ❌ 错误
WHERE created_at >= 上个月

-- ✅ 正确
WHERE created_at >= '2024-03'
```

---

## 📈 测试结果解读

### 测试报告示例

```
============================================================
                    测试报告
============================================================

📊 总体统计:
   总测试数: 42
   通过: 38 ✅
   失败: 4 ❌
   通过率: 90.48%

📈 分类统计:
   ✅ 基础查询: 3/3 (100.00%)
   ✅ 时间查询: 3/3 (100.00%)
   ⚠️  多维度: 1/2 (50.00%)
   ✅ 排序: 2/2 (100.00%)
   ...

============================================================
```

### 结果文件

测试完成后会生成 `test-results.json`：

```json
{
  "timestamp": "2026-04-12T10:30:00.000Z",
  "duration": "120.5s",
  "summary": {
    "total": 42,
    "passed": 38,
    "failed": 4,
    "byCategory": { ... }
  },
  "results": [
    {
      "id": "basic-001",
      "passed": true,
      "sql": "SELECT region, SUM(total_amount) ..."
    },
    ...
  ]
}
```

---

## 🛠️ 添加新测试用例

编辑 `test-cases.js`，在 `TEST_CASES` 数组中添加：

```javascript
{
  id: 'custom-001',
  category: '自定义分类',
  query: '你的测试查询',
  expected: {
    intent_type: 'QUERY',
    table_name: 'orders',
    select_columns: ['total_amount'],
    aggregation: 'SUM',
    // ... 其他期望值
  },
  description: '测试说明',
}
```

---

## 💡 最佳实践

### 1. 开发阶段
- 使用 `quick-test.js` 快速验证新功能
- 重点关注失败的测试用例

### 2. 发布前
- 运行完整的 `run-tests.js`
- 确保通过率 > 90%
- 检查测试报告中的警告

### 3. 回归测试
- 每次修改核心逻辑后运行测试
- 特别关注之前失败的用例是否修复

### 4. 性能优化
- 监控测试耗时
- 优化慢查询的 SQL 生成

---

## 🐛 故障排查

### 问题1: LLM API 调用失败
```
错误: DeepSeek API 调用失败
解决: 检查 .env 文件中的 API Key 配置
```

### 问题2: 数据库连接失败
```
错误: SQLite 查询失败
解决: 确认 smart_analyst.db 文件存在
```

### 问题3: 测试超时
```
错误: 测试执行超时
解决: 增加 setTimeout 延迟时间
```

---

## 📝 测试清单

在提交代码前，确保：

- [ ] 运行 `quick-test.js` 无错误
- [ ] 运行 `run-tests.js` 通过率 > 90%
- [ ] 检查 `test-results.json` 中的失败用例
- [ ] 修复所有 ⚠️ 警告
- [ ] 更新测试用例（如有新功能）

---

## 🎯 下一步

1. **完善测试覆盖**: 添加更多边缘场景
2. **性能测试**: 大数据量下的查询性能
3. **集成测试**: 前端 + 后端联调测试
4. **自动化 CI**: 集成到 GitHub Actions

---

**最后更新**: 2026-04-12  
**维护者**: Smart Analyst Team
