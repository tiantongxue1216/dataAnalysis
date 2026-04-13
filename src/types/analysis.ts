export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    color?: string
  }[]
}

export interface TableData {
  columns: string[]
  rows: (string | number)[][]
}

export interface AnalysisResult {
  type: 'text' | 'chart' | 'table'
  content: string | ChartData | TableData
}
