#!/usr/bin/env node

/**
 * MemFlow AI 主服务器文件（JSON存储版本）
 * 使用JSON文件存储，避免SQLite3编译依赖问题
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
const PORT = process.env.PORT || 3001; // 使用3001端口，避免与测试服务器冲突
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
    name: 'MemFlow AI (JSON存储版本)',
    version: '0.1.0',
    environment: NODE_ENV,
    uptime: process.uptime(),
    storage: 'JSON文件存储',
    port: PORT
  });
});

// API版本前缀
const API_PREFIX = '/api/v1';

// 基础API路由
app.get(`${API_PREFIX}/`, (req, res) => {
  res.json({
    name: 'MemFlow AI API (JSON存储版本)',
    version: '0.1.0',
    description: '智能分层记忆系统API - 使用JSON文件存储',
    storage: 'JSON文件存储（避免SQLite3编译依赖）',
    endpoints: {
      memories: `${API_PREFIX}/memories`,
      search: `${API_PREFIX}/search`,
      stats: `${API_PREFIX}/stats`,
      system: `${API_PREFIX}/system`,
      health: '/health',
      test: '/test',
      init: '/init-test-data'
    },
    note: '此版本使用JSON文件存储，适合开发和测试环境'
  });
});

// 测试端点
app.get('/test', async (req, res) => {
  try {
    const MemoryModel = require('./models/MemoryModelJSON');
    const testResult = await MemoryModel.testStorage();
    
    res.json({
      success: true,
      message: 'MemFlow AI JSON存储系统测试完成',
      test_result: testResult,
      server_info: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd(),
        port: PORT,
        storage: 'JSON文件存储'
      }
    });
  } catch (error) {
    console.error('测试失败:', error);
    res.status(500).json({
      success: false,
      error: '测试失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 初始化测试数据端点
app.post('/init-test-data', async (req, res) => {
  try {
    const MemoryModel = require('./models/MemoryModelJSON');
    const initResult = await MemoryModel.initTestData();
    
    res.json({
      success: true,
      message: '测试数据初始化完成',
      init_result: initResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('初始化测试数据失败:', error);
    res.status(500).json({
      success: false,
      error: '初始化测试数据失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 记忆管理API路由
app.use(`${API_PREFIX}/memories`, require('./routes/memoryRoutesJSON'));

// 搜索API路由
app.use(`${API_PREFIX}/search`, require('./routes/searchRoutesJSON'));

// 系统管理API路由
app.use(`${API_PREFIX}/system`, require('./routes/systemRoutesJSON'));

// 统计API路由
app.use(`${API_PREFIX}/stats`, require('./routes/statsRoutesJSON'));

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
    path.join(__dirname, '..', 'backups')
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
🚀 MemFlow AI JSON存储版本服务器已启动!
    
📊 服务器信息:
  环境: ${NODE_ENV}
  端口: ${PORT}
  地址: http://localhost:${PORT}
  健康检查: http://localhost:${PORT}/health
  测试端点: http://localhost:${PORT}/test
  初始化数据: POST http://localhost:${PORT}/init-test-data
  API文档: http://localhost:${PORT}/api/v1
    
📁 项目目录: ${path.join(__dirname, '..')}
📅 启动时间: ${new Date().toISOString()}
    
💡 存储方案: JSON文件存储（避免SQLite3编译依赖）
💡 数据文件: data/memories.json
💡 备份目录: data/backups/
    
🔧 可用命令:
  npm start    - 启动生产服务器
  npm run dev  - 启动开发服务器（带热重载）
  node src/server-json.js - 直接启动此服务器
    
🎯 立即测试:
  1. 访问 http://localhost:${PORT}/health 检查健康状态
  2. 访问 http://localhost:${PORT}/test 测试存储系统
  3. POST http://localhost:${PORT}/init-test-data 初始化测试数据
  4. 访问 http://localhost:${PORT}/api/v1/memories 获取记忆列表
    
✅ 优势:
  - 无需编译SQLite3依赖
  - 快速启动和测试
  - 适合开发和原型阶段
  - 数据可读性强（JSON格式）
  - 易于备份和迁移
    
⚠️ 注意:
  - 此版本适合开发和测试环境
  - 生产环境建议使用数据库
  - 并发性能有限
  - 需要定期备份数据
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