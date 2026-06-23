/**
 * 嵌入模型统一接口
 * 支持多种AI服务提供商
 */

const ZhipuEmbedding = require('./zhipu');
// 可以添加其他提供商：OpenAI、本地模型等

class EmbeddingManager {
  /**
   * 创建嵌入管理器
   * @param {Object} config 配置
   */
  constructor(config = {}) {
    this.config = config;
    this.provider = null;
    this.cache = new Map(); // 简单的内存缓存
    this.cacheSize = config.cacheSize || 1000; // 缓存条目数
    this.cacheTTL = config.cacheTTL || 3600000; // 缓存有效期（1小时）
    
    this._initProvider();
  }
  
  /**
   * 初始化嵌入提供商
   * @private
   */
  _initProvider() {
    const { provider = 'zhipu', ...providerConfig } = this.config;
    
    switch (provider.toLowerCase()) {
      case 'zhipu':
        this.provider = new ZhipuEmbedding(providerConfig);
        console.log(`[EmbeddingManager] 使用智谱AI嵌入模型`);
        break;
        
      // 可以扩展其他提供商
      // case 'openai':
      //   this.provider = new OpenAIEmbedding(providerConfig);
      //   break;
      //   
      // case 'local':
      //   this.provider = new LocalEmbedding(providerConfig);
      //   break;
        
      default:
        throw new Error(`不支持的嵌入提供商: ${provider}`);
    }
  }
  
  /**
   * 生成缓存键
   * @private
   */
  _getCacheKey(text) {
    return `embedding:${Buffer.from(text).toString('base64')}`;
  }
  
  /**
   * 获取嵌入向量（带缓存）
   * @param {string} text 输入文本
   * @param {boolean} [useCache=true] 是否使用缓存
   * @returns {Promise<number[]>} 嵌入向量
   */
  async getEmbedding(text, useCache = true) {
    if (!text || typeof text !== 'string') {
      throw new Error('输入文本必须是非空字符串');
    }
    
    // 检查缓存
    if (useCache) {
      const cacheKey = this._getCacheKey(text);
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        console.log(`[EmbeddingManager] 使用缓存嵌入，文本长度: ${text.length}`);
        return cached.embedding;
      }
    }
    
    // 调用提供商API
    console.log(`[EmbeddingManager] 生成新嵌入，文本: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    const embedding = await this.provider.embed(text);
    
    // 更新缓存
    if (useCache) {
      const cacheKey = this._getCacheKey(text);
      this.cache.set(cacheKey, {
        embedding,
        timestamp: Date.now()
      });
      
      // 限制缓存大小
      if (this.cache.size > this.cacheSize) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
    }
    
    return embedding;
  }
  
  /**
   * 批量获取嵌入向量
   * @param {string[]} texts 文本数组
   * @returns {Promise<number[][]>} 嵌入向量数组
   */
  async getEmbeddings(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('输入必须是非空数组');
    }
    
    console.log(`[EmbeddingManager] 批量生成嵌入，数量: ${texts.length}`);
    return await this.provider.embed(texts);
  }
  
  /**
   * 计算文本相似度
   * @param {string} text1 文本1
   * @param {string} text2 文本2
   * @returns {Promise<number>} 相似度分数（0-1）
   */
  async similarity(text1, text2) {
    const [embedding1, embedding2] = await Promise.all([
      this.getEmbedding(text1),
      this.getEmbedding(text2)
    ]);
    
    return this._cosineSimilarity(embedding1, embedding2);
  }
  
  /**
   * 计算余弦相似度
   * @private
   */
  _cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('向量维度不一致');
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }
    
    return dotProduct / (norm1 * norm2);
  }
  
  /**
   * 测试连接
   * @returns {Promise<boolean>} 是否连接成功
   */
  async testConnection() {
    try {
      return await this.provider.testConnection();
    } catch (error) {
      console.error('[EmbeddingManager] 连接测试失败:', error.message);
      return false;
    }
  }
  
  /**
   * 获取提供商信息
   * @returns {Object} 提供商信息
   */
  getProviderInfo() {
    return this.provider.getModelInfo();
  }
  
  /**
   * 清空缓存
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[EmbeddingManager] 已清空缓存，清理了 ${size} 个条目`);
  }
  
  /**
   * 获取缓存统计
   * @returns {Object} 缓存统计信息
   */
  getCacheStats() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        expiredCount++;
      }
    }
    
    return {
      total: this.cache.size,
      expired: expiredCount,
      hitRate: 'N/A', // 需要记录命中率
      maxSize: this.cacheSize,
      ttl: this.cacheTTL
    };
  }
}

module.exports = EmbeddingManager;