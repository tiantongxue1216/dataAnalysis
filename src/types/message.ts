import type { IntentObject } from './intent'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  intent?: IntentObject  // 意图识别结果
}
