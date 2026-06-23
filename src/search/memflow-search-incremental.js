#!/usr/bin/env node
/**
 * MemFlow AI 记忆搜索 - 增量索引版
 * 减少API调用，提高性能
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 加载配置
const configPath = path.join(__dirname, '../../config/default.yaml');
const config = yaml.load(fs.readFileSync(configPath, 'utf8'));

// 嵌入管理器
const EmbeddingManager = require('../embedding/index');
const embeddingConfig = {
  provider: config.embedding.provider,
  ...config.embedding.zhipu,
  cacheSize: config.embedding.cache.size,
  cacheTTL: config.embedding.cache.ttl
};
const embeddingManager = new EmbeddingManager(embeddingConfig);

// 增量索引管理器
class IncrementalMemflowSearch {
  constructor(options = {}) {
    this.options = {
      memoryDir: options.memoryDir || path.join(__dirname, '../../../memory'),
      workspaceDir: options.workspaceDir || path.join(__dirname, '../../../workspace'),
      indexFile: options.indexFile || path.join(__dirname, '../../../.memflow-index.json'),
      maxResults: options.maxResults || 10,
      similarityThreshold: options.similarityThreshold || 0.7,
      ...options
    };
    
    this.index = []; // 内存索引
    this.fileStats = {}; // 文件状态记录 {path: {mtime, size, indexedAt}}
    this.initialized = false;
    
    console.log('[IncrementalSearch] 增量索引版初始化');
  }
  
  /**
   * 初始化或更新索引
   */
  async initialize(force = false) {
    console.log('[IncrementalSearch] 检查索引状态...');
    
    // 加载现有索引
    await this._loadIndex();
    
    // 检查需要更新的文件
    const { newFiles, modifiedFiles, unchangedFiles } = await this._checkFileChanges();
    
    console.log(`   新文件: ${newFiles.length}, 修改文件: ${modifiedFiles.length}, 未变文件: ${unchangedFiles.length}`);
    
    if (newFiles.length === 0 && modifiedFiles.length === 0 && !force) {
      console.log('[IncrementalSearch] 索引已是最新，无需更新');
      this.initialized = true;
      return;
    }
    
    // 增量索引
    console.log('[IncrementalSearch] 开始增量索引...');
    
    // 分批索引新文件（避免超时）
    const allFilesToIndex = [
      ...newFiles.map(f => ({ path: f, reason: 'new' })),
      ...modifiedFiles.map(f => ({ path: f, reason: 'modified' }))
    ];
    
    const BATCH_FILES = 2; // 每批最多索引2个文件（避免SIGKILL）
    for (let batchStart = 0; batchStart < allFilesToIndex.length; batchStart += BATCH_FILES) {
      const batch = allFilesToIndex.slice(batchStart, batchStart + BATCH_FILES);
      
      for (const { path: filePath, reason } of batch) {
        if (reason === 'modified') {
          this.index = this.index.filter(item => item.path !== filePath);
        }
        await this._indexFile(filePath, reason);
      }
      
      // 每批保存一次，支持断点续传
      await this._saveIndex();
      
      const remaining = allFilesToIndex.length - (batchStart + batch.length);
      if (remaining > 0) {
        console.log(`[增量索引批处理] 已处理 ${batchStart + batch.length}/${allFilesToIndex.length} 个文件，剩余 ${remaining} 个`);
      }
    }
    
    // 保存索引
    await this._saveIndex();
    
    this.initialized = true;
    console.log(`[IncrementalSearch] 增量索引完成，共 ${this.index.length} 个片段`);
  }
  
  /**
   * 搜索记忆
   */
  async search(query, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    console.log(`[IncrementalSearch] 搜索: "${query.substring(0, 50)}..."`);
    
    const startTime = Date.now();
    
    try {
      // 生成查询嵌入
      const queryEmbedding = await embeddingManager.getEmbedding(query);
      
      // 多维度过滤日志
      const filters = [];
      if (options.vault) filters.push(`vault=${options.vault}`);
      if (options.dateFrom) filters.push(`dateFrom=${options.dateFrom}`);
      if (options.dateTo) filters.push(`dateTo=${options.dateTo}`);
      if (options.tag) filters.push(`tag=${options.tag}`);
      if (filters.length > 0) {
        console.log(`[IncrementalSearch] 过滤条件: ${filters.join(', ')}`);
      }
      
      // 预计算日期过滤函数
      const hasDateFilter = options.dateFrom || options.dateTo;
      let dateFromMs = null, dateToMs = null;
      if (hasDateFilter) {
        // 从文件名提取日期：YYYY-MM-DD.md 或空格/连字符格式
        if (options.dateFrom) {
          dateFromMs = new Date(options.dateFrom).getTime();
        }
        if (options.dateTo) {
          // dateTo 包含当天，设置到当天结束
          dateToMs = new Date(options.dateTo).getTime() + 86400000;
        }
      }
      
      // 计算相似度
      const results = [];
      for (const item of this.index) {
        // 1. 仓过滤（vault维度）
        if (options.vault && item.vault !== options.vault) {
          continue;
        }
        
        // 2. 标签过滤（tag维度）
        if (options.tag) {
          const itemText = item.text || '';
          const tagPattern = new RegExp(`#${options.tag}`, 'i');
          if (!tagPattern.test(itemText) && item.vault !== options.tag) {
            continue;
          }
        }
        
        // 3. 时间范围过滤（date维度）
        if (hasDateFilter && item.file) {
          // 从文件名提取日期：2026-05-19.md -> Date
          const dateMatch = item.file.match(/(\d{4})[-_.](\d{1,2})[-_.](\d{1,2})/);
          if (dateMatch) {
            const itemDate = new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2])-1, parseInt(dateMatch[3])).getTime();
            if (dateFromMs && itemDate < dateFromMs) continue;
            if (dateToMs && itemDate >= dateToMs) continue;
          }
        }
        
        const similarity = this._cosineSimilarity(queryEmbedding, item.embedding);
        
        if (similarity >= (options.similarityThreshold || this.options.similarityThreshold)) {
          results.push({
            ...item,
            similarity,
            score: similarity * 100
          });
        }
      }
      
      // 排序和限制
      results.sort((a, b) => b.similarity - a.similarity);
      const maxResults = options.maxResults || this.options.maxResults;
      const finalResults = results.slice(0, maxResults);
      
      const duration = Date.now() - startTime;
      
      console.log(`[IncrementalSearch] 搜索完成，找到 ${finalResults.length} 个结果 (${duration}ms)`);
      
      return {
        query,
        filters,
        totalResults: results.length,
        returnedResults: finalResults.length,
        results: finalResults,
        duration,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('[IncrementalSearch] 搜索失败:', error.message);
      throw error;
    }
  }
  
  /**
   * 获取索引统计
   */
  getStats() {
    const fileCount = Object.keys(this.fileStats).length;
    const indexedFiles = this.index.reduce((files, item) => {
      files.add(item.path);
      return files;
    }, new Set()).size;
    
    return {
      totalItems: this.index.length,
      indexedFiles,
      totalFiles: fileCount,
      initialized: this.initialized,
      indexFile: this.options.indexFile,
      lastUpdated: this._getLastUpdateTime()
    };
  }
  
  /**
   * 手动添加文档
   */
  async addDocument(text, metadata = {}) {
    const embedding = await embeddingManager.getEmbedding(text);
    
    const item = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: text.substring(0, 1000),
      embedding,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    
    this.index.push(item);
    
    // 立即保存
    await this._saveIndex();
    
    return item;
  }
  
  // ========== 私有方法 ==========
  
  /**
   * 加载索引
   */
  async _loadIndex() {
    try {
      if (fs.existsSync(this.options.indexFile)) {
        const data = JSON.parse(fs.readFileSync(this.options.indexFile, 'utf8'));
        this.index = data.index || [];
        this.fileStats = data.fileStats || {};
        console.log(`[IncrementalSearch] 加载现有索引: ${this.index.length} 个片段`);
        
        // 补全缺失的仓标签（旧索引没有vault字段）
        let fixedCount = 0;
        const vaultCache = {};
        for (const item of this.index) {
          if (!item.vault && item.path) {
            if (!vaultCache[item.path]) {
              vaultCache[item.path] = this._detectVault(item.path);
            }
            item.vault = vaultCache[item.path];
            fixedCount++;
          }
        }
        if (fixedCount > 0) {
          console.log(`[IncrementalSearch] 补全 ${fixedCount} 个仓标签`);
          this._saveIndex();
        }
      }
    } catch (error) {
      console.log('[IncrementalSearch] 索引文件损坏，重新创建');
      this.index = [];
      this.fileStats = {};
    }
  }
  
  /**
   * 保存索引
   */
  async _saveIndex() {
    const data = {
      index: this.index,
      fileStats: this.fileStats,
      savedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    fs.writeFileSync(this.options.indexFile, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[IncrementalSearch] 索引已保存: ${this.options.indexFile}`);
  }
  
  /**
   * 检查文件变化
   */
  async _checkFileChanges() {
    const newFiles = [];
    const modifiedFiles = [];
    const unchangedFiles = [];
    
    // 检查记忆文件
    const memoryFiles = this._getMemoryFiles();
    
    for (const filePath of memoryFiles) {
      const stats = fs.statSync(filePath);
      const fileKey = filePath;
      
      if (!this.fileStats[fileKey]) {
        // 新文件
        newFiles.push(filePath);
      } else {
        const oldStats = this.fileStats[fileKey];
        if (stats.mtimeMs > oldStats.mtimeMs || stats.size !== oldStats.size) {
          // 文件已修改
          modifiedFiles.push(filePath);
        } else {
          // 文件未变
          unchangedFiles.push(filePath);
        }
      }
      
      // 更新文件状态
      this.fileStats[fileKey] = {
        mtimeMs: stats.mtimeMs,
        size: stats.size,
        indexedAt: new Date().toISOString()
      };
    }
    
    return { newFiles, modifiedFiles, unchangedFiles };
  }
  
  /**
   * 获取记忆文件列表
   */
  _getMemoryFiles() {
    const files = [];
    
    // 记忆目录
    if (fs.existsSync(this.options.memoryDir)) {
      const memoryFiles = fs.readdirSync(this.options.memoryDir)
        .filter(file => file.endsWith('.md'))
        .map(file => path.join(this.options.memoryDir, file));
      
      files.push(...memoryFiles);
    }
    
    // 关键工作空间文件
    const keyFiles = ['MEMORY.md', 'SOUL.md', 'USER.md', 'AGENTS.md', 'TOOLS.md', 'HEARTBEAT.md'];
    for (const file of keyFiles) {
      const filePath = path.join(this.options.workspaceDir, file);
      if (fs.existsSync(filePath)) {
        files.push(filePath);
      }
    }
    
    return files;
  }
  
  /**
   * 索引单个文件（批量嵌入，减少API调用）
   */
  async _indexFile(filePath, reason = 'new') {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      console.log(`  📄 索引: ${fileName} (${reason})`);
      
      // 分割为段落
      const paragraphs = this._splitIntoParagraphs(content);
      
      // 收集需要新嵌入的段落（过滤短文本和已存在的）
      const newParagraphs = [];
      const newParagraphIndices = [];
      
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];
        if (paragraph.trim().length < 20) continue;
        
        const existing = this.index.find(item => 
          item.path === filePath && item.line === i + 1
        );
        
        if (existing) {
          // 更新现有索引（文本内容可能已变，但复用已有嵌入缓存）
          existing.text = paragraph;
          existing.updatedAt = new Date().toISOString();
          
          // 如果文本变化较大，也重新生成嵌入
          const oldLen = existing.text ? existing.text.length : 0;
          if (Math.abs(paragraph.length - oldLen) > oldLen * 0.3) {
            newParagraphs.push(paragraph);
            newParagraphIndices.push({ line: i + 1, update: existing });
          }
        } else {
          newParagraphs.push(paragraph);
          newParagraphIndices.push({ line: i + 1, update: null });
        }
      }
      
      // 批量生成嵌入向量
      if (newParagraphs.length > 0) {
        console.log(`    📦 批量嵌入 ${newParagraphs.length} 个段落...`);
        
        // 分批处理，每批最多20个（避免API限制）
        const BATCH_SIZE = 20;
        for (let batchStart = 0; batchStart < newParagraphs.length; batchStart += BATCH_SIZE) {
          const batchEnd = Math.min(batchStart + BATCH_SIZE, newParagraphs.length);
          const batchTexts = newParagraphs.slice(batchStart, batchEnd);
          const batchIndices = newParagraphIndices.slice(batchStart, batchEnd);
          
          const embeddings = await embeddingManager.getEmbeddings(batchTexts);
          
          for (let j = 0; j < batchIndices.length; j++) {
            const { line, update } = batchIndices[j];
            
            if (update) {
              // 更新现有项
              update.embedding = embeddings[j];
            } else {
              // 创建新索引项
              this.index.push({
                id: `${fileName}_${line}`,
                text: batchTexts[j],
                file: fileName,
                line: line,
                path: filePath,
                vault: this._detectVault(filePath),  // 自动打仓标签
                embedding: embeddings[j],
                indexedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            }
          }
          
          const batchPct = Math.min(100, Math.round((batchEnd / newParagraphs.length) * 100));
          console.log(`    已索引 ${batchEnd}/${newParagraphs.length} 个段落 (${batchPct}%)`);
        }
      } else {
        console.log(`    ✅ 所有段落已有嵌入，无需更新`);
      }
      
      console.log(`    ✅ ${fileName}: 索引完成 (${newParagraphs.length} 个新段落)`);
      
    } catch (error) {
      console.error(`[IncrementalSearch] 索引文件失败 ${filePath}:`, error.message);
    }
  }
  
  /**
   * 分割为段落（按标题级别分割，避免过大/过小段落）
   * 每个###至少为一段，###内再按换行分割
   */
  _splitIntoParagraphs(text) {
    // 按##或###标题分割，每个标题成为一个segments
    const headingPattern = /(?=^#{1,3}\s)/gm;
    const rawParagraphs = text.split(headingPattern).filter(p => p.trim().length > 0);
    
    const result = [];
    for (const raw of rawParagraphs) {
      const trimmed = raw.trim();
      // 忽略纯元数据行（如日期、标签等）
      if (trimmed.length < 20) continue;
      
      // 如果段落太长（超过2000字），按双换行再分割
      if (trimmed.length > 2000) {
        const subParts = trimmed.split(/\n\s*\n/).filter(s => s.trim().length >= 30);
        result.push(...subParts);
      } else {
        result.push(trimmed);
      }
    }
    
    return result;
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
  
  /**
   * 获取最后更新时间
   */
  _getLastUpdateTime() {
    if (this.index.length === 0) return null;
    
    const timestamps = this.index.map(item => new Date(item.updatedAt || item.indexedAt).getTime());
    return new Date(Math.max(...timestamps)).toISOString();
  }
  
  // 自动判断记忆仓（vault tag）
  // 参考ChromaDB/Qdrant的metadata过滤思路：给每条记忆打多维标签
  _detectVault(filePath) {
    const fileName = path.basename(filePath);
    
    if (fileName.endsWith('.md')) {
      const content = fs.readFileSync(filePath, 'utf8').substring(0, 1500).toLowerCase();
      
      let vault = '日常';
      
      // 优先级从上到下，匹配到即返回
      
      // === 商业战略 ===
      if (/战略|竞争|三才|定价|定位|战场|利润分配|出牌|战役|商业模式|核心竞争力|差异化/.test(content)) {
        vault = '商业战略';
      }
      // === 产品技术（刺绣/艺术漆/墙布/配方） ===
      else if (/配方|工艺参数|质量|检测|工序|原料|刺绣|壁画|艺术漆|墙布|施工工艺|产品特性/.test(content)) {
        vault = '产品技术';
      }
      // === 市场渠道 ===
      else if (/加盟|招商|经销商|渠道|展会|客户|师傅|施工|门店|获客|推广|转化/.test(content)) {
        vault = '市场渠道';
      }
      // === 用户指定书单学习 ===
      else if (/毛选|选集|资治|通鉴|盐铁|左传|天道|书单|学习|读书|矛盾论|实践论|持久战/.test(content)) {
        vault = '经验学习';
      }
      // === 系统技术（OpenClaw/MemFlow） ===
      else if (/OpenClaw|升级|版本|更新|cron|heartbeat|记忆|memory|MemFlow|索引|嵌入|智谱/.test(content)) {
        vault = '系统技术';
      }
      // === MemPalace/UUMit 等外部系统研究 ===
      else if (/MemPalace|宫殿|UUMit|小龙人|ChromaDB|Qdrant|A2A|MCP|能力交易/.test(content)) {
        vault = '外部研究';
      }
      // === 财务运营 ===
      else if (/成本|核算|营收|利润|报表|库存|财务|费用|数据|日报|预算|投入产出/.test(content)) {
        vault = '财务运营';
      }
      // === 软件制作/工具 ===
      else if (/脚本|工具|程序|软件|HTML|canvas|Excel|代码|node|API/.test(content)) {
        vault = '软件制作';
      }
      
      return vault;
    }
    
    return '日常';
  }
}

// CLI接口
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('MemFlow AI 增量索引搜索');
    console.log('用法:');
    console.log('  node memflow-search-incremental.js <查询文本>');
    console.log('  node memflow-search-incremental.js --vault 仓名 <查询文本>');
    console.log('  node memflow-search-incremental.js --from YYYY-MM-DD --to YYYY-MM-DD <查询文本>');
    console.log('  node memflow-search-incremental.js --tag 标签名 <查询文本>');
    console.log('  node memflow-search-incremental.js --init');
    console.log('  node memflow-search-incremental.js --stats');
    console.log('  node memflow-search-incremental.js --update');
    process.exit(0);
  }
  
  const search = new IncrementalMemflowSearch();
  
  if (args[0] === '--init') {
    console.log('🚀 初始化增量索引...');
    await search.initialize(true); // 强制重新索引
    const stats = search.getStats();
    console.log(JSON.stringify(stats, null, 2));
    
  } else if (args[0] === '--stats') {
    await search.initialize();
    const stats = search.getStats();
    console.log(JSON.stringify(stats, null, 2));
    
  } else if (args[0] === '--update') {
    console.log('🔄 更新增量索引...');
    await search.initialize();
    const stats = search.getStats();
    console.log(`索引更新完成: ${stats.totalItems} 个片段`);
    
  } else {
    // 解析过滤参数
    const parseOptions = () => {
      const opts = {};
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--vault') { opts.vault = args[++i]; }
        else if (args[i] === '--from') { opts.dateFrom = args[++i]; }
        else if (args[i] === '--to') { opts.dateTo = args[++i]; }
        else if (args[i] === '--tag') { opts.tag = args[++i]; }
      }
      return opts;
    };
    const opts = parseOptions();
    
    // 提取非过滤参数的文本作为查询
    const skipFlags = ['--vault','--from','--to','--tag'];
    const queryParts = args.filter(a => !skipFlags.includes(a) && !skipFlags.includes(args[args.indexOf(a)-1]));
    const query = queryParts.join(' ');
    
    console.log(`🔍 搜索: "${query}"`);
    if (opts.vault) console.log(`📂 限定仓: ${opts.vault}`);
    if (opts.dateFrom) console.log(`📅 从: ${opts.dateFrom}`);
    if (opts.dateTo) console.log(`📅 到: ${opts.dateTo}`);
    if (opts.tag) console.log(`🏷️ 限定标签: ${opts.tag}`);
    
    await search.initialize();
    const result = await search.search(query, opts);
    
    console.log(`\n📊 搜索结果 (${result.duration}ms):`);
    console.log(`   总匹配: ${result.totalResults}`);
    console.log(`   显示: ${result.returnedResults}`);
    
    if (result.results.length > 0) {
      console.log('\n📋 相关记忆:');
      result.results.forEach((item, i) => {
        console.log(`\n${i + 1}. [${item.score.toFixed(1)}分] ${item.file}:${item.line}`);
        console.log(`   内容: ${item.text.substring(0, 120)}...`);
      });
    } else {
      console.log('\n❌ 未找到相关记忆');
    }
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('搜索失败:', error);
    process.exit(1);
  });
}

module.exports = IncrementalMemflowSearch;