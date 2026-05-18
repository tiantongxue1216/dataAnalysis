参考链接：[https://cloud.tencent.cn/developer/article/2593804?policyId=20240000&traceId=&frompage=homepage]


LangChain SQL Toolkit 为你的应用接入自然语言查询数据库的能力，提供了一套完整且功能强大的工具集。下面我们来一步步构建这个智能查询助手。

### 💡 核心概念：SQLDatabaseToolkit

可以把 `SQLDatabaseToolkit` 想象成一个为*大语言模型（Large Language Model, LLM）* 准备的“数据库操作瑞士军刀”。它将LLM的语言能力和数据库的精准查询结合起来，让非技术用户也能用自然语言提问，并获得答案。

---

### 🛠️ 分步实战：从安装到提问

#### 1. 准备工作：安装与导入

首先，确保安装必要的库。对于Python环境，主要需要 `langchain-community` 和 `langchain-core`。

```bash
pip install -qU langchain-community langchain-core langgraph sqlalchemy
```

在代码中导入我们需要的主要组件：

```python
from langchain_community.utiliti es import SQLDatabase
from langchain_community.agent_toolkits import SQLDatabaseToolkit
from langchain_openai import ChatOpenAI  # DeepSeek兼容OpenAI API格式
from langgraph.prebuilt import create_react_agent
from langchain import hub
```

#### 2. 建立连接：初始化数据库

`SQLDatabase` 对象处理与数据库的连接，支持SQLite, MySQL, PostgreSQL等多种常见数据库。下面以内存中的SQLite示例数据库为例。

```python
# 1. 获取一个示例数据库引擎
import requests
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

def get_engine():
    url = "https://raw.githubusercontent.com/lerocha/chinook-database/master/ChinookDatabase/DataSources/Chinook_Sqlite.sql"
    response = requests.get(url)
    sql_script = response.text

    connection = sqlite3.connect(":memory:", check_same_thread=False)
    connection.executescript(sql_script)
    return create_engine("sqlite://", creator=lambda: connection, poolclass=StaticPool, connect_args={"check_same_thread": False})

engine = get_engine()

# 2. 创建SQLDatabase对象
db = SQLDatabase(engine)
print("数据库连接成功！表名：", db.get_usable_table_names())
```

#### 3. 选择大脑：实例化LLM

选择、配置并实例化一个LLM，你可以用DeepSeek、通义千问、智谱GLM或本地模型等。建议将 `temperature` 设置为0，以保证输出更精准。

```python
import os
os.environ["DEEPSEEK_API_KEY"] = "你的DeepSeek API Key"

# 实例化LLM，此处以DeepSeek的deepseek-chat为例
llm = ChatOpenAI(model="deepseek-chat", temperature=0, openai_api_base="https://api.deepseek.com/v1")
```

#### 4. 组装工具箱：实例化Toolkit

将 `db` 和 `llm` 注入 `SQLDatabaseToolkit`，让它拥有操作数据库的“工具”：

```python
toolkit = SQLDatabaseToolkit(db=db, llm=llm)
```

#### 5. 雇佣管家：创建并执行Agent

将 `llm` 和 `toolkit.get_tools()` 结合，创建一个能自主规划和执行任务的Agent，就能让它来干活了。

```python
# 获取一个针对SQL任务的系统提示模板
prompt_template = hub.pull("langchain-ai/sql-agent-system-prompt")
system_message = prompt_template.format(dialect="SQLite", top_k=5)

# 创建ReAct Agent
agent_executor = create_react_agent(llm, toolkit.get_tools(), state_modifier=system_message)

# 现在，可以开始提问了！
example_query = "哪位客户的总消费金额最高？" # Asking "Which customer spent the most overall?"
for event in agent_executor.stream({"messages": [("user", example_query)]}, stream_mode="values"):
    event["messages"][-1].pretty_print()
```

### 🛡️ 安全保障：必须掌握的DB权限控制

这是**最核心的安全措施**。请务必为应用创建专门的数据库用户，并为其分配**最小必要权限**（例如只给予 `SELECT` 查询权限），以限制单一查询能获取的数据量，避免无限制的返回。

---

### 🧠 进阶技巧：提升准确性与定制化

#### 1. 精细控制查询结果
`SQLDatabase` 实例化时，可通过 `sample_rows_in_table_info` 控制结果示例的数量。
```python
db = SQLDatabase(engine, sample_rows_in_table_info=2)  # 显示2条样本数据
```

#### 2. 增强系统提示词
通过优化Agent的系统提示词，可以帮它更好地理解你的数据结构。
```python
custom_prompt = """你是一个能与SQL数据库交互的代理。
你的任务是：将用户的自然语言问题转化为SQL查询，并基于查询结果给出答案。
当前数据库的方言是 {dialect}。
请按以下步骤思考：
1. 首先，使用 sql_db_list_tables 工具，了解数据库中有哪些表。
2. 然后，根据问题，使用 sql_db_schema 工具，获取相关表的详细结构。
3. 接着，构建准确的SQL查询，并使用 sql_db_query 工具执行它。
4. 最后，根据查询结果，用中文给出最终答案。
"""
system_message = custom_prompt.format(dialect="SQLite")
agent_executor = create_react_agent(llm, toolkit.get_tools(), state_modifier=system_message)
```

#### 3. 兼容性与扩展性
LangChain 为不同模型和数据库提供了集成接口。例如，当使用 `Cohere` 模型时，可导入 `create_sql_agent` 来直接创建并初始化Agent，其中包含 `SQLDatabaseToolkit` 和所需的模型，但通常建议使用更通用的 `create_react_agent` 以保持灵活性。

如果要迁移到其他数据库，只需修改 `SQLDatabase.from_uri()` 中的连接字符串即可，无需改动查询代码。此外，`create_react_agent` 支持更多选项，如 `return_intermediate_steps` 来追踪Agent的思考过程。

---

### 📚 相关资源

*   **LangChain 官方文档**：最权威的信息来源，可查阅 `SQLDatabaseToolkit` 的API参考。
*   **LangSmith**：可用于追踪和调试Agent的运行过程。
*   **Chinook 数据库**：文章使用的示例数据库，可用于学习和测试。

### 💎 总结

`SQLDatabaseToolkit` 本质上是一个为**大模型配备数据库操作能力的工具集**。它通过Agent自主规划，结合 `list tables`、`get schema`、`query` 等工具，逐步完成查询和分析任务。为了安全运行，关键环节是**压对数据库账号的权限配置**。