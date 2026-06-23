/**
 * 记忆索引模块
 * 将OpenClaw记忆文件导入向量数据库
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class MemoryIndexer {
  /**
   * 创建记忆索引器
   * @param {Object} config 配置
   */
  constructor(config = {}) {
    this.config = {
      memoryPath: config.memoryPath || '../memory',
      dbPath: config.dbPath || './data/memflow.db',
      chunkSize: config.chunkSize || 1000,
      overlap: config.overlap || 200,
      minChunkLength: config.minChunkLength || 50,
      ...config
    };
    
    this.db = null;
    this.stats = {
      filesProcessed: 0,
      chunksCreated: 0,
      embeddingsGenerated: 0,
      errors: 0
    };
    
    console.log(`[MemoryIndexer] 初始化完成`);
    console.log(`   - 记忆路径: ${this.config.memoryPath}`);
    console.log(`   - 数据库: ${this.config.dbPath}`);
  }
  
  /**
   * 初始化数据库
   */
  async initDatabase() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.config.dbPath, (err) => {
        if (err) {
          console.error('[MemoryIndexer] 数据库连接失败:', err.message);
          reject(err);
          return;
        }
        
        console.log('[MemoryIndexer] 数据库连接成功');
        
        // 创建表
        this._createTables().then(() => {
          console.log('[MemoryIndexer] 数据库表初始化完成');
          resolve();
        }).catch(reject);
      });
    });
  }
  
  /**
   * 创建数据库表
   * @private
   */
  async _createTables() {
    const queries = [
      // 记忆文件表
      `CREATE TABLE IF NOT EXISTS memory_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        filesize INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        indexed_at TIMESTAMP,
        status TEXT DEFAULT 'pending',
        UNIQUE(filename)
      )`,
      
      // 文本块表
      `CREATE TABLE IF NOT EXISTS memory_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER NOT NULL,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        token_count INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES memory_files (id),
        UNIQUE(file_id, chunk_index)
      )`,
      
      // 嵌入向量表
      `CREATE TABLE IF NOT EXISTS memory_embeddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chunk_id INTEGER NOT NULL,
        embedding BLOB NOT NULL,
        embedding_hash TEXT NOT NULL,
        provider TEXT DEFAULT 'zhipu',
        model TEXT DEFAULT 'embedding-2',
        dimensions INTEGER DEFAULT 1024,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chunk_id) REFERENCES memory_chunks (id),
        UNIQUE(chunk_id)
      )`,
      
      // 索引表（用于快速搜索）
      `CREATE TABLE IF NOT EXISTS memory_index (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chunk_id INTEGER NOT NULL,
        file_id INTEGER NOT NULL,
        search_text TEXT,
        tags TEXT,
        importance INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chunk_id) REFERENCES memory_chunks (id),
        FOREIGN KEY (file_id) REFERENCES memory_files (id)
      )`,
      
      // 创建索引
      `CREATE INDEX IF NOT EXISTS idx_memory_files_filename ON memory_files(filename)`,
      `CREATE INDEX IF NOT EXISTS idx_memory_chunks_file_id ON memory_chunks(file_id)`,
      `CREATE INDEX IF NOT EXISTS idx_memory_embeddings_chunk_id ON memory_embeddings(chunk_id)`,
      `CREATE INDEX IF NOT EXISTS idx_memory_index_search ON memory_index(search_text)`
    ];
    
    for (const query of queries) {
      await new Promise((resolve, reject) => {
        this.db.run(query, (err) => {
          if (err) {
            console.error('[MemoryIndexer] 创建表失败:', err.message);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }
  
  /**
   * 扫描记忆文件
   * @returns {Promise<string[]>} 文件路径数组
   */
  async scanMemoryFiles() {
    const memoryDir = path.join(__dirname, '..', '..', this.config.memoryPath);
    
    return new Promise((resolve, reject) => {
      fs.readdir(memoryDir, (err, files) => {
        if (err) {
          console.error('[MemoryIndexer] 扫描目录失败:', err.message);
          reject(err);
          return;
        }
        
        // 过滤出.md文件并按日期排序
        const mdFiles = files
          .filter(file => file.endsWith('.md') && !file.includes('backup'))
          .sort() // 按文件名排序（日期顺序）
          .map(file => path.join(memoryDir, file));
        
        console.log(`[MemoryIndexer] 找到 ${mdFiles.length} 个记忆文件`);
        resolve(mdFiles);
      });
    });
  }
  
  /**
   * 处理单个记忆文件
   * @param {string} filePath 文件路径
   */
  async processFile(filePath) {
    const filename = path.basename(filePath);
    console.log(`[MemoryIndexer] 处理文件: ${filename}`);
    
    try {
      // 读取文件内容
      const content = await fs.promises.readFile(filePath, 'utf8');
      const stats = await fs.promises.stat(filePath);
      
      // 检查文件是否已处理
      const fileId = await this._getOrCreateFileRecord(filename, filePath, stats.size);
      
      if (await this._isFileProcessed(fileId)) {
        console.log(`[MemoryIndexer] 文件已处理，跳过: ${filename}`);
        return;
      }
      
      // 分块处理文本
      const chunks = this._chunkText(content, filename);
      console.log(`[MemoryIndexer] 生成 ${chunks.length} 个文本块`);
      
      // 保存文本块
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkId = await this._saveChunk(fileId, i, chunk);
        
        // 记录统计
        this.stats.chunksCreated++;
        
        // 这里可以调用嵌入生成（下一步实现）
        // await this._generateEmbedding(chunkId, chunk);
      }
      
      // 更新文件状态
      await this._updateFileStatus(fileId, 'processed');
      
      this.stats.filesProcessed++;
      console.log(`[MemoryIndexer] 文件处理完成: ${filename}`);
      
    } catch (error) {
      console.error(`[MemoryIndexer] 处理文件失败 ${filename}:`, error.message);
      this.stats.errors++;
    }
  }
  
  /**
   * 文本分块
   * @private
   */
  _chunkText(text, filename) {
    const chunks = [];
    
    // 按段落分割
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    let currentLength = 0;
    
    for (const paragraph of paragraphs) {
      const paraLength = paragraph.length;
      
      // 如果段落本身很长，需要进一步分割
      if (paraLength > this.config.chunkSize) {
        // 先保存当前块
        if (currentLength > this.config.minChunkLength) {
          chunks.push(currentChunk);
          currentChunk = '';
          currentLength = 0;
        }
        
        // 分割长段落
        const subChunks = this._splitLongParagraph(paragraph);
        chunks.push(...subChunks);
      } else {
        // 检查是否超过块大小
        if (currentLength + paraLength > this.config.chunkSize) {
          if (currentLength > this.config.minChunkLength) {
            chunks.push(currentChunk);
          }
          currentChunk = paragraph;
          currentLength = paraLength;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
          currentLength += paraLength;
        }
      }
    }
    
    // 添加最后一个块
    if (currentLength > this.config.minChunkLength) {
      chunks.push(currentChunk);
    }
    
    // 添加文件元信息到每个块
    return chunks.map((chunk, index) => {
      return `[来源: ${filename}, 块: ${index + 1}/${chunks.length}]\n${chunk}`;
    });
  }
  
  /**
   * 分割长段落
   * @private
   */
  _splitLongParagraph(paragraph) {
    const sentences = paragraph.split(/[.!?。！？]+/).filter(s => s.trim().length > 0);
    const chunks = [];
    
    let currentChunk = '';
    let currentLength = 0;
    
    for (const sentence of sentences) {
      const sentenceText = sentence.trim() + '.';
      const sentenceLength = sentenceText.length;
      
      if (currentLength + sentenceLength > this.config.chunkSize) {
        if (currentLength > this.config.minChunkLength) {
          chunks.push(currentChunk);
        }
        currentChunk = sentenceText;
        currentLength = sentenceLength;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentenceText;
        currentLength += sentenceLength;
      }
    }
    
    if (currentLength > this.config.minChunkLength) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }
  
  /**
   * 获取或创建文件记录
   * @private
   */
  async _getOrCreateFileRecord(filename, filepath, filesize) {
    return new Promise((resolve, reject) => {
      // 先查询是否已存在
      this.db.get(
        'SELECT id FROM memory_files WHERE filename = ?',
        [filename],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (row) {
            resolve(row.id);
          } else {
            // 创建新记录
            this.db.run(
              `INSERT INTO memory_files (filename, filepath, filesize, indexed_at) 
               VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
              [filename, filepath, filesize],
              function(err) {
                if (err) {
                  reject(err);
                } else {
                  resolve(this.lastID);
                }
              }
            );
          }
        }
      );
    });
  }
  
  /**
   * 检查文件是否已处理
   * @private
   */
  async _isFileProcessed(fileId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT status FROM memory_files WHERE id = ?',
        [fileId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row && row.status === 'processed');
          }
        }
      );
    });
  }
  
  /**
   * 保存文本块
   * @private
   */
  async _saveChunk(fileId, chunkIndex, content) {
    // 计算内容哈希（用于去重）
    const crypto = require('crypto');
    const contentHash = crypto.createHash('md5').update(content).digest('hex');
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO memory_chunks (file_id, chunk_index, content, content_hash, token_count)
         VALUES (?, ?, ?, ?, ?)`,
        [fileId, chunkIndex, content, contentHash, this._estimateTokenCount(content)],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }
  
  /**
   * 更新文件状态
   * @private
   */
  async _updateFileStatus(fileId, status) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE memory_files SET status = ?, indexed_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, fileId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
  
  /**
   * 估算token数量（简单估算）
   * @private
   */
  _estimateTokenCount(text) {
    // 简单估算：英文字符/4 + 中文字符/2
    const englishChars = (text.match(/[a-zA-Z0-9\s]/g) || []).length;
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    return Math.ceil(englishChars / 4 + chineseChars / 2);
  }
  
  /**
   * 获取数据库统计
   */
  async getDatabaseStats() {
    const queries = {
      files: 'SELECT COUNT(*) as count FROM memory_files',
      chunks: 'SELECT COUNT(*) as count FROM memory_chunks',
      embeddings: 'SELECT COUNT(*) as count FROM memory_embeddings',
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
   * 运行完整索引流程
   */
  async runFullIndex() {
    console.log('[MemoryIndexer] 开始完整索引流程');
    console.log('='.repeat(50));
    
    const startTime = Date.now();
    
    try {
      // 1. 初始化数据库
      await this.initDatabase();
      
      // 2. 扫描文件
      const files = await this.scanMemoryFiles();
      console.log(`[MemoryIndexer] 需要处理 ${files.length} 个文件`);
      
      // 3. 处理每个文件
      for (const filePath of files) {
        await this.processFile(filePath);
      }
      
      // 4. 获取统计信息
      const dbStats = await this.getDatabaseStats();
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log('='.repeat(50));
      console.log('[MemoryIndexer] 索引完成！');
      console.log(`   耗时: ${duration}秒`);
      console.log(`   处理文件: ${this.stats.filesProcessed}`);
      console.log(`   创建块: ${this.stats.chunksCreated}`);
      console.log(`   错误: ${this.stats.errors}`);
      console.log('');
      console.log('[MemoryIndexer] 数据库统计:');
      console.log(`   文件总数: ${dbStats.files}`);
      console.log(`   已处理文件: ${dbStats.processedFiles}`);
      console.log(`   文本块: ${dbStats.chunks}`);
      console.log(`   嵌入向量: ${dbStats.embeddings}`);
      
      return {
        success: true,
        duration,
        stats: this.stats,
        dbStats
      };
      
    } catch (error) {
      console.error('[MemoryIndexer] 索引流程失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('[MemoryIndexer] 关闭数据库失败:', err.message);
        } else {
          console.log('[MemoryIndexer] 数据库连接已关闭');
        }
      });
    }
  }
}

module.exports = MemoryIndexer;