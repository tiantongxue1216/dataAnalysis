/**
 * Agent 状态定义
 */

import { Annotation } from '@langchain/langgraph'

/**
 * Agent 状态接口
 * 
 * @typedef {Object} AgentState
 * @property {Array} messages - 消息历史（包括 HumanMessage, AIMessage, ToolMessage）
 * @property {string} question - 用户原始问题
 * @property {Array<string>} thoughts - 思考过程记录
 * @property {Array} toolResults - 工具执行结果
 * @property {Array<string>} steps - 执行步骤记录
 * @property {number} iterations - 当前迭代次数
 * @property {number} maxIterations - 最大迭代次数
 * @property {string} [datasourceId] - 数据源 ID
 */

/**
 * 使用 Annotation 定义 Agent 状态
 */
export const AgentState = Annotation.Root({
  // 消息历史
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => []
  }),
  
  // 用户问题
  question: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => ''
  }),
  
  // 思考过程
  thoughts: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => []
  }),
  
  // 工具执行结果
  toolResults: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => []
  }),
  
  // 执行步骤
  steps: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => []
  }),
  
  // 迭代计数
  iterations: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => 0
  }),
  
  // 最大迭代次数
  maxIterations: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => 10
  }),
  
  // 数据源 ID
  datasourceId: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null
  }),
  
  // 工具调用历史（用于防止重复调用）
  toolCallHistory: Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => []
  })
})

/**
 * 创建初始状态
 * @param {object} params - 参数
 * @returns {object} 初始状态
 */
export function createInitialState(params = {}) {
  return {
    messages: params.messages || [],
    question: params.question || '',
    thoughts: params.thoughts || [],
    toolResults: params.toolResults || [],
    steps: params.steps || [],
    iterations: params.iterations || 0,
    maxIterations: params.maxIterations || 10,
    datasourceId: params.datasourceId || null,
    toolCallHistory: params.toolCallHistory || []
  }
}
