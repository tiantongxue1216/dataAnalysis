import { useState, cloneElement, isValidElement, Children, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NewAppLayout from './components/layout/NewAppLayout'
import NewHomePage from './pages/NewHomePage'
import DataSourcePage from './pages/DataSourcePage'

interface Session {
  id: string
  title: string
  timestamp: Date
  messageCount: number
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
  chartRecommendation?: any
  agentMode?: boolean
  data?: Array<Record<string, any>>
  recommendation?: any
  sql?: string
}

// 创建一个包装组件来传递 props
function AppContent({ 
  children,
  onNewChat, 
  sessions, 
  activeSessionId, 
  onSelectSession,
  onUpdateSession,
  messagesBySession,
  onAddMessage,
  getSessionMessages,
  selectedDatasourceId,
  onDatasourceChange,
}: {
  children: React.ReactNode
  onNewChat: () => void
  sessions: Session[]
  activeSessionId: string | undefined
  onSelectSession?: (sessionId: string) => void
  onUpdateSession: (sessionId: string, title: string, messageCount: number) => void
  messagesBySession?: {[sessionId: string]: ChatMessage[]}
  onAddMessage?: (sessionId: string, message: ChatMessage) => void
  getSessionMessages?: (sessionId: string) => ChatMessage[]
  selectedDatasourceId: string | null
  onDatasourceChange: (id: string) => void
}) {
  // 遍历 children 并注入额外的 props
  return Children.map(children, child => {
    if (isValidElement(child)) {
      return cloneElement(child as any, {
        onNewChat,
        sessions,
        activeSessionId,
        onSelectSession,
        onUpdateSession,
        messagesBySession,
        onAddMessage,
        getSessionMessages,
        selectedDatasourceId,
        onDatasourceChange,
      })
    }
    return child
  })
}

function App() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>()
  const [selectedDatasourceId, setSelectedDatasourceId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [messagesBySession, setMessagesBySession] = useState<{[sessionId: string]: ChatMessage[]}>({})

  // 从 localStorage 加载会话和消息数据
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem('sessions')
      const savedMessages = localStorage.getItem('messagesBySession')
      
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions)
        // 转换时间戳字符串回 Date 对象
        const sessionsWithDates = parsedSessions.map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp)
        }))
        setSessions(sessionsWithDates)
        
        // 设置第一个会话为活跃会话
        if (sessionsWithDates.length > 0) {
          setActiveSessionId(sessionsWithDates[0].id)
        }
      }
      
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages)
        // 转换时间戳字符串回 Date 对象
        const messagesWithDates: {[key: string]: ChatMessage[]} = {}
        Object.keys(parsedMessages).forEach(sessionId => {
          messagesWithDates[sessionId] = parsedMessages[sessionId].map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        })
        setMessagesBySession(messagesWithDates)
      }
      
      setIsInitialized(true)
    } catch (error) {
      console.error('加载本地数据失败:', error)
      setIsInitialized(true)
    }
  }, [])

  // 保存会话到 localStorage
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('sessions', JSON.stringify(sessions))
      } catch (error) {
        console.error('保存会话失败:', error)
      }
    }
  }, [sessions, isInitialized])

  // 保存消息到 localStorage
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('messagesBySession', JSON.stringify(messagesBySession))
      } catch (error) {
        console.error('保存消息失败:', error)
      }
    }
  }, [messagesBySession, isInitialized])

  const handleNewChat = () => {
    console.log('[App] 创建新会话')
    const newSession: Session = {
      id: Date.now().toString(),
      title: `新会话 ${sessions.length + 1}`,
      timestamp: new Date(),
      messageCount: 0,
    }
    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    console.log('[App] 新会话 ID:', newSession.id)
  }

  const handleUpdateSession = (sessionId: string, title: string, messageCount: number) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === sessionId 
          ? { ...session, title, messageCount }
          : session
      )
    )
  }

  // 选择会话
  const handleSelectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId)
  }, [])

  // 添加消息到当前会话
  const handleAddMessage = useCallback((sessionId: string, message: ChatMessage) => {
    setMessagesBySession(prev => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] || []), message]
    }))
  }, [])

  // 获取会话消息
  const getSessionMessages = useCallback((sessionId: string): ChatMessage[] => {
    return messagesBySession[sessionId] || []
  }, [messagesBySession])

  return (
    <BrowserRouter>
      <NewAppLayout 
        onNewChat={handleNewChat} 
        sessions={sessions} 
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onUpdateSession={handleUpdateSession}
        selectedDatasourceId={selectedDatasourceId}
        onDatasourceChange={setSelectedDatasourceId}
      >
        <Routes>
          <Route path="/" element={<AppContent 
            onNewChat={handleNewChat}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onUpdateSession={handleUpdateSession}
            messagesBySession={messagesBySession}
            onAddMessage={handleAddMessage}
            getSessionMessages={getSessionMessages}
            selectedDatasourceId={selectedDatasourceId}
            onDatasourceChange={setSelectedDatasourceId}
          >
            <NewHomePage 
              selectedDatasourceId={selectedDatasourceId} 
              onDatasourceChange={setSelectedDatasourceId}
            />
          </AppContent>} />
          <Route path="/datasource" element={<DataSourcePage />} />
        </Routes>
      </NewAppLayout>
    </BrowserRouter>
  )
}

export default App
