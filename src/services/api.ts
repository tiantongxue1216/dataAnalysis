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
