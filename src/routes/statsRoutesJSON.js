/**
 * 统计API路由（JSON存储版本）
 */

const express = require('express');
const router = express.Router();
const MemoryModel = require('../models/MemoryModelJSON');

// 获取记忆统计信息
router.get('/memories', async (req, res) => {
  try {
    const stats = await MemoryModel.getMemoryStats();
    
    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取记忆统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计信息失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 获取分类统计
router.get('/categories', async (req, res) => {
  try {
    const stats = await MemoryModel.getMemoryStats();
    
    // 整理分类统计
    const categoryStats = Object.entries(stats.by_category || {})
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    
    res.json({
      success: true,
      total_categories: categoryStats.length,
      categories: categoryStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取分类统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取分类统计失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 获取类型统计
router.get('/types', async (req, res) => {
  try {
    const stats = await MemoryModel.getMemoryStats();
    
    const typeStats = [
      { type: '短期记忆', count: stats.by_type?.short_term || 0 },
      { type: '中期记忆', count: stats.by_type?.medium_term || 0 },
      { type: '长期记忆', count: stats.by_type?.long_term || 0 }
    ];
    
    res.json({
      success: true,
      types: typeStats,
      total_by_type: stats.by_type,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取类型统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取类型统计失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 获取重要性分布
router.get('/importance', async (req, res) => {
  try {
    const stats = await MemoryModel.getMemoryStats();
    
    const importanceStats = Object.entries(stats.importance_distribution || {})
      .map(([importance, count]) => ({ 
        importance: parseInt(importance), 
        count 
      }))
      .sort((a, b) => a.importance - b.importance);
    
    res.json({
      success: true,
      importance_distribution: importanceStats,
      avg_importance: stats.avg_importance || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取重要性统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取重要性统计失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 获取访问统计
router.get('/access', async (req, res) => {
  try {
    const stats = await MemoryModel.getMemoryStats();
    
    // 获取访问次数最多的记忆
    const memories = await MemoryModel.getMemories({ limit: 100 });
    const topAccessed = memories
      .sort((a, b) => (b.access_count || 0) - (a.access_count || 0))
      .slice(0, 10)
      .map(memory => ({
        id: memory.id,
        content: memory.content.substring(0, 50) + '...',
        access_count: memory.access_count || 0,
        last_accessed: memory.last_accessed_at
      }));
    
    res.json({
      success: true,
      total_access: stats.total_access || 0,
      avg_access_per_memory: stats.total > 0 ? (stats.total_access || 0) / stats.total : 0,
      top_accessed_memories: topAccessed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取访问统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取访问统计失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 获取时间统计
router.get('/time', async (req, res) => {
  try {
    const memories = await MemoryModel.getMemories({ limit: 1000 });
    
    // 按创建时间分组（按天）
    const dailyStats = {};
    const monthlyStats = {};
    
    memories.forEach(memory => {
      const date = new Date(memory.created_at);
      const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const monthKey = date.toISOString().substring(0, 7); // YYYY-MM
      
      dailyStats[dayKey] = (dailyStats[dayKey] || 0) + 1;
      monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + 1;
    });
    
    // 转换为数组并排序
    const dailyArray = Object.entries(dailyStats)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // 最近30天
    
    const monthlyArray = Object.entries(monthlyStats)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    res.json({
      success: true,
      recent_7days: memories.filter(m => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return new Date(m.created_at) > sevenDaysAgo;
      }).length,
      recent_30days: memories.filter(m => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(m.created_at) > thirtyDaysAgo;
      }).length,
      daily_stats: dailyArray,
      monthly_stats: monthlyArray,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取时间统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取时间统计失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 获取综合统计报告
router.get('/report', async (req, res) => {
  try {
    const stats = await MemoryModel.getMemoryStats();
    const storageInfo = await MemoryModel.getStorageInfo();
    
    // 获取各种统计数据
    const memories = await MemoryModel.getMemories({ limit: 50 });
    const categories = await (async () => {
      const stats = await MemoryModel.getMemoryStats();
      return Object.entries(stats.by_category || {})
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    })();
    
    // 生成报告
    const report = {
      summary: {
        total_memories: stats.total || 0,
        memory_types: stats.by_type || {},
        avg_importance: stats.avg_importance || 0,
        total_access: stats.total_access || 0,
        recent_7days: stats.recent_7days || 0
      },
      top_categories: categories,
      storage_info: {
        type: storageInfo.storage_type,
        file_path: storageInfo.file_path,
        last_updated: storageInfo.last_updated
      },
      recent_memories: memories.slice(0, 5).map(m => ({
        id: m.id,
        content: m.content.substring(0, 100) + '...',
        category: m.category,
        importance: m.importance,
        created_at: m.created_at
      })),
      recommendations: [
        stats.total === 0 ? '建议添加更多记忆数据' : null,
        (stats.by_type?.long_term || 0) < 3 ? '建议标记更多重要记忆为长期记忆' : null,
        stats.recent_7days === 0 ? '最近7天没有新增记忆' : null
      ].filter(Boolean),
      generated_at: new Date().toISOString()
    };
    
    res.json({
      success: true,
      report: report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('生成统计报告失败:', error);
    res.status(500).json({
      success: false,
      error: '生成统计报告失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;