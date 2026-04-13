import dotenv from 'dotenv'
import app from './routes.js'
import { config } from './config.js'

// 加载环境变量
dotenv.config()

const PORT = config.port

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   Smart Analyst Backend Server          ║
╠══════════════════════════════════════════╣
║                                          ║
║   Server running on:                    ║
║   http://localhost:${PORT}               ║
║                                          ║
║   API Endpoints:                         ║
║   GET    /api/datasources               ║
║   GET    /api/datasources/:id           ║
║   POST   /api/datasources               ║
║   PUT    /api/datasources/:id           ║
║   DELETE /api/datasources/:id           ║
║   POST   /api/datasources/test          ║
║   POST   /api/datasources/metadata      ║
║   GET    /api/health                    ║
║                                          ║
╚══════════════════════════════════════════╝
  `)
})
