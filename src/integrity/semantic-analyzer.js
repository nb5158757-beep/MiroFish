/**
 * MemFlow AI 语义矛盾检测
 * 基于语义嵌入和矛盾模式识别的增强分析
 */

class SemanticAnalyzer {
  constructor(options = {}) {
    this.options = {
      similarityThreshold: 0.7,      // 语义相似度阈值
      contradictionThreshold: 0.6,   // 矛盾检测阈值
      useEmbedding: true,           // 是否使用语义嵌入
      embeddingModel: 'zhipu',      // 嵌入模型
      cacheEnabled: true,           // 启用缓存
      ...options
    };
    
    // 矛盾模式库
    this.contradictionPatterns = this.buildContradictionPatterns();
    
    // 缓存
    this.embeddingCache = new Map();
    this.similarityCache = new Map();
    
    // 统计
    this.stats = {
      totalAnalyses: 0,
      contradictionsFound: 0,
      avgSimilarity: 0,
      avgContradictionScore: 0
    };
  }

  /**
   * 构建矛盾模式库
   */
  buildContradictionPatterns() {
    return {
      // 否定模式
      negation: [
        { positive: '是', negative: '不是' },
        { positive: '有', negative: '没有' },
        { positive: '可以', negative: '不能' },
        { positive: '会', negative: '不会' },
        { positive: '要', negative: '不要' },
        { positive: '应该', negative: '不应该' },
        { positive: '必须', negative: '不必' },
        { positive: '可能', negative: '不可能' }
      ],
      
      // 相反词模式
      opposite: [
        { word1: '好', word2: '坏' },
        { word1: '快', word2: '慢' },
        { word1: '高', word2: '低' },
        { word1: '多', word2: '少' },
        { word1: '大', word2: '小' },
        { word1: '强', word2: '弱' },
        { word1: '热', word2: '冷' },
        { word1: '新', word2: '旧' },
        { word1: '成功', word2: '失败' },
        { word1: '正确', word2: '错误' },
        { word1: '支持', word2: '反对' },
        { word1: '增加', word2: '减少' },
        { word1: '提高', word2: '降低' },
        { word1: '改善', word2: '恶化' },
        { word1: '优点', word2: '缺点' },
        { word1: '优势', word2: '劣势' }
      ],
      
      // 数量矛盾模式
      quantity: [
        { pattern: '很多', opposite: '很少' },
        { pattern: '全部', opposite: '没有' },
        { pattern: '大多数', opposite: '少数' },
        { pattern: '经常', opposite: '很少' },
        { pattern: '总是', opposite: '从不' }
      ],
      
      // 程度矛盾模式
      degree: [
        { pattern: '非常', opposite: '一点也不' },
        { pattern: '极其', opposite: '完全不' },
        { pattern: '特别', opposite: '普通' }
      ]
    };
  }

  /**
   * 分析语义矛盾
   */
  async analyzeSemanticConflict(memoryA, memoryB) {
    const startTime = Date.now();
    this.stats.totalAnalyses++;
    
    console.log(`🔤 分析语义矛盾: ${memoryA.id} vs ${memoryB.id}`);
    
    // 1. 文本预处理
    const textA = this.preprocessText(memoryA.content);
    const textB = this.preprocessText(memoryB.content);
    
    // 2. 计算语义相似度
    const similarity = await this.computeSemanticSimilarity(textA, textB);
    
    // 3. 检测矛盾模式
    const patternAnalysis = this.detectContradictionPatterns(textA, textB);
    
    // 4. 计算矛盾分数
    const contradictionScore = this.computeContradictionScore(similarity, patternAnalysis);
    
    // 5. 生成分析结果
    const result = this.generateAnalysisResult(
      memoryA, memoryB, similarity, patternAnalysis, contradictionScore
    );
    
    // 更新统计
    this.updateStats(similarity, contradictionScore, Date.now() - startTime);
    
    return result;
  }

  /**
   * 文本预处理
   */
  preprocessText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    // 1. 转换为小写（中文不需要，但保留给其他语言）
    let processed = text.toLowerCase();
    
    // 2. 移除标点符号（保留中文标点）
    processed = processed.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ');
    
    // 3. 移除多余空格
    processed = processed.replace(/\s+/g, ' ').trim();
    
    // 4. 移除停用词（简化版本）
    const stopWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'];
    stopWords.forEach(word => {
      processed = processed.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
    });
    
    // 5. 再次清理空格
    processed = processed.replace(/\s+/g, ' ').trim();
    
    return processed;
  }

  /**
   * 计算语义相似度
   */
  async computeSemanticSimilarity(textA, textB) {
    // 检查缓存
    const cacheKey = `${textA}|${textB}`;
    if (this.options.cacheEnabled && this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey);
    }
    
    let similarity = 0;
    
    if (this.options.useEmbedding && textA && textB) {
      try {
        // 使用嵌入模型计算相似度
        similarity = await this.computeEmbeddingSimilarity(textA, textB);
      } catch (error) {
        console.warn('嵌入模型计算失败，使用文本相似度:', error.message);
        similarity = this.computeTextSimilarity(textA, textB);
      }
    } else {
      // 使用文本相似度
      similarity = this.computeTextSimilarity(textA, textB);
    }
    
    // 缓存结果
    if (this.options.cacheEnabled) {
      this.similarityCache.set(cacheKey, similarity);
    }
    
    return similarity;
  }

  /**
   * 计算嵌入相似度（模拟）
   */
  async computeEmbeddingSimilarity(textA, textB) {
    // 模拟嵌入计算
    // 在实际实现中，这里会调用Zhipu AI嵌入API
    
    // 简单实现：基于共同词汇的相似度
    const wordsA = new Set(textA.split(' '));
    const wordsB = new Set(textB.split(' '));
    
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    
    if (union.size === 0) return 0;
    
    return intersection.size / union.size;
  }

  /**
   * 计算文本相似度
   */
  computeTextSimilarity(textA, textB) {
    if (!textA || !textB) return 0;
    
    // Jaccard相似度
    const setA = new Set(textA.split(''));
    const setB = new Set(textB.split(''));
    
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    
    if (union.size === 0) return 0;
    
    return intersection.size / union.size;
  }

  /**
   * 检测矛盾模式
   */
  detectContradictionPatterns(textA, textB) {
    const patterns = {
      negation: [],
      opposite: [],
      quantity: [],
      degree: [],
      custom: []
    };
    
    let totalPatterns = 0;
    let strongPatterns = 0;
    
    // 检测否定模式
    for (const pattern of this.contradictionPatterns.negation) {
      const hasPositiveA = textA.includes(pattern.positive);
      const hasNegativeB = textB.includes(pattern.negative);
      const hasNegativeA = textA.includes(pattern.negative);
      const hasPositiveB = textB.includes(pattern.positive);
      
      if ((hasPositiveA && hasNegativeB) || (hasNegativeA && hasPositiveB)) {
        patterns.negation.push({
          pattern: `${pattern.positive}/${pattern.negative}`,
          foundInA: hasPositiveA ? pattern.positive : pattern.negative,
          foundInB: hasPositiveB ? pattern.positive : pattern.negative
        });
        totalPatterns++;
        strongPatterns++;
      }
    }
    
    // 检测相反词模式
    for (const pattern of this.contradictionPatterns.opposite) {
      const hasWord1A = textA.includes(pattern.word1);
      const hasWord2B = textB.includes(pattern.word2);
      const hasWord2A = textA.includes(pattern.word2);
      const hasWord1B = textB.includes(pattern.word1);
      
      if ((hasWord1A && hasWord2B) || (hasWord2A && hasWord1B)) {
        patterns.opposite.push({
          words: `${pattern.word1}/${pattern.word2}`,
          foundInA: hasWord1A ? pattern.word1 : pattern.word2,
          foundInB: hasWord1B ? pattern.word1 : pattern.word2
        });
        totalPatterns++;
        strongPatterns++;
      }
    }
    
    // 检测数量矛盾
    for (const pattern of this.contradictionPatterns.quantity) {
      const hasPatternA = textA.includes(pattern.pattern);
      const hasOppositeB = textB.includes(pattern.opposite);
      const hasOppositeA = textA.includes(pattern.opposite);
      const hasPatternB = textB.includes(pattern.pattern);
      
      if ((hasPatternA && hasOppositeB) || (hasOppositeA && hasPatternB)) {
        patterns.quantity.push({
          pattern: `${pattern.pattern}/${pattern.opposite}`,
          foundInA: hasPatternA ? pattern.pattern : pattern.opposite,
          foundInB: hasPatternB ? pattern.pattern : pattern.opposite
        });
        totalPatterns++;
      }
    }
    
    // 检测程度矛盾
    for (const pattern of this.contradictionPatterns.degree) {
      const hasPatternA = textA.includes(pattern.pattern);
      const hasOppositeB = textB.includes(pattern.opposite);
      const hasOppositeA = textA.includes(pattern.opposite);
      const hasPatternB = textB.includes(pattern.pattern);
      
      if ((hasPatternA && hasOppositeB) || (hasOppositeA && hasPatternB)) {
        patterns.degree.push({
          pattern: `${pattern.pattern}/${pattern.opposite}`,
          foundInA: hasPatternA ? pattern.pattern : pattern.opposite,
          foundInB: hasPatternB ? pattern.pattern : pattern.opposite
        });
        totalPatterns++;
      }
    }
    
    return {
      patterns,
      totalPatterns,
      strongPatterns,
      hasContradiction: totalPatterns > 0
    };
  }

  /**
   * 计算矛盾分数
   */
  computeContradictionScore(similarity, patternAnalysis) {
    const { totalPatterns, strongPatterns, hasContradiction } = patternAnalysis;
    
    if (!hasContradiction) {
      return 0;
    }
    
    // 基础分数：基于模式数量
    let score = Math.min(totalPatterns * 0.2, 0.6);
    
    // 增强分数：强模式额外加分
    score += strongPatterns * 0.1;
    
    // 相似度调整：高相似度但内容矛盾，分数更高
    if (similarity > this.options.similarityThreshold) {
      // 相似度高但检测到矛盾，矛盾更明显
      score += (similarity - this.options.similarityThreshold) * 0.5;
    } else {
      // 相似度低，矛盾可能性降低
      score *= similarity;
    }
    
    // 确保分数在0-1之间
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * 生成分析结果
   */
  generateAnalysisResult(memoryA, memoryB, similarity, patternAnalysis, contradictionScore) {
    const hasContradiction = contradictionScore >= this.options.contradictionThreshold;
    
    const result = {
      memoryA: memoryA.id,
      memoryB: memoryB.id,
      similarity: similarity,
      contradictionScore: contradictionScore,
      hasContradiction: hasContradiction,
      confidence: contradictionScore,
      patternAnalysis: patternAnalysis,
      details: this.generateDetails(similarity, patternAnalysis, contradictionScore),
      suggestion: this.generateSuggestion(hasContradiction, contradictionScore, patternAnalysis)
    };
    
    if (hasContradiction) {
      this.stats.contradictionsFound++;
    }
    
    return result;
  }

  /**
   * 生成详细信息
   */
  generateDetails(similarity, patternAnalysis, contradictionScore) {
    const { patterns, totalPatterns, strongPatterns } = patternAnalysis;
    
    const details = {
      similarity: similarity.toFixed(3),
      totalPatterns,
      strongPatterns,
      contradictionScore: contradictionScore.toFixed(3),
      patternBreakdown: {}
    };
    
    // 添加模式分类统计
    for (const [category, categoryPatterns] of Object.entries(patterns)) {
      if (categoryPatterns.length > 0) {
        details.patternBreakdown[category] = {
          count: categoryPatterns.length,
          examples: categoryPatterns.slice(0, 3) // 只显示前3个例子
        };
      }
    }
    
    return details;
  }

  /**
   * 生成解决建议
   */
  generateSuggestion(hasContradiction, contradictionScore, patternAnalysis) {
    if (!hasContradiction) {
      return '未检测到明显语义矛盾。';
    }
    
    const { patterns, totalPatterns } = patternAnalysis;
    
    let suggestion = `检测到${totalPatterns}个矛盾模式：`;
    
    // 根据检测到的模式类型提供建议
    const advice = [];
    
    if (patterns.negation.length > 0) {
      advice.push(`发现${patterns.negation.length}个否定矛盾，建议明确陈述立场。`);
    }
    
    if (patterns.opposite.length > 0) {
      advice.push(`发现${patterns.opposite.length}个相反词矛盾，建议统一评价标准。`);
    }
    
    if (patterns.quantity.length > 0) {
      advice.push(`发现${patterns.quantity.length}个数量描述矛盾，建议核实具体数据。`);
    }
    
    if (patterns.degree.length > 0) {
      advice.push(`发现${patterns.degree.length}个程度描述矛盾，建议统一程度表述。`);
    }
    
    suggestion += ' ' + advice.join(' ');
    
    // 添加置信度提示
    if (contradictionScore >= 0.8) {
      suggestion += ' (高置信度矛盾，建议优先处理)';
    } else if (contradictionScore >= 0.6) {
      suggestion += ' (中等置信度矛盾，建议检查)';
    } else {
      suggestion += ' (低置信度矛盾，可能为表述差异)';
    }
    
    return suggestion;
  }

  /**
   * 更新统计信息
   */
  updateStats(similarity, contradictionScore, processingTime) {
    // 更新平均相似度
    this.stats.avgSimilarity = (
      this.stats.avgSimilarity * (this.stats.totalAnalyses - 1) + similarity
    ) / this.stats.totalAnalyses;
    
    // 更新平均矛盾分数
    this.stats.avgContradictionScore = (
      this.stats.avgContradictionScore * (this.stats.totalAnalyses - 1) + contradictionScore
    ) / this.stats.totalAnalyses;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: {
        embedding: this.embeddingCache.size,
        similarity: this.similarityCache.size
      },
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.embeddingCache.clear();
    this.similarityCache.clear();
    console.log('🗑️ 语义分析缓存已清除');
  }

  /**
   * 批量分析
   */
  async analyzeBatch(memories) {
    const results = [];
    const analyzedPairs = new Set();
    
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const memoryA = memories[i];
        const memoryB = memories[j];
        
        // 跳过已分析的对
        const pairKey = `${memoryA.id}|${memoryB.id}`;
        if (analyzedPairs.has(pairKey)) {
          continue;
        }
        analyzedPairs.add(pairKey);
        
        // 分析语义矛盾
        const analysis = await this.analyzeSemanticConflict(memoryA, memoryB);
        
        if (analysis.hasContradiction) {
          results.push(analysis);
        }
      }
    }
    
    return {
      totalPairs: analyzedPairs.size,
      contradictionsFound: results.length,
      contradictions: results,
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * 添加自定义矛盾模式
   */
  addCustomPattern(category, pattern) {
    if (!this.contradictionPatterns[category]) {
      this.contradictionPatterns[category] = [];
    }
    
    this.contradictionPatterns[category].push(pattern);
    console.log(`✅ 添加自定义矛盾模式到 ${category}: ${JSON.stringify(pattern)}`);
  }
  
  /**
   * 导出矛盾模式
   */
  exportPatterns() {
    return {
      patterns: this.contradictionPatterns,
      stats: {
        totalNegation: this.contradictionPatterns.negation.length,
        totalOpposite: this.contradictionPatterns.opposite.length,
        totalQuantity: this.contradictionPatterns.quantity.length,
        totalDegree: this.contradictionPatterns.degree.length
      },
      exportTime: new Date().toISOString()
    };
  }
  
  /**
   * 导入矛盾模式
   */
  importPatterns(patterns) {
    if (patterns.negation) {
      this.contradictionPatterns.negation = patterns.negation;
    }
    if (patterns.opposite) {
      this.contradictionPatterns.opposite = patterns.opposite;
    }
    if (patterns.quantity) {
      this.contradictionPatterns.quantity = patterns.quantity;
    }
    if (patterns.degree) {
      this.contradictionPatterns.degree = patterns.degree;
    }
    if (patterns.custom) {
      this.contradictionPatterns.custom = patterns.custom;
    }
    
    console.log('✅ 矛盾模式导入完成');
  }
}

// 导出模块
module.exports = SemanticAnalyzer;
