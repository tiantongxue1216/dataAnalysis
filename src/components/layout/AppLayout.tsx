import Sidebar from './Sidebar'
import Header from './Header'

interface Session {
  id: string
  title: string
  timestamp: Date
  messageCount: number
}

interface AppLayoutProps {
  children: React.ReactNode
  onNewChat?: () => void
  sessions?: Session[]
  activeSessionId?: string
}

export default function AppLayout({ children, onNewChat, sessions = [], activeSessionId }: AppLayoutProps) {
  return (
    <div className="h-screen w-screen flex bg-white">
      <Sidebar onNewChat={onNewChat} sessions={sessions} activeSessionId={activeSessionId} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
