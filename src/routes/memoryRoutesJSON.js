/**
 * 记忆管理路由（JSON存储版本）
 * 处理记忆的CRUD操作API - 使用JSON文件存储
 */

const express = require('express');
const router = express.Router();
const MemoryModel = require('../models/MemoryModelJSON');

/**
 * @swagger
 * tags:
 *   name: Memories (JSON)
 *   description: 记忆管理API - JSON存储版本
 */

/**
 * @swagger
 * /api/v1/memories:
 *   get:
 *     summary: 获取记忆列表（JSON存储）
 *     tags: [Memories (JSON)]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 每页数量
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 偏移量
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 分类过滤
 *       - in: query
 *         name: memory_type
 *         schema:
 *           type: string
 *           enum: [short_term, medium_term, long_term]
 *         description: 记忆类型过滤
 *       - in: query
 *         name: min_importance
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 10
 *         description: 最小重要性
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [id, created_at, updated_at, last_accessed_at, importance, access_count]
 *           default: created_at
 *         description: 排序字段
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: 排序顺序
 *     responses:
 *       200:
 *         description: 记忆列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Memory'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       500:
 *         description: 服务器错误
 */
router.get('/', async (req, res) => {
  try {
    const {
      limit = 50,
      offset = 0,
      category,
      memory_type,
      min_importance,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      category: category || null,
      memory_type: memory_type || null,
      min_importance: min_importance ? parseInt(min_importance) : 0,
      sort_by,
      sort_order
    };

    const memories = await MemoryModel.getMemories(options);
    
    res.json({
      success: true,
      data: memories,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: memories.length
      },
      storage: 'JSON文件存储',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取记忆列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取记忆列表失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/memories/{id}:
 *   get:
 *     summary: 获取单个记忆（JSON存储）
 *     tags: [Memories (JSON)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 记忆ID
 *     responses:
 *       200:
 *         description: 记忆详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Memory'
 *       404:
 *         description: 记忆不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: '无效的记忆ID',
        message: '记忆ID必须是正整数',
        timestamp: new Date().toISOString()
      });
    }

    const memory = await MemoryModel.getMemoryById(id);
    
    res.json({
      success: true,
      data: memory,
      storage: 'JSON文件存储',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`获取记忆 ${req.params.id} 失败:`, error);
    
    if (error.message.includes('不存在')) {
      res.status(404).json({
        success: false,
        error: '记忆不存在',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: '获取记忆失败',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * @swagger
 * /api/v1/memories:
 *   post:
 *     summary: 创建新记忆（JSON存储）
 *     tags: [Memories (JSON)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: 记忆内容
 *               category:
 *                 type: string
 *                 description: 分类
 *                 default: 未分类
 *               tags:
 *                 type: string
 *                 description: 标签（逗号分隔）
 *               importance:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *                 default: 5
 *                 description: 重要性评分
 *               memory_type:
 *                 type: string
 *                 enum: [short_term, medium_term, long_term]
 *                 default: short_term
 *                 description: 记忆类型
 *     responses:
 *       201:
 *         description: 记忆创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Memory'
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/', async (req, res) => {
  try {
    const memoryData = req.body;

    // 验证必要字段
    if (!memoryData.content || memoryData.content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: '内容不能为空',
        message: '记忆内容(content)是必填字段',
        timestamp: new Date().toISOString()
      });
    }

    // 验证重要性评分范围
    if (memoryData.importance !== undefined) {
      const importance = parseInt(memoryData.importance);
      if (isNaN(importance) || importance < 0 || importance > 10) {
        return res.status(400).json({
          success: false,
          error: '重要性评分无效',
          message: '重要性评分必须在0-10之间',
          timestamp: new Date().toISOString()
        });
      }
      memoryData.importance = importance;
    }

    // 验证记忆类型
    const validMemoryTypes = ['short_term', 'medium_term', 'long_term'];
    if (memoryData.memory_type && !validMemoryTypes.includes(memoryData.memory_type)) {
      return res.status(400).json({
        success: false,
        error: '记忆类型无效',
        message: `记忆类型必须是: ${validMemoryTypes.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    const newMemory = await MemoryModel.createMemory(memoryData);
    
    res.status(201).json({
      success: true,
      message: '记忆创建成功',
      data: newMemory,
      storage: 'JSON文件存储',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('创建记忆失败:', error);
    res.status(500).json({
      success: false,
      error: '创建记忆失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/memories/{id}:
 *   put:
 *     summary: 更新记忆（JSON存储）
 *     tags: [Memories (JSON)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 记忆ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: 记忆内容
 *               category:
 *                 type: string
 *                 description: 分类
 *               tags:
 *                 type: string
 *                 description: 标签（逗号分隔）
 *               importance:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *                 description: 重要性评分
 *               memory_type:
 *                 type: string
 *                 enum: [short_term, medium_term, long_term]
 *                 description: 记忆类型
 *     responses:
 *       200:
 *         description: 记忆更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Memory'
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: 记忆不存在
 *       500:
 *         description: 服务器错误
 */
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updateData = req.body;

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: '无效的记忆ID',
        message: '记忆ID必须是正整数',
        timestamp: new Date().toISOString()
      });
    }

    // 验证更新数据
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: '更新数据为空',
        message: '至少提供一个更新字段',
        timestamp: new Date().toISOString()
      });
    }

    // 验证重要性评分范围
    if (updateData.importance !== undefined) {
      const importance = parseInt(updateData.importance);
      if (isNaN(importance) || importance < 0 || importance > 10) {
        return res.status(400).json({
          success: false,
          error: '重要性评分无效',
          message: '重要性评分必须在0-10之间',
          timestamp: new Date().toISOString()
        });
      }
      updateData.importance = importance;
    }

    // 验证记忆类型
    const validMemoryTypes = ['short_term', 'medium_term', 'long_term'];
    if (updateData.memory_type && !validMemoryTypes.includes(updateData.memory_type)) {
      return res.status(400).json({
        success: false,
        error: '记忆类型无效',
        message: `记忆类型必须是: ${validMemoryTypes.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    const updatedMemory = await MemoryModel.updateMemory(id, updateData);
    
    res.json({
      success: true,
      message: '记忆更新成功',
      data: updatedMemory,
      storage: 'JSON文件存储',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`更新记忆 ${req.params.id} 失败:`, error);
    
    if (error.message.includes('不存在')) {
      res.status(404).json({
        success: false,
        error: '更新失败',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: '更新记忆失败',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * @swagger
 * /api/v1/memories/{id}:
 *   delete:
 *     summary: 删除记忆（JSON存储）
 *     tags: [Memories (JSON)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 记忆ID
 *     responses:
 *       200:
 *         description: 记忆删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: 记忆不存在
 *       500:
 *         description: 服务器错误
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: '无效的记忆ID',
        message: '记忆ID必须是正整数',
        timestamp: new Date().toISOString()
      });
    }

    const deleted = await MemoryModel.deleteMemory(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '记忆不存在',
        message: `记忆ID ${id} 不存在`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: '记忆删除成功',
      storage: 'JSON文件存储',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`删除记忆 ${req.params.id} 失败:`, error);
    res.status(500).json({
      success: false,
      error: '删除记忆失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/v1/memories/search:
 *   get:
 *     summary: 搜索记忆（JSON存储）
 *     tags: [Memories (JSON)]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 偏移量
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 分类过滤
 *       - in: query
 *         name: memory_type
 *         schema:
 *           type: string
 *           enum: [short_term, medium_term, long_term]
 *         description: 记忆类型过滤
 *     responses:
 *       200:
 *         description: 搜索结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Memory'
 *                 query:
 *                   type: object
 *                   properties:
 *                     q:
 *                       type: string
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       400:
 *         description: 搜索参数错误
 *       500:
 *         description: 服务器错误
 */
router.get('/search', async (req, res) => {
  try {
    const {
      q = '',
      limit = 20,
      offset = 0,
      category,
      memory_type
    } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      category: category || null,
      memory_type: memory_type || null
    };

    const results = await MemoryModel.searchMemories(q, options);
    
    res.json({
      success: true,
      data: results,
      query: {
        q,
        limit: options.limit,
        offset: options.offset,
        category: options.category,
        memory_type: options.memory_type
      },
      storage: 'JSON文件存储',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('搜索记忆失败:', error);
    res.status(500).json({
      success: false,
      error: '搜索记忆失败',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;