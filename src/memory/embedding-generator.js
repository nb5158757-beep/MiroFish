/**
 * 嵌入生成模块
 * 为记忆文本块生成智谱AI嵌入向量
 */

const sqlite3 = require('sqlite3').verbose();

class EmbeddingGenerator {
  /**
   * 创建嵌入生成器
   * @param {Object} config 配置
   * @param {Object} embeddingManager 嵌入管理器
   */
  constructor(config = {}, embeddingManager = null) {
    this.config = {
      dbPath: config.dbPath || './data/memflow.db',
      batchSize: config.batchSize || 10,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };
    
    this.embeddingManager = embeddingManager;
    this.db = null;
    this.stats = {
      totalChunks: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      apiCalls: 0
    };
    
    console.log(`[EmbeddingGenerator] 初始化完成`);
    console.log(`   - 批处理大小: ${this.config.batchSize}`);
  }
  
  /**
   * 设置嵌入管理器
   */
  setEmbeddingManager(embeddingManager) {
    this.embeddingManager = embeddingManager;
    console.log('[EmbeddingGenerator] 嵌入管理器已设置');
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
          console.error('[EmbeddingGenerator] 数据库连接失败:', err.message);
          reject(err);
          return;
        }
        
        console.log('[EmbeddingGenerator] 数据库连接成功');
        resolve();
      });
    });
  }
  
  /**
   * 获取需要嵌入的文本块
   * @param {number} limit 限制数量
   */
  async getChunksNeedingEmbedding(limit = null) {
    await this.init();
    
    const limitClause = limit ? `LIMIT ${limit}` : '';
    
    const query = `
      SELECT c.id, c.content, c.content_hash, c.chunk_index,
             f.filename, f.filepath
      FROM memory_chunks c
      JOIN memory_files f ON c.file_id = f.id
      WHERE NOT EXISTS (
        SELECT 1 FROM memory_embeddings e 
        WHERE e.chunk_id = c.id
      )
      ORDER BY c.id
      ${limitClause}
    `;
    
    return new Promise((resolve, reject) => {
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log(`[EmbeddingGenerator] 找到 ${rows.length} 个需要嵌入的文本块`);
        resolve(rows);
      });
    });
  }
  
  /**
   * 批量生成嵌入
   * @param {Array} chunks 文本块数组
   */
  async generateEmbeddingsForChunks(chunks) {
    if (!this.embeddingManager) {
      throw new Error('嵌入管理器未设置');
    }
    
    if (!chunks || chunks.length === 0) {
      console.log('[EmbeddingGenerator] 没有需要处理的文本块');
      return { succeeded: 0, failed: 0 };
    }
    
    console.log(`[EmbeddingGenerator] 为 ${chunks.length} 个文本块生成嵌入...`);
    
    const results = {
      succeeded: [],
      failed: []
    };
    
    // 分批处理
    for (let i = 0; i < chunks.length; i += this.config.batchSize) {
      const batch = chunks.slice(i, i + this.config.batchSize);
      console.log(`[EmbeddingGenerator] 处理批次 ${Math.floor(i / this.config.batchSize) + 1}: ${batch.length} 个文本块`);
      
      try {
        // 提取文本内容
        const texts = batch.map(chunk => chunk.content);
        
        // 批量生成嵌入
        const embeddings = await this.embeddingManager.getEmbeddings(texts);
        this.stats.apiCalls++;
        
        // 保存嵌入
        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j];
          const embedding = embeddings[j];
          
          try {
            await this.saveEmbedding(chunk.id, embedding);
            results.succeeded.push({
              chunkId: chunk.id,
              filename: chunk.filename,
              chunkIndex: chunk.chunk_index
            });
            this.stats.succeeded++;
          } catch (error) {
            console.error(`[EmbeddingGenerator] 保存嵌入失败 chunk ${chunk.id}:`, error.message);
            results.failed.push({
              chunkId: chunk.id,
              filename: chunk.filename,
              error: error.message
            });
            this.stats.failed++;
          }
        }
        
        this.stats.processed += batch.length;
        
        // 进度报告
        const progress = ((i + batch.length) / chunks.length * 100).toFixed(1);
        console.log(`[EmbeddingGenerator] 进度: ${progress}% (${i + batch.length}/${chunks.length})`);
        
      } catch (error) {
        console.error(`[EmbeddingGenerator] 批次处理失败:`, error.message);
        
        // 批次失败，尝试逐个处理
        for (const chunk of batch) {
          try {
            const embedding = await this.embeddingManager.getEmbedding(chunk.content);
            this.stats.apiCalls++;
            
            await this.saveEmbedding(chunk.id, embedding);
            results.succeeded.push({
              chunkId: chunk.id,
              filename: chunk.filename,
              chunkIndex: chunk.chunk_index
            });
            this.stats.succeeded++;
          } catch (singleError) {
            console.error(`[EmbeddingGenerator] 单个处理失败 chunk ${chunk.id}:`, singleError.message);
            results.failed.push({
              chunkId: chunk.id,
              filename: chunk.filename,
              error: singleError.message
            });
            this.stats.failed++;
          }
          
          this.stats.processed++;
        }
      }
    }
    
    return results;
  }
  
  /**
   * 保存嵌入到数据库
   */
  async saveEmbedding(chunkId, embedding) {
    if (!Array.isArray(embedding)) {
      throw new Error('嵌入必须是数组');
    }
    
    // 计算嵌入哈希（用于去重）
    const crypto = require('crypto');
    const embeddingJson = JSON.stringify(embedding);
    const embeddingHash = crypto.createHash('md5').update(embeddingJson).digest('hex');
    
    // 获取提供商信息
    const providerInfo = this.embeddingManager.getProviderInfo();
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO memory_embeddings 
         (chunk_id, embedding, embedding_hash, provider, model, dimensions) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          chunkId,
          embeddingJson, // 存储为JSON字符串
          embeddingHash,
          providerInfo.provider,
          providerInfo.model,
          providerInfo.dimensions
        ],
        function(err) {
          if (err) {
            // 如果是唯一约束冲突，可能是重复嵌入
            if (err.message.includes('UNIQUE constraint failed')) {
              console.log(`[EmbeddingGenerator] 嵌入已存在 chunk ${chunkId}`);
              this.stats.skipped++;
              resolve(); // 不算错误
            } else {
              reject(err);
            }
          } else {
            resolve();
          }
        }
      );
    });
  }
  
  /**
   * 运行完整嵌入生成流程
   */
  async runFullGeneration() {
    console.log('[EmbeddingGenerator] 开始完整嵌入生成流程');
    console.log('='.repeat(50));
    
    const startTime = Date.now();
    
    try {
      await this.init();
      
      // 1. 获取需要嵌入的文本块
      const chunks = await this.getChunksNeedingEmbedding();
      this.stats.totalChunks = chunks.length;
      
      if (chunks.length === 0) {
        console.log('[EmbeddingGenerator] 所有文本块已有嵌入，无需处理');
        return {
          success: true,
          message: '所有文本块已有嵌入',
          stats: this.stats
        };
      }
      
      console.log(`[EmbeddingGenerator] 需要为 ${chunks.length} 个文本块生成嵌入`);
      
      // 2. 批量生成嵌入
      const results = await this.generateEmbeddingsForChunks(chunks);
      
      // 3. 统计结果
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log('='.repeat(50));
      console.log('[EmbeddingGenerator] 嵌入生成完成！');
      console.log(`   总耗时: ${duration}秒`);
      console.log(`   处理速度: ${(this.stats.processed / duration).toFixed(2)} 块/秒`);
      console.log(`   API调用: ${this.stats.apiCalls} 次`);
      console.log('');
      console.log('[EmbeddingGenerator] 生成统计:');
      console.log(`   总文本块: ${this.stats.totalChunks}`);
      console.log(`   成功: ${this.stats.succeeded}`);
      console.log(`   失败: ${this.stats.failed}`);
      console.log(`   跳过: ${this.stats.skipped}`);
      console.log(`   已处理: ${this.stats.processed}`);
      
      if (results.failed.length > 0) {
        console.log('');
        console.log('[EmbeddingGenerator] 失败详情（前5个）:');
        results.failed.slice(0, 5).forEach(fail => {
          console.log(`   - chunk ${fail.chunkId} (${fail.filename}): ${fail.error}`);
        });
      }
      
      // 4. 验证结果
      const verification = await this.verifyEmbeddings();
      console.log('');
      console.log('[EmbeddingGenerator] 验证结果:');
      console.log(`   总嵌入数: ${verification.totalEmbeddings}`);
      console.log(`   有效嵌入: ${verification.validEmbeddings}`);
      console.log(`   平均维度: ${verification.avgDimensions}`);
      
      return {
        success: this.stats.failed === 0,
        duration,
        stats: this.stats,
        results,
        verification
      };
      
    } catch (error) {
      console.error('[EmbeddingGenerator] 嵌入生成失败:', error.message);
      return {
        success: false,
        error: error.message,
        stats: this.stats
      };
    }
  }
  
  /**
   * 验证嵌入数据
   */
  async verifyEmbeddings() {
    const query = `
      SELECT COUNT(*) as total,
             SUM(CASE WHEN embedding IS NOT NULL AND LENGTH(embedding) > 10 THEN 1 ELSE 0 END) as valid,
             AVG(dimensions) as avg_dimensions
      FROM memory_embeddings
    `;
    
    return new Promise((resolve, reject) => {
      this.db.get(query, [], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve({
          totalEmbeddings: row.total,
          validEmbeddings: row.valid,
          avgDimensions: row.avg_dimensions || 0
        });
      });
    });
  }
  
  /**
   * 获取嵌入统计
   */
  async getEmbeddingStats() {
    const queries = {
      totalChunks: 'SELECT COUNT(*) as count FROM memory_chunks',
      chunksWithEmbeddings: 'SELECT COUNT(DISTINCT chunk_id) as count FROM memory_embeddings',
      totalEmbeddings: 'SELECT COUNT(*) as count FROM memory_embeddings',
      providers: 'SELECT provider, COUNT(*) as count FROM memory_embeddings GROUP BY provider',
      models: 'SELECT model, COUNT(*) as count FROM memory_embeddings GROUP BY model'
    };
    
    const stats = {};
    
    for (const [key, query] of Object.entries(queries)) {
      if (key === 'providers' || key === 'models') {
        const rows = await new Promise((resolve, reject) => {
          this.db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
        stats[key] = rows;
      } else {
        const result = await new Promise((resolve, reject) => {
          this.db.get(query, [], (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
          });
        });
        stats[key] = result;
      }
    }
    
    // 计算覆盖率
    stats.coverage = stats.totalChunks > 0 
      ? (stats.chunksWithEmbeddings / stats.totalChunks * 100).toFixed(1)
      : 0;
    
    return stats;
  }
  
  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('[EmbeddingGenerator] 关闭数据库失败:', err.message);
        } else {
          console.log('[EmbeddingGenerator] 数据库连接已关闭');
        }
      });
    }
  }
}

module.exports = EmbeddingGenerator;