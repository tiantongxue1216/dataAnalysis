import { useState, useEffect } from 'react'
import { 
  Database, 
  ChevronRight, 
  ChevronDown, 
  Calendar, 
  Table, 
  Hash,
  Folder,
  BarChart3,
  Loader2
} from 'lucide-react'
import { schemaApi } from '@/services/api'

interface TreeNode {
  id: string
  label: string
  type: 'folder' | 'table' | 'dimension' | 'measure' | 'field' | 'time'
  children?: TreeNode[]
  icon?: any
  description?: string
  aggregation?: string
}

interface DataTreePanelProps {
  onSelectTable?: (tableName: string) => void
}

export default function DataTreePanel({ onSelectTable }: DataTreePanelProps) {
  const [selectedModel, setSelectedModel] = useState('all-models')
  const [collapsedNodes, setCollapsedNodes] = useState<{[key: string]: boolean}>({})
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState<string>('')

  useEffect(() => {
    fetchSchemaData()
  }, [])

  const fetchSchemaData = async () => {
    try {
      setLoading(true)
      const result = await schemaApi.getSchema()
      if (result.success) {
        const trees = buildTreeFromSchema(result.data.tables)
        setTreeData(trees)
        // 默认选择第一个表
        if (trees.length > 0 && trees[0].id.startsWith('table-')) {
          const tableName = trees[0].id.replace('table-', '')
          setSelectedTable(tableName)
          onSelectTable?.(tableName)
        }
      }
    } catch (error) {
      console.error('获取 Schema 数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName)
    onSelectTable?.(tableName)
  }

  const buildTreeFromSchema = (tables: any[]): TreeNode[] => {
    return tables.map(table => ({
      id: `table-${table.name}`,
      label: table.description || table.name,
      type: 'table',
      icon: Table,
      description: table.description,
      children: [
        // 维度节点
        ...(table.dimensions.length > 0 ? [{
          id: `table-${table.name}-dimensions`,
          label: '维度',
          type: 'folder' as const,
          icon: Folder,
          children: table.dimensions.map((dim: any) => ({
            id: `table-${table.name}-dim-${dim.name}`,
            label: dim.description || dim.name,
            type: 'dimension' as const,
            icon: Hash,
            description: dim.description,
          }))
        }] : []),
        // 度量节点
        ...(table.measures.length > 0 ? [{
          id: `table-${table.name}-measures`,
          label: '度量',
          type: 'folder' as const,
          icon: Folder,
          children: table.measures.map((measure: any) => ({
            id: `table-${table.name}-measure-${measure.name}`,
            label: measure.name,
            type: 'measure' as const,
            icon: BarChart3,
            description: measure.description,
            aggregation: measure.aggregation,
          }))
        }] : []),
        // 时间字段节点
        ...(table.timeFields.length > 0 ? [{
          id: `table-${table.name}-timefields`,
          label: '时间字段',
          type: 'folder' as const,
          icon: Folder,
          children: table.timeFields.map((tf: any) => ({
            id: `table-${table.name}-time-${tf.name}`,
            label: tf.description || tf.name,
            type: 'time' as const,
            icon: Calendar,
            description: tf.description,
          }))
        }] : [])
      ].filter(Boolean) as TreeNode[]
    }))
  }

  const toggleNode = (id: string) => {
    setCollapsedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isCollapsed = collapsedNodes[node.id]
    const hasChildren = node.children && node.children.length > 0
    const Icon = node.icon || Folder
    const isSelected = node.type === 'table' && node.id.replace('table-', '') === selectedTable

    return (
      <div key={node.id}>
        <button
          onClick={() => {
            if (node.type === 'table') {
              const tableName = node.id.replace('table-', '')
              handleTableSelect(tableName)
            } else if (hasChildren) {
              toggleNode(node.id)
            }
          }}
          className={`w-full flex items-center gap-2 py-1.5 px-2 text-sm text-left transition-colors ${
            isSelected
              ? 'bg-blue-100 text-blue-700 font-medium'
              : node.type === 'table'
                ? 'hover:bg-gray-50 text-gray-900 font-medium cursor-pointer'
                : 'hover:bg-gray-50 text-gray-700 cursor-default'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {hasChildren ? (
            <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
          ) : (
            <span className="w-3"></span>
          )}
          <Icon className="w-4 h-4 text-gray-600" />
          <span className="text-gray-700 truncate">{node.label}</span>
        </button>
        
        {hasChildren && !isCollapsed && (
          <div>
            {node.children!.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* 标题栏 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-gray-700" />
          <h3 className="text-base font-semibold text-gray-900">数据</h3>
        </div>
      </div>

      {/* 数据模型选择器 */}
      <div className="p-3 border-b border-gray-200">
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="bank-loan-model">银行存贷款业务模型</option>
          <option value="retail-model">零售业务模型</option>
          <option value="corporate-model">对公业务模型</option>
        </select>
      </div>

      {/* 数据树 */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : treeData.length > 0 ? (
          treeData.map(node => renderTreeNode(node))
        ) : (
          <div className="text-center py-8 text-sm text-gray-400">
            暂无数据
          </div>
        )}
      </div>
    </aside>
  )
}
