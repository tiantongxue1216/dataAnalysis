import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import HomePage from './pages/HomePage'
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

  const handleNewChat = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      title: `新会话 ${sessions.length + 1}`,
      timestamp: new Date(),
      messageCount: 0,
    }
    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(newSession.id)
  }

  return (
    <BrowserRouter>
      <AppLayout onNewChat={handleNewChat} sessions={sessions} activeSessionId={activeSessionId}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/datasource" element={<DataSourcePage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

export default App
