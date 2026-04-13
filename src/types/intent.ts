/**
 * 意图识别类型定义
 */

// 意图类型
export type IntentType = 'QUERY' | 'COUNT' | 'FILTER' | 'SORT' | 'INCOMPLETE'

// 实体类型
export type EntityType = 'TIME' | 'REGION' | 'METRIC' | 'DIMENSION' | 'VALUE' | 'OPERATION'

// 聚合函数类型
export type AggregationType = 'SUM' | 'AVG' | 'COUNT' | 'MAX' | 'MIN' | 'NONE'

// 排序方向
export type SortDirection = 'ASC' | 'DESC'

// 比较操作符
export type Operator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'BETWEEN' | 'IN' | 'LIKE'

// 实体接口
export interface Entity {
  entity_type: EntityType
  value: string
  normalized?: string  // 标准化后的值（如时间标准化为日期格式）
  column_name?: string  // 对应的数据库列名
}

// 查询条件
export interface Condition {
  column: string
  operator: Operator
  value: string | string[] | number
}

// 排序字段
export interface OrderBy {
  column: string
  direction: SortDirection
}

// 完整的意图对象
export interface IntentObject {
  intent_type: IntentType
  confidence: number  // 置信度 0-1
  entities: Entity[]
  select_columns: string[]
  aggregation?: AggregationType
  table_name?: string
  conditions: Condition[]
  group_by?: string[]
  order_by?: OrderBy
  limit?: number
  missing_slots: string[]  // 缺失的槽位（需要用户澄清）
  reasoning?: string  // LLM 推理过程
}

// 意图识别结果
export interface IntentRecognitionResult {
  success: boolean
  intent?: IntentObject
  need_clarification?: boolean
  missing_slots?: string[]
  message?: string  // 需要向用户展示的澄清消息
}
