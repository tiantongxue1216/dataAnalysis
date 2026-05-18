/**
 * API 服务层
 * 封装所有与后端的交互
 */

import type { DataSource } from '@/types/datasource'
import type { IntentObject, IntentRecognitionResult } from '@/types/intent'

const API_BASE_URL = 'http://localhost:3001/api'

/**
 * 通用请求方法
 */
async function request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || '请求失败')
    }

    return data
  } catch (error) {
    console.error('API 请求错误:', error)
    throw error
  }
}

/**
 * 数据源管理 API
 */
export const dataSourceApi = {
  /**
   * 获取所有数据源
   */
  getAll() {
    return request<{ success: boolean; data: DataSource[] }>('/datasources')
  },

  /**
   * 获取单个数据源
   */
  getById(id: string) {
    return request<{ success: boolean; data: DataSource }>(`/datasources/${id}`)
  },

  /**
   * 创建数据源
   */
  create(data: Partial<DataSource>) {
    return request<{ success: boolean; data: DataSource }>('/datasources', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * 更新数据源
   */
  update(id: string, data: Partial<DataSource>) {
    return request<{ success: boolean; data: DataSource }>(`/datasources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * 删除数据源
   */
  delete(id: string) {
    return request<{ success: boolean; message: string }>(`/datasources/${id}`, {
      method: 'DELETE',
    })
  },

  /**
   * 测试数据库连接
   */
  testConnection(config: Partial<DataSource>) {
    return request<{ success: boolean; data: any }>('/datasources/test', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  },

  /**
   * 获取数据库元数据
   */
  getMetadata(config: Partial<DataSource>) {
    return request<{ success: boolean; data: any }>('/datasources/metadata', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  },
}

/**
 * 健康检查
 */
export const healthApi = {
  check() {
    return request('/health')
  },
}

/**
 * 意图识别 API
 */
export const intentApi = {
  /**
   * 识别用户查询的意图
   */
  recognize(query: string) {
    return request<IntentRecognitionResult>('/intent/recognize', {
      method: 'POST',
      body: JSON.stringify({ query }),
    })
  },

  /**
   * 澄清对话
   */
  clarify(
    query: string,
    missingSlots: string[],
    userResponse: string,
    partialIntent?: IntentObject
  ) {
    return request<IntentRecognitionResult>('/intent/clarify', {
      method: 'POST',
      body: JSON.stringify({
        query,
        missing_slots: missingSlots,
        user_response: userResponse,
        partial_intent: partialIntent,
      }),
    })
  },
}

/**
 * SQL 生成 API
 */
export const sqlApi = {
  /**
   * 根据意图生成 SQL
   */
  generate(intent: IntentObject, datasourceId?: string) {
    return request<{ 
      success: boolean
      sql?: string
      method?: string
      error?: string
    }>('/sql/generate', {
      method: 'POST',
      body: JSON.stringify({ 
        intent,
        datasource_id: datasourceId,
      }),
    })
  },
}

/**
 * 查询执行 API
 */
export const queryApi = {
  /**
   * 执行 SQL 查询并推荐图表
   */
  execute(sql: string, datasourceId: string, intentType?: string) {
    return request<{ 
      success: boolean
      data?: any[]
      recommendation?: {
        chartType: string
        reason: string
        canRender: boolean
        message?: string
        xAxis?: string
        yAxis?: string | string[]
        groupBy?: string
      }
      rowCount?: number
      error?: string
    }>('/query/execute', {
      method: 'POST',
      body: JSON.stringify({ 
        sql,
        datasource_id: datasourceId,
        intent_type: intentType,
      }),
    })
  },
}

/**
 * Schema 信息 API
 */
export const schemaApi = {
  /**
   * 获取数据库 Schema 信息
   */
  getSchema() {
    return request<{ 
      success: boolean
      data: {
        tables: Array<{
          name: string
          description: string
          dimensions: Array<{ name: string; description: string; type: string }>
          measures: Array<{ name: string; column: string; aggregation: string; description: string; type: string }>
          timeFields: Array<{ name: string; description: string }>
        }>
      }
    }>('/schema')
  },
}

/**
 * Agent API
 */
export const agentApi = {
  /**
   * 使用 Agent 引擎执行查询
   */
  query(question: string, datasourceId: string, maxIterations?: number) {
    return request<{ 
      success: boolean
      question: string
      answer: string
      thoughts: string[]
      toolResults: Array<{
        toolCallId: string
        toolName: string
        result: string
        success: boolean
      }>
      iterations: number
      duration: number
      error?: string
      // 图表相关数据
      data?: Array<Record<string, any>>
      recommendation?: {
        chartType: string
        reason: string
        canRender: boolean
        message?: string
        xAxis?: string
        yAxis?: string | string[]
        groupBy?: string
      }
    }>('/agent/query', {
      method: 'POST',
      body: JSON.stringify({ 
        question,
        datasource_id: datasourceId,
        max_iterations: maxIterations,
      }),
    })
  },

  /**
   * 获取可用工具列表
   */
  getTools() {
    return request<{ 
      success: boolean
      data: Array<{
        name: string
        description: string
      }>
    }>('/agent/tools')
  },
}

/**
 * NL2SQL Agent API（新）
 * 基于 LangChain ReAct Agent 的自然语言查询接口
 */
export const nl2sqlApi = {
  /**
   * 执行自然语言到 SQL 的查询
   * @param question - 用户问题
   * @param datasourceId - 数据源 ID
   * @param options - 可选参数
   * @returns 查询结果
   */
  query(
    question: string, 
    datasourceId: string, 
    options?: {
      topK?: number
      maxIterations?: number
    }
  ) {
    return request<{ 
      success: boolean
      question: string
      answer: string
      thoughts: string[]
      data?: {
        rows: Array<Record<string, any>>
        rowCount: number
      }
      recommendation?: {
        chartType: string
        reason: string
        canRender: boolean
        message?: string
        xAxis?: string
        yAxis?: string | string[]
        groupBy?: string
      }
      iterations: number
      duration: number
      error?: string
      metadata?: {
        dialect: string
        tools_used: string[]
      }
    }>('/nl2sql/query', {
      method: 'POST',
      body: JSON.stringify({ 
        question,
        datasource_id: datasourceId,
        top_k: options?.topK || 5,
        max_iterations: options?.maxIterations || 10,
      }),
    })
  },
}
