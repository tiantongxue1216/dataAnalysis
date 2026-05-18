/**
 * 意图识别主服务（已废弃）
 * @deprecated 请使用 /api/nl2sql/query 替代
 * 
 * 此模块已被 LangChain NL2SQL Agent 替代
 * 保留此文件仅为向后兼容，所有功能已返回废弃提示
 */

/**
 * 意图识别主流程（已废弃）
 * @deprecated 请使用新的 NL2SQL Agent API
 */
export async function recognizeIntent(userInput, metadata = null) {
  console.warn('[Intent Recognition] ⚠️  此函数已废弃，请使用 /api/nl2sql/query')
  
  return {
    success: false,
    error: '意图识别服务已废弃，请使用新的 NL2SQL Agent API',
    migration_guide: 'POST /api/nl2sql/query { question, datasource_id }',
    deprecated: true
  }
}

/**
 * 澄清对话（已废弃）
 * @deprecated 请使用新的 NL2SQL Agent API
 */
export async function clarifyIntent(query, missingSlots, userResponse, partialIntent, metadata = null) {
  console.warn('[Intent Recognition] ⚠️  此函数已废弃，请使用 /api/nl2sql/query')
  
  return {
    success: false,
    error: '澄清对话服务已废弃，请使用新的 NL2SQL Agent API',
    migration_guide: 'POST /api/nl2sql/query { question, datasource_id }',
    deprecated: true
  }
}
