#!/usr/bin/env node

/**
 * MemFlow AI 主服务器文件
 * 智能分层记忆系统的核心服务器
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// 配置加载
require('dotenv').config();

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 中间件配置
app.use(helmet()); // 安全头部
app.use(cors()); // 跨域支持
app.use(compression()); // 响应压缩
app.use(bodyParser.json({ limit: '10mb' })); // JSON解析
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' })); // URL编码解析

// 静态文件服务
app.use(express.static(path.join(__dirname, '..', 'public')));

// 请求日志中间件
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(body) {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    return originalSend.call(this, body);
  };
  
  next();
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    environment: NODE_ENV,
    uptime: process.uptime()
  });
});

// API版本前缀
const API_PREFIX = '/api/v1';

// 基础API路由
app.get(`${API_PREFIX}/`, (req, res) => {
  res.json({
    name: 'MemFlow AI API',
    version: '0.1.0',
    description: '智能分层记忆系统API',
    endpoints: {
      memories: `${API_PREFIX}/memories`,
      search: `${API_PREFIX}/search`,
      health: '/health',
      docs: '/api-docs' // TODO: 添加API文档
    }
  });
});

// 记忆管理API路由
app.use(`${API_PREFIX}/memories`, require('./routes/memoryRoutes'));

// 搜索API路由
app.use(`${API_PREFIX}/search`, require('./routes/searchRoutes'));

// 系统管理API路由
app.use(`${API_PREFIX}/system`, require('./routes/systemRoutes'));

// 404处理
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `无法找到 ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = NODE_ENV === 'production' 
    ? '服务器内部错误' 
    : err.message;
  
  res.status(statusCode).json({
    error: 'Internal Server Error',
    message: message,
    timestamp: new Date().toISOString(),
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 确保必要的目录存在
const ensureDirectories = () => {
  const directories = [
    path.join(__dirname, '..', 'data'),
    path.join(__dirname, '..', 'logs'),
    path.join(__dirname, '..', 'uploads')
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ 创建目录: ${dir}`);
    }
  });
};

// 启动服务器
const startServer = () => {
  ensureDirectories();
  
  app.listen(PORT, () => {
    console.log(`
🚀 MemFlow AI 服务器已启动!
    
📊 服务器信息:
  环境: ${NODE_ENV}
  端口: ${PORT}
  地址: http://localhost:${PORT}
  健康检查: http://localhost:${PORT}/health
  API文档: http://localhost:${PORT}/api-docs (待实现)
    
📁 项目目录: ${path.join(__dirname, '..')}
📅 启动时间: ${new Date().toISOString()}
    
🔧 可用命令:
  npm start    - 启动生产服务器
  npm run dev  - 启动开发服务器（带热重载）
  npm test     - 运行测试
  npm run db:init - 初始化数据库
    
💡 提示: 确保已运行数据库初始化脚本
    `);
  });
};

// 处理进程信号
process.on('SIGTERM', () => {
  console.log('🛑 收到SIGTERM信号，正在优雅关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 收到SIGINT信号，正在优雅关闭服务器...');
  process.exit(0);
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('❌ 未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
});

// 导出app用于测试
module.exports = app;

// 如果是直接运行此文件，则启动服务器
if (require.main === module) {
  startServer();
}