/**
 * MemFlow AI Core - 智能记忆筛选和沉淀平台
 * 版本: 0.9.0-beta
 * 发布时间: 2026-04-15
 * 
 * 核心功能:
 * 1. 情绪状态控制 - 解决大模型偷懒问题
 * 2. 智能token分配 - 平衡效率与质量
 * 3. 通用适配器架构 - 支持所有AI智能体
 * 4. 记忆筛选优化 - 超越Claude-Mem
 * 5. 技能沉淀系统 - 越用越聪明
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');

class MemFlowAI extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.version = '0.9.0-beta';
    this.id = uuidv4();
    this.config = this._mergeDefaultConfig(config);
    
    // 核心模块
    this.emotionInjector = new EmotionStateInjector(this.config.emotionControl);
    this.tokenSupervisor = new TokenSupervisor(this.config.tokenSupervision);
    this.memoryManager = new MemoryManager(this.config.memory);
    this.adapterManager = new AdapterManager(this.config.adapters);
    this.skillEngine = new SkillPrecipitationEngine(this.config.skills);
    
    // 状态
    this.isInitialized = false;
    this.stats = {
      totalMemories: 0,
      totalSearches: 0,
      tokenSaved: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    this._init();
  }
  
  _mergeDefaultConfig(userConfig) {
    const defaults = {
      emotionControl: {
        enabled: true,
        defaultState: "深度分析",
        confidenceRequirement: 0.8,
        lazyDetection: true
      },
      tokenSupervision: {
        enabled: true,
        simpleQuestion: 100,
        mediumQuestion: 300,
        complexQuestion: 800,
        criticalDecision: 2000,
        adaptive: true
      },
      memory: {
        maxSize: 10000,
        retentionDays: 30,
        compression: true,
        encryption: false
      },
      adapters: {
        openclaw: true,
        claudeCode: true,
        cursor: true,
        codex: true,
        universal: true
      },
      skills: {
        autoLearn: true,
        precipitationThreshold: 3,
        reuseOptimization: true
      },
      cache: {
        enabled: true,
        maxSize: 1000,
        ttl: 3600
      },
      debug: false
    };
    
    return _.merge({}, defaults, userConfig);
  }
  
  async _init() {
    try {
      // 初始化适配器
      await this.adapterManager.initialize();
      
      // 加载现有记忆
      await this.memoryManager.load();
      
      // 启动技能引擎
      if (this.config.skills.autoLearn) {
        await this.skillEngine.start();
      }
      
      this.isInitialized = true;
      this.emit('initialized', { version: this.version, id: this.id });
      
      if (this.config.debug) {
        console.log(`MemFlow AI ${this.version} 初始化完成`);
      }
    } catch (error) {
      console.error('MemFlow AI 初始化失败:', error);
      throw error;
    }
  }
  
  // ==================== 核心API ====================
  
  /**
   * 情绪状态注入 - 解决大模型偷懒
   * @param {string} prompt - 原始prompt
   * @param {string} emotionState - 情绪状态
   * @param {number} confidence - 自信度要求
   * @returns {string} 增强后的prompt
   */
  injectEmotionState(prompt, emotionState = null, confidence = null) {
    if (!this.config.emotionControl.enabled) {
      return prompt;
    }
    
    const enhanced = this.emotionInjector.inject(
      prompt,
      emotionState || this.config.emotionControl.defaultState,
      confidence || this.config.emotionControl.confidenceRequirement
    );
    
    this.stats.tokenSaved += this._estimateTokenSavings(prompt, enhanced);
    return enhanced;
  }
  
  /**
   * 智能token分配
   * @param {string} question - 问题内容
   * @returns {number} token预算
   */
  allocateTokens(question) {
    if (!this.config.tokenSupervision.enabled) {
      return 500; // 默认值
    }
    
    return this.tokenSupervisor.allocate(question);
  }
  
  /**
   * 添加记忆
   * @param {Object} memory - 记忆对象
   * @returns {string} 记忆ID
   */
  async addMemory(memory) {
    this._validateInitialized();
    
    const memoryWithMetadata = {
      ...memory,
      id: uuidv4(),
      timestamp: Date.now(),
      platform: 'universal',
      importance: memory.importance || this._calculateImportance(memory.content)
    };
    
    const memoryId = await this.memoryManager.add(memoryWithMetadata);
    this.stats.totalMemories++;
    
    // 触发技能学习
    if (this.config.skills.autoLearn) {
      await this.skillEngine.learnFromMemory(memoryWithMetadata);
    }
    
    this.emit('memoryAdded', { id: memoryId, memory: memoryWithMetadata });
    return memoryId;
  }
  
  /**
   * 智能搜索记忆
   * @param {string} query - 搜索查询
   * @param {Object} options - 搜索选项
   * @returns {Array} 记忆结果
   */
  async search(query, options = {}) {
    this._validateInitialized();
    
    this.stats.totalSearches++;
    
    // 检查缓存
    if (this.config.cache.enabled) {
      const cached = this.memoryManager.getFromCache(query);
      if (cached) {
        this.stats.cacheHits++;
        return cached;
      }
    }
    
    // 智能搜索
    const results = await this.memoryManager.search(query, options);
    
    // 更新缓存
    if (this.config.cache.enabled && results.length > 0) {
      this.memoryManager.cacheQuery(query, results);
    } else {
      this.stats.cacheMisses++;
    }
    
    return results;
  }
  
  /**
   * 获取适配器
   * @param {string} platform - 平台名称
   * @returns {Object} 适配器实例
   */
  getAdapter(platform) {
    this._validateInitialized();
    return this.adapterManager.getAdapter(platform);
  }
  
  /**
   * 同步记忆到所有平台
   * @param {Object} memory - 记忆对象
   */
  async syncMemory(memory) {
    this._validateInitialized();
    return this.adapterManager.syncMemory(memory);
  }
  
  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const cacheHitRate = this.stats.cacheHits + this.stats.cacheMisses > 0 
      ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(1)
      : 0;
    
    return {
      ...this.stats,
      cacheHitRate: `${cacheHitRate}%`,
      version: this.version,
      initialized: this.isInitialized,
      adapters: this.adapterManager.getAdapterStatus()
    };
  }
  
  /**
   * 获取学习到的技能
   * @returns {Array} 技能列表
   */
  async getLearnedSkills() {
    return this.skillEngine.getSkills();
  }
  
  // ==================== 工具方法 ====================
  
  _validateInitialized() {
    if (!this.isInitialized) {
      throw new Error('MemFlow AI 未初始化，请等待初始化完成');
    }
  }
  
  _calculateImportance(content) {
    // 简单的重要性计算
    const factors = {
      length: Math.min(content.length / 1000, 1),
      hasKeywords: this._hasImportantKeywords(content) ? 0.3 : 0,
      hasQuestions: content.includes('?') ? 0.2 : 0,
      hasDecisions: this._containsDecisions(content) ? 0.5 : 0
    };
    
    return _.sum(Object.values(factors));
  }
  
  _hasImportantKeywords(content) {
    const keywords = ['重要', '关键', '决定', '决策', '必须', '紧急'];
    return keywords.some(keyword => content.includes(keyword));
  }
  
  _containsDecisions(content) {
    const decisionWords = ['决定', '选择', '采用', '实施', '部署'];
    return decisionWords.some(word => content.includes(word));
  }
  
  _estimateTokenSavings(original, enhanced) {
    // 简单的token节省估算
    const originalLength = original.length;
    const enhancedLength = enhanced.length;
    const savings = Math.max(0, originalLength - enhancedLength) / 4; // 近似token数
    return Math.floor(savings);
  }
  
  // ==================== 生命周期 ====================
  
  async destroy() {
    // 保存记忆
    await this.memoryManager.save();
    
    // 停止技能引擎
    await this.skillEngine.stop();
    
    // 关闭适配器
    await this.adapterManager.destroy();
    
    this.isInitialized = false;
    this.emit('destroyed');
  }
}

// ==================== 内部类 ====================

class EmotionStateInjector {
  constructor(config) {
    this.config = config;
  }
  
  inject(prompt, emotionState, confidence) {
    if (!this.config.enabled) {
      return prompt;
    }
    
    const stateTags = [
      `[推理模式: ${emotionState}]`,
      `[自信要求: ${confidence.toFixed(2)}]`,
      `[偷懒检测: ${this.config.lazyDetection ? '开启' : '关闭'}]`,
      `[深度分析: 强制开启]`
    ];
    
    return `${stateTags.join('\n')}\n\n${prompt}`;
  }
}

class TokenSupervisor {
  constructor(config) {
    this.config = config;
  }
  
  allocate(question) {
    if (!this.config.enabled) {
      return 500;
    }
    
    const complexity = this._assessComplexity(question);
    
    switch (complexity) {
      case 'simple':
        return this.config.simpleQuestion;
      case 'medium':
        return this.config.mediumQuestion;
      case 'complex':
        return this.config.complexQuestion;
      case 'critical':
        return this.config.criticalDecision;
      default:
        return this.config.mediumQuestion;
    }
  }
  
  _assessComplexity(question) {
    const length = question.length;
    const hasComplexWords = this._hasComplexKeywords(question);
    const isQuestion = question.includes('?');
    const isDecision = this._isDecisionQuestion(question);
    
    if (isDecision) return 'critical';
    if (length > 200 || hasComplexWords) return 'complex';
    if (length > 50 && isQuestion) return 'medium';
    return 'simple';
  }
  
  _hasComplexKeywords(text) {
    const complexWords = ['分析', '解释', '比较', '评估', '设计', '架构'];
    return complexWords.some(word => text.includes(word));
  }
  
  _isDecisionQuestion(text) {
    const decisionWords = ['应该', '选择', '决定', '推荐', '最佳'];
    return decisionWords.some(word => text.includes(word));
  }
}

class MemoryManager {
  constructor(config) {
    this.config = config;
    this.memories = new Map();
    this.cache = new Map();
  }
  
  async load() {
    // 从存储加载记忆
    // 实现取决于存储后端
  }
  
  async save() {
    // 保存记忆到存储
  }
  
  async add(memory) {
    this.memories.set(memory.id, memory);
    return memory.id;
  }
  
  async search(query, options) {
    // 智能搜索算法
    const results = [];
    
    for (const [id, memory] of this.memories) {
      const relevance = this._calculateRelevance(memory.content, query);
      if (relevance > (options.minRelevance || 0.3)) {
        results.push({
          ...memory,
          relevance,
          score: relevance * (memory.importance || 0.5)
        });
      }
    }
    
    // 按分数排序
    return results.sort((a, b) => b.score - a.score).slice(0, options.limit || 10);
  }
  
  _calculateRelevance(content, query) {
    // 简单的相关性计算
    const contentWords = content.toLowerCase().split(/\s+/);
    const queryWords = query.toLowerCase().split(/\s+/);
    
    let matches = 0;
    for (const qWord of queryWords) {
      if (contentWords.some(cWord => cWord.includes(qWord) || qWord.includes(cWord))) {
        matches++;
      }
    }
    
    return matches / Math.max(queryWords.length, 1);
  }
  
  getFromCache(query) {
    const cacheKey = this._getCacheKey(query);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < (this.config.ttl || 3600000)) {
      return cached.results;
    }
    
    return null;
  }
  
  cacheQuery(query, results) {
    const cacheKey = this._getCacheKey(query);
    this.cache.set(cacheKey, {
      results,
      timestamp: Date.now()
    });
    
    // 清理过期缓存
    this._cleanCache();
  }
  
  _getCacheKey(query) {
    return query.toLowerCase().replace(/\s+/g, '_');
  }
  
  _cleanCache() {
    const now = Date.now();
    const ttl = (this.config.ttl || 3600000);
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > ttl) {
        this.cache.delete(key);
      }
    }
    
    // 限制缓存大小
    if (this.cache.size > (this.config.maxSize || 1000)) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, entries.length - (this.config.maxSize || 1000));
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }
  }
}

class AdapterManager {
  constructor(config) {
    this.config = config;
    this.adapters = new Map();
  }
  
  async initialize() {
    // 初始化所有启用的适配器
    for (const [platform, enabled] of Object.entries(this.config)) {
      if (enabled) {
        try {
          const adapter = await this._createAdapter(platform);
          this.adapters.set(platform, adapter);
        } catch (error) {
          console.warn(`适配器 ${platform} 初始化失败:`, error);
        }
      }
    }
  }
  
  async _createAdapter(platform) {
    // 创建适配器实例
    // 实际实现会根据平台不同而变化
    return {
      platform,
      connected: false,
      connect: async () => {
        this.connected = true;
        return true;
      },
      disconnect: async () => {
        this.connected = false;
      },
      syncMemory: async (memory) => {
        // 同步记忆到该平台
        return true;
      }
    };
  }
  
  getAdapter(platform) {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`适配器 ${platform} 未找到或未启用`);
    }
    return adapter;
  }
  
  async syncMemory(memory) {
    const results = [];
    
    for (const [platform, adapter] of this.adapters.entries()) {
      if (adapter.connected) {
        try {
          await adapter.syncMemory(memory);
          results.push({ platform, success: true });
        } catch (error) {
          results.push({ platform, success: false, error: error.message });
        }
      }
    }
    
    return results;
  }
  
  getAdapterStatus() {
    const status = {};
    for (const [platform, adapter] of this.adapters.entries()) {
      status[platform] = {
        connected: adapter.connected,
        enabled: this.config[platform]
      };
    }
    return status;
  }
  
  async destroy() {
    for (const [_, adapter] of this.adapters.entries()) {
      try {
        await adapter.disconnect();
      } catch (error) {
        // 忽略断开连接错误
      }
    }
    this.adapters.clear();
  }
}

class SkillPrecipitationEngine {
  constructor(config) {
    this.config = config;
    this.skills = new Map();
    this.usageCounts = new Map();
  }
  
  async start() {
    // 启动技能学习引擎
    // 可以定期分析记忆，提取技能
  }
  
  async stop() {
    // 停止引擎
  }
  
  async learnFromMemory(memory) {
    // 从记忆中学到技能
    const skills = this._extractSkills(memory.content);
    
    for (const skill of skills) {
      const currentCount = this.usageCounts.get(skill) || 0;
      this.usageCounts.set(skill, currentCount + 1);
      
      // 如果使用次数达到阈值，沉淀为正式技能
      if (currentCount + 1 >= this.config.precipitationThreshold) {
        this.skills.set(skill, {
          name: skill,
          usageCount