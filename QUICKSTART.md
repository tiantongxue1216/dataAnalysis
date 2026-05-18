# 🚀 快速启动指南

## ✅ 环境已就绪

所有配置已完成，您现在可以开始测试了！

## 📋 检查清单

- [x] API Key 配置完成 (sk-1dda48c336b44951b743b3e38afd46f8)
- [x] 示例数据库创建成功 (smart_analyst.db, 24 KB)
- [x] 数据库连接验证通过
- [x] Agent 引擎配置完成
- [x] 错误处理机制集成
- [x] 测试脚本准备就绪

## 🎯 立即开始测试

### 选项 1: 命令行快速测试（推荐）

```bash
cd server
node test-agent-with-db.js
```

这将自动执行 5 个测试场景，展示完整的 Agent 工作流程。

**预计时间**: 2-3 分钟  
**预期输出**: 每个测试场景的思考过程、工具执行情况和最终答案

---

### 选项 2: 前端界面交互测试

#### 步骤 1: 启动后端服务
```bash
cd server
npm run dev
```

等待看到：
```
🚀 服务器运行在 http://localhost:3001
✅ 数据源加载成功: 1 个
```

#### 步骤 2: 启动前端服务
打开新终端：
```bash
npm run dev
```

等待看到：
```
VITE ready in xxx ms
➜  Local:   http://localhost:5175/
```

#### 步骤 3: 访问应用
1. 打开浏览器访问: http://localhost:5175
2. 在底部工具栏找到 "Agent 模式" 开关
3. 点击开关启用 Agent 模式（开关变蓝）
4. 在输入框中输入问题，例如：
   - "查询所有员工的姓名和部门"
   - "统计每个部门的员工数量"
   - "查询公司的平均工资"
5. 点击发送按钮
6. 观察 Agent 的思考和执行过程

**预计时间**: 5-10 分钟  
**体验内容**: 完整的交互式对话界面

---

### 选项 3: API 直接调用

```bash
curl -X POST http://localhost:3001/api/agent/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "查询所有员工的姓名和部门",
    "datasource_id": "e7e67aa4-9403-4096-9b65-fdd1eb77a662",
    "max_iterations": 5
  }' | jq .
```

**预计时间**: 1 分钟  
**适用场景**: 集成测试、自动化测试

---

## 💡 推荐的测试问题

### 🟢 简单级别
```
1. 查询所有员工的姓名
2. 列出所有部门
3. 查看产品名称和价格
```

### 🟡 中等级别
```
4. 查询所有员工的姓名和部门
5. 统计每个部门的员工数量
6. 查询工资高于15000的员工
7. 找出年龄最大的员工
```

### 🔴 复杂级别
```
8. 查询销售额最高的产品
9. 统计各地区的销售总额
10. 查看每个部门的平均工资
11. 找出入职时间最长的3名员工
12. 查询技术部的所有员工及其工资
```

---

## 📊 预期结果示例

### 问题: "查询所有员工的姓名和部门"

**思考过程**:
```
1. 用户想查询员工姓名和部门信息
2. 需要获取 employees 表的结构
3. 需要获取 departments 表的结构
4. 生成 SQL: SELECT e.emp_name, d.dept_name FROM employees e JOIN departments d ON e.dept_id = d.dept_id
5. 执行查询
6. 返回 15 条记录
```

**最终答案**:
```
以下是所有员工及其所属部门：

| 姓名   | 部门     |
|--------|----------|
| 张三   | 技术部   |
| 李四   | 销售部   |
| 王五   | 财务部   |
| ...    | ...      |

共 15 名员工分布在 5 个部门。
```

---

## 🔍 监控和调试

### 查看后端日志
在后端终端中，您可以看到：
```
[Agent] 初始化 LLM
  API Key: sk-1dda4...
  Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1
  Model: qwen-plus

=== [Planner] 规划下一步 ===
当前步骤: 0
历史消息: 1

=== [Executor] 执行工具 ===
执行工具: get_table_schema
参数: {"tableName":"employees"}

[Agent Tool] 调用: get_table_schema
[Agent Tool] 结果: get_table_schema
```

### 查看浏览器控制台
在前端浏览器中按 F12 打开开发者工具，可以看到：
- API 请求和响应
- 组件渲染状态
- 错误信息（如果有）

---

## ⚠️ 常见问题

### Q1: 数据库文件不存在
```
❌ 数据库文件不存在，请先运行: node create-sample-db.js
```

**解决**:
```bash
cd server
node create-sample-db.js
```

### Q2: API Key 认证失败
```
❌ AuthenticationError: 401 Authentication Fails
```

**解决**:
1. 检查 `server/.env` 文件
2. 确认 API Key 正确: `sk-1dda48c336b44951b743b3e38afd46f8`
3. 重启后端服务

### Q3: 端口被占用
```
Error: listen EADDRINUSE: address already in use :::3001
```

**解决**:
```bash
# Windows
taskkill /F /PID <进程ID>

# 或者修改端口
# 在 server/index.js 中修改端口号
```

### Q4: 依赖未安装
```
Error: Cannot find module 'xxx'
```

**解决**:
```bash
cd server
npm install
```

---

## 📚 深入学习

### 了解 Agent 工作原理
- [Agent 状态图设计](./server/agent/STATE-DIAGRAM.md)
- [ReAct 提示词规范](./server/agent/prompts.js)
- [错误处理机制](./server/agent/ERROR-HANDLING.md)

### 了解数据库配置
- [数据库配置指南](./DATABASE-CONFIG.md)
- [真实数据库设置总结](./REAL-DATABASE-SETUP.md)

### 了解系统集成
- [Agent 集成总览](./AGENT-INTEGRATION.md)
- [API Key 配置说明](./API-KEY-CONFIG.md)

---

## 🎓 学习路径

### 第 1 步: 基础理解 (30 分钟)
1. 阅读 [Agent 集成总览](./AGENT-INTEGRATION.md)
2. 了解系统架构和组件
3. 运行一次完整测试

### 第 2 步: 深入探索 (1-2 小时)
1. 研究 [Agent 状态图](./server/agent/STATE-DIAGRAM.md)
2. 理解 Planner-Executor-Reflector 循环
3. 分析测试输出的每个步骤

### 第 3 步: 实践操作 (2-3 小时)
1. 尝试不同的查询问题
2. 观察错误处理和自动修正
3. 修改测试用例

### 第 4 步: 扩展开发 (持续)
1. 添加新的数据表
2. 实现自定义工具
3. 优化查询性能
4. 改进错误处理

---

## 🎉 开始您的 Agent 之旅！

现在一切准备就绪，您可以：

✅ **测试功能**: 验证 Agent 的智能查询能力  
✅ **学习原理**: 深入理解 LangGraph 和 ReAct 模式  
✅ **开发扩展**: 基于现有框架添加新功能  
✅ **优化性能**: 提升查询速度和准确性  

**祝您使用愉快！** 🚀

---

**最后更新**: 2026-04-21  
**版本**: 1.0.0  
**状态**: ✅ 生产就绪
