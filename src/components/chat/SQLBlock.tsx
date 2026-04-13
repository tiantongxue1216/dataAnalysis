import { Code, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface SQLBlockProps {
  sql: string
}

export default function SQLBlock({ sql }: SQLBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
      {/* SQL 头部 */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-gray-600" />
          <span className="text-xs font-medium text-gray-700">SQL 查询</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 hover:text-primary hover:bg-white rounded transition-all"
          title="复制 SQL"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-500">已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>

      {/* SQL 内容 */}
      <div className="p-3 overflow-x-auto">
        <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap break-all">
          {sql}
        </pre>
      </div>
    </div>
  )
}
