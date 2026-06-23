/**
 * 简化版并行运行管理器
 */

class ParallelManagerSimple {
  constructor(config = {}, memflowIntegration = null) {
    this.config = {
      mode: 'parallel',
      weights: { memflow: 0.7, openclaw: 0.3 },
      ...config
    };
    
    this.memflowIntegration = memflowIntegration;
    this.stats = {
      total: 0,
      memflow: 0,
      openclaw: 0,
      both: 0,
      memflowWins: 0,
      openclawWins: 0
    };
  }
  
  setMemflowIntegration(integration) {
    this.memflowIntegration = integration;
  }
  
  async parallelSearch(query, options = {}) {
    this.stats.total++;
    
    const results = {
      memflow: null,
      openclaw: null,
      merged: null
    };
    
    try {
      // MemFlow AI搜索
      if (this.memflowIntegration) {
        this.stats.memflow++;
        results.memflow = await this.memflowIntegration.memorySearch(query, options);
      }
      
      // OpenClaw模拟搜索
      this.stats.openclaw++;
      results.openclaw = await this._mockOpenClawSearch(query);
      
      // 合并结果
      results.merged = this._mergeResults(results.memflow, results.openclaw);
      
      // 对比
      const comparison = this._compareResults(results.memflow, results.openclaw);
      if (comparison.winner === 'memflow') this.stats.memflowWins++;
      else if (comparison.winner === 'openclaw') this.stats.openclawWins++;
      
      results.comparison = comparison;
      
      return results;
      
    } catch (error) {
      console.error('并行搜索失败:', error.message);
      
      // 回退到MemFlow AI
      if (this.memflowIntegration) {
        return {
          memflow: await this.memflowIntegration.memorySearch(query, options),
          openclaw: { error: '失败' },
          merged: null,
          fallback: true
        };
      }
      
      throw error;
    }
  }
  
  async _mockOpenClawSearch(query) {
    // 模拟OpenClaw搜索
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      results: [
        {
          id: 'openclaw_1',
          score: 0.8,
          text: `OpenClaw结果: ${query}`,
          metadata: { source: 'openclaw_mock' },
          snippet: '模拟OpenClaw搜索结果...'
        }
      ],
      duration: 150
    };
  }
  
  _mergeResults(memflow, openclaw) {
    if (!memflow?.success && !openclaw?.success) {
      return { success: false, results: [] };
    }
    
    if (!memflow?.success) return openclaw;
    if (!openclaw?.success) return memflow;
    
    const allResults = [];
    
    // MemFlow AI结果
    if (memflow.results) {
      memflow.results.forEach(r => {
        allResults.push({
          ...r,
          score: (r.score || 0) * this.config.weights.memflow,
          source: 'memflow'
        });
      });
    }
    
    // OpenClaw结果
    if (openclaw.results) {
      openclaw.results.forEach(r => {
        allResults.push({
          ...r,
          score: (r.score || 0) * this.config.weights.openclaw,
          source: 'openclaw'
        });
      });
    }
    
    // 排序
    allResults.sort((a, b) => b.score - a.score);
    
    return {
      success: true,
      results: allResults.slice(0, 15),
      sources: {
        memflow: memflow.results?.length || 0,
        openclaw: openclaw.results?.length || 0
      }
    };
  }
  
  _compareResults(memflow, openclaw) {
    if (!memflow?.success || !openclaw?.success) {
      return { winner: 'none' };
    }
    
    const memflowScore = this._calculateScore(memflow.results);
    const openclawScore = this._calculateScore(openclaw.results);
    
    return {
      memflowScore,
      openclawScore,
      winner: memflowScore > openclawScore ? 'memflow' : 
              openclawScore > memflowScore ? 'openclaw' : 'tie'
    };
  }
  
  _calculateScore(results) {
    if (!results || results.length === 0) return 0;
    const avg = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
    return avg * Math.min(results.length / 10, 1);
  }
  
  getStats() {
    const winRate = this.stats.memflowWins + this.stats.openclawWins > 0 ?
      (this.stats.memflowWins / (this.stats.memflowWins + this.stats.openclawWins) * 100).toFixed(1) : 0;
    
    return {
      ...this.stats,
      memflowWinRate: `${winRate}%`,
      weights: this.config.weights
    };
  }
}

module.exports = ParallelManagerSimple;