/**
 * API 测试脚本
 * 用于测试后端 API 是否正常工作
 */

const API_BASE = 'http://localhost:3001/api'

async function test() {
  console.log('=== 开始 API 测试 ===\n')

  // 1. 健康检查
  console.log('1. 测试健康检查...')
  try {
    const health = await fetch(`${API_BASE}/health`)
    const healthData = await health.json()
    console.log('✓ 健康检查通过:', healthData.message, '\n')
  } catch (err) {
    console.log('✗ 健康检查失败:', err.message, '\n')
    return
  }

  // 2. 获取数据源列表（应该是空的）
  console.log('2. 获取数据源列表...')
  try {
    const listRes = await fetch(`${API_BASE}/datasources`)
    const listData = await listRes.json()
    console.log(`✓ 获取到 ${listData.data.length} 个数据源\n`)
  } catch (err) {
    console.log('✗ 获取数据源失败:', err.message, '\n')
  }

  // 3. 测试 SQLite 连接
  console.log('3. 测试 SQLite 连接...')
  try {
    const testRes = await fetch(`${API_BASE}/datasources/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'SQLite',
        filePath: 'D:\\qoderWS\\dataAnalysis\\smart_analyst.db',
      }),
    })
    const testData = await testRes.json()
    console.log('✓ 连接测试结果:', testData.data.message)
    console.log('  表数量:', testData.data.tables?.length || 0, '\n')
  } catch (err) {
    console.log('✗ 连接测试失败:', err.message, '\n')
  }

  // 4. 创建数据源
  console.log('4. 创建 SQLite 数据源...')
  try {
    const createRes = await fetch(`${API_BASE}/datasources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '本地测试数据库',
        type: 'SQLite',
        filePath: 'D:\\qoderWS\\dataAnalysis\\smart_analyst.db',
        database: 'main',
      }),
    })
    const createData = await createRes.json()
    console.log('✓ 数据源创建成功, ID:', createData.data.id, '\n')
  } catch (err) {
    console.log('✗ 创建数据源失败:', err.message, '\n')
  }

  // 5. 再次获取列表
  console.log('5. 再次获取数据源列表...')
  try {
    const listRes = await fetch(`${API_BASE}/datasources`)
    const listData = await listRes.json()
    console.log(`✓ 获取到 ${listData.data.length} 个数据源`)
    listData.data.forEach(ds => {
      console.log(`  - ${ds.name} (${ds.type})`)
    })
    console.log('')
  } catch (err) {
    console.log('✗ 获取数据源失败:', err.message, '\n')
  }

  // 6. 获取数据库元数据
  console.log('6. 获取数据库元数据...')
  try {
    const metaRes = await fetch(`${API_BASE}/datasources/metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'SQLite',
        filePath: 'D:\\qoderWS\\dataAnalysis\\smart_analyst.db',
      }),
    })
    const metaData = await metaRes.json()
    console.log('✓ 获取到元数据')
    console.log(`  总表数: ${metaData.data.totalTables}`)
    metaData.data.tables?.forEach(table => {
      console.log(`  - ${table.name} (${table.columns.length} 列)`)
    })
    console.log('')
  } catch (err) {
    console.log('✗ 获取元数据失败:', err.message, '\n')
  }

  console.log('=== API 测试完成 ===')
}

test()
