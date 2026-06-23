/**
 * 分层记忆系统
 * 基于《意识上传记忆系统・完整进化手册》实现
 */

const fs = require('fs');
const path = require('path');

class LayeredMemory {
  constructor(configPath = './config/advanced-memory.yaml') {
    this.config = this._loadConfig(configPath);
    this.layers = {};
    this.valueCore = null;
    this.synapseWeights = new Map();
    
    console.log('[LayeredMemory] 初始化分层记忆系统...');
  }
  
  _loadConfig(configPath) {
    try {
      const yaml = require('js-yaml');
      const fullPath = path.join(__dirname, '..', '..', configPath);
      return yaml.load(fs.readFileSync(fullPath, 'utf8'));
    } catch (error) {
      console.error('[LayeredMemory] 配置加载失败，使用默认配置:', error.message);
      return this._getDefaultConfig();
    }
  }
  
  _getDefaultConfig() {
    return {
      memory_layers: {
        work: { path: './memory/0_work', capacity: 10, ttl: 3600 },
        short: { path: './memory/1_short', ttl: 604800 },
        medium: { path: './memory/2_medium', organization: 'daily' },
        long: { path: './memory/3_long', format: 'rule' },
        semantic: { path: './memory/4_semantic', provider: 'zhipu' },
        decay: { path: './memory/5_decay', recovery_window: 2592000 }
      }
    };
  }
  
  /**
   * 初始化所有记忆层
   */
  async init() {
    console.log('[LayeredMemory] 初始化记忆层...');
    
    // 创建目录结构
    for (const [layerName, layerConfig] of Object.entries(this.config.memory_layers)) {
      const layerPath = path.join(__dirname, '..', '..', layerConfig.path);
      
      if (!fs.existsSync(layerPath)) {
        fs.mkdirSync(layerPath, { recursive: true });
        console.log(`  创建层: ${layerName} -> ${layerPath}`);
      }
      
      this.layers[layerName] = {
        config: layerConfig,
        path: layerPath,
        stats: {
          fileCount: 0,
          totalSize: 0,
          lastAccess: Date.now()
        }
      };
    }
    
    // 加载价值对齐层
    await this._loadValueCore();
    
    // 初始化突触权重
    await this._initSynapseWeights();
    
    console.log('[LayeredMemory] 初始化完成，共配置', Object.keys(this.layers).length, '个记忆层');
    return true;
  }
  
  /**
   * 加载价值对齐层
   */
  async _loadValueCore() {
    const valueCorePath = path.join(__dirname, '..', '..', 'value_core');
    
    if (!fs.existsSync(valueCorePath)) {
      console.warn('[LayeredMemory] 价值对齐层目录不存在，创建中...');
      fs.mkdirSync(valueCorePath, { recursive: true });
    }
    
    this.valueCore = {
      principles: this._loadJsonFile(path.join(valueCorePath, 'principles.json')),
      goals: this._loadJsonFile(path.join(valueCorePath, 'goals.json')),
      successMetrics: this._loadJsonFile(path.join(valueCorePath, 'success_metric.json'))
    };
    
    console.log('[LayeredMemory] 价值对齐层加载完成');
  }
  
  _loadJsonFile(filePath) {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return {};
  }
  
  /**
   * 初始化突触权重
   */
  async _initSynapseWeights() {
    const weightsFile = path.join(__dirname, '..', '..', 'data', 'synapse_weights.json');
    
    if (fs.existsSync(weightsFile)) {
      const weightsData = JSON.parse(fs.readFileSync(weightsFile, 'utf8'));
      for (const [memoryId, weight] of Object.entries(weightsData)) {
        this.synapseWeights.set(memoryId, weight);
      }
      console.log(`[LayeredMemory] 加载 ${this.synapseWeights.size} 个突触权重`);
    } else {
      console.log('[LayeredMemory] 无现有突触权重，初始化新系统');
    }
  }
  
  /**
   * 写入新记忆（智能判断存储层）
   */
  async writeMemory(content, metadata = {}) {
    const memoryId = this._generateMemoryId(content, metadata);
    const memoryRecord = {
      id: memoryId,
      content,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        source: metadata.source || 'user_input'
      },
      layer: null,
      weight: 0.5, // 初始权重
      valueAlignment: this._calculateValueAlignment(content, metadata)
    };
    
    // 1. 判断存储层
    const targetLayer = this._determineStorageLayer(memoryRecord);
    memoryRecord.layer = targetLayer;
    
    // 2. 计算初始权重
    memoryRecord.weight = this._calculateInitialWeight(memoryRecord);
    
    // 3. 存储到对应层
    await this._storeToLayer(targetLayer, memoryRecord);
    
    // 4. 更新突触权重
    this.synapseWeights.set(memoryId, memoryRecord.weight);
    
    // 5. 同步到语义层（如果配置了）
    if (this.config.memory_layers.semantic?.provider === 'zhipu') {
      await this._syncToSemanticLayer(memoryRecord);
    }
    
    console.log(`[LayeredMemory] 记忆写入完成: ${memoryId} -> ${targetLayer}, 权重: ${memoryRecord.weight.toFixed(3)}`);
    
    return {
      success: true,
      memoryId,
      layer: targetLayer,
      weight: memoryRecord.weight,
      valueAlignment: memoryRecord.valueAlignment
    };
  }
  
  /**
   * 判断存储层
   */
  _determineStorageLayer(memoryRecord) {
    const { content, metadata, valueAlignment } = memoryRecord;
    
    // 1. 工作记忆检查（当前任务相关）
    if (metadata.taskId || metadata.isActiveTask) {
      return 'work';
    }
    
    // 2. 价值对齐度检查（高价值 -> 长期）
    if (valueAlignment.score > 0.7) {
      return 'long';
    }
    
    // 3. 时间敏感性检查（最近事件 -> 短期）
    const hoursAgo = metadata.hoursAgo || 0;
    if (hoursAgo < 24) {
      return 'short';
    }
    
    // 4. 内容类型检查
    if (this._isRuleOrPrinciple(content)) {
      return 'long';
    }
    
    if (this._isEventOrNarrative(content)) {
      return 'medium';
    }
    
    // 默认：中期记忆
    return 'medium';
  }
  
  /**
   * 计算价值对齐度
   */
  _calculateValueAlignment(content, metadata) {
    if (!this.valueCore.principles) {
      return { score: 0.5, factors: [] };
    }
    
    const factors = [];
    let totalScore = 0;
    let maxPossible = 0;
    
    // 检查与核心原则的匹配
    for (const principle of this.valueCore.principles.core_principles || []) {
      const relevance = this._checkPrincipleRelevance(content, principle);
      if (relevance > 0) {
        factors.push({
          principle: principle.principle,
          relevance,
          weight: principle.weight_factor || 0.1
        });
        totalScore += relevance * (principle.weight_factor || 0.1);
        maxPossible += principle.weight_factor || 0.1;
      }
    }
    
    // 检查与当前目标的相关性
    if (this.valueCore.goals?.current_goals) {
      for (const goal of this.valueCore.goals.current_goals) {
        if (goal.priority >= 8) { // 高优先级目标
          const goalRelevance = this._checkGoalRelevance(content, goal);
          if (goalRelevance > 0) {
            const goalWeight = 0.15 * (goal.priority / 10);
            factors.push({
              goal: goal.goal,
              relevance: goalRelevance,
              weight: goalWeight
            });
            totalScore += goalRelevance * goalWeight;
            maxPossible += goalWeight;
          }
        }
      }
    }
    
    const score = maxPossible > 0 ? totalScore / maxPossible : 0.5;
    
    return {
      score: Math.min(Math.max(score, 0), 1),
      factors,
      interpretation: this._interpretValueAlignment(score)
    };
  }
  
  _checkPrincipleRelevance(content, principle) {
    const principleText = principle.principle.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // 简单关键词匹配（实际应该用更智能的方法）
    if (principleText.includes('决策') && (
      contentLower.includes('决定') || 
      contentLower.includes('选择') ||
      contentLower.includes('方案')
    )) {
      return 0.8;
    }
    
    if (principleText.includes('真实') && (
      contentLower.includes('事实') ||
      contentLower.includes('准确') ||
      contentLower.includes('验证')
    )) {
      return 0.7;
    }
    
    if (principleText.includes('隐私') && (
      contentLower.includes('私人') ||
      contentLower.includes('保密') ||
      contentLower.includes('敏感')
    )) {
      return 0.9;
    }
    
    return 0.1; // 基础相关性
  }
  
  _checkGoalRelevance(content, goal) {
    const goalText = goal.goal.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // 检查内容是否与目标相关
    for (const keyword of goalText.split(' ')) {
      if (keyword.length > 3 && contentLower.includes(keyword)) {
        return 0.6;
      }
    }
    
    // 检查成功指标
    for (const metric of goal.success_metrics || []) {
      if (contentLower.includes(metric.toLowerCase())) {
        return 0.8;
      }
    }
    
    return 0.1;
  }
  
  _interpretValueAlignment(score) {
    if (score >= 0.8) return '高度符合价值核心';
    if (score >= 0.6) return '较好符合价值核心';
    if (score >= 0.4) return '基本符合价值核心';
    if (score >= 0.2) return '部分符合价值核心';
    return '与价值核心关联较弱';
  }
  
  /**
   * 计算初始权重
   */
  _calculateInitialWeight(memoryRecord) {
    let weight = 0.5; // 基础权重
    
    // 1. 价值对齐度贡献
    weight += memoryRecord.valueAlignment.score * 0.3;
    
    // 2. 时间新鲜度贡献（最近的事件权重更高）
    const hoursAgo = memoryRecord.metadata.hoursAgo || 0;
    const timeFactor = Math.max(0, 1 - (hoursAgo / 168)); // 一周衰减
    weight += timeFactor * 0.2;
    
    // 3. 来源可信度贡献
    const sourceCredibility = this._getSourceCredibility(memoryRecord.metadata.source);
    weight += sourceCredibility * 0.1;
    
    // 4. 内容质量贡献
    const contentQuality = this._assessContentQuality(memoryRecord.content);
    weight += contentQuality * 0.1;
    
    return Math.min(Math.max(weight, 0.1), 1.0);
  }
  
  _getSourceCredibility(source) {
    const credibilityMap = {
      'user_input': 0.9,
      'system_generated': 0.7,
      'external_api': 0.6,
      'web_crawled': 0.5,
      'unknown': 0.3
    };
    
    return credibilityMap[source] || 0.5;
  }
  
  _assessContentQuality(content) {
    // 简单质量评估
    const length = content.length;
    if (length < 10) return 0.2; // 太短
    if (length > 1000) return 0.8; // 详细
    if (length > 100) return 0.6; // 适中
    
    // 检查结构
    const hasStructure = content.includes('\n') || content.includes('。') || content.includes('. ');
    return hasStructure ? 0.7 : 0.4;
  }
  
  _isRuleOrPrinciple(content) {
    const ruleIndicators = ['规则', '原则', '方法', '步骤', '应该', '必须', '不要'];
    return ruleIndicators.some(indicator => content.includes(indicator));
  }
  
  _isEventOrNarrative(content) {
    const eventIndicators = ['今天', '昨天', '会议', '讨论', '发生', '事件'];
    return eventIndicators.some(indicator => content.includes(indicator));
  }
  
  _generateMemoryId(content, metadata) {
    const timestamp = Date.now();
    const contentHash = require('crypto')
      .createHash('md5')
      .update(content.substring(0, 100))
      .digest('hex')
      .substring(0, 8);
    
    return `mem_${timestamp}_${contentHash}`;
  }
  
  async _storeToLayer(layerName, memoryRecord) {
    const layer = this.layers[layerName];
    if (!layer) {
      throw new Error(`记忆层不存在: ${layerName}`);
    }
    
    const filename = `${memoryRecord.id}.json`;
    const filepath = path.join(layer.path, filename);
    
    // 检查容量限制
    if (layer.config.capacity) {
      const currentFiles = fs.readdirSync(layer.path).filter(f => f.endsWith('.json'));
      if (currentFiles.length >= layer.config.capacity) {
        await this._evictFromLayer(layerName);
      }
    }
    
    // 写入文件
    fs.writeFileSync(filepath, JSON.stringify(memoryRecord, null, 2), 'utf8');
    
    // 更新统计
    layer.stats.fileCount++;
    layer.stats.totalSize += Buffer.byteLength(JSON.stringify(memoryRecord));
    layer.stats.lastAccess = Date.now();
    
    return filepath;
  }
  
  async _evictFromLayer(layerName) {
    const layer = this.layers[layerName];
    const files = fs.readdirSync(layer.path).filter(f => f.endsWith('.json'));
    
    if (files.length === 0) return;
    
    // 简单策略：删除最旧的文件
    const oldestFile = files.sort()[0];
    const filepath = path.join(layer.path, oldestFile);
    
    // 读取文件获取memoryId
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const memoryRecord = JSON.parse(content);
      
      // 移动到遗忘池
      await this._moveToDecayPool(memoryRecord);
      
      // 删除原文件
      fs.unlinkSync(filepath);
      
      console.log(`[LayeredMemory] ${layerName}层已驱逐: ${memoryRecord.id}`);
    } catch (error) {
      console.error(`[LayeredMemory] 驱逐文件失败: ${filepath}`, error.message);
    }
  }
  
  async _moveToDecayPool(memoryRecord) {
    const decayLayer = this.layers.decay;
    if (!decayLayer) return;
    
    const filename = `${memoryRecord.id}_decayed.json`;
    const filepath = path.join(decayLayer.path, filename);
    
    // 标记为已遗忘
    memoryRecord.decayed = true;
    memoryRecord.decayTimestamp = new Date().toISOString();
    memoryRecord.recoveryDeadline = new Date(Date.now() + (decayLayer.config.recovery_window || 2592000) * 1000).toISOString();
    
    fs.writeFileSync(filepath, JSON.stringify(memoryRecord, null, 2), 'utf8');
  }
  
  async _syncToSemanticLayer(memoryRecord) {
    // 这里应该调用智谱AI API进行语义索引
    // 暂时记录日志
    console.log(`[LayeredMemory] 语义层同步: ${memoryRecord.id}`);
  }
  
  /**
   * 跨层搜索记忆
   */
  async searchMemory(query, options = {}) {
    const startTime = Date.now();
    const results = [];
    
    // 确定搜索哪些层
    const layersToSearch = options.layers || ['work', 'short', 'medium', 'long'];
    
    for (const layerName of layersToSearch) {
      const layerResults = await this._searchLayer(layerName, query);
      results.push(...layerResults);
    }
    
    // 按权重排序
    results.sort((a, b) => {
      const weightA = this.synapseWeights.get(a.id) || 0.5;
      const weightB = this.synapseWeights.get(b.id) || 0.5;
      return weightB - weightA;
    });
    
    // 限制结果数量
    const maxResults = options.maxResults || 10;
    const finalResults = results.slice(0, maxResults);
    
    // 更新突触权重（被调用）
    for (const result of finalResults) {
      this._updateSynapseWeight(result.id, 'recalled');
    }
    
    const duration = Date.now() - startTime;
    
    console.log(`[LayeredMemory] 搜索完成: "${query}", ${finalResults.length} 结果, ${duration}ms`);
    
    return {
      success: true,
