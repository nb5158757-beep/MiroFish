/**
 * 搜索API路由（JSON存储版本）
 */

const express = require('express');
const router = express.Router();
const MemoryModel = require('../models/MemoryModelJSON');

// 语义搜索端点（简化版，实际需要集成AI）
router.get('/semantic', async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '搜索查询不能为空',
        message: '请提供搜索关键词(q参数)',
        timestamp: new Date().toISOString()
      });
    }

    // 使用关键词搜索作为语义搜索的简化版本
    const results = await MemoryModel.searchMemories(q, { limit: parseInt(limit) });
    
    res.json({
      success: true,
      query: q,
      results: results,
      count: results.length,
      note: '此为关键词搜索，语义搜索需要集成AI模型',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('语义搜索失败:', error);
    res.status(500).json({
      success: false,
      error: '搜索失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 相关记忆端点
router.get('/related/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { limit = 5 } = req.query;
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: '无效的记忆ID',
        message: '记忆ID必须是正整数',
        timestamp: new Date().toISOString()
      });
    }

    // 获取目标记忆
    const targetMemory = await MemoryModel.getMemoryById(id);
    
    if (!targetMemory) {
      return res.status(404).json({
        success: false,
        error: '记忆不存在',
        message: `记忆ID ${id} 不存在`,
        timestamp: new Date().toISOString()
      });
    }

    // 简化版相关记忆：同分类的记忆
    const relatedMemories = await MemoryModel.searchMemories(targetMemory.category || '', { 
      limit: parseInt(limit) + 1 // 多取一个，然后过滤掉自己
    });
    
    // 过滤掉自己
    const filteredResults = relatedMemories.filter(memory => memory.id !== id).slice(0, parseInt(limit));
    
    res.json({
      success: true,
      target_memory: {
        id: targetMemory.id,
        content: targetMemory.content.substring(0, 100) + '...',
        category: targetMemory.category
      },
      related_memories: filteredResults,
      relation_type: '同分类记忆',
      count: filteredResults.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`获取相关记忆 ${req.params.id} 失败:`, error);
    res.status(500).json({
      success: false,
      error: '获取相关记忆失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;