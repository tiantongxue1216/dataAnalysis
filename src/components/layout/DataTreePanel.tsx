import { useState, useEffect } from 'react'
import { 
  Database, 
  ChevronRight, 
  Loader2,
  AlertCircle,
  Table2,
  Key,
  Type
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
  selectedDatasourceId?: string
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
        // 如果没有选中的数据源，且有数据源列表，自动选择第一个
        if (!selectedDatasourceId && result.data.length > 0) {
          const first = result.data[0]
          setSelectedDatasource(first)
          fetchTables(first)
        }
      }
    } catch (error) {
      console.error('获取数据源列表失败:', error)
    }
  }

  const fetchTables = async (datasource: DataSource) => {
    try {
      setLoading(true)
      setError('')
      const result = await dataSourceApi.getMetadata(datasource)
      if (result.success && result.data) {
        const tableList = result.data.tables || []
        setTables(tableList)
      } else {
        setError('获取表信息失败')
        setTables([])
      }
    } catch (error: any) {
      setError(error.message || '获取表信息失败')
      setTables([])
    } finally {
      setLoading(false)
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
        <select
          value={selectedDatasource?.id || ''}
          onChange={(e) => {
            const ds = datasources.find(d => d.id === e.target.value)
            if (ds) {
              setSelectedDatasource(ds)
              fetchTables(ds)
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="" disabled>选择数据库</option>
          {datasources.map(ds => (
            <option key={ds.id} value={ds.id}>
              {ds.name}
            </option>
          ))}
        </select>
      </div>

      {/* 当前数据库信息 */}
      {selectedDatasource && (
        <div className="p-3 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">{selectedDatasource.name}</span>
          </div>
          <div className="text-xs text-blue-600 mt-1">{selectedDatasource.type}</div>
        </div>
      )}

      {/* 表和字段列表 */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : tables.length > 0 ? (
          <div className="space-y-1">
            {tables.map((table, idx) => {
              const tableName = table.name || table.table_name || `Table ${idx + 1}`
              const isCollapsed = collapsedTables[tableName]
              
              return (
                <div key={tableName}>
                  {/* 表名 */}
                  <button
                    onClick={() => toggleTable(tableName)}
                    className="w-full flex items-center gap-2 py-2 px-3 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
                    <Table2 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900 truncate">{tableName}</span>
                    <span className="text-xs text-gray-500 ml-auto">{table.columns.length} 字段</span>
                  </button>

                  {/* 字段列表 */}
                  {!isCollapsed && (
                    <div className="ml-6 space-y-1 py-1">
                      {table.columns.map((column) => (
                        <div
                          key={column.name}
                          className="flex items-center gap-2 py-1.5 px-2 text-xs hover:bg-gray-50"
                        >
                          {column.primaryKey ? (
                            <Key className="w-3 h-3 text-yellow-600" />
                          ) : (
                            <Type className="w-3 h-3 text-gray-400" />
                          )}
                          <span className="text-gray-700 truncate flex-1">{column.name}</span>
                          <span className="text-gray-500">{column.type}</span>
                          {column.primaryKey && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px]">PK</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 px-4">
            <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {selectedDatasource ? '该数据库没有表' : '请选择一个数据库'}
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
