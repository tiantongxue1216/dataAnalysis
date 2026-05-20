import { useState } from 'react'
import { 
  MessageSquare, 
  BarChart3, 
  Code2, 
  Blocks, 
  Sparkles, 
  Star, 
  Clock, 
  Plus,
  Search,
  Home,
  User,
  Bell,
  FolderOpen
} from 'lucide-react'

interface Session {
  id: string
  title: string
  timestamp: Date
  messageCount: number
}

interface NewSidebarProps {
  onNewChat?: () => void
  sessions?: Session[]
  activeSessionId?: string
  onSelectSession?: (sessionId: string) => void
}

export default function NewSidebar({ 
  onNewChat, 
  sessions = [], 
  activeSessionId, 
  onSelectSession 
}: NewSidebarProps) {
  const [activeNav, setActiveNav] = useState('simple-query')
  const [collapsedGroups, setCollapsedGroups] = useState<{[key: string]: boolean}>({
    today: false,
    last30days: false
  })

  const navItems = [
    { id: 'simple-query', icon: MessageSquare, label: '智能查询', active: true },
  ]

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }))
  }

  // 根据时间分组会话
  const groupSessionsByTime = () => {
    const now = new Date()
    const today: Session[] = []
    const last30Days: Session[] = []

    sessions.forEach(session => {
      const sessionDate = new Date(session.timestamp)
      const diffTime = now.getTime() - sessionDate.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        // 今天
        today.push(session)
      } else if (diffDays <= 30) {
        // 最近30天
        last30Days.push(session)
      }
    })

    return { today, last30Days }
  }

  const { today, last30Days } = groupSessionsByTime()

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Logo区域 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">黑泽</span>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="py-2 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.active || activeNav === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* 分隔线 */}
      <div className="mx-3 my-2 border-t border-gray-200"></div>

      {/* 历史对话 */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-3">
          历史对话
        </div>

        {/* 今天 */}
        {today.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => toggleGroup('today')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              <Clock className={`w-3 h-3 transition-transform ${collapsedGroups.today ? '' : 'rotate-90'}`} />
              <span>今天</span>
              <span className="ml-auto text-xs text-gray-400">{today.length}</span>
            </button>
            {!collapsedGroups.today && (
              <div className="ml-4 mt-1 space-y-1">
                {today.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => onSelectSession?.(session.id)}
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-all ${
                      activeSessionId === session.id
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="truncate">{session.title}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 最近30天 */}
        {last30Days.length > 0 && (
          <div>
            <button
              onClick={() => toggleGroup('last30days')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              <Clock className={`w-3 h-3 transition-transform ${collapsedGroups.last30days ? '' : 'rotate-90'}`} />
              <span>最近30天</span>
              <span className="ml-auto text-xs text-gray-400">{last30Days.length}</span>
            </button>
            {!collapsedGroups.last30days && (
              <div className="ml-4 mt-1 space-y-1">
                {last30Days.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => onSelectSession?.(session.id)}
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-all ${
                      activeSessionId === session.id
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="truncate">{session.title}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部用户信息 */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <span className="text-sm text-gray-700">18310676516</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-gray-100 rounded">
              <Home className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded">
              <FolderOpen className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded">
              <Bell className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded">
              <MessageSquare className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
