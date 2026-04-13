# Smart Analyst 项目 - 后端集成说明

## 项目结构

```
d:\qoderWS\dataAnalysis\
├── src/                          # 前端代码 (React + Vite)
│   ├── components/
│   │   └── layout/
│   │       ├── ConfigureDataSourceModal.tsx  # 数据源配置模态框
│   │       ├── Header.tsx
│   │       ├── AppLayout.tsx
│   │       └── Sidebar.tsx
│   ├── pages/
│   │   ├── DataSourcePage.tsx    # 数据源管理页面
│   │   └── HomePage.tsx
│   ├── services/
│   │   └── api.ts                # API 服务层
│   └── types/
│       └── datasource.ts         # 数据类型定义
├── server/                       # 后端代码 (Node.js + Express)
│   ├── index.js                  # 服务器入口
│   ├── routes.js                 # API 路由
│   ├── database.js               # 数据库连接管理器
│   ├── storage.js                # 数据源存储
│   ├── config.js                 # 配置文件
│   ├── package.json
│   └── test-api.js               # API 测试脚本
├── smart_analyst.db              # SQLite 测试数据库
└── init_db.py                    # 数据库初始化脚本
```

## 技术栈

### 前端
- **框架**: React 18.3.1
- **构建工具**: Vite 6.0.1
- **样式**: Tailwind CSS 3.4.15
- **路由**: react-router-dom 7.1.0
- **图标**: lucide-react
- **语言**: TypeScript

### 后端
- **运行时**: Node.js 24.14.0
- **框架**: Express 4.18.2
- **数据库**: 
  - SQLite (Node.js 内置模块)
  - MySQL (mysql2)
  - PostgreSQL (pg)
- **其他**: CORS, UUID

## 快速开始

### 1. 启动后端服务

```bash
cd server
node index.js
```

后端服务将在 http://localhost:3001 启动

### 2. 启动前端开发服务器

```bash
npm run dev
```

前端应用将在 http://localhost:5175 启动

## API 接口文档

### 数据源管理

#### 1. 获取所有数据源
```
GET /api/datasources
```

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "id": "e7e67aa4-9403-4096-9b65-fdd1eb77a662",
      "name": "本地测试数据库",
      "type": "SQLite",
      "filePath": "D:\\qoderWS\\dataAnalysis\\smart_analyst.db",
      "database": "main",
      "createdAt": "2026-04-12T05:18:04.242Z",
      "updatedAt": "2026-04-12T05:18:04.242Z"
    }
  ]
}
```

#### 2. 创建数据源
```
POST /api/datasources
Content-Type: application/json

{
  "name": "本地测试数据库",
  "type": "SQLite",
  "filePath": "D:\\qoderWS\\dataAnalysis\\smart_analyst.db",
  "database": "main"
}
```

#### 3. 测试数据库连接
```
POST /api/datasources/test
Content-Type: application/json

{
  "type": "SQLite",
  "filePath": "D:\\qoderWS\\dataAnalysis\\smart_analyst.db"
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "SQLite 连接成功",
    "tables": ["users", "orders", "order_items", "product_categories"]
  }
}
```

#### 4. 获取数据库元数据
```
POST /api/datasources/metadata
Content-Type: application/json

{
  "type": "SQLite",
  "filePath": "D:\\qoderWS\\dataAnalysis\\smart_analyst.db"
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "tables": [
      {
        "name": "users",
        "columns": [
          { "name": "id", "type": "INTEGER", "nullable": false, "primaryKey": true },
          { "name": "username", "type": "TEXT", "nullable": false, "primaryKey": false },
          ...
        ]
      },
      ...
    ],
    "totalTables": 4
  }
}
```

#### 5. 删除数据源
```
DELETE /api/datasources/:id
```

### 支持的数据库类型

1. **SQLite** ✅ (完全支持)
   - 使用 Node.js 内置的 `node:sqlite` 模块
   - 无需安装额外依赖
   - 只需提供文件路径

2. **MySQL** ✅ (支持连接测试和元数据获取)
   - 需要 Host、Port、Database、Username、Password

3. **PostgreSQL** ✅ (支持连接测试和元数据获取)
   - 需要 Host、Port、Database、Username、Password

4. **SQL Server** ⚠️ (待实现)
   - 需要安装 `mssql` 包

## 测试数据库信息

项目包含一个预配置的 SQLite 测试数据库：

**文件位置:** `D:\qoderWS\dataAnalysis\smart_analyst.db`

**包含数据:**
- 4 张表：users (50条), orders (200条), order_items (200条), product_categories (5条)
- 覆盖 5 个地区、5 个产品类别
- 最近 12 个月的销售数据

**重新初始化数据库:**
```bash
python init_db.py
```

## 前后端联调流程

### 完整使用流程

1. **启动后端服务**
   ```bash
   cd server
   node index.js
   ```

2. **启动前端应用**
   ```bash
   npm run dev
   ```

3. **访问应用**
   - 打开浏览器访问 http://localhost:5175
   - 点击顶部【请选择数据源】→ 点击【去配置】
   - 或直接访问 http://localhost:5175/datasource

4. **添加数据源**
   - 点击【新增数据源】或【立即添加】按钮
   - 填写表单信息：
     - 数据源名称：自定义名称
     - 数据库类型：选择 SQLite
     - 数据库文件路径：`D:\qoderWS\dataAnalysis\smart_analyst.db`
   - 点击【测试连接】验证配置
   - 点击【保存数据源】保存到系统

5. **查看数据源列表**
   - 保存成功后，页面会显示已配置的数据源列表
   - 可以删除不再需要的数据源

## API 测试

运行自动化测试脚本：
```bash
cd server
node test-api.js
```

该脚本会自动测试所有 API 端点并显示测试结果。

## 数据存储

数据源配置保存在 `server/datasources.json` 文件中，格式如下：

```json
[
  {
    "id": "e7e67aa4-9403-4096-9b65-fdd1eb77a662",
    "name": "本地测试数据库",
    "type": "SQLite",
    "filePath": "D:\\qoderWS\\dataAnalysis\\smart_analyst.db",
    "database": "main",
    "createdAt": "2026-04-12T05:18:04.242Z",
    "updatedAt": "2026-04-12T05:18:04.242Z"
  }
]
```

## 安全说明

1. **密码保护**：返回给前端的数据源信息中，密码字段会被隐藏（显示为 `********`）
2. **只读访问**：SQLite 数据库使用只读模式打开
3. **输入验证**：后端对所有输入进行验证
4. **错误处理**：API 错误不会暴露敏感信息

## 开发注意事项

1. **CORS 配置**：后端已配置 CORS 允许前端跨域访问
2. **热更新**：前端使用 Vite 热更新，后端修改需要重启
3. **TypeScript**：前端使用 TypeScript，类型定义在 `src/types/datasource.ts`
4. **API 基础地址**：`src/services/api.ts` 中的 `API_BASE_URL` 配置为 `http://localhost:3001/api`

## 常见问题

### Q: 后端启动失败？
A: 确保端口 3001 未被占用，或修改 `server/config.js` 中的端口配置

### Q: 前端无法连接后端？
A: 检查后端是否正常运行，确认 `API_BASE_URL` 配置正确

### Q: SQLite 连接失败？
A: 检查数据库文件路径是否正确，确保文件存在且有读取权限

### Q: MySQL/PostgreSQL 连接失败？
A: 确保数据库服务正在运行，防火墙允许相应端口访问

## 下一步开发计划

1. ✨ 实现 SQL 查询编辑器
2. ✨ 实现查询结果可视化
3. ✨ 实现数据导出功能
4. ✨ 添加用户认证和权限管理
5. ✨ 支持更多数据库类型（SQL Server、Oracle）
6. ✨ 实现数据库连接池
7. ✨ 添加查询历史记录
8. ✨ 实现数据同步和缓存机制
