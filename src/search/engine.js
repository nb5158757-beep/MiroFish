/**
 * 智能搜索引擎
 * 基于向量相似度的语义搜索
 */

const sqlite3 = require('sqlite3').verbose();

class SearchEngine {
  /**
   * 创建搜索引擎
   * @param {Object} config 配置
   * @param {Object} embeddingManager 嵌入管理器
   */
  constructor(config = {}, embeddingManager = null) {
    this.config = {
      dbPath: config.dbPath || './data/memflow.db',
      maxResults: config.maxResults || 10,
      similarityThreshold: config.similarityThreshold || 0.7,
      searchMode: config.searchMode || 'hybrid', // semantic, keyword, hybrid
      weights: config.weights || { semantic: 0.7, keyword: 0.3 },
      ...config
    };
    
    this.embeddingManager = embeddingManager;
    this.db = null;
    
    console.log(`[SearchEngine] 初始化完成`);
    console.log(`   - 搜索模式: ${this.config.searchMode}`);
    console.log(`   - 最大结果: ${this.config.maxResults}`);
    console.log(`   - 相似度阈值: ${this.config.similarityThreshold}`);
  }
  
  /**
   * 初始化数据库连接
   */
  async init() {
    if (this.db) {
      return; // 已初始化
    }
    
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.config.dbPath, (err) => {
        if (err) {
          console.error('[SearchEngine] 数据库连接失败:', err.message);
          reject(err);
          return;
        }
        
        console.log('[SearchEngine] 数据库连接成功');
        
        // 启用扩展（如果可用）
        this.db.get('SELECT sqlite_version() as version', (err, row) => {
          if (err) {
            console.warn('[SearchEngine] 无法获取SQLite版本');
          } else {
            console.log(`[SearchEngine] SQLite版本: ${row.version}`);
          }
          resolve();
        });
      });
    });
  }
  
  /**
   * 设置嵌入管理器
   */
  setEmbeddingManager(embeddingManager) {
    this.embeddingManager = embeddingManager;
    console.log('[SearchEngine] 嵌入管理器已设置');
  }
  
  /**
   * 语义搜索（基于向量相似度）
   * @param {string} query 查询文本
   * @param {Object} options 搜索选项
   */
  async semanticSearch(query, options = {}) {
    if (!this.embeddingManager) {
      throw new Error('嵌入管理器未设置，无法进行语义搜索');
    }
    
    await this.init();
    
    const startTime = Date.now();
    console.log(`[SearchEngine] 语义搜索: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);
    
    try {
      // 1. 生成查询嵌入
      const queryEmbedding = await this.embeddingManager.getEmbedding(query);
      console.log(`[SearchEngine] 查询嵌入生成完成，维度: ${queryEmbedding.length}`);
      
      // 2. 从数据库获取所有嵌入（对于小数据集）
      // 注意：对于大数据集，应该使用向量数据库或近似最近邻搜索
      const chunks = await this._getAllChunksWithEmbeddings();
      
      if (chunks.length === 0) {
        console.log('[SearchEngine] 警告: 数据库中没有嵌入向量');
        return {
          results: [],
          query,
          mode: 'semantic',
          warning: '没有可用的嵌入向量，请先运行嵌入生成'
        };
      }
      
      // 3. 计算相似度
      console.log(`[SearchEngine] 计算 ${chunks.length} 个块的相似度...`);
      const results = [];
      
      for (const chunk of chunks) {
        if (!chunk.embedding || !chunk.embedding.length) {
          continue; // 跳过没有嵌入的块
        }
        
        const similarity = this._cosineSimilarity(queryEmbedding, chunk.embedding);
        
        if (similarity >= this.config.similarityThreshold) {
          results.push({
            ...chunk,
            similarity,
            score: similarity // 语义搜索的分数就是相似度
          });
        }
      }
      
      // 4. 按相似度排序
      results.sort((a, b) => b.similarity - a.similarity);
      
      // 5. 限制结果数量
      const limitedResults = results.slice(0, this.config.maxResults);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`[SearchEngine] 语义搜索完成，找到 ${limitedResults.length} 个结果，耗时 ${duration}ms`);
      
      return {
        results: limitedResults,
        query,
        mode: 'semantic',
        totalMatches: results.length,
        duration,
        stats: {
          chunksProcessed: chunks.length,
          chunksWithEmbeddings: chunks.filter(c => c.embedding && c.embedding.length).length,
          aboveThreshold: limitedResults.length
        }
      };
      
    } catch (error) {
      console.error('[SearchEngine] 语义搜索失败:', error.message);
      throw error;
    }
  }
  
  /**
   * 关键词搜索（传统文本搜索）
   */
  async keywordSearch(query, options = {}) {
    await this.init();
    
    const startTime = Date.now();
    console.log(`[SearchEngine] 关键词搜索: "${query}"`);
    
    try {
      // 使用SQLite的全文搜索或LIKE查询
      const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
      
      if (searchTerms.length === 0) {
        return {
          results: [],
          query,
          mode: 'keyword',
          warning: '查询词太短'
        };
      }
      
      // 构建查询条件
      const conditions = searchTerms.map(term => `LOWER(content) LIKE '%${term}%'`);
      const whereClause = conditions.join(' OR ');
      
      const querySql = `
        SELECT c.id, c.content, c.chunk_index, 
               f.filename, f.filepath,
               LENGTH(c.content) as content_length,
               1.0 as relevance  -- 简单实现，实际应该计算TF-IDF
        FROM memory_chunks c
        JOIN memory_files f ON c.file_id = f.id
        WHERE ${whereClause}
        ORDER BY content_length DESC
        LIMIT ?
      `;
      
      const results = await new Promise((resolve, reject) => {
        this.db.all(querySql, [this.config.maxResults], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      // 计算简单分数（基于匹配词数量）
      const scoredResults = results.map(result => {
        let score = 0;
        for (const term of searchTerms) {
          const matches = (result.content.toLowerCase().match(new RegExp(term, 'g')) || []).length;
          score += matches;
        }
        return {
          ...result,
          score: score / searchTerms.length, // 归一化分数
          matchType: 'keyword'
        };
      });
      
      // 按分数排序
      scoredResults.sort((a, b) => b.score - a.score);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`[SearchEngine] 关键词搜索完成，找到 ${scoredResults.length} 个结果，耗时 ${duration}ms`);
      
      return {
        results: scoredResults,
        query,
        mode: 'keyword',
        searchTerms,
        duration
      };
      
    } catch (error) {
      console.error('[SearchEngine] 关键词搜索失败:', error.message);
      
      // 回退到简单LIKE查询
      return await this._fallbackKeywordSearch(query);
    }
  }
  
  /**
   * 回退关键词搜索（简单实现）
   * @private
   */
  async _fallbackKeywordSearch(query) {
    const searchTerm = query.toLowerCase();
    
    const querySql = `
      SELECT c.id, c.content, c.chunk_index, 
             f.filename, f.filepath,
             LENGTH(c.content) as content_length
      FROM memory_chunks c
      JOIN memory_files f ON c.file_id = f.id
      WHERE LOWER(c.content) LIKE ?
      LIMIT ?
    `;
    
    const results = await new Promise((resolve, reject) => {
      this.db.all(querySql, [`%${searchTerm}%`, this.config.maxResults], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    return {
      results: results.map(r => ({ ...r, score: 1.0, matchType: 'fallback' })),
      query,
      mode: 'keyword_fallback',
      warning: '使用了回退搜索模式'
    };
  }
  
  /**
   * 混合搜索（语义 + 关键词）
   */
  async hybridSearch(query, options = {}) {
    const startTime = Date.now();
    console.log(`[SearchEngine] 混合搜索: "${query}"`);
    
    try {
      // 并行执行两种搜索
      const [semanticResults, keywordResults] = await Promise.allSettled([
        this.semanticSearch(query, options),
        this.keywordSearch(query, options)
      ]);
      
      const semantic = semanticResults.status === 'fulfilled' ? semanticResults.value : { results: [] };
      const keyword = keywordResults.status === 'fulfilled' ? keywordResults.value : { results: [] };
      
      // 合并结果
      const allResults = new Map(); // 使用Map避免重复（基于chunk id）
      
      // 添加语义搜索结果
      semantic.results.forEach(result => {
        const key = `chunk_${result.id}`;
        allResults.set(key, {
          ...result,
          semanticScore: result.score || result.similarity || 0,
          keywordScore: 0,
          combinedScore: (result.score || result.similarity || 0) * this.config.weights.semantic
        });
      });
      
      // 添加关键词搜索结果
      keyword.results.forEach(result => {
        const key = `chunk_${result.id}`;
        if (allResults.has(key)) {
          // 更新现有结果
          const existing = allResults.get(key);
          existing.keywordScore = result.score || 0;
          existing.combinedScore = 
            existing.semanticScore * this.config.weights.semantic +
            existing.keywordScore * this.config.weights.keyword;
        } else {
          // 添加新结果
          allResults.set(key, {
            ...result,
            semanticScore: 0,
            keywordScore: result.score || 0,
            combinedScore: (result.score || 0) * this.config.weights.keyword
          });
        }
      });
      
      // 转换为数组并排序
      const combinedResults = Array.from(allResults.values())
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, this.config.maxResults);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`[SearchEngine] 混合搜索完成，找到 ${combinedResults.length} 个结果，耗时 ${duration}ms`);
      
      return {
        results: combinedResults,
        query,
        mode: 'hybrid',
        semanticStats: semantic.stats,
        keywordStats: keyword.searchTerms,
        duration,
        breakdown: {
          semantic: semantic.results.length,
          keyword: keyword.results.length,
          combined: combinedResults.length
        }
      };
      
    } catch (error) {
      console.error('[SearchEngine] 混合搜索失败:', error.message);
      throw error;
    }
  }
  
  /**
   * 通用搜索接口
   */
  async search(query, options = {}) {
    const mode = options.mode || this.config.searchMode;
    
    switch (mode.toLowerCase()) {
      case 'semantic':
        return await this.semanticSearch(query, options);
      case 'keyword':
        return await this.keywordSearch(query, options);
      case 'hybrid':
        return await this.hybridSearch(query, options);
      default:
        throw new Error(`不支持的搜索模式: ${mode}`);
    }
  }
  
  /**
   * 获取所有块及其嵌入
   * @private
   */
  async _getAllChunksWithEmbeddings() {
    const querySql = `
      SELECT c.id, c.content, c.chunk_index, c.content_hash,
             f.filename, f.filepath,
             e.embedding, e.provider, e.model, e.dimensions
      FROM memory_chunks c
      JOIN memory_files f ON c.file_id = f.id
      LEFT JOIN memory_embeddings e ON c.id = e.chunk_id
      WHERE e.embedding IS NOT NULL
      ORDER BY c.id
    `;
    
    return new Promise((resolve, reject) => {
      this.db.all(querySql, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        // 解析嵌入向量（BLOB → 数组）
        const chunks = rows.map(row => {
          let embedding = null;
          if (row.embedding) {
            try {
              // 假设嵌入存储为JSON字符串或二进制
              if (row.embedding instanceof Buffer) {
                embedding = JSON.parse(row.embedding.toString());
              } else if (typeof row.embedding === 'string') {
                embedding = JSON.parse(row.embedding);
              }
            } catch (error) {
              console.warn(`[SearchEngine] 解析嵌入失败 chunk ${row.id}:`, error.message);
            }
          }
          
          return {
            ...row,
            embedding
          };
        });
        
        resolve(chunks);
      });
    });
  }
  
  /**
   * 计算余弦相似度
   * @private
   */
  _cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) {
      return 0;
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
   * 获取搜索统计
   */
  async getSearchStats() {
    await this.init();
    
    const queries = {
      totalChunks: 'SELECT COUNT(*) as count FROM memory_chunks',
      chunksWithEmbeddings: 'SELECT COUNT(DISTINCT chunk_id) as count FROM memory_embeddings',
      totalFiles: 'SELECT COUNT(*) as count FROM memory_files',
      processedFiles: 'SELECT COUNT(*) as count FROM memory_files WHERE status = "processed"'
    };
    
    const stats = {};
    
    for (const [key, query] of Object.entries(queries)) {
      const result = await new Promise((resolve, reject) => {
        this.db.get(query, (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });
      stats[key] = result;
    }
    
    return stats;
  }
  
  /**
   * 测试搜索功能
   */
  async testSearch(query = '记忆系统', mode = 'hybrid') {
    console.log(`[SearchEngine] 测试搜索: "${query}" (模式: ${mode})`);
    
    try {
      const result = await this.search(query, { mode });
      
      console.log(`[SearchEngine] 测试结果:`);
      console.log(`   模式: ${result.mode}`);
      console.log(`   找到结果: ${result.results.length}`);
      console.log(`   耗时: ${result.duration || 'N/A'}ms`);
      
      if (result.results.length > 0) {
        console.log(`   前3个结果:`);
        result.results.slice(0, 3).forEach((r, i) => {
          console.log(`     ${i + 1}. ${r.filename} [相似度: ${(r.similarity || r.score || 0).toFixed(3)}]`);
          console.log(`        预览: ${r.content.substring(0, 80)}...`);
        });
      }
      
      return result;
      
    } catch (error) {
      console.error('[SearchEngine] 测试搜索失败:', error.message);
      return { error: error.message };
    }
  }
  
  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('[SearchEngine] 关闭数据库失败:', err.message);
        } else {
          console.log('[SearchEngine] 数据库连接已关闭');
        }
      });
    }
  }
}

module.exports = SearchEngine;