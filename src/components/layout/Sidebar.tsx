import { Plus, Clock, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Session {
  id: string
  title: string
  timestamp: Date
  messageCount: number
}

interface SidebarProps {
  onNewChat?: () => void
  sessions?: Session[]
  activeSessionId?: string
  onSelectSession?: (sessionId: string) => void
}

export default function Sidebar({ onNewChat, sessions = [], activeSessionId, onSelectSession }: SidebarProps) {
  return (
    <aside className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Logo和新建会话区域 */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">DA</span>
          </div>
          <h1 className="text-primary font-bold text-base">SMART_ANALYST</h1>
        </div>
        
        {/* 新建会话按钮 */}
        <Button 
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2"
          size="lg"
        >
          <Plus className="w-4 h-4" />
          新建会话
        </Button>
      </div>

      {/* 历史记录 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex items-center gap-2 mb-3 text-gray-600">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">历史记录</span>
        </div>
        
        {sessions.length === 0 ? (
          <div className="text-gray-400 text-sm italic">
            // NO_SESSIONS_FOUND
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession?.(session.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  activeSessionId === session.id
                    ? 'bg-primary/10 border-primary'
                    : 'bg-white border-gray-200 hover:border-primary hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {session.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {session.timestamp.toLocaleDateString('zh-CN')} · {session.messageCount} 条消息
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
