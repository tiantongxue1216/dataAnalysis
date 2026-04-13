export interface DataSource {
  id?: string
  name: string
  type: 'PostgreSQL' | 'MySQL' | 'SQL Server' | 'Oracle' | 'SQLite'
  host?: string | null
  port?: string | null
  database?: string | null
  username?: string | null
  password?: string | null
  filePath?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface TestConnectionResult {
  success: boolean
  message: string
  tables?: string[]
}

export interface TableMetadata {
  name: string
  columns: ColumnMetadata[]
}

export interface ColumnMetadata {
  name: string
  type: string
  nullable: boolean
  primaryKey: boolean
}

export interface DatabaseMetadata {
  tables: TableMetadata[]
  totalTables: number
}
