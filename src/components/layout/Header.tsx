import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, ChevronDown, Settings } from 'lucide-react'
import { dataSourceApi } from '@/services/api'
import type { DataSource } from '@/types/datasource'

interface HeaderProps {
  selectedDatasourceId: string | null
  onDatasourceChange: (id: string) => void
}

export default function Header({ selectedDatasourceId, onDatasourceChange }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [datasources, setDatasources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDatasources()
  }, [])

  const fetchDatasources = async () => {
    try {
      setLoading(true)
      const result = await dataSourceApi.getAll()
      if (result.success) {
        setDatasources(result.data)
        // 如果有数据源且未选择，默认选择第一个
        if (result.data.length > 0 && !selectedDatasourceId && result.data[0].id) {
          onDatasourceChange(result.data[0].id)
        }
      }
    } catch (error) {
      console.error('获取数据源失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectDatasource = (id: string) => {
    onDatasourceChange(id)
    setIsOpen(false)
  }

  const handleConfigure = () => {
    setIsOpen(false)
    navigate('/datasource')
  }

  const selectedDatasource = datasources.find(d => d.id === selectedDatasourceId)

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
            <span className="text-xs text-primary font-mono font-semibold tracking-wide">
              {selectedDatasource ? 'TARGET_DATA_STREAM' : 'NO_DATASOURCE'}
            </span>
            <span className="text-sm font-medium text-gray-500">
              {loading ? '加载中...' : selectedDatasource ? selectedDatasource.name : '请选择数据源'}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* 下拉菜单 */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
            {datasources.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-700 text-base font-medium mb-4">未找到数据源</p>
                <button 
                  onClick={handleConfigure}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  去配置
                </button>
              </div>
            ) : (
              <div className="py-2">
                {datasources.filter(d => d.id).map(datasource => (
                  <button
                    key={datasource.id}
                    onClick={() => datasource.id && handleSelectDatasource(datasource.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      selectedDatasourceId === datasource.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        selectedDatasourceId === datasource.id ? 'bg-primary' : 'bg-gray-300'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{datasource.name}</p>
                        <p className="text-xs text-gray-500">{datasource.type}</p>
                      </div>
                    </div>
                  </button>
                ))}
                <div className="border-t border-gray-200 mt-2 pt-2 px-4 pb-3">
                  <button
                    onClick={handleConfigure}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Settings className="w-4 h-4" />
                    管理数据源
                  </button>
                </div>
              </div>
            )}
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
