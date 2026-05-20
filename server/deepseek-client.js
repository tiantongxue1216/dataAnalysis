/**
 * DeepSeek API 客户端
 * 封装与 DeepSeek 大模型的交互
 */

import { config } from './config.js'

/**
 * DeepSeek API 配置
 */
function getDeepSeekConfig() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.DASHSCOPE_API_KEY || config.deepseekApiKey,
    apiUrl: process.env.DEEPSEEK_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v3',
    timeout: 30000, // 30秒超时
    enable_thinking: process.env.DEEPSEEK_ENABLE_THINKING !== 'false', // 默认开启思考模式
  }
}

/**
 * 调用 DeepSeek API
 * @param {Array} messages - 消息数组 [{role: 'user', content: '...'}]
 * @param {Object} options - 可选配置
 * @returns {Object} API 响应
 */
export async function callDeepSeekAPI(messages, options = {}) {
  const DEEPSEEK_CONFIG = getDeepSeekConfig()
  const {
    model = DEEPSEEK_CONFIG.model,
    temperature = 0.3,
    maxTokens = 2000,
    response_format, // 可选，默认为 undefined
    extraBody = {}, // 阿里云百炼额外参数（如 enable_thinking）
  } = options

  if (!DEEPSEEK_CONFIG.apiKey) {
    throw new Error('DeepSeek API Key 未配置，请设置 DEEPSEEK_API_KEY 环境变量')
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEEPSEEK_CONFIG.timeout)

    const body = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...extraBody, // 合并额外参数
    }

    // 只有当 response_format 不为 undefined 时才添加
    if (response_format) {
      body.response_format = response_format
    }

    const response = await fetch(DEEPSEEK_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_CONFIG.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `DeepSeek API 调用失败: ${response.status} - ${errorData.error?.message || response.statusText}`
      )
    }

    const data = await response.json()
    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('DeepSeek API 请求超时')
    }
    throw error
  }
}

/**
 * 解析 DeepSeek 返回的 JSON 结果
 * @param {string} content - 模型返回的内容
 * @returns {Object} 解析后的 JSON 对象
 */
export function parseDeepSeekResponse(content) {
  try {
    // 尝试直接解析
    return JSON.parse(content)
  } catch (error) {
    // 如果直接解析失败，尝试提取 JSON 部分
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch (parseError) {
        throw new Error(`无法解析 DeepSeek 返回的 JSON: ${parseError.message}`)
      }
    }
    throw new Error(`返回内容不是有效的 JSON 格式`)
  }
}

/**
 * 获取 API 配置信息（用于调试）
 */
export function getAPIConfig() {
  const DEEPSEEK_CONFIG = getDeepSeekConfig()
  return {
    apiUrl: DEEPSEEK_CONFIG.apiUrl,
    model: DEEPSEEK_CONFIG.model,
    hasApiKey: !!DEEPSEEK_CONFIG.apiKey,
  }
}
