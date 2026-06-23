/**
 * 怀疑层 - 优化版
 * 降低误报率，增加上下文理解
 */

class SkepticLayerOptimized {
  constructor() {
    this.skepticism = 0.6; // 降低怀疑水平
    this.challenges = [];
    this.context = {
      isTestingContext: false,     // 是否在测试环境中
      hasRealData: false,          // 是否有真实数据支持
      isArchitectureDiscussion: false, // 是否架构讨论
      previousClaims: []           // 历史声明
    };
    
    console.log('[Skeptic] 优化版初始化，怀疑水平:', this.skepticism);
  }
  
  /**
   * 挑战声明（带上下文）
   */
  challenge(claim, confidence = 0.8, context = {}) {
    const id = Date.now();
    
    // 更新上下文
    this._updateContext(context);
    
    const result = {
      id,
      claim: this._shorten(claim),
      confidence,
      timestamp: new Date().toISOString(),
      context: this.context
    };
    
    // 检查是否需要挑战（优化版逻辑）
    const shouldChallenge = this._shouldChallengeOptimized(claim, confidence);
    
    if (shouldChallenge) {
      result.challenged = true;
      result.reason = this._getChallengeReasonOptimized(claim, confidence);
      result.suggestions = this._getSuggestionsOptimized(claim);
      result.verdict = 'needs_verification';
      
      console.log(`\n⚠️ [怀疑层优化] 挑战声明:`);
      console.log(`   内容: "${claim.substring(0, 80)}..."`);
      console.log(`   置信度: ${confidence}`);
      console.log(`   原因: ${result.reason}`);
      console.log(`   建议: ${result.suggestions.join(', ')}`);
    } else {
      result.challenged = false;
      result.verdict = 'valid';
      console.log(`✅ [怀疑层优化] 接受声明: "${claim.substring(0, 60)}..."`);
    }
    
    this.challenges.push(result);
    this._addToHistory(claim, result.challenged);
    
    return result;
  }
  
  /**
   * 优化版：决定是否挑战
   */
  _shouldChallengeOptimized(claim, confidence) {
    let score = 0;
    
    // === 规则1: 过度自信（调整权重） ===
    if (confidence > 0.85) score += 0.2;  // 原0.3，降低
    if (confidence > 0.9) score += 0.1;   // 新增：极高置信度
    
    // === 规则2: 模拟/估算关键词（区分类型） ===
    const simKeywords = ['模拟数据', '估算结果', '预计提升']; // 具体组合
    const weakKeywords = ['可能', '大概', '或许']; // 弱语气词
    
    for (const keyword of simKeywords) {
      if (claim.includes(keyword)) score += 0.3; // 原0.4，降低
    }
    
    // 弱语气词单独处理（降低权重）
    let weakCount = 0;
    for (const keyword of weakKeywords) {
      if (claim.includes(keyword)) weakCount++;
    }
    if (weakCount > 0) score += 0.1; // 原0.4，大幅降低
    
    // === 规则3: 绝对化表述（保持严格） ===
    const absoluteKeywords = ['完美解决', '全部问题', '绝对正确', '毫无缺陷'];
    const moderateKeywords = ['100%', '完全', '彻底']; // 中等绝对化
    
    for (const keyword of absoluteKeywords) {
      if (claim.includes(keyword)) score += 0.5; // 保持严格
    }
    
    for (const keyword of moderateKeywords) {
      if (claim.includes(keyword)) {
        // 检查上下文：如果是测试结果中的"100%"，可能合理
        if (claim.includes('测试显示') || claim.includes('基准测试')) {
          score += 0.2; // 降低权重
        } else {
          score += 0.4; // 正常权重
        }
      }
    }
    
    // === 规则4: 效率提升声明（增加验证条件） ===
    if (claim.includes('效率提升') || claim.includes('性能提升')) {
      const match = claim.match(/(\d+)[%-]\d+[%]/);
      if (match) {
        const percent = parseInt(match[1]);
        if (percent > 50) score += 0.7; // 大幅提升需要严格验证
        else if (percent > 30) score += 0.4; // 中等提升
        else score += 0.2; // 小幅提升
      } else {
        // 没有具体数字的模糊提升声明
        score += 0.3;
      }
    }
    
    // === 规则5: 上下文加分/减分 ===
    
    // 加分：缺乏证据支持
    if (!claim.includes('测试显示') && !claim.includes('验证结果') && 
        !claim.includes('实际数据') && confidence > 0.7) {
      score += 0.2;
    }
    
    // 减分：有真实数据支持
    if (claim.includes('真实基准测试') || claim.includes('实际测量') || 
        claim.includes('用户场景测试')) {
      score -= 0.3; // 大幅降低怀疑
    }
    
    // 减分：在测试环境中
    if (this.context.isTestingContext) {
      score -= 0.2;
    }
    
    // 减分：架构讨论中的合理声明
    if (this.context.isArchitectureDiscussion && 
        (claim.includes('架构设计') || claim.includes('系统设计'))) {
      score -= 0.1;
    }
    
    // 确保分数在合理范围
    score = Math.max(0, Math.min(1, score));
    
    // 应用怀疑水平（调整后的）
    const adjustedScore = score * this.skepticism;
    
    // 动态阈值：根据声明类型调整
    let threshold = 0.35; // 原0.3，提高
    
    // 如果是测试结果，提高阈值（更宽容）
    if (claim.includes('测试') && claim.includes('结果')) {
      threshold = 0.4;
    }
    
    // 如果是状态报告，提高阈值
    if (claim.includes('运行正常') || claim.includes('状态报告')) {
      threshold = 0.45;
    }
    
    return adjustedScore > threshold;
  }
  
  /**
   * 优化版：获取挑战原因
   */
  _getChallengeReasonOptimized(claim, confidence) {
    const reasons = [];
    
    if (confidence > 0.85) {
      reasons.push('置信度过高');
    }
    
    if (claim.includes('模拟数据') || claim.includes('估算结果')) {
      reasons.push('需要真实数据验证');
    }
    
    if (claim.includes('效率提升') || claim.includes('性能提升')) {
      if (!claim.includes('测试显示') && !claim.includes('实际测量')) {
        reasons.push('性能声明缺乏实测数据');
      }
    }
    
    if (claim.includes('完美解决') || claim.includes('全部问题')) {
      reasons.push('绝对化表述需要验证');
    }
    
    // 检查是否缺乏具体证据
    const evidenceMarkers = ['测试显示', '验证结果', '实际数据', '用户反馈'];
    const hasEvidence = evidenceMarkers.some(marker => claim.includes(marker));
    
    if (!hasEvidence && confidence > 0.7) {
      reasons.push('缺乏具体证据支持');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : '需要进一步验证';
  }
  
  /**
   * 优化版：获取建议
   */
  _getSuggestionsOptimized(claim) {
    const suggestions = [];
    
    if (claim.includes('效率提升') || claim.includes('性能提升')) {
      if (!claim.includes('测试显示')) {
        suggestions.push('进行真实基准测试');
        suggestions.push('测量实际用户场景性能');
      } else {
        suggestions.push('确保测试方法可重复');
        suggestions.push('在不同环境下验证');
      }
    }
    
    if (claim.includes('模拟') || claim.includes('估算')) {
      suggestions.push('使用真实生产数据验证');
      suggestions.push('设计可重复的实验方案');
    }
    
    if (claim.includes('架构') || claim.includes('设计')) {
      suggestions.push('创建原型进行验证');
      suggestions.push('进行压力测试和边界测试');
    }
    
    // 通用建议
    if (suggestions.length === 0) {
      suggestions.push('提供具体的数据支持');
      suggestions.push('确保声明可验证和可重复');
      suggestions.push('考虑边界情况和异常场景');
    }
    
    return suggestions.slice(0, 3);
  }
  
  /**
   * 更新上下文
   */
  _updateContext(context) {
    this.context = {
      ...this.context,
      ...context,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * 添加到历史
   */
  _addToHistory(claim, challenged) {
    this.context.previousClaims.push({
      claim: this._shorten(claim),
      challenged,
      timestamp: new Date().toISOString()
    });
    
    // 保持历史记录长度
    if (this.context.previousClaims.length > 10) {
      this.context.previousClaims = this.context.previousClaims.slice(-10);
    }
  }
  
  /**
   * 缩短文本
   */
  _shorten(text) {
    if (typeof text !== 'string') return '非文本声明';
    if (text.length <= 100) return text;
    return text.substring(0, 100) + '...';
  }
  
  /**
   * 获取统计
   */
  getStats() {
    const total = this.challenges.length;
    const challenged = this.challenges.filter(c => c.challenged).length;
    
    return {
      totalChallenges: total,
      challenged: challenged,
      challengeRate: total > 0 ? (challenged / total).toFixed(3) : 0,
      skepticism: this.skepticism,
      accuracy: this._calculateAccuracy(),
      context: {
        hasRealData: this.context.hasRealData,
        isTestingContext: this.context.isTestingContext,
        historySize: this.context.previousClaims.length
      }
    };
  }
  
  /**
   * 计算准确率（基于历史）
   */
  _calculateAccuracy() {
    if (this.context.previousClaims.length < 3) return null;
    
    // 简单准确率计算（需要人工标注）
    // 这里返回null，实际使用时需要标注数据
    return null;
  }
  
  /**
   * 设置怀疑水平
   */
  setSkepticism(level) {
    this.skepticism = Math.max(0.3, Math.min(0.9, level)); // 限制范围
    console.log(`[Skeptic] 怀疑水平设置为: ${this.skepticism}`);
  }
  
  /**
   * 设置上下文
   */
  setContext(key, value) {
    this.context[key] = value;
    console.log(`[Skeptic] 上下文更新: ${key}=${value}`);
  }
}

module.exports = SkepticLayerOptimized;