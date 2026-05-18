import dotenv from 'dotenv'
import app from './routes.js'
import { config } from './config.js'

// 加载环境变量
dotenv.config()

const PORT = config.port

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║  Smart Analyst Backend Server          ║
══════════════════════════════════════════╣
║                                         ║
║  Server running on:                    ║
║  http://localhost:${PORT}               ║
║                                         ║
║  API Endpoints:                         ║
║  GET    /api/datasources               ║
║  GET    /api/datasources/:id           ║
║  POST   /api/datasources               ║
║  PUT    /api/datasources/:id           ║
║  DELETE /api/datasources/:id           ║
║  POST   /api/datasources/test          ║
║  POST   /api/datasources/metadata      ║
║  POST   /api/intent/recognize          ║
║  POST   /api/sql/generate              ║
║  POST   /api/query/execute             ║
║  GET    /api/schema                    ║
║  POST   /api/agent/query               ║
║  GET    /api/agent/tools               ║
║  GET    /api/health                    ║
║                                         ║
╚══════════════════════════════════════════╝
  `)
})
