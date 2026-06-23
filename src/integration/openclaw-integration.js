/**
 * OpenClaw集成模块
 * 将MemFlow AI智能搜索集成到OpenClaw中
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

class OpenClawIntegration {
  /**
   * 创建OpenClaw集成
   * @param {Object} config 配置
   * @param {Object} searchEngine 搜索引擎
   */
  constructor(config = {}, searchEngine = null) {
    this.config = {
      openclawPath: config.openclawPath || '~/.nvm/versions/node/v22.22.0/bin/openclaw',
      workspacePath: config.workspacePath || '~/.openclaw/workspace',
      integrationMode: config.integrationMode || 'enhance', // replace, enhance, parallel
      autoSync: config.autoSync !== false,
      syncInterval: config.syncInterval || 300000, // 5分钟
      ...config
    };
    
    this.searchEngine = searchEngine;
    this.syncTimer = null;
    this.stats = {
      searches: 0,
      successful: 0,
      failed: 0,
      syncs: 0
    };
    
    console.log(`[OpenClawIntegration] 初始化完成`);
    console.log(`   - 集成模式: ${this.config.integrationMode}`);
    console.log(`   - 工作空间: ${this.config.workspacePath}`);
  }
  
  /**
   * 设置搜索引擎
   */
  setSearchEngine(searchEngine) {
    this.searchEngine = searchEngine;
    console.log('[OpenClawIntegration] 搜索引擎已设置');
  }
  
  /**
   * 模拟OpenClaw的memory_search
   * @param {string} query 查询文本
   * @param {Object} options 搜索选项
   */
  async memorySearch(query, options = {}) {
    if (!this.searchEngine) {
      throw new Error('搜索引擎未设置');
    }
    
    this.stats.searches++;
    console.log(`[OpenClawIntegration] 模拟memory_search: "${query}"`);
    
    try {
      // 使用MemFlow AI进行搜索
      const searchOptions = {
        mode: options.mode || 'hybrid',
        maxResults: options.maxResults || 10,
        similarityThreshold: options.similarityThreshold || 0.5 // 降低阈值
      };
      
      const result = await this.searchEngine.search(query, searchOptions);
      
      // 转换为OpenClaw兼容的格式
      const openclawResults = this._formatForOpenClaw(result);
      
      this.stats.successful++;
      
      console.log(`[OpenClawIntegration] 搜索成功，找到 ${openclawResults.length} 个结果`);
      
      return {
        success: true,
        results: openclawResults,
        query,
        stats: {
          mode: result.mode,
          duration: result.duration,
          totalMatches: result.totalMatches || result.results.length
        }
      };
      
    } catch (error) {
      this.stats.failed++;
      console.error('[OpenClawIntegration] 搜索失败:', error.message);
      
      // 回退到关键词搜索
      try {
        console.log('[OpenClawIntegration] 尝试关键词回退...');
        const keywordResult = await this.searchEngine.keywordSearch(query);
        const openclawResults = this._formatForOpenClaw(keywordResult);
        
        return {
          success: true,
          results: openclawResults,
          query,
          warning: '使用关键词回退搜索',
          stats: {
            mode: 'keyword_fallback',
            duration: keywordResult.duration
          }
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: `搜索失败: ${error.message}, 回退也失败: ${fallbackError.message}`,
          query
        };
      }
    }
  }
  
  /**
   * 格式化为OpenClaw兼容的结果
   * @private
   */
  _formatForOpenClaw(searchResult) {
    return searchResult.results.map((item, index) => {
      // 提取关键信息
      const content = item.content || '';
      const filename = item.filename || 'unknown.md';
      const filepath = item.filepath || '';
      const similarity = item.similarity || item.score || 0;
      
      // 创建摘要（前200字符）
      const summary = this._createSummary(content, 200);
      
      // 创建OpenClaw格式的结果
      return {
        id: `memflow_${item.id || index}`,
        score: similarity,
        text: content,
        metadata: {
          source: 'memflow-ai',
          filename,
          filepath,
          chunk_index: item.chunk_index,
          similarity: similarity.toFixed(4),
          search_mode: searchResult.mode,
          timestamp: new Date().toISOString()
        },
        snippet: summary,
        highlight: this._extractHighlight(content, searchResult.query)
      };
    });
  }
  
  /**
   * 创建摘要
   * @private
   */
  _createSummary(text, maxLength = 200) {
    if (!text || text.length <= maxLength) {
      return text;
    }
    
    // 找到最近的句子边界
    const truncated = text.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastNewline = truncated.lastIndexOf('\n');
    
    const cutIndex = Math.max(lastPeriod, lastNewline, maxLength - 50);
    return truncated.substring(0, cutIndex > 50 ? cutIndex : maxLength) + '...';
  }
  
  /**
   * 提取高亮文本
   * @private
   */
  _extractHighlight(text, query) {
    if (!query || !text) {
      return '';
    }
    
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    
    for (const term of queryTerms) {
      const index = text.toLowerCase().indexOf(term);
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + term.length + 50);
        return '...' + text.substring(start, end) + '...';
      }
    }
    
    // 没有匹配，返回开头
    return text.substring(0, Math.min(100, text.length)) + '...';
  }
  
  /**
   * 与OpenClaw memory_search对比测试
   */
  async compareWithOpenClaw(query) {
    console.log(`[OpenClawIntegration] 对比测试: "${query}"`);
    
    const results = {
      memflow: null,
      openclaw: null,
      comparison: null
    };
    
    try {
      // 1. MemFlow AI搜索
      const memflowStart = Date.now();
      results.memflow = await this.memorySearch(query);
      results.memflow.duration = Date.now() - memflowStart;
      
      // 2. OpenClaw搜索（如果可用）
      try {
        const openclawStart = Date.now();
        results.openclaw = await this._callOpenClawSearch(query);
        results.openclaw.duration = Date.now() - openclawStart;
      } catch (error) {
        console.log('[OpenClawIntegration] OpenClaw搜索不可用:', error.message);
        results.openclaw = { error: error.message };
      }
      
      // 3. 对比分析
      results.comparison = this._compareResults(results.memflow, results.openclaw);
      
      console.log('[OpenClawIntegration] 对比完成:');
      console.log(`   MemFlow AI: ${results.memflow.results?.length || 0} 结果, ${results.memflow.duration}ms`);
      console.log(`   OpenClaw: ${results.openclaw?.results?.length || 0} 结果, ${results.openclaw?.duration || 'N/A'}ms`);
      
      if (results.comparison) {
        console.log(`   重叠结果: ${results.comparison.overlapCount}`);
        console.log(`   独特结果(MemFlow): ${results.comparison.uniqueMemflow}`);
        console.log(`   独特结果(OpenClaw): ${results.comparison.uniqueOpenclaw}`);
      }
      
      return results;
      
    } catch (error) {
      console.error('[OpenClawIntegration] 对比测试失败:', error.message);
      return { error: error.message };
    }
  }
  
  /**
   * 调用OpenClaw memory_search
   * @private
   */
  async _callOpenClawSearch(query) {
    // 注意：由于OpenClaw的memory_search当前有问题，这里使用模拟
    console.log('[OpenClawIntegration] 模拟OpenClaw搜索（实际可能失败）');
    
    // 实际实现应该调用OpenClaw CLI或API
    // 例如: openclaw memory search "query"
    
    // 暂时返回模拟结果
    return {
      success: false,
      error: 'OpenClaw memory_search当前不可用',
      suggestion: '使用MemFlow AI作为替代'
    };
  }
  
  /**
   * 对比搜索结果
   * @private
   */
  _compareResults(memflowResult, openclawResult) {
    if (!memflowResult.success || !openclawResult?.success) {
      return null;
    }
    
    const memflowIds = new Set(memflowResult.results.map(r => r.metadata.filename));
    const openclawIds = new Set();
    
    if (openclawResult.results) {
      // 假设OpenClaw结果有filename字段
      openclawResult.results.forEach(r => {
        if (r.metadata?.filename) {
          openclawIds.add(r.metadata.filename);
        }
      });
    }
    
    // 计算重叠
    const overlap = new Set([...memflowIds].filter(x => openclawIds.has(x)));
    
    return {
      overlapCount: overlap.size,
      uniqueMemflow: memflowIds.size - overlap.size,
      uniqueOpenclaw: openclawIds.size - overlap.size,
      memflowTotal: memflowIds.size,
      openclawTotal: openclawIds.size
    };
  }
  
  /**
   * 启动自动同步
   */
  startAutoSync() {
    if (!this.config.autoSync) {
      console.log('[OpenClawIntegration] 自动同步已禁用');
      return;
    }
    
    console.log(`[OpenClawIntegration] 启动自动同步，间隔: ${this.config.syncInterval}ms`);
    
    this.syncTimer = setInterval(() => {
      this.syncWithOpenClaw().catch(error => {
        console.error('[OpenClawIntegration] 自动同步失败:', error.message);
      });
    }, this.config.syncInterval);
    
    // 立即运行一次
    this.syncWithOpenClaw().catch(console.error);
  }
  
  /**
   * 停止自动同步
   */
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('[OpenClawIntegration] 自动同步已停止');
    }
  }
  
  /**
   * 与OpenClaw同步记忆文件
   */
  async syncWithOpenClaw() {
    console.log('[OpenClawIntegration] 开始同步记忆文件...');
    this.stats.syncs++;
    
    try {
      // 检查OpenClaw记忆目录
      const memoryPath = path.join(this.config.workspacePath.replace('~', process.env.HOME), 'memory');
      
      if (!fs.existsSync(memoryPath)) {
        console.warn(`[OpenClawIntegration] OpenClaw记忆目录不存在: ${memoryPath}`);
        return { success: false, error: '记忆目录不存在' };
      }
      
      // 获取最新文件
      const files = fs.readdirSync(memoryPath)
        .filter(f => f.endsWith('.md') && !f.includes('backup'))
        .sort()
        .reverse(); // 最新的在前面
      
      console.log(`[OpenClawIntegration] 找到 ${files.length} 个记忆文件`);
      
      // 检查是否需要重新索引（基于最新文件修改时间）
      const latestFile = files[0];
      if (latestFile) {
        const latestPath = path.join(memoryPath, latestFile);
        const stats = fs.statSync(latestPath);
        
        console.log(`[OpenClawIntegration] 最新文件: ${latestFile}, 修改时间: ${stats.mtime.toISOString()}`);
        
        // 这里可以添加逻辑来检查是否需要重新索引
        // 例如：比较修改时间，如果新于上次索引时间，则触发重新索引
      }
      
      return {
        success: true,
        filesCount: files.length,
        latestFile,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('[OpenClawIntegration] 同步失败:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 创建OpenClaw插件脚本
   */
  async createOpenClawPlugin() {
    const pluginDir = path.join(__dirname, '..', '..', 'openclaw-plugin');
    
    if (!fs.existsSync(pluginDir)) {
      fs.mkdirSync(pluginDir, { recursive: true });
    }
    
    // 创建插件文件
    const pluginFiles = {
      'package.json': JSON.stringify({
        name: 'memflow-ai-openclaw-plugin',
        version: '1.0.0',
        description: 'MemFlow AI integration for OpenClaw',
        main: 'index.js',
        scripts: {
          start: 'node index.js'
        },
        dependencies: {
          'memflow-ai': 'file:..'
        }
      }, null, 2),
      
      'index.js': `
const { OpenClawIntegration } = require('memflow-ai/src/integration/openclaw-integration');
const { SearchEngine } = require('memflow-ai/src/search/engine');
const { EmbeddingManager } = require('memflow-ai/src/embedding');

// 配置
const config = {
  openclawPath: process.env.OPENCLAW_PATH || 'openclaw',
  workspacePath: process.env.OPENCLAW_WORKSPACE || '~/.openclaw/workspace',
  integrationMode: 'enhance'
};

// 初始化
async function init() {
  console.log('🚀 MemFlow AI OpenClaw插件启动...');
  
  try {
    // 1. 初始化嵌入管理器
    const embeddingManager = new EmbeddingManager({
      provider: 'zhipu',
      apiKey: process.env.ZHIPU_API_KEY,
      proxy: process.env.HTTPS_PROXY
    });
    
    // 2. 初始化搜索引擎
    const searchEngine = new SearchEngine({
      dbPath: './data/memflow.db',
      searchMode: 'hybrid'
    });
    
    searchEngine.setEmbeddingManager(embeddingManager);
    
    // 3. 初始化集成
    const integration = new OpenClawIntegration(config, searchEngine);
    
    // 4. 启动自动同步
    integration.startAutoSync();
    
    console.log('✅ MemFlow AI插件初始化完成');
    
    // 导出API
    return {
      memorySearch: (query) => integration.memorySearch(query),
      compareWithOpenClaw: (query) => integration.compareWithOpenClaw(query),
      getStats: () => integration.stats
    };
    
  } catch (error) {
    console.error('❌ 插件初始化失败:', error);
    throw error;
  }
}

// 如果直接运行，启动插件
if (require.main === module) {
  init().catch(console.error);
}

module.exports = { init };
      `.trim()
    };
    
    // 写入文件
    for (const [filename, content] of Object.entries(pluginFiles)) {
      const filepath = path.join(pluginDir, filename);
      fs.writeFileSync(filepath, content);
      console.log(`[OpenClawIntegration] 创建插件文件: ${filename}`);
    }
    
    console.log(`[OpenClawIntegration] 插件创建完成，目录: ${pluginDir}`);
    
    return {
      success: true,
      pluginDir,
      files: Object.keys(pluginFiles)
    };
  }
  
  /**
   * 获取集成统计
   */
  getStats() {
    return {
      ...this.stats,
      integrationMode: this.config.integrationMode,
      autoSync: this.config.autoSync,
      searchEngineReady: !!this.searchEngine
    };
  }
  
  /**
   * 测试集成功能
   */
  async testIntegration() {
    console.log('[OpenClawIntegration] 测试集成功能...');
    
    const testQueries = [
      '记忆系统',
      'OpenClaw配置',
      '今天的工作'
    ];
    
    const results = [];
    
    for (const query of testQueries) {
      console.log(`\n  测试查询: "${query}"`);
      
      try {
        const result = await this.memorySearch(query);
        
        if (result.success) {
          console.log(`    ✅ 成功，找到 ${result.results.length} 个结果`);
          console.log(`      最佳匹配: ${result.results[0]?.metadata?.filename || '无'}`);
          console.log(`      相似度: ${result.results[0]?.metadata?.similarity || 'N/A'}`);
          
          results.push({
            query,
            success: true,
            count: result.results.length,
            duration: result.stats?.duration,
            bestMatch: result.results[0]?.metadata?.filename
          });
        } else {
          console.log(`    ❌ 失败: ${result.error}`);
          results.push({
            query,
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        console.log(`    ❌ 异常: ${error.message}`);
        results.push({
          query,
          success: false,
          error: error.message
        });
      }
    }
    
    // 对比测试
    console.log('\n  对比测试（与OpenClaw）:');
    try {
      const comparison = await this.compareWithOpenClaw('记忆系统');
      if (comparison.comparison) {
        console.log(`    MemFlow AI: ${comparison.comparison.memflowTotal} 结果`);
        console.log(`    OpenClaw: ${comparison.comparison.openclawTotal} 结果`);
        console.log(`    重叠: ${comparison.comparison.overlapCount}`);
      }
    } catch (error) {
      console.log(`    对比测试失败: ${error.message}`);
    }
    
    return {
      success: results.every(r => r.success),
      results,
      stats: this.stats
    };
  }
}

module.exports = OpenClawIntegration;