/**
 * MemFlow AI 增强版时间冲突检测
 * 基于Allen区间代数的时间关系分析
 */

class TimeConflictDetector {
  constructor(options = {}) {
    this.options = {
      maxTimeGap: 3600, // 最大时间间隔(秒)
      minOverlapRatio: 0.1, // 最小重叠比例
      confidenceThreshold: 0.6,
      ...options
    };
    
    // Allen的13种时间关系
    this.ALLEN_RELATIONS = {
      BEFORE: 'before',        // A在B之前
      AFTER: 'after',          // A在B之后
      MEETS: 'meets',          // A与B相接
      MET_BY: 'met_by',        // B与A相接
      OVERLAPS: 'overlaps',    // A与B重叠
      OVERLAPPED_BY: 'overlapped_by', // B与A重叠
      STARTS: 'starts',        // A开始B
      STARTED_BY: 'started_by', // B开始A
      FINISHES: 'finishes',    // A结束B
      FINISHED_BY: 'finished_by', // B结束A
      DURING: 'during',        // A在B期间
      CONTAINS: 'contains',    // B在A期间
      EQUALS: 'equals'         // A等于B
    };
  }

  /**
   * 计算Allen时间关系
   */
  computeAllenRelation(intervalA, intervalB) {
    const { start: aStart, end: aEnd } = intervalA;
    const { start: bStart, end: bEnd } = intervalB;
    
    // 检查相等
    if (aStart === bStart && aEnd === bEnd) {
      return { relation: this.ALLEN_RELATIONS.EQUALS, overlap: 1.0 };
    }
    
    // 检查包含关系
    if (aStart <= bStart && aEnd >= bEnd) {
      const overlap = this.calculateOverlapRatio(intervalA, intervalB);
      return { relation: this.ALLEN_RELATIONS.CONTAINS, overlap };
    }
    
    if (bStart <= aStart && bEnd >= aEnd) {
      const overlap = this.calculateOverlapRatio(intervalA, intervalB);
      return { relation: this.ALLEN_RELATIONS.DURING, overlap };
    }
    
    // 检查开始关系
    if (aStart === bStart && aEnd < bEnd) {
      return { relation: this.ALLEN_RELATIONS.STARTS, overlap: 1.0 };
    }
    
    if (aStart === bStart && aEnd > bEnd) {
      return { relation: this.ALLEN_RELATIONS.STARTED_BY, overlap: 1.0 };
    }
    
    // 检查结束关系
    if (aEnd === bEnd && aStart > bStart) {
      return { relation: this.ALLEN_RELATIONS.FINISHES, overlap: 1.0 };
    }
    
    if (aEnd === bEnd && aStart < bStart) {
      return { relation: this.ALLEN_RELATIONS.FINISHED_BY, overlap: 1.0 };
    }
    
    // 检查重叠关系
    if (aStart < bStart && aEnd > bStart && aEnd < bEnd) {
      const overlap = this.calculateOverlapRatio(intervalA, intervalB);
      return { relation: this.ALLEN_RELATIONS.OVERLAPS, overlap };
    }
    
    if (bStart < aStart && bEnd > aStart && bEnd < aEnd) {
      const overlap = this.calculateOverlapRatio(intervalA, intervalB);
      return { relation: this.ALLEN_RELATIONS.OVERLAPPED_BY, overlap };
    }
    
    // 检查相接关系
    if (aEnd === bStart) {
      return { relation: this.ALLEN_RELATIONS.MEETS, overlap: 0 };
    }
    
    if (bEnd === aStart) {
      return { relation: this.ALLEN_RELATIONS.MET_BY, overlap: 0 };
    }
    
    // 检查前后关系
    if (aEnd < bStart) {
      const gap = bStart - aEnd;
      return { relation: this.ALLEN_RELATIONS.BEFORE, gap };
    }
    
    if (bEnd < aStart) {
      const gap = aStart - bEnd;
      return { relation: this.ALLEN_RELATIONS.AFTER, gap };
    }
    
    // 默认情况
    return { relation: 'unknown', overlap: 0 };
  }

  /**
   * 计算重叠比例
   */
  calculateOverlapRatio(intervalA, intervalB) {
    const overlapStart = Math.max(intervalA.start, intervalB.start);
    const overlapEnd = Math.min(intervalA.end, intervalB.end);
    
    if (overlapStart >= overlapEnd) {
      return 0;
    }
    
    const overlapDuration = overlapEnd - overlapStart;
    const aDuration = intervalA.end - intervalA.start;
    const bDuration = intervalB.end - intervalB.start;
    
    // 返回相对较小区间的重叠比例
    const minDuration = Math.min(aDuration, bDuration);
    return overlapDuration / minDuration;
  }

  /**
   * 分析时间冲突
   */
  analyzeTimeConflict(memoryA, memoryB) {
    // 获取时间区间
    const intervalA = this.getTimeInterval(memoryA);
    const intervalB = this.getTimeInterval(memoryB);
    
    // 计算时间关系
    const relationResult = this.computeAllenRelation(intervalA, intervalB);
    
    // 分析冲突可能性
    const conflictAnalysis = this.evaluateConflict(relationResult, memoryA, memoryB);
    
    return {
      relation: relationResult.relation,
      overlap: relationResult.overlap || 0,
      gap: relationResult.gap || 0,
      conflict: conflictAnalysis.conflict,
      confidence: conflictAnalysis.confidence,
      details: conflictAnalysis.details,
      suggestion: this.generateSuggestion(relationResult, conflictAnalysis)
    };
  }

  /**
   * 获取时间区间
   */
  getTimeInterval(memory) {
    // 默认：记忆有开始时间和结束时间
    // 如果只有时间戳，创建短时间区间
    if (memory.startTime && memory.endTime) {
      return {
        start: memory.startTime,
        end: memory.endTime
      };
    } else if (memory.timestamp) {
      // 只有时间戳，假设持续1小时
      return {
        start: memory.timestamp,
        end: memory.timestamp + 3600000 // 1小时
      };
    } else {
      // 无时间信息，使用当前时间
      const now = Date.now();
      return {
        start: now,
        end: now + 3600000
      };
    }
  }

  /**
   * 评估冲突
   */
  evaluateConflict(relationResult, memoryA, memoryB) {
    const { relation, overlap, gap } = relationResult;
    
    // 根据时间关系评估冲突可能性
    let conflict = false;
    let confidence = 0;
    let details = {};
    
    switch (relation) {
      case this.ALLEN_RELATIONS.EQUALS:
        // 完全相同时间，高冲突可能性
        conflict = true;
        confidence = 0.9;
        details = { reason: '完全相同的时间区间' };
        break;
        
      case this.ALLEN_RELATIONS.OVERLAPS:
      case this.ALLEN_RELATIONS.OVERLAPPED_BY:
        // 时间重叠，冲突可能性中等
        conflict = true;
        confidence = 0.5 + (overlap * 0.4); // 重叠越多，置信度越高
        details = { 
          reason: '时间区间重叠',
          overlapRatio: overlap
        };
        break;
        
      case this.ALLEN_RELATIONS.CONTAINS:
      case this.ALLEN_RELATIONS.DURING:
        // 包含关系，冲突可能性中等
        conflict = true;
        confidence = 0.6;
        details = { 
          reason: '时间区间包含关系',
          overlapRatio: overlap
        };
        break;
        
      case this.ALLEN_RELATIONS.STARTS:
      case this.ALLEN_RELATIONS.STARTED_BY:
      case this.ALLEN_RELATIONS.FINISHES:
      case this.ALLEN_RELATIONS.FINISHED_BY:
        // 开始/结束关系，低冲突可能性
        conflict = true;
        confidence = 0.4;
        details = { reason: '时间边界相同' };
        break;
        
      case this.ALLEN_RELATIONS.MEETS:
      case this.ALLEN_RELATIONS.MET_BY:
        // 相接关系，很低冲突可能性
        conflict = false;
        confidence = 0.2;
        details = { reason: '时间区间相接' };
        break;
        
      case this.ALLEN_RELATIONS.BEFORE:
      case this.ALLEN_RELATIONS.AFTER:
        // 前后关系，检查时间间隔
        if (gap <= this.options.maxTimeGap * 1000) { // 转换为毫秒
          // 时间接近，可能冲突
          conflict = true;
          confidence = 0.3 + (1 - gap / (this.options.maxTimeGap * 1000)) * 0.3;
          details = { 
            reason: '时间接近但分离',
            gapSeconds: gap / 1000,
            maxGap: this.options.maxTimeGap
          };
        } else {
          // 时间间隔大，不冲突
          conflict = false;
          confidence = 0.1;
          details = { 
            reason: '时间间隔较大',
            gapSeconds: gap / 1000
          };
        }
        break;
        
      default:
        conflict = false;
        confidence = 0;
        details = { reason: '未知时间关系' };
    }
    
    // 如果重叠比例太小，降低置信度
    if (overlap > 0 && overlap < this.options.minOverlapRatio) {
      confidence *= 0.5;
      details.overlapTooSmall = true;
    }
    
    return {
      conflict,
      confidence: Math.min(Math.max(confidence, 0), 1),
      details
    };
  }

  /**
   * 生成解决建议
   */
  generateSuggestion(relationResult, conflictAnalysis) {
    const { relation, overlap, gap } = relationResult;
    const { conflict, confidence, details } = conflictAnalysis;
    
    if (!conflict || confidence < this.options.confidenceThreshold) {
      return '时间关系正常，无需处理。';
    }
    
    let suggestion = '';
    
    switch (relation) {
      case this.ALLEN_RELATIONS.EQUALS:
        suggestion = '时间完全相同，建议检查是否为重复记忆或需要合并。';
        break;
        
      case this.ALLEN_RELATIONS.OVERLAPS:
      case this.ALLEN_RELATIONS.OVERLAPPED_BY:
        suggestion = `时间重叠${(overlap * 100).toFixed(1)}%，建议明确时间边界或创建时间线。`;
        break;
        
      case this.ALLEN_RELATIONS.CONTAINS:
        suggestion = '一个时间区间完全包含另一个，建议检查是否为父子事件关系。';
        break;
        
      case this.ALLEN_RELATIONS.DURING:
        suggestion = '一个时间区间在另一个期间内，建议检查事件层次结构。';
        break;
        
      case this.ALLEN_RELATIONS.BEFORE:
      case this.ALLEN_RELATIONS.AFTER:
        if (gap <= this.options.maxTimeGap * 1000) {
          suggestion = `时间接近（间隔${(gap / 1000).toFixed(0)}秒），建议检查事件连续性。`;
        }
        break;
        
      default:
        suggestion = '检测到时间关系异常，建议检查时间戳准确性。';
    }
    
    // 添加置信度信息
    if (confidence >= 0.8) {
      suggestion += ' (高置信度)';
    } else if (confidence >= 0.6) {
      suggestion += ' (中置信度)';
    } else {
      suggestion += ' (低置信度，建议人工检查)';
    }
    
    return suggestion;
  }

  /**
   * 批量分析时间冲突
   */
  async analyzeBatch(memories) {
    const results = [];
    const analyzedPairs = new Set();
    
    // 按时间排序，优化比较
    const sortedMemories = [...memories].sort((a, b) => {
      const timeA = a.startTime || a.timestamp || 0;
      const timeB = b.startTime || b.timestamp || 0;
      return timeA - timeB;
    });
    
    // 使用滑动窗口优化
    for (let i = 0; i < sortedMemories.length; i++) {
      for (let j = i + 1; j < sortedMemories.length; j++) {
        const memoryA = sortedMemories[i];
        const memoryB = sortedMemories[j];
        
        // 检查是否应该继续比较（时间间隔过大）
        const timeA = memoryA.endTime || memoryA.timestamp || 0;
        const timeB = memoryB.startTime || memoryB.timestamp || 0;
        
        if (timeB - timeA > this.options.maxTimeGap * 1000 * 10) {
          // 时间间隔太大，跳过后续比较
          break;
        }
        
        // 分析冲突
        const analysis = this.analyzeTimeConflict(memoryA, memoryB);
        
        if (analysis.conflict && analysis.confidence >= this.options.confidenceThreshold) {
          results.push({
            memoryA: memoryA.id,
            memoryB: memoryB.id,
            ...analysis
          });
        }
        
        analyzedPairs.add(`${memoryA.id}|${memoryB.id}`);
      }
    }
    
    return {
      totalPairs: analyzedPairs.size,
      conflictsFound: results.length,
      conflicts: results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取时间关系描述
   */
  getRelationDescription(relation) {
    const descriptions = {
      [this.ALLEN_RELATIONS.BEFORE]: '在...之前',
      [this.ALLEN_RELATIONS.AFTER]: '在...之后',
      [this.ALLEN_RELATIONS.MEETS]: '与...相接',
      [this.ALLEN_RELATIONS.MET_BY]: '被...相接',
      [this.ALLEN_RELATIONS.OVERLAPS]: '与...重叠',
      [this.ALLEN_RELATIONS.OVERLAPPED_BY]: '被...重叠',
      [this.ALLEN_RELATIONS.STARTS]: '开始于...',
      [this.ALLEN_RELATIONS.STARTED_BY]: '被...开始',
      [this.ALLEN_RELATIONS.FINISHES]: '结束于...',
      [this.ALLEN_RELATIONS.FINISHED_BY]: '被...结束',
      [this.ALLEN_RELATIONS.DURING]: '在...期间',
      [this.ALLEN_RELATIONS.CONTAINS]: '包含...',
      [this.ALLEN_RELATIONS.EQUALS]: '等于...'
    };
    
    return descriptions[relation] || '未知关系';
  }
}

// 导出模块
module.exports = TimeConflictDetector;