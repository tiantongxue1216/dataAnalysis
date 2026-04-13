// 服务器配置
export const config = {
  port: process.env.PORT || 3001,
  // 数据源配置存储文件
  datasourcesFile: './datasources.json',
  // 日志配置
  logLevel: process.env.LOG_LEVEL || 'info',
  // DeepSeek API 配置（兼容阿里云百炼）
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || process.env.DASHSCOPE_API_KEY || '',
  deepseekApiUrl: process.env.DEEPSEEK_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-v3.2',
}
