/**
 * MemFlow AI 时间线验证器
 * 检查记忆时间顺序一致性，检测时间线异常
 */

class TimelineValidator {
  constructor(options = {}) {
    this.options = {
      maxTimeGap: 86400000,      // 最大时间间隔(24小时)
      minTimeGap: 1000,          // 最小时间间隔(1秒)
      maxTimeJump: 604800000,    // 最大时间跳跃(7天)
      allowFutureDates: false,   // 是否允许未来日期
      confidenceThreshold: 0.7,  // 置信度阈值
      ...options
    };
    
    // 时间线异常类型
    this.ANOMALY_TYPES = {
      TIME_GAP: 'time_gap',           // 时间间隔过大
      TIME_OVERLAP: 'time_overlap',   // 时间重叠
      TIME_REVERSE: 'time_reverse',   // 时间倒序
      FUTURE_DATE: 'future_date',     // 未来日期
      DUPLICATE_TIME: 'duplicate_time', // 重复时间
      INVALID_TIMESTAMP: 'invalid_timestamp' // 无效时间戳
    };
    
    // 统计信息
    this.stats = {
      totalValidations: 0,
      anomaliesFound: 0,
      byType: {},
      avgProcessingTime: 0
    };
    
    // 初始化类型统计
    for (const type of Object.values(this.ANOMALY_TYPES)) {
      this.stats.byType[type] = 0;
    }
  }

  /**
   * 验证时间线一致性
   */
  async validateTimeline(memories) {
    const startTime = Date.now();
    this.stats.totalValidations++;
    
    console.log(`⏰ 时间线验证开始，处理 ${memories.length} 条记忆...`);
    
    // 按时间排序
    const sortedMemories = this.sortByTimestamp(memories);
    
    // 验证时间戳有效性
    const timestampIssues = this.validateTimestamps(sortedMemories);
    
    // 检测时间线异常
    const timelineAnomalies = this.detectTimelineAnomalies(sortedMemories);
    
    // 合并所有问题
    const allIssues = [...timestampIssues, ...timelineAnomalies];
    
    // 计算置信度
    const issuesWithConfidence = this.calculateConfidence(allIssues);
    
    // 过滤低置信度问题
    const significantIssues = issuesWithConfidence.filter(
      issue => issue.confidence >= this.options.confidenceThreshold
    );
    
    // 更新统计
    this.updateStats(significantIssues, Date.now() - startTime);
    
    return {
      totalMemories: memories.length,
      issuesFound: significantIssues.length,
      issues: significantIssues,
      timelineSummary: this.generateTimelineSummary(sortedMemories, significantIssues),
      suggestions: this.generateSuggestions(significantIssues),
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 按时间戳排序
   */
  sortByTimestamp(memories) {
    return [...memories].sort((a, b) => {
      const timeA = this.getMemoryTimestamp(a);
      const timeB = this.getMemoryTimestamp(b);
      return timeA - timeB;
    });
  }

  /**
   * 获取记忆时间戳
   */
  getMemoryTimestamp(memory) {
    if (memory.timestamp) {
      return memory.timestamp;
    } else if (memory.createdAt) {
      return new Date(memory.createdAt).getTime();
    } else if (memory.time) {
      return new Date(memory.time).getTime();
    } else {
      return Date.now(); // 默认当前时间
    }
  }

  /**
   * 验证时间戳有效性
   */
  validateTimestamps(memories) {
    const issues = [];
    const now = Date.now();
    
    for (let i = 0; i < memories.length; i++) {
      const memory = memories[i];
      const timestamp = this.getMemoryTimestamp(memory);
      
      // 检查无效时间戳
      if (!this.isValidTimestamp(timestamp)) {
        issues.push({
          type: this.ANOMALY_TYPES.INVALID_TIMESTAMP,
          memoryId: memory.id,
          timestamp,
          details: {
            reason: '时间戳无效或格式错误',
            value: timestamp
          },
          confidence: 0.9
        });
        continue;
      }
      
      // 检查未来日期
      if (!this.options.allowFutureDates && timestamp > now) {
        issues.push({
          type: this.ANOMALY_TYPES.FUTURE_DATE,
          memoryId: memory.id,
          timestamp,
          details: {
            reason: '时间戳为未来日期',
            currentTime: now,
            futureBy: timestamp - now
          },
          confidence: 0.8
        });
      }
      
      // 检查重复时间戳
      for (let j = i + 1; j < memories.length; j++) {
        const otherMemory = memories[j];
        const otherTimestamp = this.getMemoryTimestamp(otherMemory);
        
        if (Math.abs(timestamp - otherTimestamp) < this.options.minTimeGap) {
          issues.push({
            type: this.ANOMALY_TYPES.DUPLICATE_TIME,
            memoryIds: [memory.id, otherMemory.id],
            timestamp,
            details: {
              reason: '时间戳过于接近或重复',
              timeDiff: Math.abs(timestamp - otherTimestamp),
              threshold: this.options.minTimeGap
            },
            confidence: 0.7
          });
        }
      }
    }
    
    return issues;
  }

  /**
   * 检测时间线异常
   */
  detectTimelineAnomalies(sortedMemories) {
    const issues = [];
    
    for (let i = 1; i < sortedMemories.length; i++) {
      const prevMemory = sortedMemories[i - 1];
      const currMemory = sortedMemories[i];
      
      const prevTime = this.getMemoryTimestamp(prevMemory);
      const currTime = this.getMemoryTimestamp(currMemory);
      const timeDiff = currTime - prevTime;
      
      // 检查时间倒序
      if (timeDiff < 0) {
        issues.push({
          type: this.ANOMALY_TYPES.TIME_REVERSE,
          memoryIds: [prevMemory.id, currMemory.id],
          timestamps: [prevTime, currTime],
          details: {
            reason: '时间顺序倒置',
            timeDiff,
            expected: 'currTime > prevTime'
          },
          confidence: 0.9
        });
        continue;
      }
      
      // 检查时间间隔过大
      if (timeDiff > this.options.maxTimeGap) {
        issues.push({
          type: this.ANOMALY_TYPES.TIME_GAP,
          memoryIds: [prevMemory.id, currMemory.id],
          timestamps: [prevTime, currTime],
          details: {
            reason: '时间间隔过大',
            timeDiff,
            gapHours: (timeDiff / 3600000).toFixed(1),
            maxGap: this.options.maxTimeGap,
            maxGapHours: (this.options.maxTimeGap / 3600000).toFixed(1)
          },
          confidence: this.calculateGapConfidence(timeDiff)
        });
      }
      
      // 检查时间跳跃（异常变化）
      if (i > 1) {
        const prevPrevTime = this.getMemoryTimestamp(sortedMemories[i - 2]);
        const prevDiff = prevTime - prevPrevTime;
        
        // 检查时间变化率异常
        if (prevDiff > 0 && timeDiff > prevDiff * 10) {
          issues.push({
            type: this.ANOMALY_TYPES.TIME_GAP,
            memoryIds: [prevMemory.id, currMemory.id],
            timestamps: [prevTime, currTime],
            details: {
              reason: '时间跳跃异常',
              timeDiff,
              prevDiff,
              jumpRatio: (timeDiff / prevDiff).toFixed(1),
              threshold: 10
            },
            confidence: 0.6
          });
        }
      }
    }
    
    return issues;
  }

  /**
   * 检查时间戳有效性
   */
  isValidTimestamp(timestamp) {
    if (typeof timestamp !== 'number') {
      return false;
    }
    
    // 检查是否为合理的时间戳（1970-2100年之间）
    const minValid = 0; // 1970-01-01
    const maxValid = 4102444800000; // 2100-01-01
    
    return timestamp >= minValid && timestamp <= maxValid;
  }

  /**
   * 计算时间间隔置信度
   */
  calculateGapConfidence(timeDiff) {
    const normalized = Math.min(timeDiff / this.options.maxTimeGap, 1);
    
    // 使用sigmoid函数计算置信度
    // 间隔越大，置信度越高，但不超过0.9
    return 0.1 + 0.8 * (1 / (1 + Math.exp(-10 * (normalized - 0.5))));
  }

  /**
   * 计算问题置信度
   */
  calculateConfidence(issues) {
    return issues.map(issue => {
      // 根据问题类型调整置信度
      let confidence = issue.confidence || 0.5;
      
      switch (issue.type) {
        case this.ANOMALY_TYPES.TIME_REVERSE:
          confidence *= 1.2; // 时间倒序置信度更高
          break;
        case this.ANOMALY_TYPES.INVALID_TIMESTAMP:
          confidence *= 1.3; // 无效时间戳置信度最高
          break;
        case this.ANOMALY_TYPES.DUPLICATE_TIME:
          confidence *= 0.9; // 重复时间置信度稍低
          break;
      }
      
      return {
        ...issue,
        confidence: Math.min(Math.max(confidence, 0), 1)
      };
    });
  }

  /**
   * 生成时间线摘要
   */
  generateTimelineSummary(memories, issues) {
    if (memories.length === 0) {
      return {
        totalMemories: 0,
        timeRange: '无记忆',
        avgTimeGap: 0,
        consistency: '无法计算'
      };
    }
    
    const firstTime = this.getMemoryTimestamp(memories[0]);
    const lastTime = this.getMemoryTimestamp(memories[memories.length - 1]);
    const totalTime = lastTime - firstTime;
    
    // 计算平均时间间隔
    let totalGap = 0;
    let validGaps = 0;
    
    for (let i = 1; i < memories.length; i++) {
      const gap = this.getMemoryTimestamp(memories[i]) - this.getMemoryTimestamp(memories[i - 1]);
      if (gap > 0) {
        totalGap += gap;
        validGaps++;
      }
    }
    
    const avgGap = validGaps > 0 ? totalGap / validGaps : 0;
    
    // 计算一致性分数
    const issueScore = issues.length / memories.length;
    const consistency = 1 - Math.min(issueScore, 1);
    
    return {
      totalMemories: memories.length,
      timeRange: {
        start: new Date(firstTime).toISOString(),
        end: new Date(lastTime).toISOString(),
        durationHours: (totalTime / 3600000).toFixed(1)
      },
      avgTimeGap: {
        milliseconds: avgGap,
        minutes: (avgGap / 60000).toFixed(1),
        hours: (avgGap / 3600000).toFixed(1)
      },
      consistency: {
        score: consistency.toFixed(2),
        level: this.getConsistencyLevel(consistency),
        issues: issues.length
      }
    };
  }

  /**
   * 获取一致性等级
   */
  getConsistencyLevel(score) {
    if (score >= 0.9) return '优秀';
    if (score >= 0.7) return '良好';
    if (score >= 0.5) return '一般';
    return '需要改进';
  }

  /**
   * 生成解决建议
   */
  generateSuggestions(issues) {
    const suggestions = [];
    
    for (const issue of issues) {
      let suggestion = '';
      
      switch (issue.type) {
        case this.ANOMALY_TYPES.TIME_GAP:
          suggestion = `记忆 ${issue.memoryIds.join(' 和 ')} 时间间隔过大（${issue.details.gapHours}小时），建议检查是否缺失中间记忆。`;
          break;
          
        case this.ANOMALY_TYPES.TIME_REVERSE:
          suggestion = `记忆 ${issue.memoryIds.join(' 和 ')} 时间顺序倒置，建议调整时间戳顺序。`;
          break;
          
        case this.ANOMALY_TYPES.FUTURE_DATE:
          suggestion = `记忆 ${issue.memoryId} 的时间戳为未来日期，请检查时间设置。`;
          break;
          
        case this.ANOMALY_TYPES.DUPLICATE_TIME:
          suggestion = `记忆 ${issue.memoryIds.join(' 和 ')} 时间戳过于接近，建议区分时间或合并记忆。`;
          break;
          
        case this.ANOMALY_TYPES.INVALID_TIMESTAMP:
          suggestion = `记忆 ${issue.memoryId} 的时间戳无效，请修正时间戳格式。`;
          break;
          
        default:
          suggestion = `记忆 ${issue.memoryId || issue.memoryIds?.join(',')} 存在时间线问题，建议检查。`;
      }
      
      suggestions.push({
        issueType: issue.type,
        memoryIds: issue.memoryId ? [issue.memoryId] : issue.memoryIds,
        suggestion,
        confidence: issue.confidence
      });
    }
    
    return suggestions;
  }

  /**
   * 更新统计信息
   */
  updateStats(issues, processingTime) {
    this.stats.anomaliesFound += issues.length;
    
    // 更新类型统计
    for (const issue of issues) {
      if (this.stats.byType[issue.type] !== undefined) {
        this.stats.byType[issue.type]++;
      }
    }
    
    // 更新平均处理时间
    this.stats.avgProcessingTime = (
      this.stats.avgProcessingTime * (this.stats.totalValidations - 1) + processingTime
    ) / this.stats.totalValidations;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      anomalyRate: this.stats.totalValidations > 0 
        ? (this.stats.anomaliesFound / this.stats.totalValidations).toFixed(2)
        : 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.stats = {
      totalValidations: 0,
      anomaliesFound: 0,
      byType: {},
      avgProcessingTime: 0
    };
    
    for (const type of Object.values(this.ANOMALY_TYPES)) {
      this.stats.byType[type] = 0;
    }
    
    console.log('📊 时间线验证统计已重置');
  }

  /**
   * 批量验证
   */
  async validateBatch(memories, batchSize = 100) {
    const results = [];
    
    // 分批处理
    for (let i = 0; i < memories.length; i += batchSize) {
      const batch = memories.slice(i, i + batchSize);
      const result = await this.validateTimeline(batch);
      results.push(result);
    }
    
    // 合并结果
    const merged = this.mergeValidationResults(results);
    
    return merged;
  }

  /**
   * 合并验证结果
   */
  mergeValidationResults(results) {
    if (results.length === 0) {
      return {
        totalMemories: 0,
        issuesFound: 0,
        issues: [],
        timelineSummary: {},
        suggestions: [],
        stats: this.getStats(),
        timestamp: new Date().toISOString()
      };
    }
    
    if (results.length === 1) {
      return results[0];
    }
    
    // 合并多个批次的结果
    const merged = {
      totalMemories: 0,
      issuesFound: 0,
      issues: [],
      timelineSummary: {},
      suggestions: [],
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };
    
    for (const result of results) {
      merged.totalMemories += result.totalMemories;
      merged.issuesFound += result.issuesFound;
      merged.issues.push(...result.issues);
      merged.suggestions.push(...result.suggestions);
    }
    
    return merged;
  }

  /**
   * 导出配置
   */
  exportConfig() {
    return {
      options: this.options,
      anomalyTypes: this.ANOMALY_TYPES,
      stats: this.getStats(),
      exportTime: new Date().toISOString()
    };
  }
}

// 导出模块
module.exports = TimelineValidator;