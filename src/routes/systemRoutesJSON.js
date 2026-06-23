/**
 * 系统管理API路由（JSON存储版本）
 */

const express = require('express');
const router = express.Router();
const MemoryModel = require('../models/MemoryModelJSON');

// 获取系统配置
router.get('/config', async (req, res) => {
  try {
    const config = await MemoryModel.getSystemConfig();
    
    res.json({
      success: true,
      config: config,
      storage: 'JSON文件存储',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取系统配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取系统配置失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 更新系统配置
router.put('/config/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    
    if (!key || key.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '配置键不能为空',
        message: '请提供配置键(key参数)',
        timestamp: new Date().toISOString()
      });
    }
    
    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: '配置值不能为空',
        message: '请提供配置值(value参数)',
        timestamp: new Date().toISOString()
      });
    }

    const updated = await MemoryModel.updateSystemConfig(key, value, description);
    
    if (!updated) {
      return res.status(500).json({
        success: false,
        error: '更新配置失败',
        message: '系统配置更新失败',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: '系统配置更新成功',
      config_key: key,
      config_value: value,
      description: description || '',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`更新系统配置 ${req.params.key} 失败:`, error);
    res.status(500).json({
      success: false,
      error: '更新系统配置失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 获取存储信息
router.get('/storage', async (req, res) => {
  try {
    const storageInfo = await MemoryModel.getStorageInfo();
    
    res.json({
      success: true,
      storage_info: storageInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取存储信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取存储信息失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 备份数据
router.post('/backup', async (req, res) => {
  try {
    const { backup_path } = req.body;
    
    const backupFile = await MemoryModel.backupData(backup_path);
    
    if (!backupFile) {
      return res.status(500).json({
        success: false,
        error: '备份失败',
        message: '数据备份失败',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: '数据备份成功',
      backup_file: backupFile,
      backup_time: new Date().toISOString(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('数据备份失败:', error);
    res.status(500).json({
      success: false,
      error: '数据备份失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 清理旧记忆
router.post('/cleanup', async (req, res) => {
  try {
    const {
      max_age_days = 30,
      min_importance = 2,
      memory_type = 'short_term'
    } = req.body;

    const cleanedCount = await MemoryModel.cleanupOldMemories({
      max_age_days: parseInt(max_age_days),
      min_importance: parseInt(min_importance),
      memory_type
    });
    
    res.json({
      success: true,
      message: `清理了 ${cleanedCount} 条旧记忆`,
      cleaned_count: cleanedCount,
      options: {
        max_age_days,
        min_importance,
        memory_type
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('清理记忆失败:', error);
    res.status(500).json({
      success: false,
      error: '清理记忆失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 系统状态检查
router.get('/status', async (req, res) => {
  try {
    const storageInfo = await MemoryModel.getStorageInfo();
    const config = await MemoryModel.getSystemConfig();
    const stats = await MemoryModel.getMemoryStats();
    
    res.json({
      success: true,
      system_status: '运行正常',
      storage: storageInfo,
      config: config,
      stats: stats,
      server_info: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory_usage: process.memoryUsage()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('系统状态检查失败:', error);
    res.status(500).json({
      success: false,
      error: '系统状态检查失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;