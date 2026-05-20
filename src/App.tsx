import { useState, cloneElement, isValidElement, Children } from 'react'
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

// 创建一个包装组件来传递 props
function AppContent({ 
  children,
  onNewChat, 
  sessions, 
  activeSessionId, 
  onUpdateSession,
  selectedDatasourceId,
  onDatasourceChange,
}: {
  children: React.ReactNode
  onNewChat: () => void
  sessions: Session[]
  activeSessionId: string | undefined
  onUpdateSession: (sessionId: string, title: string, messageCount: number) => void
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
        onUpdateSession,
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

  return (
    <BrowserRouter>
      <NewAppLayout 
        onNewChat={handleNewChat} 
        sessions={sessions} 
        activeSessionId={activeSessionId}
        onUpdateSession={handleUpdateSession}
        selectedDatasourceId={selectedDatasourceId}
        onDatasourceChange={setSelectedDatasourceId}
      >
        <Routes>
          <Route path="/" element={<AppContent 
            onNewChat={handleNewChat}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onUpdateSession={handleUpdateSession}
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
