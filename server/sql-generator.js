/**
 * SQL 生成器
 * 根据意图对象和表结构生成 SQL 查询
 * 
 * 策略：
 * 1. 基于规则/模板生成（主要方式）
 * 2. LLM 生成作为回退方案
 */

import { callDeepSeekAPI } from './deepseek-client.js'
import { generateSchemaDescription } from './db-schema.js'

/**
 * SQL 片段模板库
 */
const SQL_TEMPLATES = {
  // SELECT 子句
  select: (columns, aggregation) => {
    if (!columns || columns.length === 0) {
      return 'SELECT *'
    }
    
    if (aggregation && aggregation !== 'NONE') {
      // 如果有多个字段，第一个是分组字段，第二个是聚合字段
      if (columns.length > 1) {
        const groupCol = columns[0]
        const aggCol = columns[1]
        return `SELECT ${groupCol}, ${aggregation}(${aggCol}) as ${aggregation.toLowerCase()}_${aggCol}`
      } else {
        // 只有一个字段，直接聚合
        const col = columns[0]
        return `SELECT ${aggregation}(${col}) as ${aggregation.toLowerCase()}_${col}`
      }
    }
    
    return `SELECT ${columns.join(', ')}`
  },

  // FROM 子句
  from: (tableName) => {
    if (!tableName) {
      throw new Error('表名不能为空')
    }
    return `FROM ${tableName}`
  },

  // WHERE 子句
  where: (conditions) => {
    if (!conditions || conditions.length === 0) {
      return ''
    }

    const whereClauses = conditions.map(condition => {
      const { column, operator, value } = condition
      
      // 判断值是否需要加引号（数字不需要，字符串需要）
      const isNumeric = typeof value === 'number' || !isNaN(Number(value))
      const quotedValue = isNumeric ? value : `'${value}'`
      
      // 处理不同的操作符
      switch (operator) {
        case '=':
          return `${column} = ${quotedValue}`
        case '>':
          return `${column} > ${quotedValue}`
        case '<':
          return `${column} < ${quotedValue}`
        case '>=':
          return `${column} >= ${quotedValue}`
        case '<=':
          return `${column} <= ${quotedValue}`
        case '!=':
          return `${column} != ${quotedValue}`
        case 'LIKE':
          return `${column} LIKE '%${value}%'`
        case 'IN':
          return `${column} IN (${value})`
        case 'BETWEEN':
          return `${column} BETWEEN ${value}`
        default:
          return `${column} ${operator} ${quotedValue}`
      }
    })

    return `WHERE ${whereClauses.join(' AND ')}`
  },

  // GROUP BY 子句
  groupBy: (groupBy) => {
    if (!groupBy || groupBy.length === 0) {
      return ''
    }
    return `GROUP BY ${groupBy.join(', ')}`
  },

  // ORDER BY 子句
  orderBy: (orderBy) => {
    if (!orderBy) {
      return ''
    }
    
    const { column, direction = 'DESC' } = orderBy
    return `ORDER BY ${column} ${direction}`
  },

  // LIMIT 子句
  limit: (limit) => {
    if (!limit) {
      return ''
    }
    return `LIMIT ${limit}`
  },
}

/**
 * 基于规则生成 SQL（主要方式）
 * @param {Object} intent - 意图对象
 * @param {Object} metadata - 表结构元数据
 * @returns {string} 生成的 SQL
 */
export function generateSQLByRules(intent, metadata = null) {
  try {
    console.log('[SQL Generator] 使用规则引擎生成 SQL')
    console.log('[SQL Generator] 意图对象:', JSON.stringify(intent, null, 2))

    // 验证必需字段
    if (!intent.table_name) {
      throw new Error('缺少表名，无法生成 SQL')
    }

    if (!intent.select_columns || intent.select_columns.length === 0) {
      throw new Error('缺少查询字段，无法生成 SQL')
    }

    // 构建 SQL 各部分
    const parts = []

    // 0. 如果有 GROUP BY，确保 SELECT 中包含分组字段
    let selectColumns = [...intent.select_columns]
    if (intent.group_by && intent.group_by.length > 0) {
      // 将 GROUP BY 字段添加到 SELECT 的开头
      intent.group_by.forEach(groupCol => {
        if (!selectColumns.includes(groupCol)) {
          selectColumns.unshift(groupCol)
        }
      })
    }

    // 1. SELECT 子句
    parts.push(SQL_TEMPLATES.select(selectColumns, intent.aggregation))

    // 2. FROM 子句
    parts.push(SQL_TEMPLATES.from(intent.table_name))

    // 3. WHERE 子句
    const whereClause = SQL_TEMPLATES.where(intent.conditions)
    if (whereClause) {
      parts.push(whereClause)
    }

    // 4. GROUP BY 子句
    const groupByClause = SQL_TEMPLATES.groupBy(intent.group_by)
    if (groupByClause) {
      parts.push(groupByClause)
    }

    // 5. ORDER BY 子句
    const orderByClause = SQL_TEMPLATES.orderBy(intent.order_by)
    if (orderByClause) {
      parts.push(orderByClause)
    }

    // 6. LIMIT 子句
    const limitClause = SQL_TEMPLATES.limit(intent.limit)
    if (limitClause) {
      parts.push(limitClause)
    }

    // 拼接完整 SQL
    const sql = parts.join(' ') + ';'

    console.log('[SQL Generator] 生成的 SQL:', sql)

    return {
      success: true,
      sql,
      method: 'rule-based',
      intent_type: intent.intent_type,
    }
  } catch (error) {
    console.error('[SQL Generator] 规则生成失败:', error.message)
    return {
      success: false,
      error: error.message,
      method: 'rule-based',
    }
  }
}

/**
 * 基于 LLM 生成 SQL（回退方案）
 * @param {Object} intent - 意图对象
 * @param {Object} metadata - 表结构元数据
 * @returns {Promise<Object>} 生成结果
 */
export async function generateSQLByLLM(intent, metadata = null) {
  try {
    console.log('[SQL Generator] 使用 LLM 生成 SQL')

    // 构建 Prompt
    const prompt = buildLLMPrompt(intent, metadata)

    // 调用 LLM
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: prompt,
      },
    ]

    const response = await callDeepSeekAPI(messages, {
      temperature: 0.1, // 低温度，确保输出稳定
      maxTokens: 500,
      // 不设置 response_format，使用普通文本模式
    })

    // 解析 LLM 返回的 SQL
    const content = response.choices?.[0]?.message?.content
    
    if (!content) {
      console.error('[SQL Generator] LLM 响应中未找到 content 字段')
      throw new Error('LLM 未返回任何内容')
    }
    
    console.log('[SQL Generator] LLM 原始响应:', content)
    const sql = extractSQLFromResponse(content)

    if (!sql) {
      console.error('[SQL Generator] 无法从 LLM 响应中提取 SQL')
      throw new Error('LLM 未返回有效的 SQL')
    }

    console.log('[SQL Generator] LLM 生成的 SQL:', sql)

    return {
      success: true,
      sql,
      method: 'llm-based',
      intent_type: intent.intent_type,
      reasoning: response.content,
    }
  } catch (error) {
    console.error('[SQL Generator] LLM 生成失败:', error.message)
    return {
      success: false,
      error: error.message,
      method: 'llm-based',
    }
  }
}

/**
 * 主函数：生成 SQL
 * 优先使用规则生成，失败时回退到 LLM
 * @param {Object} intent - 意图对象
 * @param {Object} metadata - 表结构元数据
 * @returns {Promise<Object>} 生成结果
 */
export async function generateSQL(intent, metadata = null) {
  console.log('[SQL Generator] 开始生成 SQL')

  // 第一步：尝试基于规则生成
  const ruleResult = generateSQLByRules(intent, metadata)

  if (ruleResult.success) {
    console.log('[SQL Generator] ✅ 规则生成成功')
    return ruleResult
  }

  // 第二步：规则生成失败，回退到 LLM
  console.log('[SQL Generator] ⚠️  规则生成失败，回退到 LLM 生成')
  const llmResult = await generateSQLByLLM(intent, metadata)

  if (llmResult.success) {
    console.log('[SQL Generator] ✅ LLM 生成成功')
    return llmResult
  }

  // 第三步：两种方式都失败
  console.error('[SQL Generator] ❌ SQL 生成失败')
  return {
    success: false,
    error: `SQL 生成失败: ${ruleResult.error || llmResult.error}`,
    method: 'failed',
  }
}

/**
 * 构建 LLM Prompt
 */
function buildLLMPrompt(intent, metadata) {
  let prompt = `请根据以下信息生成 SQL 查询：\n\n`

  // 用户原始查询
  prompt += `**用户查询**: ${intent.user_input || '未知'}\n\n`

  // 意图信息
  prompt += `**意图类型**: ${intent.intent_type}\n`
  
  // 处理表名缺失的情况
  if (!intent.table_name) {
    prompt += `**表名**: 未指定（需要你根据查询内容推断）\n`
    
    // 如果有元数据，提供所有可用表供选择
    if (metadata && metadata.tables && metadata.tables.length > 0) {
      prompt += `\n**可用表列表**:\n`
      metadata.tables.forEach(table => {
        prompt += `  - ${table.name}`
        if (table.columns && table.columns.length > 0) {
          const keyColumns = table.columns.slice(0, 5).map(c => c.name).join(', ')
          prompt += ` (字段: ${keyColumns}${table.columns.length > 5 ? '...' : ''})`
        }
        prompt += `\n`
      })
      prompt += `\n请根据用户查询的语义，选择最合适的表。\n`
    }
  } else {
    prompt += `**表名**: ${intent.table_name}\n`
  }
  
  prompt += `**查询字段**: ${intent.select_columns?.join(', ') || '未指定'}\n`
  
  if (intent.aggregation) {
    prompt += `**聚合函数**: ${intent.aggregation}\n`
  }

  if (intent.conditions && intent.conditions.length > 0) {
    prompt += `**筛选条件**:\n`
    intent.conditions.forEach(cond => {
      prompt += `  - ${cond.column} ${cond.operator} ${cond.value}\n`
    })
  }

  if (intent.group_by && intent.group_by.length > 0) {
    prompt += `**分组字段**: ${intent.group_by.join(', ')}\n`
  }

  if (intent.order_by) {
    prompt += `**排序**: ${intent.order_by.column} ${intent.order_by.direction || 'DESC'}\n`
  }

  if (intent.limit) {
    prompt += `**限制数量**: ${intent.limit}\n`
  }

  // 表结构信息
  if (metadata && metadata.tables) {
    prompt += `\n**表结构详细信息**:\n`
    
    // 如果指定了表名，只显示该表的结构
    if (intent.table_name) {
      const targetTable = metadata.tables.find(t => t.name === intent.table_name)
      if (targetTable) {
        prompt += `表名: ${targetTable.name}\n`
        prompt += `字段列表:\n`
        targetTable.columns.forEach(col => {
          prompt += `  - ${col.name} (${col.type})${col.primaryKey ? ' [主键]' : ''}${col.nullable ? '' : ' [非空]'}\n`
        })
      } else {
        prompt += `未找到表 "${intent.table_name}" 的结构信息\n`
      }
    } else {
      // 如果未指定表名，显示所有表的结构
      metadata.tables.forEach(table => {
        prompt += `\n表名: ${table.name}\n`
        prompt += `字段列表:\n`
        table.columns.forEach(col => {
          prompt += `  - ${col.name} (${col.type})${col.primaryKey ? ' [主键]' : ''}${col.nullable ? '' : ' [非空]'}\n`
        })
      })
    }
  }

  prompt += `\n**重要提示**:\n`
  prompt += `1. 如果表名未指定，请根据查询内容和字段名称推断最合适的表\n`
  prompt += `2. 只返回 SQL 语句，不要包含其他解释、注释或 Markdown 格式\n`
  prompt += `3. SQL 语句必须以分号结尾\n`
  prompt += `4. 字符串值必须用单引号包裹\n\n`
  prompt += `请生成符合上述要求的 SQL 查询语句：`

  return prompt
}

/**
 * LLM System Prompt
 */
const SCHEMA_DESCRIPTION = generateSchemaDescription()

const SYSTEM_PROMPT = `你是一个专业的 SQL 生成助手。你的任务是根据用户意图和表结构生成准确的 SQL 查询语句。

${SCHEMA_DESCRIPTION}

**核心能力**:
1. 当表名未指定时，根据查询内容和字段名称智能推断最合适的表
2. 理解常见的业务指标（如销售额、订单数、用户数等）对应的表和字段
3. 生成符合 SQL 标准的查询语句

**要求**:
1. 只返回 SQL 语句，不要包含任何解释、注释或其他文本
2. SQL 语句必须以分号结尾
3. 使用标准的 SQL 语法
4. 字符串值必须用单引号包裹
5. 如果表名或字段名包含特殊字符，使用双引号包裹
6. 确保生成的 SQL 是安全且可执行的
7. 当表名缺失时，从提供的可用表列表中选择最合适的表
8. **重要**: 时间字段统一使用 created_at，不要使用 date
9. **重要**: 订单金额字段使用 total_amount，不要使用 sales_amount`

/**
 * 从 LLM 响应中提取 SQL
 */
function extractSQLFromResponse(content) {
  if (!content) {
    return null
  }

  // 尝试提取 SQL 代码块
  const codeBlockMatch = content.match(/```(?:sql)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim()
  }

  // 尝试提取以 SELECT/INSERT/UPDATE/DELETE 开头的语句
  const sqlMatch = content.match(/(SELECT|INSERT|UPDATE|DELETE)[\s\S]*?;/i)
  if (sqlMatch) {
    return sqlMatch[0].trim()
  }

  // 如果内容本身就是 SQL
  if (/^(SELECT|INSERT|UPDATE|DELETE)\s/i.test(content.trim())) {
    return content.trim()
  }

  return null
}
