/**
 * MemFlow AI + 数字大脑集成模块
 * 将神经科学模拟与实际记忆系统结合
 */

const { DigitalBrain } = require('../digital-brain');
const { SearchEngine } = require('../search/engine');
const { EmbeddingManager } = require('../embedding');

class MemFlowBrainIntegration {
  constructor(config = {}) {
    this.config = {
      // MemFlow AI配置
      memflow: {
        dbPath: config.memflow?.dbPath || './data/memflow.db',
        searchMode: config.memflow?.searchMode || 'hybrid',
        maxResults: config.memflow?.maxResults || 10
      },
      
      // 数字大脑配置
      brain: {
        simulationSpeed: config.brain?.simulationSpeed || 1, // 模拟速度倍数
        enableLearning: config.brain?.enableLearning !== false,
        consciousnessThreshold: config.brain?.consciousnessThreshold || 0.3
      },
      
      // 集成配置
      integration: {
        memoryToNeuronRatio: config.integration?.memoryToNeuronRatio || 0.1, // 每个记忆对应的神经元比例
        attentionBasedRecall: config.integration?.attentionBasedRecall !== false,
        predictiveLoading: config.integration?.predictiveLoading !== false
      },
      
      ...config
    };
    
    // 组件
    this.digitalBrain = null;
    this.searchEngine = null;
    this.embeddingManager = null;
    
    // 状态
    this.integrationState = {
      initialized: false,
      memoryNeuronMap: new Map(), // 记忆ID -> 神经元集群映射
      neuronMemoryMap: new Map(), // 神经元ID -> 记忆ID映射
      lastRecall: 0,
      totalIntegrations: 0
    };
    
    console.log('[MemFlowBrain] 集成系统初始化');
  }
  
  /**
   * 初始化集成系统
   */
  async init() {
    console.log('[MemFlowBrain] 开始初始化集成系统...');
    
    try {
      // 1. 初始化MemFlow AI组件
      console.log('   1. 初始化MemFlow AI...');
      await this._initMemFlowAI();
      
      // 2. 初始化数字大脑
      console.log('   2. 初始化数字大脑...');
      await this._initDigitalBrain();
      
      // 3. 建立记忆-神经元映射
      console.log('   3. 建立记忆-神经元映射...');
      await this._createMemoryNeuronMapping();
      
      // 4. 启动集成运行
      console.log('   4. 启动集成运行...');
      await this._startIntegrationRuntime();
      
      this.integrationState.initialized = true;
      console.log('[MemFlowBrain] ✅ 集成系统初始化完成');
      
      return {
        success: true,
        memflowReady: !!this.searchEngine,
        brainReady: !!this.digitalBrain,
        mappings: this.integrationState.memoryNeuronMap.size
      };
      
    } catch (error) {
      console.error('[MemFlowBrain] ❌ 集成初始化失败:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 初始化MemFlow AI
   */
  async _initMemFlowAI() {
    // 嵌入管理器
    this.embeddingManager = new EmbeddingManager({
      provider: 'zhipu',
      apiKey: process.env.ZHIPU_API_KEY,
      proxy: process.env.HTTPS_PROXY
    });
    
    // 搜索引擎
    this.searchEngine = new SearchEngine({
      dbPath: this.config.memflow.dbPath,
      maxResults: this.config.memflow.maxResults,
      searchMode: this.config.memflow.searchMode
    });
    
    this.searchEngine.setEmbeddingManager(this.embeddingManager);
    await this.searchEngine.init();
    
    // 检查数据库状态
    const stats = await this.searchEngine.getSearchStats();
    console.log(`   MemFlow AI就绪: ${stats.totalChunks} 个记忆块`);
    
    return true;
  }
  
  /**
   * 初始化数字大脑
   */
  async _initDigitalBrain() {
    this.digitalBrain = new DigitalBrain();
    
    // 根据MemFlow记忆数量调整大脑规模
    const memflowStats = await this.searchEngine.getSearchStats();
    const estimatedNeurons = Math.max(
      1000,
      Math.floor(memflowStats.totalChunks * this.config.integration.memoryToNeuronRatio)
    );
    
    console.log(`   数字大脑配置: 基于 ${memflowStats.totalChunks} 记忆块，估计需要 ${estimatedNeurons} 神经元`);
    
    // 这里可以优化：根据记忆数量动态调整脑区规模
    // 暂时使用默认配置
    
    return true;
  }
  
  /**
   * 创建记忆-神经元映射
   */
  async _createMemoryNeuronMapping() {
    // 从数据库获取所有记忆块
    // 这里简化：实际应该分批处理
    
    console.log('   创建记忆到神经元的映射关系...');
    
    // 模拟映射创建
    const sampleMappings = [
      { memoryId: 'mem_001', neuronCluster: 'prefrontal_working_memory', strength: 0.8 },
      { memoryId: 'mem_002', neuronCluster: 'hippocampus_encoding', strength: 0.7 },
      { memoryId: 'mem_003', neuronCluster: 'neocortex_sensory', strength: 0.6 }
    ];
    
    for (const mapping of sampleMappings) {
      this.integrationState.memoryNeuronMap.set(mapping.memoryId, {
        cluster: mapping.neuronCluster,
        strength: mapping.strength,
        lastActivated: 0
      });
      
      // 反向映射
      if (!this.integrationState.neuronMemoryMap.has(mapping.neuronCluster)) {
        this.integrationState.neuronMemoryMap.set(mapping.neuronCluster, []);
      }
      this.integrationState.neuronMemoryMap.get(mapping.neuronCluster).push(mapping.memoryId);
    }
    
    console.log(`   创建了 ${this.integrationState.memoryNeuronMap.size} 个映射关系`);
  }
  
  /**
   * 启动集成运行
   */
  async _startIntegrationRuntime() {
    // 启动定期同步
    this._startPeriodicSync();
    
    // 启动大脑模拟
    this._startBrainSimulation();
    
    console.log('   集成运行时已启动');
  }
  
  /**
   * 启动定期同步
   */
  _startPeriodicSync() {
    const syncInterval = 30000; // 30秒同步一次
    
    this.syncTimer = setInterval(() => {
      this._syncMemoryAndBrain().catch(error => {
        console.error('[MemFlowBrain] 同步失败:', error.message);
      });
    }, syncInterval);
    
    console.log(`   定期同步已设置: ${syncInterval}ms间隔`);
  }
  
  /**
   * 启动大脑模拟
   */
  _startBrainSimulation() {
    const simulationInterval = 100; // 每100ms模拟一步
    
    this.brainTimer = setInterval(() => {
      this._runBrainStep();
    }, simulationInterval / this.config.brain.simulationSpeed);
    
    console.log(`   大脑模拟已启动: ${simulationInterval}ms/步`);
  }
  
  /**
   * 运行大脑步骤
   */
  _runBrainStep() {
    if (!this.digitalBrain) return;
    
    const stepResult = this.digitalBrain.step();
    
    // 检查是否有活跃的神经元集群
    this._checkActiveClusters(stepResult);
    
    // 定期记录状态
    if (stepResult.time % 1000 === 0) {
      this._logIntegrationState(stepResult);
    }
  }
  
  /**
   * 检查活跃集群并触发记忆召回
   */
  _checkActiveClusters(brainState) {
    // 这里应该分析brainState中的活跃集群
    // 然后触发相关记忆的预加载
    
    // 简化实现：随机检查
    if (Math.random() < 0.1 && this.config.integration.predictiveLoading) {
      this._triggerPredictiveRecall();
    }
  }
  
  /**
   * 触发预测性召回
   */
  async _triggerPredictiveRecall() {
    // 基于当前大脑状态预测可能需要哪些记忆
    const predictedTopics = this._predictTopicsFromBrainState();
    
    if (predictedTopics.length > 0) {
      console.log(`[MemFlowBrain] 预测性召回: ${predictedTopics.join(', ')}`);
      
      // 预加载相关记忆
      for (const topic of predictedTopics) {
        await this._preloadRelatedMemories(topic);
      }
    }
  }
  
  /**
   * 从大脑状态预测主题
   */
  _predictTopicsFromBrainState() {
    const topics = [];
    
    if (!this.digitalBrain) return topics;
    
    const brainState = this.digitalBrain.getBrainState();
    
    // 基于脑区活动预测
    if (brainState.regionStates.prefrontal?.activeRatio > 0.3) {
      topics.push('工作记忆', '决策', '计划');
    }
    
    if (brainState.regionStates.hippocampus?.activeRatio > 0.3) {
      topics.push('记忆', '学习', '经验');
    }
    
    if (brainState.regionStates.amygdala?.activeRatio > 0.4) {
      topics.push('情绪', '重要事件', '个人经历');
    }
    
    // 基于全局状态预测
    if (brainState.globalState.focus > 0.7) {
      topics.push('专注任务', '技术细节', '解决方案');
    }
    
    if (brainState.globalState.mood > 0.7) {
      topics.push('积极经历', '成功案例', '愉快记忆');
    }
    
    return [...new Set(topics)]; // 去重
  }
  
  /**
   * 预加载相关记忆
   */
  async _preloadRelatedMemories(topic) {
    try {
      const results = await this.searchEngine.search(topic, {
        maxResults: 5,
        mode: 'semantic'
      });
      
      if (results.results && results.results.length > 0) {
        // 标记这些记忆为预加载
        for (const result of results.results) {
          const memoryId = result.id || result.metadata?.filename;
          if (memoryId && this.integrationState.memoryNeuronMap.has(memoryId)) {
            const mapping = this.integrationState.memoryNeuronMap.get(memoryId);
            mapping.lastActivated = Date.now();
            mapping.preloaded = true;
            
            // 增强相关神经元连接
            this._strengthenNeuronConnections(mapping.cluster);
          }
        }
        
        console.log(`[MemFlowBrain] 预加载 ${results.results.length} 个相关记忆`);
      }
    } catch (error) {
      console.error('[MemFlowBrain] 预加载失败:', error.message);
    }
  }
  
  /**
   * 增强神经元连接
   */
  _strengthenNeuronConnections(clusterName) {
    // 这里应该调用数字大脑API增强特定集群的连接
    // 暂时记录日志
    console.log(`[MemFlowBrain] 增强神经元集群连接: ${clusterName}`);
  }
  
  /**
   * 同步记忆和大脑状态
   */
  async _syncMemoryAndBrain() {
    console.log('[MemFlowBrain] 开始记忆-大脑同步...');
    
    try {
      // 1. 检查新记忆
      const newMemories = await this._checkForNewMemories();
      
      if (newMemories.length > 0) {
        console.log(`   发现 ${newMemories.length} 个新记忆，更新大脑映射`);
        await this._integrateNewMemories(newMemories);
      }
      
      // 2. 更新记忆权重（基于大脑活动）
      await this._updateMemoryWeightsFromBrainActivity();
      
      // 3. 清理旧映射
      await this._cleanupOldMappings();
      
      this.integrationState.totalIntegrations++;
      
      console.log(`[MemFlowBrain] ✅ 同步完成，总集成次数: ${this.integrationState.totalIntegrations}`);
      
    } catch (error) {
      console.error('[MemFlowBrain] 同步失败:', error.message);
    }
  }
  
  /**
   * 检查新记忆
   */
  async _checkForNewMemories() {
    // 这里应该查询数据库获取新记忆
    // 暂时返回模拟数据
    return [
      { id: `new_mem_${Date.now()}_1`, content: '新的工作记忆', type: 'work' },
      { id: `new_mem_${Date.now()}_2`, content: '学习经验总结', type: 'learning' }
    ];
  }
  
  /**
   * 集成新记忆
   */
  async _integrateNewMemories(newMemories) {
    for (const memory of newMemories) {
      // 确定合适的神经元集群
      const targetCluster = this._determineTargetCluster(memory);
      
      // 创建映射
      this.integrationState.memoryNeuronMap.set(memory.id, {
        cluster: targetCluster,
        strength: 0.5, // 初始强度
        lastActivated: Date.now(),
        createdAt: Date.now()
      });
      
      // 更新反向映射
      if (!this.integrationState.neuronMemoryMap.has(targetCluster)) {
        this.integrationState.neuronMemoryMap.set(targetCluster, []);
      }
      this.integrationState.neuronMemoryMap.get(targetCluster).push(memory.id);
      
      console.log(`   集成新记忆: ${memory.id} -> ${targetCluster}`);
    }
  }
  
  /**
   * 确定目标神经元集群
   */
  _determineTargetCluster(memory) {
    // 基于记忆类型确定集群
    switch (memory.type) {
      case 'work':
      case 'task':
        return 'prefrontal_working_memory';
      
      case 'learning':
      case 'experience':
        return 'hippocampus_encoding';
      
      case 'emotion':
      case 'personal':
        return 'amygdala_emotion';
      
      case 'technical':
      case 'solution':
        return 'neocortex_sensory';
      
      default:
        // 基于内容分析
        if (memory.content.includes('记忆') || memory.content.includes('记住')) {
          return 'hippocampus_encoding';
        } else if (memory.content.includes('决定') || memory.content.includes('选择')) {
          return 'prefrontal_decision';
        } else {
          return 'neocortex_association';
        }
    }
  }
  
  /**
   * 基于大脑活动更新记忆权重
   */
  async _updateMemoryWeightsFromBrainActivity() {
    if (!this.digitalBrain) return;
    
    const brainState = this.digitalBrain.getBrainState();
    
    // 遍历所有映射，根据相关脑区活动调整权重
    for (const [memoryId, mapping] of this.integrationState.memoryNeuronMap) {
      const cluster = mapping.cluster;
      const [region, ensemble] = cluster.split('_');
      
      // 获取脑区活动水平
      const regionState = brainState.regionStates[region];
      if (regionState && regionState.activeRatio > 0) {
        // 活动水平影响记忆权重
        const activityFactor = regionState.activeRatio;
        const timeDecay = 0.99; // 时间衰减
        
        mapping.strength = Math.min(1, mapping.strength * timeDecay + activityFactor * 0.05);
        mapping.lastActivated = Date.now();
        
        // 如果权重过低，考虑移动到遗忘池
        if (mapping.strength < 0.1 && mapping.createdAt < Date.now() - 604800000) { // 一周前
          console.log(`   记忆 ${memoryId} 权重过低，标记为待遗忘`);
          mapping.markedForForgetting = true;
        }
      }
    }
  }
  
  /**
   * 清理旧映射
   */
  async _cleanupOldMappings() {
    const now = Date.now();
    const oneWeekAgo = now - 604800000;
    
    let cleanedCount = 0;
    
    for (const [memoryId, mapping] of this.integrationState.memoryNeuronMap) {
      if (mapping.markedForForgetting && mapping.lastActivated < oneWeekAgo) {
        // 从映射中移除
        this.integrationState.memoryNeuronMap.delete(memoryId);
        
        // 从反向映射中移除
        const cluster = mapping.cluster;
        if (this.integrationState.neuronMemoryMap.has(cluster)) {
          const memories = this.integrationState.neuronMemoryMap.get(cluster);
          const index = memories.indexOf(memoryId);
          if (index > -1) {
            memories.splice(index, 1);
          }
        }
        
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`   清理了 ${cleanedCount} 个旧记忆映射`);
    }
  }
  
  /**
   * 记录集成状态
   */
  _logIntegrationState(brainState) {
    const stats = {
      time: brainState.time,
      memoryMappings: this.integrationState.memoryNeuronMap.size,
      activeClusters: Object.keys(brainState.regionResults || {}).length,
      globalArousal: brainState.globalState?.arousal?.toFixed(3),
      globalFocus: brainState.globalState?.focus?.toFixed(3),
      consciousness: brainState.globalState?.consciousness?.toFixed(3)
    };
    
    console.log('[MemFlowBrain] 集成状态