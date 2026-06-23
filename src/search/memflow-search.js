#!/usr/bin/env node
/**
 * MemFlow AI 记忆搜索
 * 替代OpenClaw的memory_search，使用智谱AI嵌入
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 加载配置
const configPath = path.join(__dirname, '../../config/default.yaml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

// 嵌入管理器
const EmbeddingManager = require('../embedding/index');
// 使用智谱AI特定配置
const embeddingConfig = {
  provider: config.embedding.provider,
  ...config.embedding.zhipu,
  cacheSize: config.embedding.cache.size,
  cacheTTL: config.embedding.cache.ttl
};
const embeddingManager = new EmbeddingManager(embeddingConfig);

// 搜索索引
class MemflowSearch {
  constructor(options = {}) {
    this.options = {
      memoryDir: options.memoryDir || path.join(__dirname, '../../../memory'),
      workspaceDir: options.workspaceDir || path.join(__dirname, '../../../workspace'),
      maxResults: options.maxResults || 10,
      similarityThreshold: options.similarityThreshold || 0.7,
      ...options
    };
    
    this.index = []; // 内存索引 {id, text, file, line, embedding, timestamp}
    this.initialized = false;
    
    console.log('[MemflowSearch] 初始化');
    console.log(`   记忆目录: ${this.options.memoryDir}`);
    console.log(`   工作空间: ${this.options.workspaceDir}`);
    console.log(`   提供商: ${config.embedding.provider}`);
    console.log(`   模型: ${config.embedding.model}`);
  }
  
  /**
   * 初始化索引
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('[MemflowSearch] 开始构建索引...');
    
    try {
      // 1. 索引记忆文件
      await this._indexMemoryFiles();
      
      // 2. 索引工作空间文件
      await this._indexWorkspaceFiles();
      
      this.initialized = true;
      console.log(`[MemflowSearch] 索引完成，共 ${this.index.length} 个片段`);
      
    } catch (error) {
      console.error('[MemflowSearch] 索引失败:', error.message);
      throw error;
    }
  }
  
  /**
   * 搜索记忆
   */
  async search(query, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    console.log(`[MemflowSearch] 搜索: "${query.substring(0, 50)}..."`);
    
    const startTime = Date.now();
    
    try {
      // 1. 生成查询嵌入
      const queryEmbedding = await embeddingManager.getEmbedding(query);
      
      // 2. 计算相似度
      const results = [];
      for (const item of this.index) {
        const similarity = this._cosineSimilarity(queryEmbedding, item.embedding);
        
        if (similarity >= (options.similarityThreshold || this.options.similarityThreshold)) {
          results.push({
            ...item,
            similarity,
            score: similarity * 100
          });
        }
      }
      
      // 3. 排序
      results.sort((a, b) => b.similarity - a.similarity);
      
      // 4. 限制结果数量
      const maxResults = options.maxResults || this.options.maxResults;
      const finalResults = results.slice(0, maxResults);
      
      const duration = Date.now() - startTime;
      
      console.log(`[MemflowSearch] 搜索完成，找到 ${finalResults.length} 个结果 (${duration}ms)`);
      
      return {
        query,
        totalResults: results.length,
        returnedResults: finalResults.length,
        results: finalResults,
        duration,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('[MemflowSearch] 搜索失败:', error.message);
      throw error;
    }
  }
  
  /**
   * 添加文档到索引
   */
  async addDocument(text, metadata = {}) {
    const embedding = await embeddingManager.getEmbedding(text);
    
    const item = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: text.substring(0, 1000), // 限制长度
      embedding,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    
    this.index.push(item);
    return item;
  }
  
  /**
   * 获取索引统计
   */
  getStats() {
    return {
      totalItems: this.index.length,
      initialized: this.initialized,
      memoryDir: this.options.memoryDir,
      workspaceDir: this.options.workspaceDir,
      provider: config.embedding.provider,
      model: config.embedding.model
    };
  }
  
  // ========== 私有方法 ==========
  
  /**
   * 索引记忆文件
   */
  async _indexMemoryFiles() {
    const memoryDir = this.options.memoryDir;
    
    if (!fs.existsSync(memoryDir)) {
      console.log(`[MemflowSearch] 记忆目录不存在: ${memoryDir}`);
      return;
    }
    
    const files = fs.readdirSync(memoryDir)
      .filter(file => file.endsWith('.md'))
      .sort();
    
    console.log(`[MemflowSearch] 找到 ${files.length} 个记忆文件`);
    
    for (const file of files) {
      await this._indexFile(path.join(memoryDir, file), 'memory');
    }
  }
  
  /**
   * 索引工作空间文件
   */
  async _indexWorkspaceFiles() {
    const workspaceDir = this.options.workspaceDir;
    
    // 只索引关键文件
    const keyFiles = [
      'MEMORY.md',
      'SOUL.md',
      'USER.md',
      'AGENTS.md',
      'TOOLS.md',
      'HEARTBEAT.md'
    ];
    
    for (const file of keyFiles) {
      const filePath = path.join(workspaceDir, file);
      if (fs.existsSync(filePath)) {
        await this._indexFile(filePath, 'workspace');
      }
    }
  }
  
  /**
   * 索引单个文件
   */
  async _indexFile(filePath, source) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      console.log(`  📄 索引: ${fileName} (${source})`);
      
      // 分割为段落
      const paragraphs = this._splitIntoParagraphs(content);
      
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];
        if (paragraph.trim().length < 20) continue; // 跳过太短的段落
        
        const embedding = await embeddingManager.getEmbedding(paragraph);
        
        this.index.push({
          id: `${source}_${fileName}_${i}`,
          text: paragraph,
          file: fileName,
          line: i + 1,
          source,
          path: filePath,
          embedding,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error(`[MemflowSearch] 索引文件失败 ${filePath}:`, error.message);
    }
  }
  
  /**
   * 分割为段落
   */
  _splitIntoParagraphs(text) {
    // 按空行分割
    return text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  }
  
  /**
   * 计算余弦相似度
   */
  _cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// CLI接口
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('MemFlow AI 记忆搜索');
    console.log('用法:');
    console.log('  node memflow-search.js <查询文本>');
    console.log('  node memflow-search.js --stats');
    console.log('  node memflow-search.js --test');
    process.exit(0);
  }
  
  const search = new MemflowSearch();
  
  if (args[0] === '--stats') {
    await search.initialize();
    const stats = search.getStats();
    console.log(JSON.stringify(stats, null, 2));
    
  } else if (args[0] === '--test') {
    console.log('🧪 运行搜索测试...');
    await search.initialize();
    
    const testQueries = [
      '记忆系统架构',
      '双线管理框架',
      '怀疑层优化',
      '智谱AI集成'
    ];
    
    for (const query of testQueries) {
      console.log(`\n🔍 搜索: "${query}"`);
      const result = await search.search(query, { maxResults: 3 });
      
      console.log(`   找到 ${result.results.length} 个结果:`);
      result.results.forEach((item, i) => {
        console.log(`   ${i + 1}. [相似度:${item.score.toFixed(1)}] ${item.file}:${item.line}`);
        console.log(`      ${item.text.substring(0, 80)}...`);
      });
    }
    
  } else {
    const query = args.join(' ');
    console.log(`🔍 搜索: "${query}"`);
    
    await search.initialize();
    const result = await search.search(query);
    
    console.log(`\n📊 搜索结果 (${result.duration}ms):`);
    console.log(`   总匹配: ${result.totalResults}`);
    console.log(`   显示: ${result.returnedResults}`);
    
    if (result.results.length > 0) {
      console.log('\n📋 相关记忆:');
      result.results.forEach((item, i) => {
        console.log(`\n${i + 1}. [${item.score.toFixed(1)}分] ${item.file}:${item.line}`);
        console.log(`   来源: ${item.source} (${item.path})`);
        console.log(`   内容: ${item.text.substring(0, 120)}...`);
      });
    } else {
      console.log('\n❌ 未找到相关记忆');
      console.log('💡 建议: 尝试不同的关键词或降低相似度阈值');
    }
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('搜索失败:', error);
    process.exit(1);
  });
}

module.exports = MemflowSearch;