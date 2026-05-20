import { useState, useEffect } from 'react'
import { 
  Database, 
  ChevronRight, 
  ChevronDown, 
  Table,
  Hash,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { dataSourceApi } from '@/services/api'
import type { DataSource } from '@/types/datasource'

interface TableInfo {
  name?: string
  table_name?: string
  columns: Array<{
    name: string
    type: string
    nullable: boolean
    primaryKey: boolean
  }>
}

interface DataTreePanelProps {
  selectedDatasourceId: string | null
}

export default function DataTreePanel({ selectedDatasourceId }: DataTreePanelProps) {
  const [datasources, setDatasources] = useState<DataSource[]>([])
  const [selectedDatasource, setSelectedDatasource] = useState<DataSource | null>(null)
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [collapsedTables, setCollapsedTables] = useState<{[key: string]: boolean}>({})

  // 加载数据源列表
  useEffect(() => {
    fetchDatasources()
  }, [])

  // 当外部选择的数据源变化时，同步更新
  useEffect(() => {
    if (selectedDatasourceId && datasources.length > 0) {
      const ds = datasources.find(d => d.id === selectedDatasourceId)
      if (ds && ds.id !== selectedDatasource?.id) {
        setSelectedDatasource(ds)
        fetchTables(ds)
      }
    }
  }, [selectedDatasourceId, datasources])

  const fetchDatasources = async () => {
    try {
      const result = await dataSourceApi.getAll()
      if (result.success) {
        setDatasources(result.data)
        // 如果没有选中数据源，默认选择第一个
        if (!selectedDatasourceId && result.data.length > 0) {
          setSelectedDatasource(result.data[0])
          fetchTables(result.data[0])
        }
      }
    } catch (error) {
      console.error('获取数据源失败:', error)
      setError('获取数据源失败')
    }
  }

  const fetchTables = async (datasource: DataSource) => {
    try {
      setLoading(true)
      setError('')
      const result = await dataSourceApi.getMetadata(datasource)
      if (result.success && result.data) {
        // 从元数据中提取表信息
        const tableList = result.data.tables || []
        setTables(tableList)
      } else {
        setError('获取表信息失败')
        setTables([])
      }
    } catch (error: any) {
      console.error('获取表信息失败:', error)
      setError(error.message || '获取表信息失败')
      setTables([])
    } finally {
      setLoading(false)
    }
  }

  const handleDatasourceChange = (datasourceId: string) => {
    const ds = datasources.find(d => d.id === datasourceId)
    if (ds) {
      setSelectedDatasource(ds)
      fetchTables(ds)
    }
  }

  const toggleTable = (tableName: string) => {
    setCollapsedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }))
  }

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* 标题栏 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-gray-700" />
          <h3 className="text-base font-semibold text-gray-900">数据库</h3>
        </div>
      </div>

      {/* 数据库选择器 */}
      <div className="p-3 border-b border-gray-200">
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          选择数据库
        </label>
        <select
          value={selectedDatasource?.id || ''}
          onChange={(e) => handleDatasourceChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="" disabled>
            请选择数据库
          </option>
          {datasources.map(ds => (
            <option key={ds.id} value={ds.id}>
              {ds.name} ({ds.type})
            </option>
          ))}
        </select>
      </div>

      {/* 数据模型选择器（当前选中的数据库） */}
      {selectedDatasource && (
        <div className="p-3 border-b border-gray-200 bg-blue-50">
          <label className="block text-xs font-medium text-blue-800 mb-1.5">
            当前数据库
          </label>
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-blue-200">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-900 font-medium truncate">
              {selectedDatasource.name}
            </span>
          </div>
        </div>
      )}

      {/* 表和字段列表 */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <span className="text-sm text-gray-500">加载表结构...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 px-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <span className="text-sm text-red-600 text-center">{error}</span>
          </div>
        ) : tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 px-4">
            <Database className="w-8 h-8 text-gray-300" />
            <span className="text-sm text-gray-400 text-center">
              {selectedDatasource ? '该数据库没有表' : '请先选择数据库'}
            </span>
          </div>
        ) : (
          <div className="space-y-1">
            {tables.map((table) => {
              const tableName = table.name || table.table_name || '未知表'
              const isCollapsed = collapsedTables[tableName]
              const columns = table.columns || []
              
              return (
                <div key={tableName} className="border-b border-gray-100 last:border-b-0">
                  {/* 表名 */}
                  <button
                    onClick={() => toggleTable(tableName)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight 
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        isCollapsed ? '' : 'rotate-90'
                      }`} 
                    />
                    <Table className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-900 font-medium truncate">
                      {tableName}
                    </span>
                    <span className="ml-auto text-xs text-gray-400">
                      {columns.length} 字段
                    </span>
                  </button>

                  {/* 字段列表 */}
                  {!isCollapsed && columns.length > 0 && (
                    <div className="bg-gray-50 py-1">
                      {columns.map((col) => (
                        <div
                          key={col.name}
                          className="flex items-center gap-2 px-3 py-1.5 pl-10 text-xs"
                        >
                          <Hash className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700 truncate flex-1">
                            {col.name}
                          </span>
                          <span className="text-gray-400 font-mono text-[10px]">
                            {col.type}
                          </span>
                          {col.primaryKey && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-medium">
                              PK
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
