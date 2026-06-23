#!/usr/bin/env node
/**
 * MemFlow AI 自动进化服务
 * 
 * 功能:
 * 1. 每次运行时：搜索关联历史记忆 → 输出到会话
 * 2. 自动发现矛盾（说了A做了B）
 * 3. 数字大脑自动调整记忆权重
 * 4. 每日自动摘要和记忆压缩
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const INDEX_FILE = path.join(ROOT, '.memflow-index-boot.json');
const EVOLVE_LOG = path.join(ROOT, '.auto-evolve-log.json');
const BOOT_STATE = path.join(ROOT, '.boot-state.json');
const BRAIN_STATE = path.join(ROOT, '.brain-state.json');

// ============================================
// 核心：搜索关联记忆
// ============================================
class AutoEvolve {
  constructor() {
    this.searchEngine = null;
    this.brain = null;
    this.evolveLog = this._loadLog();
    this.config = this._loadConfig();
    
    // 设置代理
    const proxy = this.config?.embedding?.zhipu?.proxy;
    if (proxy) {
      process.env.HTTPS_PROXY = proxy;
      process.env.HTTP_PROXY = proxy;
    }
  }

  _loadConfig() {
    try {
      return yaml.load(fs.readFileSync(path.join(ROOT, 'config/default.yaml'), 'utf8'));
    } catch { return {}; }
  }

  _loadLog() {
    try {
      return JSON.parse(fs.readFileSync(EVOLVE_LOG, 'utf8'));
    } catch {
      return {
        createdAt: new Date().toISOString(),
        sessions: 0,
        contradictionsFound: 0,
        lastEvolve: null,
        history: []
      };
    }
  }

  _saveLog() {
    this.evolveLog.lastEvolve = new Date().toISOString();
    fs.writeFileSync(EVOLVE_LOG, JSON.stringify(this.evolveLog, null, 2));
  }

  /**
   * 入口：分析当前会话上下文，搜索关联记忆
   */
  async analyzeSession(context) {
    const startTime = Date.now();
    
    if (!this.searchEngine) {
      const Search = require('./search/memflow-search-incremental.js');
      this.searchEngine = new Search({
        memoryDir: path.join(ROOT, '..', 'memory'),
        workspaceDir: path.join(ROOT, '..'),
        indexFile: INDEX_FILE,
        similarityThreshold: 0.3,
        maxResults: 10
      });
      // 加载已有索引（不重新索引）
      const data = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
      this.searchEngine.index = data.index || [];
      this.searchEngine.fileStats = data.fileStats || {};
      this.searchEngine.initialized = true;
    }

    // 1. 用上下文关键词搜索记忆
    const keywords = this._extractKeywords(context);
    const allResults = [];
    
    for (const keyword of keywords.slice(0, 3)) {
      try {
        const result = await this.searchEngine.search(keyword);
        allResults.push(...result.results);
      } catch (e) {
        // 搜索失败不影响整体
      }
    }

    // 去重 + 按相似度排序
    const unique = new Map();
    for (const r of allResults) {
      const key = `${r.file}:${r.line}`;
      if (!unique.has(key) || unique.get(key).similarity < r.similarity) {
        unique.set(key, r);
      }
    }
    
    const sorted = [...unique.values()]
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 8);

    // 2. 尝试检测矛盾（使用关键词命中对比）
    const contradictions = this._detectContradictions(context, sorted);

    // 3. 记录进化
    this.evolveLog.sessions++;
    this.evolveLog.history.push({
      timestamp: new Date().toISOString(),
      context: context.substring(0, 100),
      resultsCount: sorted.length,
      contradictions: contradictions.length,
      duration: Date.now() - startTime
    });
    // 只保留最近50条历史
    if (this.evolveLog.history.length > 50) {
      this.evolveLog.history = this.evolveLog.history.slice(-50);
    }
    this._saveLog();

    // 4. 更新大脑状态
    this._updateBrainState(sorted);

    return {
      relatedMemories: sorted,
      contradictions,
      stats: {
        totalSessions: this.evolveLog.sessions,
        totalContradictions: this.evolveLog.contradictionsFound,
        searchDuration: Date.now() - startTime
      }
    };
  }

  /**
   * 从上下文提取搜索关键词
   */
  _extractKeywords(context) {
    // 提取关键名词短语
    const words = context
      .replace(/[，。！？、：；""''（）【】《》\n]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2);
    
    // 去重 + 按长度优先（长词更可能是关键名词）
    const unique = [...new Set(words)];
    unique.sort((a, b) => b.length - a.length);
    
    // 提取2-4个关键词作为搜索
    return unique.slice(0, 4);
  }

  /**
   * 矛盾检测：检查当前上下文是否与历史记忆冲突
   */
  _detectContradictions(context, memories) {
    const contradictions = [];
    
    // 矛盾触发词
    const triggerWords = ['但', '可是', '不过', '原来', '之前以为', '其实', '不应该', '错了', '不是', '还没', 
      '弄错了', '反悔', '重来', '推翻', '算了', '不管了', '暂停', '先不做', '不搞了', '重新']; 
    const hasTrigger = triggerWords.some(m => context.includes(m));
    
    // 检查任务/承诺类记忆
    const commitmentMemories = memories.filter(m => 
      /应该|需要|决定|计划|必须|承诺|打算|目标|下一步/.test(m.text)
    );
    
    // 方向反转检测：如果历史有承诺 + 上下文有翻转词
    if (commitmentMemories.length > 0) {
      const reversalWords = ['换', '改', '变', '新', '另外', '重新', '不要', '取消', '停止'];
      const hasReversal = reversalWords.some(w => context.includes(w));
      if (hasReversal) {
        contradictions.push({
          type: 'direction_change',
          severity: 'medium',
          memory: commitmentMemories[0].file,
          memoryText: commitmentMemories[0].text.substring(0, 200),
          confidence: 0.4
        });
        this.evolveLog.contradictionsFound++;
      }
    }
    
    if (!hasTrigger) return contradictions;
    
    // 有关键词触发时深入匹配
    for (const mem of memories.slice(0, 8)) {
      const memText = mem.text;
      const hasCommitment = /应该|需要|决定|计划|必须|承诺|打算|目标|下一步/.test(memText);
      const hasCompletion = /完成|完毕|好了|已解决|没问题/.test(memText);
      
      if (hasCommitment && !hasCompletion) {
        contradictions.push({
          type: 'unfinished_commitment',
          severity: 'medium',
          memory: `${mem.file}:${mem.line || '?'}`,
          memoryText: memText.substring(0, 200),
          confidence: 0.5
        });
        this.evolveLog.contradictionsFound++;
      }
    }
    
    if (contradictions.length === 0 && hasTrigger) {
      contradictions.push({
        type: 'context_shift',
        severity: 'info',
        memory: 'general',
        memoryText: '检测到上下文变化',
        confidence: 0.2
      });
    }
    
    return contradictions;
  }

  /**
   * 更新数字大脑状态
   */
  _updateBrainState(memories) {
    try {
      let brainState = {};
      try { brainState = JSON.parse(fs.readFileSync(BRAIN_STATE, 'utf8')); }
      catch { brainState = { sessions: 0, lastFiles: [], memoryFrequency: {} }; }
      
      brainState.sessions = (brainState.sessions || 0) + 1;
      brainState.lastAccess = new Date().toISOString();
      
      // 跟踪记忆访问频率（用于大脑自动学习）
      for (const mem of memories) {
        const key = mem.file;
        brainState.memoryFrequency = brainState.memoryFrequency || {};
        brainState.memoryFrequency[key] = (brainState.memoryFrequency[key] || 0) + 1;
      }
      
      fs.writeFileSync(BRAIN_STATE, JSON.stringify(brainState, null, 2));
    } catch { /* 非关键错误 */ }
  }

  /**
   * 获取状态报告
   */
  getStatus() {
    const data = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    const files = new Set(data.index.map(i => i.file));
    return {
      index: data.index.length,
      files: files.size,
      sessions: this.evolveLog.sessions,
      contradictions: this.evolveLog.contradictionsFound,
      lastEvolve: this.evolveLog.lastEvolve
    };
  }
}

// CLI接口
async function main() {
  const args = process.argv.slice(2);
  const context = args.join(' ') || process.env.MEMFLOW_CONTEXT || '';

  const evolve = new AutoEvolve();
  
  if (context) {
    // 分析模式：给定上下文，返回关联记忆
    const result = await evolve.analyzeSession(context);
    
    console.log(JSON.stringify({
      success: true,
      related: result.relatedMemories.map(m => ({
        file: m.file,
        score: (m.similarity * 100).toFixed(1),
        text: m.text.substring(0, 200)
      })),
      contradictions: result.contradictions,
      stats: result.stats
    }));
  } else {
    // 状态模式
    const status = evolve.getStatus();
    console.log(JSON.stringify(status, null, 2));
  }
}

if (require.main === module) {
  main().catch(e => {
    console.error(JSON.stringify({ success: false, error: e.message }));
    process.exit(1);
  });
}

module.exports = AutoEvolve;
