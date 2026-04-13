import { readFileSync, writeFileSync, existsSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { config } from './config.js'

/**
 * 数据源存储服务
 * 使用 JSON 文件存储数据源配置
 */
class DataSourceStorage {
  constructor() {
    this.filePath = config.datasourcesFile
    this.ensureFile()
  }

  /**
   * 确保存储文件存在
   */
  ensureFile() {
    if (!existsSync(this.filePath)) {
      writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8')
    }
  }

  /**
   * 读取所有数据源
   */
  getAll() {
    try {
      const data = readFileSync(this.filePath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      console.error('读取数据源失败:', error)
      return []
    }
  }

  /**
   * 根据 ID 获取数据源
   */
  getById(id) {
    const datasources = this.getAll()
    return datasources.find(ds => ds.id === id)
  }

  /**
   * 添加数据源
   */
  add(dataSource) {
    const datasources = this.getAll()
    const newDataSource = {
      id: uuidv4(),
      ...dataSource,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    datasources.push(newDataSource)
    this.save(datasources)
    return newDataSource
  }

  /**
   * 更新数据源
   */
  update(id, updates) {
    const datasources = this.getAll()
    const index = datasources.findIndex(ds => ds.id === id)
    
    if (index === -1) {
      throw new Error('数据源不存在')
    }

    datasources[index] = {
      ...datasources[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    this.save(datasources)
    return datasources[index]
  }

  /**
   * 删除数据源
   */
  delete(id) {
    const datasources = this.getAll()
    const filtered = datasources.filter(ds => ds.id !== id)
    
    if (filtered.length === datasources.length) {
      throw new Error('数据源不存在')
    }

    this.save(filtered)
    return true
  }

  /**
   * 保存到文件
   */
  save(datasources) {
    writeFileSync(this.filePath, JSON.stringify(datasources, null, 2), 'utf-8')
  }
}

export default new DataSourceStorage()
