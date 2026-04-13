import { useState, useEffect } from 'react'
import { Database, Plus, AlertCircle, Trash2, Edit2, RefreshCw, Info } from 'lucide-react'
import ConfigureDataSourceModal from '@/components/layout/ConfigureDataSourceModal'
import { dataSourceApi } from '@/services/api'
import type { DataSource, DatabaseMetadata } from '@/types/datasource'

export default function DataSourcePage() {
  const [showModal, setShowModal] = useState(false)
  const [datasources, setDatasources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [metadataMap, setMetadataMap] = useState<Record<string, DatabaseMetadata>>({})

  // 获取数据源列表
  useEffect(() => {
    fetchDatasources()
  }, [])

  const fetchDatasources = async () => {
    try {
      setLoading(true)
      const response = await dataSourceApi.getAll()
      setDatasources(response.data)
    } catch (error) {
      console.error('获取数据源失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个数据源吗？')) return
    
    try {
      await dataSourceApi.delete(id)
      fetchDatasources()
    } catch (error) {
      console.error('删除数据源失败:', error)
      alert('删除失败')
    }
  }

  const handleRefreshMetadata = async (datasource: DataSource) => {
    if (!datasource.id) return
    
    setRefreshingId(datasource.id)
    
    try {
      const config: Partial<DataSource> = {
        type: datasource.type,
      }

      if (datasource.type === 'SQLite') {
        config.filePath = datasource.filePath || undefined
        config.database = datasource.database || 'main'
      } else {
        config.host = datasource.host || undefined
        config.port = datasource.port || undefined
        config.database = datasource.database || undefined
        config.username = datasource.username || undefined
        config.password = datasource.password || undefined
      }

      const response = await dataSourceApi.getMetadata(config)
      
      setMetadataMap(prev => ({
        ...prev,
        [datasource.id!]: response.data,
      }))
    } catch (error: any) {
      console.error('刷新表结构失败:', error)
      alert(`刷新失败: ${error.message}`)
    } finally {
      setRefreshingId(null)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 页面头部 */}
      <div className="px-8 py-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-primary font-mono font-semibold tracking-wide mb-2">ADMINISTRATION_MODULE</p>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">数据源管理</h1>
            <p className="text-gray-500 text-sm">配置和同步外部数据库连接，为 AI 分析提供元数据支持</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增数据源
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto p-8 grid-bg">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : datasources.length === 0 ? (
          /* 空状态 */
          <div className="max-w-2xl mx-auto mt-16 mb-12">
            <div className="text-center">
              {/* 图标 */}
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Database className="w-8 h-8 text-primary" />
              </div>

              {/* 标题和描述 */}
              <h2 className="text-2xl font-bold text-gray-900 mb-3">暂无数据源</h2>
              <p className="text-gray-500 text-base leading-relaxed max-w-md mx-auto mb-6">
                开始添加您的第一个数据库连接，让系统能够理解您的业务数据结构
              </p>

              {/* 添加按钮 */}
              <button 
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
                立即添加
              </button>
            </div>
          </div>
        ) : (
          /* 数据源列表 */
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">已配置的数据源 ({datasources.length})</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {datasources.map((ds) => (
                  <div key={ds.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Database className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{ds.name}</h4>
                          <p className="text-sm text-gray-500">
                            {ds.type} {ds.type === 'SQLite' ? `• ${ds.filePath}` : `• ${ds.host}:${ds.port}/${ds.database}`}
                          </p>
                          {metadataMap[ds.id!] && (
                            <p className="text-xs text-primary mt-1">
                              {metadataMap[ds.id!].totalTables} 张表
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          已配置
                        </span>
                        <button
                          onClick={() => handleRefreshMetadata(ds)}
                          disabled={refreshingId === ds.id}
                          className="p-2 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="刷新表结构信息"
                        >
                          <RefreshCw className={`w-4 h-4 ${refreshingId === ds.id ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleDelete(ds.id!)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 添加更多按钮 */}
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加更多数据源
              </button>
            </div>
          </div>
        )}

        {/* 安全提示 */}
        <div className="max-w-5xl mx-auto mt-8">
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-gray-900 font-semibold mb-2">安全提示</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  连接信息已进行加密存储。系统仅执行{' '}
                  <span className="text-primary font-semibold">SELECT</span> 查询，任何{' '}
                  <span className="text-red-600 font-semibold">DROP, DELETE, UPDATE</span> 操作都将被中间件实时拦截。
                  建议为系统配置专门的只读数据库用户以确保绝对安全。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 配置模态框 */}
      {showModal && <ConfigureDataSourceModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
