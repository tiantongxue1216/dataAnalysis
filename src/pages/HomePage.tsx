import { useState } from 'react'
import { MessageSquare, ArrowRight, BarChart3, Table as TableIcon, Target, Code, Database } from 'lucide-react'
import ChatMessage from '@/components/chat/ChatMessage'
import ChatInput from '@/components/chat/ChatInput'
import LoadingIndicator from '@/components/chat/LoadingIndicator'
import DataVisualization from '@/components/chart/DataVisualization'
import type { Message } from '@/types/message'
import { intentApi, sqlApi, queryApi } from '@/services/api'

const sampleQuestions = [
  '最近 12 个月的订单趋势',
  '各产品类别的销售额分布',
  '列出最近创建的 10 个用户',
  '平均每个订单的金额是多少？',
  '按地区统计用户数量排名',
]

export default function HomePage({ selectedDatasourceId }: { selectedDatasourceId: string | null }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [queryResult, setQueryResult] = useState<{
    data: any[]
    recommendation: {
      chartType: string
      reason: string
      canRender: boolean
      message?: string
      xAxis?: string
      yAxis?: string | string[]
      groupBy?: string
    } | null
  } | null>(null)
  const [currentChartType, setCurrentChartType] = useState<string>('table')

  const handleSendMessage = async (content: string) => {
    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    try {
      // 调用意图识别 API
      const result = await intentApi.recognize(content)

      let aiContent = ''

      if (result.success && result.intent) {
        // 意图识别成功
        const intent = result.intent
        aiContent = `🎯 **意图识别成功**\n\n` +
          `**意图类型**: ${intent.intent_type}\n` +
          `**置信度**: ${(intent.confidence * 100).toFixed(1)}%\n\n`

        if (intent.entities.length > 0) {
          aiContent += '**识别到的实体**:\n'
          intent.entities.forEach(entity => {
            aiContent += `  • ${entity.entity_type}: ${entity.value}`
            if (entity.normalized) {
              aiContent += ` → ${entity.normalized}`
            }
            aiContent += '\n'
          })
          aiContent += '\n'
        }

        if (intent.select_columns.length > 0) {
          aiContent += `**查询字段**: ${intent.select_columns.join(', ')}\n\n`
        }

        if (intent.aggregation) {
          aiContent += `**聚合函数**: ${intent.aggregation}\n\n`
        }

        if (intent.conditions.length > 0) {
          aiContent += `**查询条件** (${intent.conditions.length} 个):\n`
          intent.conditions.forEach(cond => {
            aiContent += `  • ${cond.column} ${cond.operator} ${cond.value}\n`
          })
          aiContent += '\n'
        }

        if (intent.group_by && intent.group_by.length > 0) {
          aiContent += `**分组字段**: ${intent.group_by.join(', ')}\n\n`
        }

        if (intent.order_by) {
          aiContent += `**排序**: ${intent.order_by.column} ${intent.order_by.direction}\n\n`
        }

        if (intent.limit) {
          aiContent += `**限制数量**: ${intent.limit}\n\n`
        }

        if (intent.reasoning) {
          aiContent += `**推理过程**: ${intent.reasoning}\n\n`
        }

        if (intent.missing_slots.length > 0) {
          aiContent += `⚠️ **缺失槽位**: ${intent.missing_slots.join(', ')}\n`
        }

        // 生成 SQL（如果没有缺失关键槽位）
        if (intent.missing_slots.length === 0) {
          try {
            aiContent += '\n---\n\n💻 **正在生成 SQL...**\n'
            
            const sqlResult = await sqlApi.generate(intent, selectedDatasourceId || undefined)
            
            if (sqlResult.success && sqlResult.sql) {
              aiContent += `✅ **SQL 生成成功** (${sqlResult.method === 'rule-based' ? '规则引擎' : 'LLM'})\n\n`
              aiContent += '```sql\n'
              aiContent += sqlResult.sql + '\n'
              aiContent += '```\n'
              
              // 执行 SQL 查询并推荐图表
              aiContent += '\n📊 **正在执行查询并推荐图表...**\n'
              
              if (!selectedDatasourceId) {
                aiContent += '\n❌ **请先选择数据源**\n'
              } else {
                try {
                  const queryResult = await queryApi.execute(
                    sqlResult.sql,
                    selectedDatasourceId,
                    intent.intent_type
                  )
                  
                  if (queryResult.success && queryResult.data) {
                    aiContent += `✅ **查询成功**: 返回 ${queryResult.rowCount} 行数据\n\n`
                    aiContent += `📈 **推荐图表**: ${queryResult.recommendation?.reason || '表格'}\n`
                    
                    // 更新可视化数据
                    setQueryResult({
                      data: queryResult.data,
                      recommendation: queryResult.recommendation || null,
                    })
                    setCurrentChartType(queryResult.recommendation?.chartType || 'table')
                  } else {
                    aiContent += `❌ **查询失败**: ${queryResult.error || '未知错误'}\n`
                  }
                } catch (error: any) {
                  aiContent += `\n❌ **查询执行错误**: ${error.message || '请检查数据源配置'}\n`
                }
              }
            } else {
              aiContent += `❌ **SQL 生成失败**: ${sqlResult.error || '未知错误'}\n`
            }
          } catch (error: any) {
            aiContent += `\n❌ **SQL 生成错误**: ${error.message || '请稍后重试'}\n`
          }
        }
      } else if (result.need_clarification) {
        // 需要澄清
        aiContent = `❓ **需要更多信息**\n\n` +
          `系统无法完全理解您的意图，需要补充以下信息：\n\n` +
          `${result.message || '请提供更详细的查询信息'}\n\n` +
          `缺失槽位: ${result.missing_slots?.join(', ') || '未知'}`
      } else {
        aiContent = '❌ 意图识别失败，请重试。'
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date(),
        intent: result.success ? result.intent : undefined,
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (error: any) {
      // 错误处理
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ **错误**: ${error.message || '意图识别失败'}\n\n请稍后重试或检查后端服务是否正常运行。`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleSampleQuestion = (question: string) => {
    handleSendMessage(question)
  }

  // 欢迎界面
  if (messages.length === 0) {
    return (
      <div className="h-full flex">
        {/* 左侧对话区域 */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col bg-white">
          {/* 数据源选择器 */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2 text-gray-600">
              <Database className="w-4 h-4" />
              <span className="text-sm">选择数据源</span>
            </div>
          </div>

          {/* 欢迎内容 */}
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
            </div>

            <div className="text-center max-w-md mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                开始数据探索
              </h2>
              <p className="text-gray-500 text-sm">
                输入您的问题，系统将生成 SQL 并可视化结果。
              </p>
            </div>

            {/* 示例问题 */}
            <div className="grid grid-cols-1 gap-3 max-w-md w-full">
              {sampleQuestions.slice(0, 3).map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSampleQuestion(question)}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-sm transition-all text-left group"
                >
                  <ArrowRight className="w-4 h-4 text-primary flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  <span className="text-gray-700 text-sm group-hover:text-gray-900">{question}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 底部输入框 */}
          <ChatInput 
            onSend={handleSendMessage}
            disabled={false}
            placeholder="在此输入问题..."
          />
        </div>

        {/* 右侧数据分析结果区域 */}
        <div className="w-1/2 flex flex-col items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mb-4">
              <div className="flex items-center justify-center gap-1 mb-4">
                <div className="w-1 h-6 bg-primary/30 rounded-full" style={{ animationDelay: '0s' }}></div>
                <div className="w-1 h-8 bg-primary/50 rounded-full" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-10 bg-primary/70 rounded-full" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
            <p className="text-gray-400 text-sm font-medium tracking-wider uppercase">
              Waiting for insight
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 对话界面
  return (
    <div className="h-full flex">
      {/* 左侧对话区域 */}
      <div className="w-1/2 border-r border-gray-200 flex flex-col bg-white">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {/* 加载指示器 */}
          {isTyping && <LoadingIndicator />}
        </div>

        {/* 输入框 */}
        <ChatInput 
          onSend={handleSendMessage}
          placeholder="在此输入问题..."
          disabled={isTyping}
        />
      </div>

      {/* 右侧数据分析结果区域 */}
      <div className="w-1/2 flex flex-col bg-gray-50 grid-bg">
        {queryResult && queryResult.recommendation ? (
          <DataVisualization
            data={queryResult.data}
            recommendation={queryResult.recommendation}
            currentChartType={currentChartType}
            onChartTypeChange={setCurrentChartType}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="mb-4">
                <div className="flex items-center justify-center gap-1 mb-4">
                  <div className="w-1 h-6 bg-primary/30 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                  <div className="w-1 h-8 bg-primary/50 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1 h-10 bg-primary/70 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
              <p className="text-gray-400 text-sm font-medium tracking-wider uppercase">
                Waiting for insight
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
