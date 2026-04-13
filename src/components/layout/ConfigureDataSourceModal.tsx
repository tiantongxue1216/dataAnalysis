import { useState } from 'react'
import { X, RefreshCw, FolderOpen, CheckCircle, AlertCircle } from 'lucide-react'
import { dataSourceApi } from '@/services/api'
import type { DataSource } from '@/types/datasource'

interface ConfigureDataSourceModalProps {
  onClose: () => void
  onSuccess?: () => void
}

type DatabaseType = 'PostgreSQL' | 'MySQL' | 'SQL Server' | 'Oracle' | 'SQLite'

interface FormData {
  name: string
  type: DatabaseType
  host: string
  port: string
  database: string
  username: string
  password: string
  filePath: string
}

export default function ConfigureDataSourceModal({ onClose, onSuccess }: ConfigureDataSourceModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'PostgreSQL',
    host: '',
    port: '5432',
    database: '',
    username: '',
    password: '',
    filePath: '',
  })

  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isSQLite = formData.type === 'SQLite'

  // 当切换数据库类型时，自动设置默认端口
  const handleTypeChange = (type: DatabaseType) => {
    let defaultPort = '5432'
    if (type === 'MySQL') defaultPort = '3306'
    else if (type === 'SQL Server') defaultPort = '1433'
    else if (type === 'Oracle') defaultPort = '1521'
    else if (type === 'SQLite') defaultPort = ''

    setFormData({ ...formData, type, port: defaultPort })
  }

  const handleTestConnection = async () => {
    setError(null)
    setTestResult(null)
    setIsTesting(true)

    try {
      const config: Partial<DataSource> = {
        type: formData.type,
      }

      if (formData.type === 'SQLite') {
        config.filePath = formData.filePath
        config.database = formData.database || 'main'
      } else {
        config.host = formData.host
        config.port = formData.port
        config.database = formData.database
        config.username = formData.username
        config.password = formData.password
      }

      const response = await dataSourceApi.testConnection(config)
      setTestResult({ success: response.data.success, message: response.data.message })
    } catch (err: any) {
      setTestResult({ success: false, message: err.message })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    setError(null)
    setIsSaving(true)

    try {
      // 验证表单
      if (!formData.name.trim()) {
        setError('请输入数据源名称')
        setIsSaving(false)
        return
      }

      const data: Partial<DataSource> = {
        name: formData.name,
        type: formData.type,
      }

      if (formData.type === 'SQLite') {
        if (!formData.filePath.trim()) {
          setError('请输入数据库文件路径')
          setIsSaving(false)
          return
        }
        data.filePath = formData.filePath
        data.database = formData.database || 'main'
      } else {
        if (!formData.host.trim()) {
          setError('请输入 Host')
          setIsSaving(false)
          return
        }
        if (!formData.database.trim()) {
          setError('请输入数据库名')
          setIsSaving(false)
          return
        }
        data.host = formData.host
        data.port = formData.port
        data.database = formData.database
        data.username = formData.username
        data.password = formData.password
      }

      await dataSourceApi.create(data)
      
      // 关闭弹窗并刷新列表
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (err: any) {
      setError(err.message || '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-auto">
        {/* 头部 */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">配置新数据库连接</h2>
              <p className="text-xs text-gray-400 font-mono">// ESTABLISHING_SECURE_GATEWAY...</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 表单内容 */}
        <div className="px-8 py-6 space-y-6">
          {/* 数据源名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              数据源名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如: 生产库_只读"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* 数据库类型和Host/文件路径 */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                数据库类型
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value as DatabaseType)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              >
                <option value="PostgreSQL">PostgreSQL</option>
                <option value="MySQL">MySQL</option>
                <option value="SQL Server">SQL Server</option>
                <option value="Oracle">Oracle</option>
                <option value="SQLite">SQLite</option>
              </select>
            </div>

            {isSQLite ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  数据库文件路径
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.filePath}
                    onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
                    placeholder="D:\\database.db 或 ./database.db"
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
                    title="选择文件"
                  >
                    <FolderOpen className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">支持绝对路径或相对路径</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Host / Endpoint
                </label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="db.example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Port和数据库名 */}
          {!isSQLite && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Port
                </label>
                <input
                  type="text"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  placeholder={formData.type === 'MySQL' ? '3306' : '5432'}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  数据库名
                </label>
                <input
                  type="text"
                  value={formData.database}
                  onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                  placeholder="my_database"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* SQLite 只需要数据库名（可选） */}
          {isSQLite && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                数据库名称（可选）
              </label>
              <input
                type="text"
                value={formData.database}
                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                placeholder="main"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">SQLite 通常使用 "main" 作为默认数据库名</p>
            </div>
          )}

          {/* 用户名和密码（仅非SQLite数据库需要） */}
          {!isSQLite && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="readonly_user"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密码
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* SQLite 提示信息 */}
          {isSQLite && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>提示：</strong>SQLite 是文件型数据库，不需要用户名和密码。系统将直接访问数据库文件。
              </p>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* 测试结果 */}
          {testResult && (
            <div className={`border rounded-lg p-4 ${
              testResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    testResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {testResult.message}
                  </p>
                  {testResult.success && (
                    <p className="text-xs text-green-600 mt-1">
                      数据库连接正常，可以进行下一步操作
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-8 py-6 border-t border-gray-100 flex gap-4">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? '测试中...' : '测试连接'}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            保存数据源
          </button>
        </div>
      </div>
    </div>
  )
}
