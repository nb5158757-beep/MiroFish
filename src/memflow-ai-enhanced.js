/**
 * MemFlow AI 增强版 - 主系统文件
 * 集成所有MemPalace算法和高级功能
 */

const MemPalaceAlgorithmIntegrator = require('./integrate-mempalace-algorithms.js');
const SkillPrecipitationSystem = require('./skill-precipitation-system.js');

class MemFlowAIEnhanced {
  constructor(config = {}) {
    console.log('🚀 初始化MemFlow AI增强版...');
    
    // 基础配置
    this.config = {
      // 性能配置
      performance: {
        targetResponseTime: 15, // 15ms目标
        targetAccuracy: 0.96,   // 96%准确率
        enableCaching: true,
        cacheSize: 1000
      },
      
      // 功能配置
      features: {
        enableContradictionDetection: true,
        enableHierarchicalSearch: true,
        enableSkillPrecipitation: true,
        enableAutonomousEvolution: true,
        enableBCIOptimization: true
      },
      
      // 算法配置
      algorithms: {
        search: 'hnsw',
        embedding: 'text-embedding-3-large',
        relevance: 'multidimensional'
      },
      
      // 覆盖用户配置
      ...config
    };
    
    // 系统状态
    this.status = 'initializing';
    this.capabilities = {};
    this.stats = {
      totalMemories: 0,
      totalSearches: 0,
      averageResponseTime: 0,
      contradictionDetections: 0
    };
    
    // 初始化核心组件
    this.initializeComponents();
    
    console.log('✅ MemFlow AI增强版初始化完成');
  }

  /**
   * 初始化所有组件
   */
  initializeComponents() {
    console.log('🔧 初始化系统组件...');
    
    // 基础记忆存储
    this.memories = new Map();
    this.memoryIndex = new Map(); // 简单索引
    
    // 搜索引擎（简化版）
    this.searchEngine = {
      search: async (query, options) => {
        return this.simpleSearch(query, options);
      },
      addToIndex: (memory) => {
        this.updateIndex(memory);
      }
    };
    
    // 技能沉淀系统
    if (this.config.features.enableSkillPrecipitation) {
      this.skillSystem = new SkillPrecipitationSystem();
      this.capabilities.skillPrecipitation = true;
    }
    
    // 标记为就绪
    this.status = 'ready';
    this.capabilities = {
      basicSearch: true,
      memoryStorage: true,
      ...this.capabilities
    };
    
    console.log(`✅ 系统组件初始化完成，状态: ${this.status}`);
  }

  /**
   * 集成MemPalace算法
   */
  async integrateMemPalaceAlgorithms() {
    console.log('⚡ 开始集成MemPalace算法...');
    
    try {
      // 创建集成器
      this.integrator = new MemPalaceAlgorithmIntegrator(this);
      
      // 执行集成
      const result = await this.integrator.integrateAllAlgorithms();
      
      if (result.success) {
        // 更新系统状态
        this.status = 'enhanced';
        this.capabilities.mempalaceAlgorithms = true;
        
        console.log('🎉 MemPalace算法集成成功！');
        console.log(`预期性能提升: ${JSON.stringify(result.performanceImprovement)}`);
        
        return result;
      } else {
        throw new Error(`集成失败: ${result.error}`);
      }
      
    } catch (error) {
      console.error('❌ MemPalace算法集成失败:', error);
      throw error;
    }
  }

  /**
   * 启动技能沉淀系统
   */
  async startSkillPrecipitationSystem() {
    if (!this.skillSystem) {
      throw new Error('技能沉淀系统未启用');
    }
    
    console.log('🚀 启动技能沉淀系统...');
    
    try {
      await this.skillSystem.start();
      this.capabilities.skillPrecipitationActive = true;
      
      console.log('✅ 技能沉淀系统启动成功');
      return true;
    } catch (error) {
      console.error('❌ 技能沉淀系统启动失败:', error);
      throw error;
    }
  }

  // ========== 核心API ==========

  /**
   * 添加记忆
   */
  async addMemory(memory, options = {}) {
    const startTime = Date.now();
    
    try {
      // 生成ID（如果不存在）
      if (!memory.id) {
        memory.id = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // 添加时间戳
      if (!memory.timestamp) {
        memory.timestamp = Date.now();
      }
      
      // 矛盾检测（如果启用）
      if (this.config.features.enableContradictionDetection && 
          this.integrator?.contradictionDetector &&
          options.skipContradictionCheck !== true) {
        
        const existingMemories = Array.from(this.memories.values()).slice(-50);
        const contradictionResult = await this.integrator.contradictionDetector.detectContradictions(
          memory,
          existingMemories,
          options.context
        );
        
        if (contradictionResult.success && contradictionResult.contradictions.length > 0) {
          this.stats.contradictionDetections++;
          
          const assessment = contradictionResult.assessment;
          if (assessment.action === 'reject') {
            throw new Error(`记忆添加被拒绝: ${assessment.reason}`);
          } else if (assessment.action === 'review') {
            memory.needsReview = true;
            memory.contradictions = contradictionResult.contradictions;
          } else if (assessment.action === 'accept-with-note') {
            memory.hasContradictions = true;
            memory.contradictionNotes = contradictionResult.contradictions;
          }
        }
      }
      
      // 存储记忆
      this.memories.set(memory.id, memory);
      this.searchEngine.addToIndex(memory);
      this.stats.totalMemories++;
      
      // 技能沉淀（如果启用）
      if (this.skillSystem && options.task && options.execution) {
        await this.skillSystem.precipitateSkillFromTask(
          options.task,
          options.execution
        );
      }
      
      const duration = Date.now() - startTime;
      this.updateResponseTime(duration);
      
      console.log(`✅ 记忆添加成功: ${memory.id} (${duration}ms)`);
      
      return {
        success: true,
        memoryId: memory.id,
        duration,
        stats: this.stats
      };
      
    } catch (error) {
      console.error('❌ 记忆添加失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 搜索记忆
   */
  async search(query, options = {}) {
    const startTime = Date.now();
    
    try {
      let results;
      
      // 使用MemPalace算法搜索（如果已集成）
      if (this.integrator && this.config.features.enableHierarchicalSearch) {
        results = await this.integrator.system.search(query, options);
      } else {
        // 使用基础搜索
        results = await this.searchEngine.search(query, options);
      }
      
      // 技能匹配（如果启用）
      if (this.skillSystem && options.context) {
        const skillRecommendations = await this.skillSystem.matchSkillsForTask(
          { type: 'search', query },
          options.context
        );
        
        if (skillRecommendations.success && skillRecommendations.recommendations.length > 0) {
          results.skillRecommendations = skillRecommendations.recommendations;
        }
      }
      
      const duration = Date.now() - startTime;
      this.stats.totalSearches++;
      this.updateResponseTime(duration);
      
      console.log(`🔍 搜索完成: "${query}" → ${results.length}结果 (${duration}ms)`);
      
      return {
        success: true,
        query,
        results,
        duration,
        stats: this.stats
      };
      
    } catch (error) {
      console.error('❌ 搜索失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取记忆
   */
  async getMemory(memoryId) {
    const memory = this.memories.get(memoryId);
    
    if (!memory) {
      throw new Error(`记忆不存在: ${memoryId}`);
    }
    
    return memory;
  }

  /**
   * 更新记忆
   */
  async updateMemory(memoryId, updates) {
    const memory = await this.getMemory(memoryId);
    
    const updatedMemory = {
      ...memory,
      ...updates,
      updatedAt: Date.now()
    };
    
    this.memories.set(memoryId, updatedMemory);
    this.searchEngine.addToIndex(updatedMemory);
    
    console.log(`✏️ 记忆更新成功: ${memoryId}`);
    
    return updatedMemory;
  }

  /**
   * 删除记忆
   */
  async deleteMemory(memoryId) {
    const deleted = this.memories.delete(memoryId);
    
    if (deleted) {
      this.stats.totalMemories--;
      console.log(`🗑️ 记忆删除成功: ${memoryId}`);
      return true;
    } else {
      throw new Error(`记忆不存在: ${memoryId}`);
    }
  }

  /**
   * 获取系统状态
   */
  getSystemStatus() {
    return {
      system: 'MemFlow AI Enhanced',
      version: '1.0.0',
      status: this.status,
      capabilities: this.capabilities,
      stats: { ...this.stats },
      config: {
        features: this.config.features,
        performance: this.config.performance
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 运行性能测试
   */
  async runPerformanceTest() {
    console.log('🏃 运行性能测试...');
    
    const tests = [
      this.testSearchPerformance(),
      this.testMemoryAddPerformance(),
      this.testContradictionDetectionPerformance()
    ];
    
    const results = await Promise.allSettled(tests);
    
    const summary = {
      totalTests: tests.length,
      passed: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      details: results.map((r, i) => ({
        test: i + 1,
        status: r.status,
        result: r.status === 'fulfilled' ? r.value : r.reason
      }))
    };
    
    console.log(`📊 性能测试完成: ${summary.passed}/${summary.totalTests}通过`);
    
    return summary;
  }

  async testSearchPerformance() {
    const startTime = Date.now();
    const testQueries = ['测试', '记忆', '系统', '搜索', '性能'];
    
    for (const query of testQueries) {
      await this.search(query, { limit: 5 });
    }
    
    const duration = Date.now() - startTime;
    const avgTime = duration / testQueries.length;
    
    return {
      test: '搜索性能',
      duration,
      avgTimePerQuery: avgTime,
      status: avgTime < 50 ? '✅ 优秀' : avgTime < 100 ? '⚠️ 一般' : '❌ 需要优化',
      target: '<50ms'
    };
  }

  async testMemoryAddPerformance() {
    const startTime = Date.now();
    const testCount = 10;
    
    for (let i = 0; i < testCount; i++) {
      await this.addMemory({
        content: `性能测试记忆 ${i}`,
        tags: ['test', 'performance']
      }, { skipContradictionCheck: true });
    }
    
    const duration = Date.now() - startTime;
    const avgTime = duration / testCount;
    
    return {
      test: '记忆添加性能',
      duration,
      avgTimePerMemory: avgTime,
      status: avgTime < 100 ? '✅ 优秀' : avgTime < 200 ? '⚠️ 一般' : '❌ 需要优化',
      target: '<100ms'
    };
  }

  async testContradictionDetectionPerformance() {
    if (!this.config.features.enableContradictionDetection) {
      return {
        test: '矛盾检测性能',
        status: '❌ 未启用',
        note: '需要在配置中启用enableContradictionDetection'
      };
    }
    
    const startTime = Date.now();
    
    // 创建有矛盾的记忆
    const memory1 = {
      id: 'contradiction-test-1',
      content: '项目已经完成',
      timestamp: Date.now()
    };
    
    const memory2 = {
      id: 'contradiction-test-2',
      content: '项目还没有完成',
      timestamp: Date.now() - 3600000
    };
    
    // 先添加第一个记忆
    await this.addMemory(memory1, { skipContradictionCheck: true });
    
    // 尝试添加有矛盾的第二个记忆
    try {
      await this.addMemory(memory2); // 应该触发矛盾检测
      
      return {
        test: '矛盾检测性能',
        status: '⚠️ 未检测到矛盾',
        note: '可能需要调整检测阈值'
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        test: '矛盾检测性能',
        status: '✅ 工作正常',
        duration,
        detected: true,
        error: error.message
      };
    }
  }

  // ========== 工具方法 ==========

  /**
   * 简单搜索实现
   */
  async simpleSearch(query, options = {}) {
    const limit = options.limit || 10;
    const memories = Array.from(this.memories.values());
    
    // 简单关键词匹配
    const results = memories
      .filter(memory => {
        const text = JSON.stringify(memory).toLowerCase();
        return text.includes(query.toLowerCase());
      })
      .slice(0, limit)
      .map(memory => ({
        memory,
        relevance: this.calculateSimpleRelevance(memory, query),
        source: 'simple-search'
      }));
    
    return results;
  }

  /**
   * 计算简单相关性
   */
  calculateSimpleRelevance(memory, query) {
    const text = JSON.stringify(memory).toLowerCase();
    const queryLower = query.toLowerCase();
    
    // 简单频率计算
    const words = queryLower.split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (word.length > 2) {
        const count = (text.match(new RegExp(word, 'g')) || []).length;
        score += count * 0.1;
      }
    });
    
    return Math.min(score, 1.0);
  }

  /**
   * 更新索引
   */
  updateIndex(memory) {
    // 简单索引实现
    if (memory.content) {
      const words = memory.content.toLowerCase().split(/\W+/);
      
      words.forEach(word => {
        if (word.length > 2) {
          if (!this.memoryIndex.has(word)) {
            this.memoryIndex.set(word, new Set());
          }
          this.memoryIndex.get(word).add(memory.id);
        }
      });
    }
  }

  /**
   * 更新响应时间统计
   */
  updateResponseTime(newTime) {
    // 移动平均
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.totalSearches - 1) + newTime) / 
      this.stats.totalSearches;
  }

  /**
   * 导出系统数据
   */
  exportData(format = 'json') {
    const data = {
      memories: Array.from(this.memories.values()),
      stats: this.stats,
      config: this.config,
      status: this.getSystemStatus(),
      timestamp: new Date().toISOString()
    };
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    
    return data;
  }

  /**
   * 重置系统
   */
  reset() {
    this.memories.clear();
    this.memoryIndex.clear();
    this.stats = {
      totalMemories: 0,
      totalSearches: 0,
      averageResponseTime: 0,
      contradictionDetections: 0
    };
    
    console.log('🔄 系统已重置');
  }
}

module.exports = MemFlowAIEnhanced;