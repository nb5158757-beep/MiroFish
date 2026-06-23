/**
 * JSON文件存储工具
 * 用于替代SQLite数据库，避免编译依赖问题
 */

const fs = require('fs');
const path = require('path');

class JSONStorage {
  constructor(filePath = 'data/memories.json') {
    this.filePath = path.join(__dirname, '..', '..', filePath);
    this.ensureFileExists();
    this.data = this.loadData();
  }

  /**
   * 确保文件存在
   */
  ensureFileExists() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!fs.existsSync(this.filePath)) {
      const initialData = {
        memories: [],
        config: {
          system_version: '0.1.0',
          memory_retention_days: 30,
          embedding_model: 'zhipu-embedding-2',
          search_threshold: 0.7,
          auto_cleanup_enabled: true,
          created_at: new Date().toISOString()
        },
        stats: {
          total_memories: 0,
          by_type: { short_term: 0, medium_term: 0, long_term: 0 },
          last_updated: new Date().toISOString()
        }
      };
      this.saveData(initialData);
    }
  }

  /**
   * 加载数据
   */
  loadData() {
    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('加载JSON数据失败:', error.message);
      return { memories: [], config: {}, stats: {} };
    }
  }

  /**
   * 保存数据
   */
  saveData(data) {
    try {
      const content = JSON.stringify(data, null, 2);
      fs.writeFileSync(this.filePath, content, 'utf8');
      this.data = data;
      return true;
    } catch (error) {
      console.error('保存JSON数据失败:', error.message);
      return false;
    }
  }

  /**
   * 获取所有记忆
   */
  getAllMemories(options = {}) {
    let memories = [...this.data.memories];
    
    // 应用过滤
    if (options.category) {
      memories = memories.filter(m => m.category === options.category);
    }
    
    if (options.memory_type) {
      memories = memories.filter(m => m.memory_type === options.memory_type);
    }
    
    if (options.min_importance) {
      memories = memories.filter(m => m.importance >= options.min_importance);
    }

    // 应用排序
    const sortBy = options.sort_by || 'created_at';
    const sortOrder = options.sort_order || 'DESC';
    
    memories.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // 处理日期字符串
      if (sortBy.includes('_at')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (sortOrder.toUpperCase() === 'ASC') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // 应用分页
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    
    return {
      data: memories.slice(offset, offset + limit),
      total: memories.length,
      limit,
      offset
    };
  }

  /**
   * 获取单个记忆
   */
  getMemoryById(id) {
    const memory = this.data.memories.find(m => m.id === id);
    if (memory) {
      // 更新访问统计
      memory.access_count = (memory.access_count || 0) + 1;
      memory.last_accessed_at = new Date().toISOString();
      this.saveData(this.data);
    }
    return memory;
  }

  /**
   * 创建新记忆
   */
  createMemory(memoryData) {
    const newMemory = {
      id: this.data.memories.length > 0 
        ? Math.max(...this.data.memories.map(m => m.id)) + 1 
        : 1,
      ...memoryData,
      access_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString()
    };

    // 设置默认值
    if (!newMemory.category) newMemory.category = '未分类';
    if (!newMemory.tags) newMemory.tags = '';
    if (!newMemory.importance) newMemory.importance = 5;
    if (!newMemory.memory_type) newMemory.memory_type = 'short_term';

    this.data.memories.push(newMemory);
    this.updateStats();
    
    if (this.saveData(this.data)) {
      return newMemory;
    }
    return null;
  }

  /**
   * 更新记忆
   */
  updateMemory(id, updateData) {
    const index = this.data.memories.findIndex(m => m.id === id);
    if (index === -1) return null;

    const updatedMemory = {
      ...this.data.memories[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };

    this.data.memories[index] = updatedMemory;
    
    if (this.saveData(this.data)) {
      return updatedMemory;
    }
    return null;
  }

  /**
   * 删除记忆
   */
  deleteMemory(id) {
    const initialLength = this.data.memories.length;
    this.data.memories = this.data.memories.filter(m => m.id !== id);
    
    if (this.data.memories.length < initialLength) {
      this.updateStats();
      return this.saveData(this.data);
    }
    return false;
  }

  /**
   * 搜索记忆
   */
  searchMemories(query, options = {}) {
    if (!query || query.trim() === '') {
      return this.getAllMemories(options);
    }

    const searchTerm = query.toLowerCase();
    let memories = this.data.memories.filter(memory => {
      // 搜索内容
      if (memory.content && memory.content.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // 搜索分类
      if (memory.category && memory.category.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // 搜索标签
      if (memory.tags && memory.tags.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      return false;
    });

    // 应用过滤
    if (options.category) {
      memories = memories.filter(m => m.category === options.category);
    }
    
    if (options.memory_type) {
      memories = memories.filter(m => m.memory_type === options.memory_type);
    }

    // 计算相关性分数
    memories = memories.map(memory => {
      let relevance = 0;
      
      // 内容匹配度
      if (memory.content && memory.content.toLowerCase().includes(searchTerm)) {
        const matches = (memory.content.toLowerCase().match(new RegExp(searchTerm, 'g')) || []).length;
        relevance += matches * 10;
      }
      
      // 分类完全匹配
      if (memory.category && memory.category.toLowerCase() === searchTerm) {
        relevance += 20;
      }
      
      // 标签匹配
      if (memory.tags && memory.tags.toLowerCase().includes(searchTerm)) {
        relevance += 5;
      }
      
      // 重要性加成
      relevance += memory.importance || 0;
      
      return {
        ...memory,
        relevance
      };
    });

    // 按相关性排序
    memories.sort((a, b) => b.relevance - a.relevance);

    // 应用分页
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    
    return {
      data: memories.slice(offset, offset + limit),
      total: memories.length,
      limit,
      offset,
      query
    };
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const memories = this.data.memories;
    
    const stats = {
      total: memories.length,
      by_type: {
        short_term: memories.filter(m => m.memory_type === 'short_term').length,
        medium_term: memories.filter(m => m.memory_type === 'medium_term').length,
        long_term: memories.filter(m => m.memory_type === 'long_term').length
      },
      by_category: {},
      importance_distribution: {},
      recent_7days: memories.filter(m => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return new Date(m.created_at) > sevenDaysAgo;
      }).length,
      avg_importance: memories.length > 0 
        ? memories.reduce((sum, m) => sum + (m.importance || 0), 0) / memories.length 
        : 0,
      total_access: memories.reduce((sum, m) => sum + (m.access_count || 0), 0)
    };

    // 计算分类分布
    memories.forEach(memory => {
      const category = memory.category || '未分类';
      stats.by_category[category] = (stats.by_category[category] || 0) + 1;
    });

    // 计算重要性分布
    memories.forEach(memory => {
      const importance = memory.importance || 0;
      stats.importance_distribution[importance] = (stats.importance_distribution[importance] || 0) + 1;
    });

    return stats;
  }

  /**
   * 清理旧记忆
   */
  cleanupOldMemories(options = {}) {
    const {
      max_age_days = 30,
      min_importance = 2,
      memory_type = 'short_term'
    } = options;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - max_age_days);

    const initialCount = this.data.memories.length;
    
    this.data.memories = this.data.memories.filter(memory => {
      // 跳过不符合类型的记忆
      if (memory.memory_type !== memory_type) return true;
      
      // 跳过重要性高的记忆
      if (memory.importance >= min_importance) return true;
      
      // 检查创建时间
      const createdDate = new Date(memory.created_at);
      return createdDate > cutoffDate;
    });

    const cleanedCount = initialCount - this.data.memories.length;
    
    if (cleanedCount > 0) {
      this.updateStats();
      this.saveData(this.data);
    }

    return cleanedCount;
  }

  /**
   * 批量导入记忆
   */
  importMemories(memories) {
    if (!Array.isArray(memories) || memories.length === 0) {
      return 0;
    }

    let imported = 0;
    const nextId = this.data.memories.length > 0 
      ? Math.max(...this.data.memories.map(m => m.id)) + 1 
      : 1;

    memories.forEach((memory, index) => {
      if (!memory.content || memory.content.trim() === '') {
        console.warn(`跳过第 ${index + 1} 条记忆：内容为空`);
        return;
      }

      const newMemory = {
        id: nextId + imported,
        content: memory.content,
        category: memory.category || '未分类',
        tags: memory.tags || '',
        importance: memory.importance || 5,
        memory_type: memory.memory_type || 'short_term',
        access_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString()
      };

      this.data.memories.push(newMemory);
      imported++;
    });

    if (imported > 0) {
      this.updateStats();
      this.saveData(this.data);
    }

    return imported;
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    this.data.stats = {
      total_memories: this.data.memories.length,
      by_type: {
        short_term: this.data.memories.filter(m => m.memory_type === 'short_term').length,
        medium_term: this.data.memories.filter(m => m.memory_type === 'medium_term').length,
        long_term: this.data.memories.filter(m => m.memory_type === 'long_term').length
      },
      last_updated: new Date().toISOString()
    };
  }

  /**
   * 获取系统配置
   */
  getConfig() {
    return this.data.config;
  }

  /**
   * 更新系统配置
   */
  updateConfig(key, value, description = '') {
    if (!this.data.config) {
      this.data.config = {};
    }
    
    this.data.config[key] = value;
    if (description) {
      // 如果有描述信息，可以存储在单独的配置描述对象中
      if (!this.data.config_descriptions) {
        this.data.config_descriptions = {};
      }
      this.data.config_descriptions[key] = description;
    }
    
    return this.saveData(this.data);
  }

  /**
   * 备份数据
   */
  backup(backupPath = 'data/backup') {
    try {
      const backupDir = path.join(__dirname, '..', '..', backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `memories-backup-${timestamp}.json`);
      
      const backupData = {
        ...this.data,
        backup_info: {
          backed_up_at: new Date().toISOString(),
          total_memories: this.data.memories.length,
          version: this.data.config.system_version || '0.1.0'
        }
      };
      
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
      return backupFile;
    } catch (error) {
      console.error('备份失败:', error.message);
      return null;
    }
  }
}

// 导出单例实例
module.exports = new JSONStorage();