import { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  ArrowRight, 
  Database,
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
  User,
  Bot,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { intentApi, sqlApi, queryApi, dataSourceApi, agentApi, nl2sqlApi } from '@/services/api'
import type { Message } from '@/types/message'
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
}: { 
  selectedDatasourceId: string | null
  onDatasourceChange?: (id: string) => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [expandedThinking, setExpandedThinking] = useState<{[key: string]: boolean}>({})
  const [datasources, setDatasources] = useState<DataSource[]>([])
  const [currentChartTypes, setCurrentChartTypes] = useState<{[key: string]: string}>({})
  const [useAgentMode, setUseAgentMode] = useState(false)
  const [useNL2SQLMode, setUseNL2SQLMode] = useState(true) // 默认使用新的 NL2SQL API
  const [availableTools, setAvailableTools] = useState<Array<{name: string; description: string}>>([])

  useEffect(() => {
    fetchDatasources()
    fetchAvailableTools()
  }, [])

  const fetchAvailableTools = async () => {
    try {
      const result = await agentApi.getTools()
      if (result.success) {
        setAvailableTools(result.data)
        console.log('Agent 可用工具:', result.data)
      }
    } catch (error) {
      console.error('获取 Agent 工具列表失败:', error)
    }
  }

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

  const selectedDatasource = datasources.find(d => d.id === selectedDatasourceId)

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
      
      // 根据模式选择不同的处理逻辑
      if (useNL2SQLMode && selectedDatasourceId) {
        // 使用新的 NL2SQL Agent API（推荐）
        await handleNL2SQLQuery(content, startTime)
      } else if (useAgentMode && selectedDatasourceId) {
        // Agent 模式：直接调用 Agent API
        await handleAgentQuery(content, startTime)
      } else {
        // 传统模式：分步调用
        await handleTraditionalQuery(content, startTime)
      }
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
   * Agent 模式查询
   */
  const handleAgentQuery = async (content: string, startTime: number) => {
    try {
      const agentResult = await agentApi.query(
        content,
        selectedDatasourceId!,
        10 // max iterations
      )

      // 检查返回结果
      if (!agentResult || !agentResult.success) {
        throw new Error(agentResult?.error || 'Agent 查询失败')
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(3)

      // 构建思考过程，添加空值保护和去重
      const toolResultsCount = agentResult.toolResults?.length || 0
      let thoughts = agentResult.thoughts || []
      
      // 去重：移除完全相同的连续思考
      thoughts = thoughts.filter((thought, index) => {
        if (index === 0) return true
        return thought !== thoughts[index - 1]
      })
      
      // 格式化思考过程
      const thinkingLines = [
        `🤖 Agent 执行完成`,
        `━━━━━━━━━━━━━━━━━━━━━━━`,
        `迭代次数: ${agentResult.iterations || 0}`,
        `工具调用: ${toolResultsCount} 次`,
        `耗时: ${duration}秒`,
        ``,
        `📝 思考过程:`,
        `───────────────────────`,
        ...thoughts.map((t, i) => `${i + 1}. ${t}`),
      ]
      
      const thinking = thinkingLines.join('\n')

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: agentResult.answer || '抱歉，未能生成回答',
        timestamp: new Date(),
        thinking,
        duration: parseFloat(duration),
        agentMode: true,
        // 添加图表数据
        data: agentResult.data || undefined,
        recommendation: agentResult.recommendation || undefined,
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (error: any) {
      console.error('Agent 查询失败:', error)
      
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

  /**
   * NL2SQL Agent 模式查询（新）
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
        // 添加图表数据
        data: nl2sqlResult.data?.rows || undefined,
        recommendation: nl2sqlResult.recommendation || undefined,
      }
      setMessages(prev => [...prev, aiMessage])
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

  /**
   * 传统模式查询
   */
  const handleTraditionalQuery = async (content: string, startTime: number) => {
    let queryConditions: string[] = []
    let tableData: Array<Record<string, any>> = []
    let resultTitle = content
    let recommendedQuestions: string[] = []
    let thinking = ''
    let chartRecommendation: ChartRecommendation | undefined

    // 1. 意图识别
    const intentResult = await intentApi.recognize(content)

    if (intentResult.success && intentResult.intent) {
      const intent = intentResult.intent
      
      // 构建查询条件显示
      if (intent.conditions && intent.conditions.length > 0) {
        intent.conditions.forEach((cond: any) => {
          queryConditions.push(`${cond.column} ${cond.operator} ${cond.value}`)
        })
      }

      thinking = `意图识别成功 (置信度: ${(intent.confidence * 100).toFixed(1)}%)\n` +
        `表名: ${intent.table_name || '未指定'}\n` +
        `查询字段: ${intent.select_columns?.join(', ') || '未指定'}`

      // 2. 生成 SQL
      if (intent.missing_slots && intent.missing_slots.length === 0) {
        try {
          const sqlResult = await sqlApi.generate(intent, selectedDatasourceId || undefined)
          
          if (sqlResult.success && sqlResult.sql) {
            thinking += `\nSQL 生成成功 (${sqlResult.method === 'rule-based' ? '规则引擎' : 'LLM'})\n${sqlResult.sql}`
            
            // 3. 执行查询
            if (selectedDatasourceId) {
              try {
                const queryResult = await queryApi.execute(
                  sqlResult.sql,
                  selectedDatasourceId,
                  intent.intent_type
                )
                
                if (queryResult.success && queryResult.data) {
                  tableData = queryResult.data
                  chartRecommendation = queryResult.recommendation
                  thinking += `\n查询成功: 返回 ${queryResult.rowCount || 0} 行数据`
                  
                  // 根据推荐设置标题
                  if (queryResult.recommendation?.reason) {
                    resultTitle = queryResult.recommendation.reason
                  }
                } else {
                  thinking += `\n查询失败: ${queryResult.error || '未知错误'}`
                }
              } catch (error: any) {
                thinking += `\n查询执行错误: ${error.message}`
              }
            } else {
              thinking += '\n请先选择数据源'
            }
          } else {
            thinking += `\nSQL 生成失败: ${sqlResult.error || '未知错误'}`
          }
        } catch (error: any) {
          thinking += `\nSQL 生成错误: ${error.message}`
        }
      } else if (intent.missing_slots && intent.missing_slots.length > 0) {
        thinking += `\n缺失槽位: ${intent.missing_slots.join(', ')}`
      }
    } else if (intentResult.need_clarification) {
      thinking = `需要更多信息: ${intentResult.message || '请提供更详细的查询信息'}`
    } else {
      thinking = '意图识别失败，请重试'
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(3)

    // 添加AI回复消息
    const aiMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      thinking,
      duration: parseFloat(duration),
      queryConditions,
      resultTitle,
      tableData,
      recommendedQuestions,
      chartRecommendation,
    }
    setMessages(prev => [...prev, aiMessage])
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
        {/* 顶部标题 */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">简单查询</h2>
          </div>
        </div>

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
            <div className="flex items-center gap-3 mt-3">
              {/* NL2SQL 模式切换（新） */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">NL2SQL (推荐)</span>
                <button
                  onClick={() => setUseNL2SQLMode(!useNL2SQLMode)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    useNL2SQLMode ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useNL2SQLMode ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Agent 模式切换 */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <span className="text-sm text-gray-600">Agent 模式</span>
                <button
                  onClick={() => setUseAgentMode(!useAgentMode)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    useAgentMode ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useAgentMode ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                {useAgentMode && (
                  <Sparkles className="w-4 h-4 text-blue-600" />
                )}
              </div>

              <div className="flex-1"></div>
              <button className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1.5">
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
      {/* 顶部标题 */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">简单查询</h2>
        </div>
      </div>

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
                    <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ minHeight: '300px', maxHeight: '500px' }}>
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
          <div className="flex items-center gap-3 mt-3">
            {/* Agent 模式切换 */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">Agent 模式</span>
              <button
                onClick={() => setUseAgentMode(!useAgentMode)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  useAgentMode ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useAgentMode ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
              {useAgentMode && (
                <Sparkles className="w-4 h-4 text-blue-600" />
              )}
            </div>

            {/* 数据源选择器 */}
            <div className="relative">
              <select
                value={selectedDatasourceId || ''}
                onChange={(e) => onDatasourceChange?.(e.target.value)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5 bg-transparent border-none focus:outline-none cursor-pointer appearance-none pr-6"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.25rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.25em 1.25em',
                }}
              >
                <option value="" disabled>选择数据源</option>
                {datasources.map(ds => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" />
              <span>推荐问句</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>最近问句</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <div className="flex-1"></div>
            <button className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              <span>新建对话</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
