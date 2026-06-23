/**
 * 并行运行管理器
 * 同时运行MemFlow AI和OpenClaw memory_search，对比结果
 */

const fs = require('fs');
const path = require('path');

class ParallelManager {
  /**
   * 创建并行管理器
   * @param {Object} config 配置
   * @param {Object} memflowIntegration MemFlow AI集成
   */
  constructor(config = {}, memflowIntegration = null) {
    this.config = {
      mode: 'parallel',
      requestRouting: { default: 'both', fallback: 'memflow' },
      resultMerge: { strategy: 'weighted', weights: { memflow: 0.7, openclaw: 0.3 } },
      ...config
    };
    
    this.memflowIntegration = memflowIntegration;
    this.openclawAvailable = false;
    this.comparisonData = [];
    this.userFeedback = [];
    
    this.stats = {
      totalRequests: 0,
      memflowRequests: 0,
      openclawRequests: 0,
      parallelRequests: 0,
      memflowWins: 0,
      openclawWins: 0,
      ties: 0
    };
    
    console.log(`[ParallelManager] 初始化完成，模式: ${this.config.mode}`);
    console.log(`   请求路由: ${this.config.requestRouting.default}`);
    console.log(`   结果合并: ${this.config.resultMerge.strategy}`);
    console.log(`   权重: MemFlow=${this.config.resultMerge.weights.memflow}, OpenClaw=${this.config.resultMerge.weights.openclaw}`);
  }
  
  /**
   * 设置MemFlow AI集成
   */
  setMemflowIntegration(integration) {
    this.memflowIntegration = integration;
    console.log('[ParallelManager] MemFlow AI集成已设置');
  }
  
  /**
   * 检查OpenClaw可用性
   */
  async checkOpenClawAvailability() {
    console.log('[ParallelManager] 检查OpenClaw可用性...');
    
    // 这里可以添加实际检查OpenClaw memory_search的代码
    // 暂时模拟检查
    try {
      // 模拟OpenClaw检查
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.openclawAvailable = true;
      console.log('[ParallelManager] OpenClaw可用（模拟）');
      
      return true;
    } catch (error) {
      this.openclawAvailable = false;
      console.log('[ParallelManager] OpenClaw不可用:', error.message);
      return false;
    }
  }
  
  /**
   * 并行搜索
   * @param {string} query 查询文本
   * @param {Object} options 搜索选项
   */
  async parallelSearch(query, options = {}) {
    this.stats.totalRequests++;
    console.log(`[ParallelManager] 并行搜索: "${query}"`);
    
    const startTime = Date.now();
    const results = {
      memflow: null,
      openclaw: null,
      merged: null,
      comparison: null
    };
    
    try {
      // 1. 确定请求路由
      const routing = this._determineRouting(options);
      console.log(`[ParallelManager] 请求路由: ${routing}`);
      
      // 2. 并行执行搜索
      const searchPromises = [];
      
      if (routing.includes('memflow') && this.memflowIntegration) {
        this.stats.memflowRequests++;
        searchPromises.push(
          this.memflowIntegration.memorySearch(query, options)
            .then(result => { results.memflow = result; return result; })
            .catch(error => { 
              console.error('[ParallelManager] MemFlow AI搜索失败:', error.message);
              results.memflow = { success: false, error: error.message };
            })
        );
      }
      
      if (routing.includes('openclaw') && this.openclawAvailable) {
        this.stats.openclawRequests++;
        searchPromises.push(
          this._callOpenClawSearch(query, options)
            .then(result => { results.openclaw = result; return result; })
            .catch(error => {
              console.error('[ParallelManager] OpenClaw搜索失败:', error.message);
              results.openclaw = { success: false, error: error.message };
            })
        );
      }
      
      if (routing === 'both') {
        this.stats.parallelRequests++;
      }
      
      // 等待所有搜索完成
      await Promise.allSettled(searchPromises);
      
      // 3. 合并结果
      results.merged = this._mergeResults(results.memflow, results.openclaw, query);
      
      // 4. 对比分析
      results.comparison = this._compareResults(results.memflow, results.openclaw);
      
      // 5. 记录对比数据
      this._recordComparison(query, results);
      
      const endTime = Date.now();
      results.duration = endTime - startTime;
      
      console.log(`[ParallelManager] 并行搜索完成，耗时 ${results.duration}ms`);
      console.log(`   MemFlow AI: ${results.memflow?.success ? '成功' : '失败'}`);
      console.log(`   OpenClaw: ${results.openclaw?.success ? '成功' : '失败'}`);
      console.log(`   合并结果: ${results.merged?.results?.length || 0} 个`);
      
      if (results.comparison) {
        console.log(`   对比: MemFlow=${results.comparison.memflowScore}, OpenClaw=${results.comparison.openclawScore}`);
        
        // 更新胜负统计
        if (results.comparison.winner === 'memflow') this.stats.memflowWins++;
        else if (results.comparison.winner === 'openclaw') this.stats.openclawWins++;
        else this.stats.ties++;
      }
      
      return results;
      
    } catch (error) {
      console.error('[ParallelManager] 并行搜索失败:', error.message);
      
      // 回退到MemFlow AI
      if (this.memflowIntegration) {
        console.log('[ParallelManager] 回退到MemFlow AI...');
        try {
          const fallbackResult = await this.memflowIntegration.memorySearch(query, options);
          return {
            memflow: fallbackResult,
            openclaw: { success: false, error: '并行搜索失败，已回退' },
            merged: fallbackResult,
            comparison: null,
            fallback: true
          };
        } catch (fallbackError) {
          throw new Error(`并行搜索失败且回退也失败: ${error.message}, ${fallbackError.message}`);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * 确定请求路由
   * @private
   */
  _determineRouting(options) {
    // 1. 检查选项中的覆盖设置
    if (options.routing) {
      return options.routing;
    }
    
    // 2. 检查OpenClaw可用性
    if (!this.openclawAvailable && this.config.requestRouting.default === 'both') {
      return 'memflow';
    }
    
    // 3. 使用默认路由
    return this.config.requestRouting.default;
  }
  
  /**
   * 调用OpenClaw搜索（模拟）
   * @private
   */
  async _callOpenClawSearch(query, options) {
    console.log(`[ParallelManager] 调用OpenClaw搜索: "${query}"`);
    
    // 模拟OpenClaw搜索延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 模拟结果（实际应该调用OpenClaw CLI或API）
    const mockResults = [
      {
        id: 'openclaw_1',
        score: 0.8,
        text: `OpenClaw模拟结果 for "${query}"`,
        metadata: {
          source: 'openclaw',
          filename: 'mock.md',
          timestamp: new Date().toISOString()
        },
        snippet: `这是OpenClaw的模拟搜索结果...`
      }
    ];
    
    return {
      success: true,
      results: mockResults,
      query,
      duration: 150,
      source: 'openclaw_mock'
    };
  }
  
  /**
   * 合并搜索结果
   * @private
   */
  _mergeResults(memflowResult, openclawResult, query) {
    if (!memflowResult?.success && !openclawResult?.success) {
      return { success: false, error: '两个系统都失败', results: [] };
    }
    
    if (!memflowResult?.success) {
      return openclawResult;
    }
    
    if (!openclawResult?.success) {
      return memflowResult;
    }
    
    // 两个都成功，进行合并
    const allResults = [];
    const seenIds = new Set();
    
    // 添加MemFlow AI结果（应用权重）
    if (memflowResult.results) {
      memflowResult.results.forEach(result => {
        const weightedResult = {
          ...result,
          originalScore: result.score || result.metadata?.similarity || 0,
          score: (result.score || result.metadata?.similarity || 0) * this.config.resultMerge.weights.memflow,
          source: 'memflow'
        };
        
        const id = this._generateResultId(weightedResult);
        if (!seenIds.has(id)) {
          allResults.push(weightedResult);
          seenIds.add(id);
        }
      });
    }
    
    // 添加OpenClaw结果（应用权重）
    if (openclawResult.results) {
      openclawResult.results.forEach(result => {
        const weightedResult = {
          ...result,
          originalScore: result.score || 0,
          score: (result.score || 0) * this.config.resultMerge.weights.openclaw,
          source: 'openclaw'
        };
        
        const id = this._generateResultId(weightedResult);
        if (!seenIds.has(id)) {
          allResults.push(weightedResult);
          seenIds.add(id);
        }
      });
    }
    
    // 按新分数排序
    allResults.sort((a, b) => b.score - a.score);
    
    // 限制结果数量
    const maxResults = this.config.resultMerge.maxTotalResults || 15;
    const finalResults = allResults.slice(0, maxResults);
    
    return {
      success: true,
      results: finalResults,
      query,
      sources: {
        memflow: memflowResult.results?.length || 0,
        openclaw: openclawResult.results?.length || 0,
        merged: finalResults.length
      },
      mergeStrategy: this.config.resultMerge.strategy
    };
  }
  
  /**
   * 生成结果ID（用于去重）
   * @private
   */
  _generateResultId(result) {
    // 基于内容和来源生成唯一ID
    const contentHash = require('crypto')
      .createHash('md5')
      .update(result.text || '')
      .digest('hex')
      .substring(0, 8);
    
    return `${result.source}_${contentHash}`;
  }
  
  /**
   * 对比搜索结果
   * @private
   */
  _compareResults(memflowResult, openclawResult) {
    if (!memflowResult?.success || !openclawResult?.success) {
      return null;
    }
    
    const memflowResults = memflowResult.results || [];
    const openclawResults = openclawResult.results || [];
    
    // 计算分数（基于结果数量和质量）
    const memflowScore = this._calculateResultScore(memflowResults);
    const openclawScore = this._calculateResultScore(openclawResults);
    
    // 计算重叠
    const memflowIds = new Set(memflowResults.map(r => this._generateResultId({ ...r, source: 'memflow' })));
    const openclawIds = new Set(openclawResults.map(r => this._generateResultId({ ...r, source: 'openclaw' })));
    
    const overlap = new Set([...memflowIds].filter(x => openclawIds.has(x)));
    
    return {
      memflowScore,
      openclawScore,
      memflowCount: memflowResults.length,
      openclawCount: openclawResults.length,
      overlapCount: overlap.size,
      winner: memflowScore > openclawScore ? 'memflow' : 
              openclawScore > memflowScore ? 'openclaw' : 'tie',
      difference: Math.abs(memflowScore - openclawScore)
    };
  }
  
  /**
   * 计算结果分数
   * @private
   */
  _calculateResultScore(results) {
    if (!results || results.length === 0) {
      return 0;
    }
    
    // 简单分数计算：平均分数 * 数量因子
    const avgScore = results.reduce((sum, r) => sum + (r.score || r.metadata?.similarity || 0), 0) / results.length;
    const countFactor = Math.min(results.length / 10, 1); // 数量因子，最多1.0
    
    return avgScore * (0.7 + 0.3 * countFactor); // 70%质量 + 30%数量
  }
  
  /**
   * 记录对比数据
   * @private
   */
  _recordComparison(query, results) {
    const comparisonRecord = {
      timestamp: new Date().toISOString(),
      query,
      duration: results.duration,
      memflow: {
        success: results.memflow?.success || false,
        resultCount: results.memflow?.results?.length || 0,
        duration: results.memflow?.duration || 0
      },
      openclaw: {
        success: results.openclaw?.success || false,
        resultCount: results.openclaw?.results?.length || 0,
        duration: results.openclaw?.duration || 0
      },
      comparison: results.comparison
    };
    
    this.comparisonData.push(comparisonRecord);
    
    // 限制数据量
    const maxRecords = 1000;
    if (this.comparisonData.length > maxRecords) {
      this.comparisonData = this.comparisonData.slice(-maxRecords);
    }
    
    // 可选：保存到文件
    if (this.config.logging?.comparisonLog) {
      this._saveComparisonLog(comparisonRecord);
    }
  }
  
  /**
   * 保存对比日志
   * @private
   */
  _saveComparisonLog(record) {
    const logDir = path.dirname(this.config.logging.comparisonLog);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logLine = JSON.stringify(record) + '\n';
    fs.appendFileSync(this.config.logging.comparisonLog, logLine, 'utf8');
  }
  
  /**
   * 收集用户反馈
   */
  recordUserFeedback(query, preferredSystem, reason = '') {
    const feedback = {
      timestamp: new Date().toISOString(),
      query,
      preferredSystem,
      reason,
      stats: { ...this.stats }
    };
    
    this.userFeedback.push(feedback);
    
    console.log(`[ParallelManager] 用户反馈记录: 偏好 ${preferredSystem}, 原因: ${reason || '未指定'}`);
    
    // 根据反馈调整权重
    if (this.config.autoOptimization?.adjustWeights && this.userFeedback.length >= 10) {
      this._adjustWeightsBasedOnFeedback();
    }
    
    return feedback;
  }
  
  /**
   * 根据反馈调整权重
   * @private
   */
  _adjustWeightsBasedOnFeedback() {
    const recentFeedback = this.userFeedback.slice(-20); // 最近20条反馈
    const memflowPrefers = recentFeedback.filter(f => f.preferredSystem === 'memflow').length;
    const openclawPrefers = recentFeedback.filter(f => f.preferredSystem === 'openclaw').length;
    const total = memflowPrefers + openclawPrefers;
    
    if (total === 0) return;
    
    const memflowRatio = memflowPrefers / total;
    const openclawRatio = openclawPrefers / total;
    
    // 计算新权重（保持总和为1）
    const newMemflowWeight = 0.5 + (memflowRatio - 0.5) * 0.2; // 最大调整±0.1
    const newOpenclawWeight = 1 - newMemflowWeight;
    
    // 检查是否需要调整
    const currentMemflowWeight = this.config.resultMerge.weights.memflow;
    const difference = Math.abs(newMemflowWeight - currentMemflowWeight);
    
    if (difference >= (this.config.autoOptimization.adjustThreshold || 0.05)) {
      this.config.resultMerge.weights.memflow = newMemflowWeight;
      this.config.resultMerge.weights.openclaw = newOpenclawWeight;
      
      console.log(`[ParallelManager] 权重已调整: MemFlow=${newMemflowWeight.toFixed(2)}, OpenClaw=${newOpenclawWeight.toFixed(2)}`);
      console.log(`   基于反馈: MemFlow偏好 ${memflowPrefers}/${total}, OpenClaw偏好 ${openclawPrefers}/${total}`);
    }
  }
  
  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    const totalComparisons = this.comparisonData.length;
    const successfulComparisons = this.comparisonData.filter(d => 
      d.memflow.success && d.openclaw.success
    ).length;
    
    const avgMemflowTime = this.comparisonData
      .filter(d => d.memflow.success)
      .reduce((sum, d) => sum + d.memflow.duration, 0) / 
      Math.max(this.comparisonData.filter(d => d.memflow.success).length, 1);
    
    const avgOpenclawTime = this.comparisonData
      .filter(d => d.openclaw.success)
      .reduce((sum, d) => sum + d.openclaw.d