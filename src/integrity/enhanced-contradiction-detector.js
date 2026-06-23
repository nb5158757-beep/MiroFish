/**
 * MemFlow AI 增强版矛盾检测集成器
 * 整合时间、语义、逻辑检测，加入缓存优化
 */

const TimeConflictDetector = require('./time-conflict-detector.js');
const SemanticAnalyzer = require('./semantic-analyzer.js');
const CacheManager = require('./cache-manager.js');

class EnhancedContradictionDetector {
  constructor(options = {}) {
    this.options = {
      enableTimeDetection: true,
      enableSemanticDetection: true,
      enableLogicalDetection: true,
      enableCache: true,
      confidenceThreshold: 0.6,
      maxBatchSize: 100,
      parallelProcessing: true,
      ...options
    };
    
    // 初始化组件
    this.timeDetector = new TimeConflictDetector(options.timeOptions || {});
    this.semanticAnalyzer = new SemanticAnalyzer(options.semanticOptions || {});
    this.cacheManager = this.options.enableCache ? new CacheManager(options.cacheOptions || {}) : null;
    
    // 统计信息
    this.stats = {
      totalChecks: 0,
      contradictionsFound: 0,
      timeConflicts: 0,
      semanticConflicts: 0,
      logicalConflicts: 0,
      cacheHits: 0,
      processingTime: 0,
      lastCheck: null
    };
    
    // 增量检查跟踪
    this.checkedPairs = new Set();
    this.modifiedMemories = new Set();
  }

  /**
   * 检测记忆矛盾（增强版）
   */
  async detectContradictions(memories, options = {}) {
    const startTime = Date.now();
    this.stats.totalChecks++;
    
    console.log(`🔍 增强版矛盾检测开始，处理 ${memories.length} 条记忆...`);
    
    // 应用选项覆盖
    const detectionOptions = { ...this.options, ...options };
    
    // 限制处理数量
    const memoriesToCheck = memories.slice(0, detectionOptions.maxBatchSize);
    
    // 增量检查：过滤已检查且未修改的记忆对
    const memoriesToProcess = detectionOptions.incrementalCheck 
      ? this.filterForIncrementalCheck(memoriesToCheck)
      : memoriesToCheck;
    
    if (memoriesToProcess.length === 0) {
      console.log('✅ 增量检查：无新增或修改的记忆需要检查');
      return this.getEmptyResult();
    }
    
    // 并行或串行处理
    const results = detectionOptions.parallelProcessing
      ? await this.processParallel(memoriesToProcess, detectionOptions)
      : await this.processSequential(memoriesToProcess, detectionOptions);
    
    // 更新统计
    this.updateStats(results, Date.now() - startTime);
    
    // 更新增量检查跟踪
    this.updateIncrementalTracking(memoriesToProcess);
    
    return {
      ...results,
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 增量检查过滤
   */
  filterForIncrementalCheck(memories) {
    if (!this.options.enableCache) {
      return memories;
    }
    
    const filtered = [];
    
    for (const memory of memories) {
      // 检查记忆是否已修改
      const isModified = this.modifiedMemories.has(memory.id) || 
                        !this.cacheManager.get(memory.id, 'memory_hash');
      
      if (isModified) {
        filtered.push(memory);
        
        // 更新内存哈希
        const memoryHash = this.computeMemoryHash(memory);
        this.cacheManager.set(memory.id, memoryHash, 'memory_hash');
        this.modifiedMemories.delete(memory.id);
      }
    }
    
    console.log(`📊 增量检查: ${memories.length} -> ${filtered.length} 条需要检查`);
    return filtered;
  }

  /**
   * 计算记忆哈希
   */
  computeMemoryHash(memory) {
    // 简单哈希计算，用于检测修改
    const content = JSON.stringify({
      content: memory.content,
      timestamp: memory.timestamp,
      metadata: memory.metadata || {}
    });
    
    // 简单哈希函数
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i);
      hash = hash & hash;
    }
    
    return hash.toString(16);
  }

  /**
   * 并行处理
   */
  async processParallel(memories, options) {
    console.log('⚡ 使用并行处理模式');
    
    const contradictions = [];
    const batchPromises = [];
    
    // 创建记忆对批次
    const memoryPairs = this.createMemoryPairs(memories);
    const batches = this.createBatches(memoryPairs, 10); // 每批10对
    
    // 并行处理批次
    for (const batch of batches) {
      batchPromises.push(
        this.processBatch(batch, options).then(batchResults => {
          contradictions.push(...batchResults);
        })
      );
    }
    
    await Promise.all(batchPromises);
    
    return this.compileResults(contradictions, memories.length);
  }

  /**
   * 串行处理
   */
  async processSequential(memories, options) {
    console.log('🔄 使用串行处理模式');
    
    const contradictions = [];
    const memoryPairs = this.createMemoryPairs(memories);
    
    for (const pair of memoryPairs) {
      const result = await this.checkMemoryPair(pair.memoryA, pair.memoryB, options);
      if (result) {
        contradictions.push(result);
      }
    }
    
    return this.compileResults(contradictions, memories.length);
  }

  /**
   * 创建记忆对
   */
  createMemoryPairs(memories) {
    const pairs = [];
    
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        pairs.push({
          memoryA: memories[i],
          memoryB: memories[j],
          pairKey: `${memories[i].id}|${memories[j].id}`
        });
      }
    }
    
    return pairs;
  }

  /**
   * 创建批次
   */
  createBatches(items, batchSize) {
    const batches = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * 处理批次
   */
  async processBatch(pairs, options) {
    const batchResults = [];
    
    for (const pair of pairs) {
      const result = await this.checkMemoryPair(pair.memoryA, pair.memoryB, options);
      if (result) {
        batchResults.push(result);
      }
    }
    
    return batchResults;
  }

  /**
   * 检查记忆对
   */
  async checkMemoryPair(memoryA, memoryB, options) {
    const pairKey = `${memoryA.id}|${memoryB.id}`;
    
    // 检查缓存
    if (this.options.enableCache) {
      const cachedResult = await this.cacheManager.get(pairKey, 'contradiction');
      if (cachedResult) {
        this.stats.cacheHits++;
        return cachedResult;
      }
    }
    
    // 执行检测
    const detectionResults = [];
    
    // 时间冲突检测
    if (options.enableTimeDetection) {
      const timeResult = this.timeDetector.analyzeTimeConflict(memoryA, memoryB);
      if (timeResult.conflict && timeResult.confidence >= options.confidenceThreshold) {
        detectionResults.push({
          type: 'time_conflict',
          ...timeResult
        });
      }
    }
    
    // 语义矛盾检测
    if (options.enableSemanticDetection) {
      const semanticResult = await this.semanticAnalyzer.analyzeSemanticConflict(memoryA, memoryB);
      if (semanticResult.hasContradiction && semanticResult.confidence >= options.confidenceThreshold) {
        detectionResults.push({
          type: 'semantic_conflict',
          ...semanticResult
        });
      }
    }
    
    // 逻辑矛盾检测（简化版）
    if (options.enableLogicalDetection) {
      const logicalResult = this.detectLogicalConflict(memoryA, memoryB);
      if (logicalResult && logicalResult.confidence >= options.confidenceThreshold) {
        detectionResults.push({
          type: 'logical_conflict',
          ...logicalResult
        });
      }
    }
    
    // 如果没有检测到矛盾，返回null
    if (detectionResults.length === 0) {
      // 缓存空结果
      if (this.options.enableCache) {
        await this.cacheManager.set(pairKey, null, 'contradiction', 300000); // 5分钟
      }
      return null;
    }
    
    // 合并检测结果
    const combinedResult = this.combineDetectionResults(detectionResults, memoryA, memoryB);
    
    // 缓存结果
    if (this.options.enableCache) {
      await this.cacheManager.set(pairKey, combinedResult, 'contradiction', 600000); // 10分钟
    }
    
    return combinedResult;
  }

  /**
   * 检测逻辑矛盾（简化版）
   */
  detectLogicalConflict(memoryA, memoryB) {
    // 提取逻辑关系
    const logicA = this.extractLogicalRelations(memoryA.content);
    const logicB = this.extractLogicalRelations(memoryB.content);
    
    // 检查矛盾
    for (const relationA of logicA) {
      for (const relationB of logicB) {
        if (this.areLogicalRelationsContradictory(relationA, relationB)) {
          return {
            confidence: 0.7,
            details: {
              relationA,
              relationB,
              conflictType: 'logical_contradiction'
            },
            suggestion: '检测到逻辑关系矛盾，建议检查因果关系或前提条件。'
          };
        }
      }
    }
    
    return null;
  }

  /**
   * 提取逻辑关系
   */
  extractLogicalRelations(content) {
    const relations = [];
    
    // 提取因果关系
    const causeMatch = content.match(/因为(.+?)所以(.+)/);
    if (causeMatch) {
      relations.push({
        type: 'cause_effect',
        cause: causeMatch[1].trim(),
        effect: causeMatch[2].trim()
      });
    }
    
    // 提取条件关系
    const conditionMatch = content.match(/如果(.+?)那么(.+)/);
    if (conditionMatch) {
      relations.push({
        type: 'if_then',
        condition: conditionMatch[1].trim(),
        result: conditionMatch[2].trim()
      });
    }
    
    return relations;
  }

  /**
   * 检查逻辑关系是否矛盾
   */
  areLogicalRelationsContradictory(relationA, relationB) {
    if (relationA.type !== relationB.type) {
      return false;
    }
    
    if (relationA.type === 'cause_effect') {
      // 相同原因但相反结果
      return relationA.cause === relationB.cause && 
             this.areEffectsContradictory(relationA.effect, relationB.effect);
    }
    
    if (relationA.type === 'if_then') {
      // 相同条件但相反结果
      return relationA.condition === relationB.condition && 
             this.areResultsContradictory(relationA.result, relationB.result);
    }
    
    return false;
  }

  /**
   * 检查效果是否矛盾
   */
  areEffectsContradictory(effectA, effectB) {
    const oppositePairs = [
      ['成功', '失败'], ['增加', '减少'], ['提高', '降低'],
      ['好', '坏'], ['快', '慢'], ['支持', '反对']
    ];
    
    return oppositePairs.some(pair => {
      const [word1, word2] = pair;
      return (effectA.includes(word1) && effectB.includes(word2)) ||
             (effectA.includes(word2) && effectB.includes(word1));
    });
  }

  /**
   * 检查结果是否矛盾
   */
  areResultsContradictory(resultA, resultB) {
    return this.areEffectsContradictory(resultA, resultB);
  }

  /**
   * 合并检测结果
   */
  combineDetectionResults(detectionResults, memoryA, memoryB) {
    // 按置信度排序
    detectionResults.sort((a, b) => b.confidence - a.confidence);
    
    // 计算综合置信度
    const totalConfidence = detectionResults.reduce((sum, result) => sum + result.confidence, 0);
    const avgConfidence = totalConfidence / detectionResults.length;
    
    // 加权综合置信度（最高置信度权重更高）
    const weightedConfidence = detectionResults[0].confidence * 0.6 + avgConfidence * 0.4;
    
    return {
      memoryA: memoryA.id,
      memoryB: memoryB.id,
      detectionResults,
      combinedConfidence: weightedConfidence,
      primaryType: detectionResults[0].type,
      suggestion: this.generateCombinedSuggestion(detectionResults),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 生成综合建议
   */
  generateCombinedSuggestion(detectionResults) {
    const suggestions = [];
    
    for (const result of detectionResults) {
      if (result.suggestion) {
        suggestions.push(result.suggestion);
      }
    }
    
    if (suggestions.length === 0) {
      return '检测到矛盾，建议检查记忆一致性。';
    }
    
    // 去重并合并建议
    const uniqueSuggestions = [...new Set(suggestions)];
    
    if (uniqueSuggestions.length === 1) {
      return uniqueSuggestions[0];
    } else {
      return `检测到多种矛盾：${uniqueSuggestions.join('；')}`;
    }
  }

  /**
   * 编译最终结果
   */
  compileResults(contradictions, totalMemories) {
    const totalPairs = (totalMemories * (totalMemories - 1)) / 2;
    
    return {
      totalMemories,
      totalPairs,
      contradictionsFound: contradictions.length,
      contradictions,
      detectionRate: totalPairs > 0 ? (contradictions.length / totalPairs * 100).toFixed(2) + '%' : '0%',
      summary: this.generateSummary(contradictions)
    };
  }

  /**
   * 生成摘要
   */
  generateSummary(contradictions) {
    if (contradictions.length === 0) {
      return '未检测到矛盾。';
    }
    
    const typeCounts = {
      time_conflict: 0,
      semantic_conflict: 0,
      logical_conflict: 0
    };
    
    let maxConfidence = 0;
    let highestConfidenceContradiction = null;
    
    for (const contradiction of contradictions) {
      typeCounts[contradiction.primaryType] = (typeCounts[contradiction.primaryType] || 0) + 1;
      
      if (contradiction.combinedConfidence > maxConfidence) {
        maxConfidence = contradiction.combinedConfidence;
        highestConfidenceContradiction = contradiction;
      }
    }
    
    const summary = `检测到 ${contradictions.length} 个矛盾：`;
    const details = [];
    
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > 0) {
        details.push(`${type}: ${count}个`);
      }
    }
    
    return `${summary} ${details.join('，')}。最高置信度: ${maxConfidence.toFixed(2)}`;
  }

  /**
   * 获取空结果
   */
  getEmptyResult() {
    return {
      totalMemories: 0,
      totalPairs: 0,
      contradictionsFound: 0,
      contradictions: [],
      detectionRate: '0%',
      summary: '无记忆需要检查',
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 更新统计信息
   */
  updateStats(results, processingTime) {
    this.stats.processingTime = (this.stats.processingTime * (this.stats.totalChecks - 1) + processingTime) / this.stats.totalChecks;
    this.stats.contradictionsFound += results.contradictionsFound;
    this.stats.lastCheck = new Date().toISOString();
    
    // 更新类型统计
    for (const contradiction of results.contradictions) {
      switch (contradiction.primaryType) {
        case 'time_conflict':
          this.stats.timeConflicts++;
          break;
        case 'semantic_conflict':
          this.stats.semanticConflicts++;
          break;
        case 'logical_conflict':
          this.stats.logicalConflicts++;
          break;
      }
    }
  }

  /**
   * 更新增量检查跟踪
   */
  updateIncrementalTracking(memories) {
    for (const memory of memories) {
      this.modifiedMemories.delete(memory.id);
    }
  }

  /**
   * 标记记忆为已修改
   */
  markMemoryAsModified(memoryId) {
    this.modifiedMemories.add(memoryId);
    
    // 清除相关缓存
    if (this.options.enableCache) {
      this.cacheManager.clearCategory('contradiction');
    }
    
    console.log(`📝 标记记忆为已修改: ${memoryId}`);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      cacheEnabled: this.options.enableCache,
      cacheStats: this.options.enableCache ? this.cacheManager.getStats() : null,
      components: {
        timeDetection: this.options.enableTimeDetection,
        semanticDetection: this.options.enableSemanticDetection,
        logicalDetection: this.options.enableLogicalDetection,
        incrementalCheck: true
      },
      performance: {
        avgProcessingTime: this.stats.processingTime.toFixed(2) + 'ms',
        checksPerSecond: this.stats.totalChecks > 0 
          ? (1000 / this.stats.processingTime).toFixed(2) + '/s'
          : '0/s',
        cacheHitRate: this.stats.totalChecks > 0
          ? ((this.stats.cacheHits / this.stats.totalChecks) * 100).toFixed(2) + '%'
          : '0%'
      },
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * 重置统计
   */
  resetStats() {
    this.stats = {
      totalChecks: 0,
      contradictionsFound: 0,
      timeConflicts: 0,
      semanticConflicts: 0,
      logicalConflicts: 0,
      cacheHits: 0,
      processingTime: 0,
      lastCheck: null
    };
    
    if (this.options.enableCache) {
      this.cacheManager.clearAll();
    }
    
    this.checkedPairs.clear();
    this.modifiedMemories.clear();
    
    console.log('📊 统计信息已重置');
  }
  
  /**
   * 导出配置
   */
  exportConfig() {
    return {
      options: this.options,
      stats: this.getStats(),
      cacheConfig: this.options.enableCache ? this.cacheManager.exportCacheData(10) : null,
      patterns: this.semanticAnalyzer.exportPatterns(),
      exportTime: new Date().toISOString()
    };
  }
  
  /**
   * 性能测试
   */
  async performanceTest(memoryCount = 100, iterations = 10) {
    console.log(`🧪 开始性能测试: ${memoryCount}条记忆, ${iterations}次迭代`);
    
    // 生成测试记忆
    const testMemories = this.generateTestMemories(memoryCount);
    
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      console.log(`迭代 ${i + 1}/${iterations}...`);
      
      const startTime = Date.now();
      const result = await this.detectContradictions(testMemories, {
        incrementalCheck: false,
        parallelProcessing: true
      });
      const endTime = Date.now();
      
      results.push({
        iteration: i + 1,
        processingTime: endTime - startTime,
        contradictionsFound: result.contradictionsFound,
        memoryCount: memoryCount
      });
    }
    
    // 计算统计
    const totalTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    const avgTime = totalTime / iterations;
    const avgContradictions = results.reduce((sum, r) => sum + r.contradictionsFound, 0) / iterations;
    
    return {
      testConfig: {
        memoryCount,
        iterations,
        options: this.options
      },
      results,
      summary: {
        totalTime: `${totalTime}ms`,
        avgTime: `${avgTime.toFixed(2)}ms`,
        avgTimePerMemory: `${(avgTime / memoryCount).toFixed(3)}ms`,
        avgContradictions: avgContradictions.toFixed(2),
        contradictionsPerSecond: `${((memoryCount * iterations) / (totalTime / 1000)).toFixed(2)}/s`,
        cacheStats: this.options.enableCache ? this.cacheManager.getStats() : null
      },
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * 生成测试记忆
   */
  generateTestMemories(count) {
    const memories = [];
    const now = Date.now();
    
    for (let i = 0; i < count; i++) {
      const timestamp = now - (i * 3600000); // 每小时一条
      
      // 生成可能矛盾的内容
      const content = this.generateTestContent(i);
      
      memories.push({
        id: `test_memory_${i}`,
        content,
        timestamp,
        startTime: timestamp,
        endTime: timestamp + 1800000, // 持续30分钟
        metadata: {
          source: 'performance_test',
          index: i
        }
      });
    }
    
    return memories;
  }
  
  /**
   * 生成测试内容
   */
  generateTestContent(index) {
    const templates = [
      `系统性能很好，响应时间很快。`,  // 正面
      `系统性能很差，响应时间很慢。`,  // 负面（矛盾）
      `会议在下午2点开始。`,          // 时间相关
      `会议在下午2点取消。`,          // 时间矛盾
      `因为优化了缓存，所以性能提高了。`, // 因果关系
      `因为优化了缓存，所以性能降低了。`, // 因果矛盾
      `这个功能非常重要。`,           // 程度
      `这个功能一点也不重要。`,       // 程度矛盾
      `用户反馈非常积极。`,           // 评价
      `用户反馈非常消极。`            // 评价矛盾
    ];
    
    // 循环使用模板，制造矛盾
    const templateIndex = index % templates.length;
    return templates[templateIndex];
  }
  
  /**
   * 获取组件状态
   */
  getComponentStatus() {
    return {
      timeDetector: this.timeDetector ? '运行中' : '未启用',
      semanticAnalyzer: this.semanticAnalyzer ? '运行中' : '未启用',
      cacheManager: this.cacheManager ? '运行中' : '未启用',
      totalPatterns: this.semanticAnalyzer ? this.semanticAnalyzer.exportPatterns().stats.totalNegation + 
                                            this.semanticAnalyzer.exportPatterns().stats.totalOpposite : 0,
      systemStatus: '正常',
      lastHealthCheck: new Date().toISOString()
    };
  }
}

// 导出模块
module.exports = EnhancedContradictionDetector;