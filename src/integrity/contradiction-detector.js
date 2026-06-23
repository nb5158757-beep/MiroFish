  getContradictionStats() {
    const stats = {
      totalDetected: this.contradictionHistory.length,
      byType: { semantic: 0, temporal: 0, logical: 0, factual: 0 },
      bySeverity: { high: 0, medium: 0, low: 0, none: 0 },
      byAction: { accept: 0, reject: 0, review: 0, 'accept-with-note': 0 }
    };
    
    this.contradictionHistory.forEach(entry => {
      entry.contradictions.forEach(contradiction => {
        stats.byType[contradiction.type]++;
        stats.bySeverity[contradiction.severity]++;
      });
      stats.byAction[entry.action]++;
    });
    
    return stats;
  }

  /**
   * 重置检测器
   */
  reset() {
    this.contradictionHistory = [];
    console.log('🔄 矛盾检测引擎已重置');
  }

  /**
   * 导出矛盾数据
   */
  exportContradictionData(format = 'json') {
    const data = {
      stats: this.getContradictionStats(),
      recentHistory: this.getContradictionHistory(100),
      config: this.config,
      timestamp: new Date().toISOString()
    };
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      // 简化的CSV导出
      let csv = '类型,严重程度,描述,时间\n';
      this.contradictionHistory.forEach(entry => {
        entry.contradictions.forEach(contradiction => {
          csv += `${contradiction.type},${contradiction.severity},"${contradiction.description}",${new Date(entry.timestamp).toISOString()}\n`;
        });
      });
      return csv;
    }
    
    return data;
  }
}

module.exports = ContradictionDetector;