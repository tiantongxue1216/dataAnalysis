import { User, Bot } from 'lucide-react'
import type { Message } from '@/types/message'
import SQLBlock from './SQLBlock'

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  // 提取 SQL 代码块
  const extractSQL = (content: string) => {
    const sqlMatch = content.match(/```sql\n([\s\S]*?)```/)
    if (sqlMatch) {
      return sqlMatch[1].trim()
    }
    return null
  }

  // 移除 Markdown 代码块标记，保留纯文本
  const formatContent = (content: string) => {
    // 移除 SQL 代码块
    let formatted = content.replace(/```sql\n[\s\S]*?```/g, '')
    // 移除其他代码块
    formatted = formatted.replace(/```[\s\S]*?```/g, '')
    // 清理多余的空行
    formatted = formatted.replace(/\n{3,}/g, '\n\n')
    return formatted.trim()
  }

  const sql = extractSQL(message.content)
  const displayContent = formatContent(message.content)

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
      {/* 头像 */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary' : 'bg-gray-200'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-gray-600" />
        )}
      </div>

      {/* 消息内容 */}
      <div className={`max-w-[70%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-4 py-3 rounded-2xl ${
          isUser 
            ? 'bg-primary text-white rounded-tr-sm' 
            : 'bg-gray-100 text-gray-900 rounded-tl-sm'
        }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayContent}</p>
          
          {/* 显示 SQL 代码块 */}
          {!isUser && sql && <SQLBlock sql={sql} />}
        </div>
        <span className="text-xs text-gray-400 px-1">
          {message.timestamp.toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
    </div>
  )
}
