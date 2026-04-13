import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, ChevronDown } from 'lucide-react'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const handleConfigure = () => {
    setIsOpen(false)
    navigate('/datasource')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* 数据源选择 */}
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 cursor-pointer transition-all hover:opacity-80"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs text-primary font-mono font-semibold tracking-wide">ACTIVE_DATA_STREAM</span>
            <span className="text-sm font-medium text-gray-500">
              请选择数据源
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* 下拉菜单 */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-6">
            <div className="text-center">
              <p className="text-gray-700 text-base font-medium mb-4">未找到数据源</p>
              <button 
                onClick={handleConfigure}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                去配置
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 右侧：状态信息 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
          <span className="text-xs font-mono text-green-600 font-medium">// STATUS: ONLINE</span>
        </div>
        <div className="px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-xs font-mono text-gray-600 font-medium">V1.0.42</span>
        </div>
      </div>
    </header>
  )
}
