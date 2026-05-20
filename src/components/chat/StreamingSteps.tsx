import { useState } from 'react'
import { ChevronRight, ChevronDown, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { ExecutionStep } from '@/services/api'

interface StreamingStepsProps {
  steps: ExecutionStep[]
}

/**
 * 流式步骤展示组件
 * 按照截图格式展示执行步骤，支持可折叠和实时流式输出
 */
export default function StreamingSteps({ steps }: StreamingStepsProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  if (steps.length === 0) {
    return null
  }

  return (
    <div className="divide-y divide-gray-200">
      {steps.map((step) => (
        <StepItem 
          key={step.id} 
          step={step} 
          isExpanded={expandedSteps.has(step.id)}
          onToggle={() => toggleStep(step.id)}
        />
      ))}
    </div>
  )
}

interface StepItemProps {
  step: ExecutionStep
  isExpanded: boolean
  onToggle: () => void
  depth?: number
}

/**
 * 单个步骤项
 */
function StepItem({ step, isExpanded, onToggle, depth = 0 }: StepItemProps) {
  const statusIcon = {
    running: <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />,
    completed: <CheckCircle2 className="w-4 h-4 text-green-600" />,
    error: <XCircle className="w-4 h-4 text-red-600" />,
  }

  const statusColor = {
    running: 'text-blue-600',
    completed: 'text-green-600',
    error: 'text-red-600',
  }

  const paddingLeft = depth * 20

  return (
    <div>
      {/* 步骤标题行 */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
        style={{ paddingLeft: `${16 + paddingLeft}px` }}
      >
        {/* 状态图标 */}
        <span className="flex-shrink-0">{statusIcon[step.status]}</span>
        
        {/* 步骤标题 */}
        <span className={`flex-1 text-sm ${statusColor[step.status]}`}>
          {step.title}
        </span>
        
        {/* 耗时 */}
        {step.duration && step.duration !== '0.000' && (
          <span className="text-xs text-gray-500 flex-shrink-0">
            ({step.duration}秒)
          </span>
        )}
        
        {/* 展开/折叠图标 */}
        {(step.collapsible || step.children?.length) && (
          <span className="flex-shrink-0 text-gray-400">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        )}
      </button>

      {/* 展开的详细内容 */}
      {isExpanded && step.details && (
        <div 
          className="px-4 py-3 bg-gray-50 border-t border-gray-200"
          style={{ paddingLeft: `${36 + paddingLeft}px` }}
        >
          <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all font-mono">
            {step.details}
          </pre>
        </div>
      )}

      {/* 子步骤 */}
      {step.children && step.children.length > 0 && isExpanded && (
        <div className="border-l-2 border-blue-200 ml-6">
          {step.children.map((child) => (
            <StepItem 
              key={child.id} 
              step={child} 
              isExpanded={false}
              onToggle={() => {}}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
