# SQL 显示功能测试指南

## ✅ 已完成的功能

### 1. 后端 API
- ✅ 添加 `POST /api/sql/generate` 端点
- ✅ 支持传入意图对象和数据源 ID
- ✅ 返回生成的 SQL 和生成方式（规则引擎/LLM）

### 2. 前端服务层
- ✅ 添加 `sqlApi.generate()` 方法
- ✅ 类型定义完整

### 3. 前端页面逻辑
- ✅ 在意图识别成功后自动调用 SQL 生成 API
- ✅ 仅在无缺失槽位时生成 SQL
- ✅ 错误处理和加载提示

### 4. UI 组件
- ✅ 创建 `SQLBlock` 组件，美观显示 SQL
- ✅ 支持一键复制 SQL
- ✅ 代码高亮样式
- ✅ 更新 `ChatMessage` 组件解析并显示 SQL

## 🧪 测试步骤

### 1. 确保服务运行
```bash
# 后端服务（端口 3001）
cd d:\qoderWS\dataAnalysis\server
node index.js

# 前端服务（端口 5173）- 应该已经在运行
cd d:\qoderWS\dataAnalysis
npm run dev
```

### 2. 访问前端
打开浏览器访问：http://localhost:5173

### 3. 测试用例

#### 测试 1: 简单查询（规则引擎生成）
输入：`上个月华东地区销售额趋势`

预期结果：
- ✅ 显示意图识别结果
- ✅ 显示 SQL 代码块
- ✅ SQL 类似：`SELECT SUM(sales_amount) as sum_sales_amount FROM orders WHERE date = '上个月' AND region = '华东' GROUP BY region;`
- ✅ 显示"规则引擎"标签

#### 测试 2: 排序查询（规则引擎生成）
输入：`产品销量排行`

预期结果：
- ✅ 显示意图识别结果
- ✅ 显示 SQL 代码块
- ✅ SQL 类似：`SELECT product_name, sales_volume FROM products ORDER BY sales_volume DESC LIMIT 10;`

#### 测试 3: 计数查询（规则引擎生成）
输入：`订单数量统计`

预期结果：
- ⚠️ 可能会要求澄清（缺少 select_columns）
- 如果通过 LLM 推断成功，会显示 SQL

#### 测试 4: 复杂查询
输入：`查询orders表中2024年销售额大于1000的地区和产品类别排名`

预期结果：
- ✅ 显示完整的意图识别信息
- ✅ 显示复杂的 SQL 查询
- ✅ 包含 WHERE、GROUP BY、ORDER BY、LIMIT 等子句

### 4. 验证 SQL 显示效果

检查以下 UI 元素：
- [ ] SQL 代码块有灰色背景
- [ ] 顶部有"SQL 查询"标题和 Code 图标
- [ ] 右上角有"复制"按钮
- [ ] 点击复制后显示"已复制"和绿色对勾
- [ ] SQL 文本使用等宽字体（monospace）
- [ ] 2 秒后"已复制"提示消失

### 5. 验证复制功能

1. 点击"复制"按钮
2. 粘贴到文本编辑器
3. 确认 SQL 语句完整且格式正确

## 📸 预期界面效果

```
┌─────────────────────────────────────────────┐
│ 🤖 Assistant                                │
│                                             │
│ 🎯 意图识别成功                             │
│                                             │
│ 意图类型: QUERY                             │
│ 置信度: 90.0%                               │
│                                             │
│ 识别到的实体:                               │
│   • TIME: 上个月 → 2024-04                  │
│   • REGION: 华东                            │
│   • METRIC: 销售额                          │
│                                             │
│ 查询字段: sales_amount                      │
│ 聚合函数: SUM                               │
│                                             │
│ 查询条件 (2 个):                            │
│   • date = 上个月                           │
│   • region = 华东                           │
│                                             │
│ 分组字段: region                            │
│                                             │
│ ---                                         │
│                                             │
│ 💻 正在生成 SQL...                          │
│                                             │
│ ✅ SQL 生成成功 (规则引擎)                  │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ 📝 SQL 查询              [📋 复制]  │    │
│ ├─────────────────────────────────────┤    │
│ │ SELECT SUM(sales_amount) as         │    │
│ │   sum_sales_amount                  │    │
│ │ FROM orders                         │    │
│ │ WHERE date = '上个月'               │    │
│ │   AND region = '华东'               │    │
│ │ GROUP BY region;                    │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ 14:30                                       │
└─────────────────────────────────────────────┘
```

## 🔍 调试技巧

### 查看网络请求
1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 发送消息
4. 查看 `/api/intent/recognize` 和 `/api/sql/generate` 请求

### 查看控制台日志
- 后端日志会显示 SQL 生成过程
- 前端控制台会显示 API 调用结果

### 常见问题

**问题 1**: SQL 没有显示
- 检查是否有缺失槽位
- 检查后端 SQL 生成 API 是否返回成功
- 查看浏览器控制台是否有错误

**问题 2**: SQL 格式不正确
- 检查后端生成的 SQL 是否包含换行符
- 确认 SQLBlock 组件的样式是否正确

**问题 3**: 复制功能不工作
- 检查浏览器是否支持 Clipboard API
- 确认是否在 HTTPS 或 localhost 环境

## 🎉 完成标志

当你能看到：
1. ✅ 意图识别结果显示正常
2. ✅ SQL 代码块美观显示
3. ✅ 可以点击复制 SQL
4. ✅ 复制的 SQL 可以正常执行

就说明功能已经完全实现！
