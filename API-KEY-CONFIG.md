# Agent API Key 配置说明

## ✅ 配置完成

您的 DeepSeek API Key 已经成功配置并验证通过。

### 配置文件位置
`server/.env`

### 当前配置
```env
# 阿里云百炼 API Key
DASHSCOPE_API_KEY=sk-1dda48c336b44951b743b3e38afd46f8

# DeepSeek API 配置（通过阿里云百炼兼容接口）
DEEPSEEK_API_KEY=sk-1dda48c336b44951b743b3e38afd46f8
DEEPSEEK_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DEEPSEEK_MODEL=qwen-plus
```

### 技术说明

**API 提供商**: 阿里云百炼（DashScope）  
**模型**: qwen-plus  
**兼容模式**: OpenAI Compatible API  
**Base URL**: `https://dashscope.aliyuncs.com/compatible-mode/v1`

这个配置使用阿里云百炼的兼容接口来访问大语言模型，而不是直接访问 DeepSeek 官方 API。

## 验证结果

运行测试命令：
```bash
cd server
node test-error-quick.js
```

输出显示：
```
[Agent] 初始化 LLM
  API Key: sk-1dda4...
  Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1
  Model: qwen-plus
✅ Agent 创建成功
📊 可用工具数量: 6
```

✅ **API Key 认证成功**  
✅ **Agent 引擎正常启动**  
✅ **工具列表加载成功**  

## Agent 工作流程验证

从测试输出可以看到 Agent 正在正常工作：

```
=== [Planner] 规划下一步 ===
当前步骤: 0
历史消息: 1
Planner 响应: 思考: 用户想查询所有员工的姓名和部门...

=== [Executor] 执行工具 ===
无工具调用，跳过执行

=== [Reflector] 反思结果 ===
无工具结果，可能已得到答案

=== [Router] 路由决策 ===
默认继续
```

这证明：
- ✅ Planner 节点能够接收用户问题并生成思考
- ✅ Executor 节点检查工具调用
- ✅ Reflector 节点评估执行结果
- ✅ Router 节点决定下一步流程

## 可用的 6 个工具

1. **intent_recognition** - 意图识别
   - 识别用户查询的意图，包括表名、查询字段、条件、排序等

2. **get_table_schema** - 获取表结构
   - 获取指定表的详细结构信息，包括字段、维度、度量、时间字段等

3. **sql_generation** - SQL 生成
   - 根据意图识别结果生成 SQL 查询语句

4. **query_execution** - 查询执行
   - 执行 SQL 查询并推荐合适的图表类型

5. **chart_recommendation** - 图表推荐
   - 根据查询结果数据推荐最合适的图表类型

6. **complete_query** - 完整查询流程
   - 执行完整的查询流程：意图识别 → SQL 生成 → 查询执行 → 图表推荐

## 错误处理功能

Agent 集成了智能错误处理系统，支持：

### 9 种错误类型
1. SQL_SYNTAX_ERROR - SQL 语法错误
2. TABLE_NOT_FOUND - 表不存在
3. COLUMN_NOT_FOUND - 列不存在
4. PERMISSION_DENIED - 权限不足
5. TIMEOUT_ERROR - 查询超时
6. CONNECTION_ERROR - 连接错误
7. EMPTY_RESULT - 查询结果为空
8. INVALID_PARAMETER - 参数错误
9. UNKNOWN_ERROR - 未知错误

### 自动修复机制
- ✅ 规则引擎分类错误
- ✅ LLM 深度分析上下文
- ✅ 智能判断是否可重试
- ✅ 生成详细错误报告
- ✅ 自动调整策略重新尝试

## 下一步

### 1. 配置数据库连接
要完整测试 Agent 功能，需要配置真实的数据库连接。编辑 `server/.env` 添加：

```env
# 数据库配置示例（SQLite）
DB_PATH=./data/analytics.db

# 或者 MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=analytics
```

### 2. 启动完整服务
```bash
# 启动后端
cd server
npm run dev

# 启动前端（另一个终端）
cd ..
npm run dev
```

### 3. 测试 Agent 模式
1. 打开浏览器访问 `http://localhost:5175`
2. 在底部工具栏开启 "Agent 模式" 开关
3. 输入自然语言问题，如："查询所有员工的姓名和部门"
4. 观察 Agent 的思考和执行过程

## 常见问题

### Q: 如何更换 API Key？
A: 直接编辑 `server/.env` 文件中的 `DEEPSEEK_API_KEY` 值，然后重启服务。

### Q: 可以使用其他模型吗？
A: 可以。修改 `.env` 中的 `DEEPSEEK_MODEL` 为其他支持的模型，如：
- `qwen-plus` (当前)
- `qwen-turbo`
- `qwen-max`
- 或其他阿里云百炼支持的模型

### Q: 如何切换到 DeepSeek 官方 API？
A: 修改 `.env` 配置：
```env
DEEPSEEK_API_KEY=your-deepseek-official-key
DEEPSEEK_API_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

### Q: API 调用失败怎么办？
A: 检查以下几点：
1. API Key 是否正确
2. 网络连接是否正常
3. 阿里云百炼账户是否有余额
4. 查看控制台错误日志

## 相关文档

- [Agent 错误处理详细说明](./server/agent/ERROR-HANDLING.md)
- [Agent 状态图设计](./server/agent/STATE-DIAGRAM.md)
- [Agent 集成总览](./AGENT-INTEGRATION.md)
- [错误处理功能总结](./ERROR-HANDLING-SUMMARY.md)

## 技术支持

如遇到问题，请检查：
1. `.env` 文件是否存在且格式正确
2. 环境变量是否正确加载
3. 控制台输出的错误信息
4. 网络连通性

---

**配置时间**: 2026-04-21  
**API Key**: sk-1dda48c336b44951b743b3e38afd46f8  
**状态**: ✅ 已验证通过
