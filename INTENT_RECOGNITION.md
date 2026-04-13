# 意图识别功能文档

## 概述

意图识别系统是本项目的核心功能之一，用于理解用户的自然语言数据查询意图，并将其转换为结构化的查询对象。

## 系统架构

### 处理流程

```
用户输入 → 规则引擎过滤 →
  匹配明显模式 → 实体识别 → 输出结构化意图对象
  复杂/模糊查询 → LLM分类 → 置信度校验 →
    高置信度 → 实体识别 → 输出结构化意图对象
    低置信度 → 启动澄清对话
```

### 核心模块

1. **规则引擎** (`server/rules-engine.js`)
   - 通过正则表达式匹配常见查询模式
   - 快速识别 QUERY、COUNT、FILTER、SORT 等意图类型
   - 提供置信度评估

2. **DeepSeek 客户端** (`server/deepseek-client.js`)
   - 封装 DeepSeek API 调用
   - 支持 JSON 格式响应
   - 超时和错误处理

3. **意图分类器** (`server/intent-classifier.js`)
   - 使用 LLM 进行意图分类
   - 识别实体（TIME、REGION、METRIC 等）
   - 输出结构化分类结果

4. **实体识别器** (`server/entity-extractor.js`)
   - 从实体列表构建查询结构
   - 槽位填充（select_columns、conditions、group_by 等）
   - 时间表达式标准化

5. **意图识别服务** (`server/intent-service.js`)
   - 编排完整流程
   - 处理澄清对话
   - 降级策略（LLM 失败时使用规则引擎）

## API 接口

### 1. 意图识别

```http
POST /api/intent/recognize
Content-Type: application/json

{
  "query": "今天的销量是多少？"
}
```

**成功响应**:
```json
{
  "success": true,
  "intent": {
    "intent_type": "QUERY",
    "confidence": 0.95,
    "entities": [
      {
        "entity_type": "TIME",
        "value": "今天",
        "normalized": "CURRENT_DATE"
      },
      {
        "entity_type": "METRIC",
        "value": "销量",
        "column_name": "sales_amount"
      }
    ],
    "select_columns": ["sales_amount"],
    "aggregation": "SUM",
    "conditions": [
      {
        "column": "date",
        "operator": "=",
        "value": "CURRENT_DATE"
      }
    ],
    "missing_slots": ["table_name"],
    "reasoning": "用户想要查询今天的销量数据，包含时间实体和指标实体"
  }
}
```

**需要澄清的响应**:
```json
{
  "success": false,
  "need_clarification": true,
  "missing_slots": ["select_columns", "table_name"],
  "message": "请提供更详细的查询信息，例如：您想查询什么指标？在哪个表中？"
}
```

### 2. 澄清对话

```http
POST /api/intent/clarify
Content-Type: application/json

{
  "query": "今天的销量",
  "missing_slots": ["table_name"],
  "user_response": "sales_fact 表"
}
```

## 意图类型

| 类型 | 说明 | 示例 |
|------|------|------|
| QUERY | 查询数据 | "今天的销量是多少？" |
| COUNT | 统计数据数量 | "有多少订单？" |
| FILTER | 筛选特定条件 | "销售额大于1000的订单" |
| SORT | 排序查询 | "按销售额排序，前10名" |
| INCOMPLETE | 信息不完整 | "销量" |

## 实体类型

| 类型 | 说明 | 示例 |
|------|------|------|
| TIME | 时间 | "今天"、"上个月" |
| REGION | 地域 | "华东"、"北京" |
| METRIC | 指标 | "销量"、"金额" |
| DIMENSION | 维度 | "产品"、"用户" |
| VALUE | 数值 | "1000"、"top 10" |
| OPERATION | 操作 | "求和"、"平均" |

## 配置

### 环境变量

在 `server/.env` 文件中配置：

```env
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
DEEPSEEK_MODEL=deepseek-chat
```

### 复制配置文件

```bash
cd server
cp .env.example .env
# 编辑 .env 文件，填入你的 API Key
```

## 测试

### 运行测试脚本

```bash
cd server
node test-intent.js
```

测试用例包括：
- 简单查询（今天的销量）
- 计数查询（华东区有多少订单）
- 排序查询（按销售额排序，显示前10名）
- 过滤查询（销售额大于1000）
- 不完整查询（只有关键词）
- 复杂查询（多条件）

### 预期结果

规则引擎应该能够快速识别模式化的查询，并返回高置信度的结果。对于复杂或不完整的查询，系统会调用 LLM 进行分类和实体识别。

## 前端集成

### API 调用

```typescript
import { intentApi } from '@/services/api'

// 识别意图
const result = await intentApi.recognize('今天的销量是多少？')

// 澄清对话
const clarifiedResult = await intentApi.clarify(
  '今天的销量',
  ['table_name'],
  'sales_fact 表'
)
```

## 扩展指南

### 添加新的规则

在 `server/rules-engine.js` 中添加新规则：

```javascript
{
  name: 'custom_pattern',
  patterns: [
    /.*自定义模式.*/,
  ],
  intent_type: 'QUERY',
  confidence: 0.8,
}
```

### 添加新的指标映射

在 `server/entity-extractor.js` 中添加指标映射：

```javascript
const METRIC_AGGREGATIONS = {
  '自定义指标': { column: 'custom_column', aggregation: 'SUM' },
  // ...
}
```

### 添加新的时间表达式

在 `server/entity-extractor.js` 中添加时间映射：

```javascript
const TIME_MAPPINGS = {
  '自定义时间': 'CUSTOM_TIME_EXPRESSION',
  // ...
}
```

## 注意事项

1. **API Key 安全**: 不要将 `.env` 文件提交到版本控制系统
2. **降级策略**: LLM 调用失败时，系统会自动降级到规则引擎
3. **置信度阈值**: 可通过调整 `isHighConfidence()` 的参数控制 LLM 调用频率
4. **元数据集成**: 当前元数据参数为 null，后续可集成数据库元数据以提高实体识别准确率
