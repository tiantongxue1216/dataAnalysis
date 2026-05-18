/**
 * 查询执行模块
 * 执行 SQL 查询并返回结果数据
 */

import databaseManager from './database.js'

/**
 * 执行 SQL 查询
 * @param {Object} datasource - 数据源配置
 * @param {string} sql - SQL 查询语句
 * @returns {Promise<Array>} 查询结果
 */
export async function executeQuery(datasource, sql) {
  try {
    // 执行查询（databaseManager 已经处理连接）
    const result = await databaseManager.executeQuery(datasource, sql)
    return result
  } catch (error) {
    console.error('[Query Executor] 执行失败:', error)
    throw error
  }
}

/**
 * 执行查询并推荐图表
 * @param {Object} datasource - 数据源配置
 * @param {string} sql - SQL 查询语句
 * @param {string} intentType - 意图类型
 * @returns {Promise<Object>} { data, recommendation }
 */
export async function executeAndRecommend(datasource, sql, intentType = null) {
  try {
    // 执行查询
    const data = await executeQuery(datasource, sql)

    // 导入推荐引擎
    const { recommendChart } = await import('./chart-recommender.js')

    // 推荐图表
    const recommendation = recommendChart(data, intentType)

    return {
      success: true,
      data,
      recommendation,
      rowCount: data.length,
    }
  } catch (error) {
    console.error('[Query Executor] 查询失败:', error)
    return {
      success: false,
      error: error.message,
      data: [],
      recommendation: {
        chartType: 'table',
        reason: '查询失败',
        canRender: false,
        message: error.message,
      },
      rowCount: 0,
    }
  }
}
