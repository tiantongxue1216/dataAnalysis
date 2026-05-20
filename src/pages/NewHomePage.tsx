import { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  ArrowRight, 
  Send,
  Sparkles,
  RotateCw,
  FileText,
  Calculator,
  Trash2,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  Code2
} from 'lucide-react'
import { dataSourceApi, nl2sqlApi } from '@/services/api'
import type { DataSource } from '@/types/datasource'
import DataVisualization from '@/components/chart/DataVisualization'

interface ChartRecommendation {
  chartType: string
  reason: string
  canRender: boolean
  message?: string
  xAxis?: string
  yAxis?: string | string[]
  groupBy?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  thinking?: string
  duration?: number
  queryConditions?: string[]
  resultTitle?: string
  tableData?: Array<Record<string, any>>
  recommendedQuestions?: string[]
  chartRecommendation?: ChartRecommendation
  agentMode?: boolean
  // Agent 模式的图表数据
  data?: Array<Record<string, any>>
  recommendation?: ChartRecommendation
  // NL2SQL 生成的 SQL 语句
  sql?: string
}

const sampleQuestions = [
  '最近 12 个月的订单趋势',
  '各地区的销售额分布',
  '列出最近创建的 10 个用户',
  '平均每个订单的金额是多少？',
  '按地区统计用户数量排名',
]

export default function NewHomePage({ 
  selectedDatasourceId,
  onDatasourceChange,
  activeSessionId,
  onUpdateSession,
  onNewChat,
}: { 
  selectedDatasourceId: string | null
  onDatasourceChange?: (id: string) => void
  activeSessionId?: string
  onUpdateSession?: (sessionId: string, title: string, messageCount: number) => void
  onNewChat?: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [expandedThinking, setExpandedThinking] = useState<{[key: string]: boolean}>({})
  const [datasources, setDatasources] = useState<DataSource[]>([])
  const [currentChartTypes, setCurrentChartTypes] = useState<{[key: string]: string}>({})

  useEffect(() => {
    fetchDatasources()
  }, [])

  // 当数据源加载后，如果没有选中的，自动选择第一个
  useEffect(() => {
    if (datasources.length > 0 && !selectedDatasourceId) {
      const firstId = datasources[0].id
      if (firstId) {
        onDatasourceChange?.(firstId)
      }
    }
  }, [datasources, selectedDatasourceId, onDatasourceChange])

  const fetchDatasources = async () => {
    try {
      const result = await dataSourceApi.getAll()
      if (result.success) {
        setDatasources(result.data)
      }
    } catch (error) {
      console.error('获取数据源失败:', error)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const startTime = Date.now()
      
      // 使用 NL2SQL Agent API
      await handleNL2SQLQuery(content, startTime)
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 错误: ${error.message || '处理失败'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * NL2SQL Agent 模式查询
   */
  const handleNL2SQLQuery = async (content: string, startTime: number) => {
    try {
      const nl2sqlResult = await nl2sqlApi.query(
        content,
        selectedDatasourceId!,
        { topK: 5, maxIterations: 10 }
      )

      // 检查返回结果
      if (!nl2sqlResult || !nl2sqlResult.success) {
        throw new Error(nl2sqlResult?.error || 'NL2SQL 查询失败')
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(3)

      // 构建思考过程
      let thoughts = nl2sqlResult.thoughts || []
      
      // 去重
      thoughts = thoughts.filter((thought, index) => {
        if (index === 0) return true
        return thought !== thoughts[index - 1]
      })
      
      // 格式化思考过程
      const thinkingLines = [
        `🚀 NL2SQL Agent 执行完成`,
        `━━━━━━━━━━━━━━━━━━━━━━━`,
        `迭代次数: ${nl2sqlResult.iterations || 0}`,
        `耗时: ${duration}秒`,
        `数据库类型: ${nl2sqlResult.metadata?.dialect || '未知'}`,
        ``,
        `📝 思考过程:`,
        `───────────────────────`,
        ...thoughts.map((t, i) => `${i + 1}. ${t}`),
      ]
      
      const thinking = thinkingLines.join('\n')

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: nl2sqlResult.answer || '抱歉，未能生成回答',
        timestamp: new Date(),
        thinking,
        duration: parseFloat(duration),
        agentMode: true,
        sql: nl2sqlResult.sql || undefined,  // 保存生成的 SQL
        // 添加图表数据
        data: nl2sqlResult.data?.rows || undefined,
        recommendation: nl2sqlResult.recommendation || undefined,
      }
      setMessages(prev => [...prev, aiMessage])
      
      // 更新会话标题和消息数量
      if (activeSessionId && onUpdateSession) {
        const userMessageCount = messages.filter(m => m.role === 'user').length + 1
        const sessionTitle = content.length > 30 ? content.substring(0, 30) + '...' : content
        onUpdateSession(activeSessionId, sessionTitle, userMessageCount)
      }
    } catch (error: any) {
      console.error('NL2SQL 查询失败:', error)
      
      // 显示错误消息
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 查询失败: ${error.message || '未知错误'}`,
        timestamp: new Date(),
        thinking: `错误: ${error.stack || error.message}`,
        duration: parseFloat(((Date.now() - startTime) / 1000).toFixed(3)),
        agentMode: true,
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }



  const handleSampleQuestion = (question: string) => {
    handleSendMessage(question)
  }

  const handleChartTypeChange = (messageId: string, chartType: string) => {
    setCurrentChartTypes(prev => ({
      ...prev,
      [messageId]: chartType,
    }))
  }

  const handleNewChatClick = () => {
    // 清空当前对话
    setMessages([])
    setCurrentChartTypes({})
    setExpandedThinking({})
    
    // 调用父组件的新建会话函数
    if (onNewChat) {
      onNewChat()
    }
  }

  const toggleThinking = (messageId: string) => {
    setExpandedThinking(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }))
  }

  // 欢迎界面
  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col bg-white">
        {/* 欢迎内容 */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="max-w-3xl w-full text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              您好，开始您的数据洞察之旅
            </h1>
            <p className="text-gray-500 text-base">
              使用自然语言查询您的业务数据，AI将自动生成SQL并返回结果
            </p>
          </div>

          {/* 示例问题 */}
          <div className="max-w-3xl w-full space-y-3">
            {sampleQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSampleQuestion(question)}
                className="w-full text-left p-4 bg-gray-50 hover:bg-blue-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform" />
                  <span className="text-gray-700 group-hover:text-gray-900 text-sm leading-relaxed">{question}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 底部输入框 */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(inputValue)
                  }
                }}
                placeholder="请直接提问，或者输入 / 唤起指令"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[60px] max-h-[200px]"
                rows={2}
              />
              <button
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            {/* 底部工具栏 */}
            <div className="flex items-center justify-end gap-3 mt-3">
              <button 
                onClick={handleNewChatClick}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                <span>新建对话</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 对话界面
  return (
    <div className="h-full flex flex-col bg-white">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {messages.map((message) => (
            <div key={message.id}>
              {message.role === 'user' ? (
                /* 用户消息 */
                <div className="flex justify-end">
                  <div className="bg-blue-50 px-5 py-3 rounded-2xl max-w-2xl">
                    <p className="text-gray-900 text-sm leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ) : (
                /* AI消息 */
                <div className="space-y-4">
                  {/* 时间戳和耗时 */}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-xs">S</span>
                    </div>
                    <span>{message.timestamp.toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}</span>
                    <span>耗时 {message.duration}秒</span>
                  </div>

                  {/* 思考和处理过程 */}
                  {message.thinking && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleThinking(message.id)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          <span>思考和处理过程</span>
                        </div>
                        {expandedThinking[message.id] ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      {expandedThinking[message.id] && (
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{message.thinking}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 生成的 SQL */}
                  {message.sql && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-2.5 bg-gray-100 border-b border-gray-200">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Code2 className="w-4 h-4 text-green-600" />
                          <span className="font-medium">生成的 SQL</span>
                        </div>
                      </div>
                      <div className="px-4 py-3 bg-gray-50">
                        <pre className="text-sm text-gray-900 font-mono whitespace-pre-wrap break-all">{message.sql}</pre>
                      </div>
                    </div>
                  )}

                  {/* AI 回答内容 */}
                  {message.content && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{message.content}</p>
                    </div>
                  )}

                  {/* 查询条件 */}
                  {message.queryConditions && message.queryConditions.length > 0 && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-gray-600">查询条件:</span>
                      {message.queryConditions.map((condition, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">
                          {condition}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 结果标题 */}
                  {message.resultTitle && (
                    <p className="text-sm text-gray-700 mt-3">{message.resultTitle}</p>
                  )}

                  {/* 表格数据 / 图表 */}
                  {((message.tableData && message.tableData.length > 0) || (message.data && message.data.length > 0)) && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ minHeight: '400px', height: '600px' }}>
                      <DataVisualization
                        data={message.tableData || message.data || []}
                        recommendation={message.chartRecommendation || message.recommendation || {
                          chartType: 'table',
                          reason: '表格展示',
                          canRender: false,
                        }}
                        currentChartType={currentChartTypes[message.id] || message.chartRecommendation?.chartType || message.recommendation?.chartType || 'table'}
                        onChartTypeChange={(type) => handleChartTypeChange(message.id, type)}
                      />
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 pt-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors">
                      <RotateCw className="w-4 h-4" />
                      <span>重新生成</span>
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors">
                      <FileText className="w-4 h-4" />
                      <span>AI报告</span>
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors">
                      <Calculator className="w-4 h-4" />
                      <span>计算过程</span>
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                      <span>删除</span>
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-300 mx-2"></div>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 推荐问句 */}
                  {message.recommendedQuestions && (
                    <div className="pt-3">
                      <p className="text-sm text-gray-600 mb-3">根据数据推荐以下问句，你可以直接点击查询:</p>
                      <div className="space-y-2">
                        {message.recommendedQuestions.map((question, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(question)}
                            className="w-full text-left px-4 py-2.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-gray-700 hover:text-gray-900 transition-colors flex items-center justify-between group"
                          >
                            <span className="flex-1">{question}</span>
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0 ml-2" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* 加载指示器 */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              <span className="ml-2">AI正在思考中...</span>
            </div>
          )}
        </div>
      </div>

      {/* 底部输入框 */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(inputValue)
                }
              }}
              placeholder="请直接提问，或者输入 / 唤起指令"
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[60px] max-h-[200px]"
              rows={2}
            />
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          
          {/* 底部工具栏 */}
          <div className="flex items-center justify-end gap-3 mt-3">
            <button 
              onClick={handleNewChatClick}
              className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              <span>新建对话</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
