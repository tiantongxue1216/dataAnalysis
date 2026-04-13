import { Loader2 } from 'lucide-react'

interface LoadingIndicatorProps {
  text?: string
}

export default function LoadingIndicator({ text = '正在分析数据...' }: LoadingIndicatorProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-fade-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
        <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
        <p className="text-sm text-gray-600">{text}</p>
      </div>
    </div>
  )
}
