import { useState, Children, isValidElement, cloneElement } from 'react'
import NewSidebar from './NewSidebar'
import DataTreePanel from './DataTreePanel'

interface Session {
  id: string
  title: string
  timestamp: Date
  messageCount: number
}

interface NewAppLayoutProps {
  children: React.ReactNode
  onNewChat?: () => void
  sessions?: Session[]
  activeSessionId?: string
  onUpdateSession?: (sessionId: string, title: string, messageCount: number) => void
  selectedDatasourceId?: string | null
  onDatasourceChange?: (id: string) => void
}

export default function NewAppLayout({ 
  children, 
  onNewChat, 
  sessions = [], 
  activeSessionId,
  onUpdateSession,
  selectedDatasourceId = null,
  onDatasourceChange,
}: NewAppLayoutProps) {
  return (
    <div className="h-screen w-screen flex bg-white">
      {/* 左侧边栏 */}
      <NewSidebar 
        onNewChat={onNewChat} 
        sessions={sessions} 
        activeSessionId={activeSessionId} 
      />
      
      {/* 中间主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {Children.map(children, child => {
          if (isValidElement(child)) {
            return cloneElement(child as any, { 
              selectedDatasourceId,
              activeSessionId,
              onUpdateSession,
              onNewChat,
            })
          }
          return child
        })}
      </main>
      
      {/* 右侧数据树面板 */}
      <DataTreePanel selectedDatasourceId={selectedDatasourceId} />
    </div>
  )
}
