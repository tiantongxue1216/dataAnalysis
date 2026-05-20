import { useState } from 'react'
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
          <Route path="/" element={<NewHomePage 
            selectedDatasourceId={selectedDatasourceId} 
            onDatasourceChange={setSelectedDatasourceId}
          />} />
          <Route path="/datasource" element={<DataSourcePage />} />
        </Routes>
      </NewAppLayout>
    </BrowserRouter>
  )
}

export default App
