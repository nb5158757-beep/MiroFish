/**
 * 怀疑层 - 简化版
 * 前额叶抑制机制
 */

class SkepticLayerSimple {
  constructor() {
    this.skepticism = 0.7; // 怀疑水平
    this.challenges = [];
    console.log('[Skeptic] 初始化，怀疑水平:', this.skepticism);
  }
  
  /**
   * 挑战声明
   */
  challenge(claim, confidence = 0.8) {
    const id = Date.now();
    const result = {
      id,
      claim: this._shorten(claim),
      confidence,
      timestamp: new Date().toISOString()
    };
    
    // 检查是否需要挑战
    const shouldChallenge = this._shouldChallenge(claim, confidence);
    
    if (shouldChallenge) {
      result.challenged = true;
      result.reason = this._getChallengeReason(claim, confidence);
      result.suggestions = this._getSuggestions(claim);
      result.verdict = 'needs_verification';
      
      console.log(`\n⚠️ [怀疑层] 挑战声明:`);
      console.log(`   内容: "${claim.substring(0, 80)}..."`);
      console.log(`   置信度: ${confidence}`);
      console.log(`   原因: ${result.reason}`);
      console.log(`   建议: ${result.suggestions.join(', ')}`);
    } else {
      result.challenged = false;
      result.verdict = 'valid';
    }
    
    this.challenges.push(result);
    return result;
  }
  
  /**
   * 决定是否挑战
   */
  _shouldChallenge(claim, confidence) {
    let score = 0;
    
    // 规则1: 过度自信
    if (confidence > 0.8) score += 0.3;
    
    // 规则2: 包含模拟/估算关键词
    const simKeywords = ['模拟', '估算', '预计', '可能', '大概'];
    for (const keyword of simKeywords) {
      if (claim.includes(keyword)) score += 0.4;
    }
    
    // 规则3: 包含绝对化表述
    const absoluteKeywords = ['完美', '全部', '完全', '绝对', '100%'];
    for (const keyword of absoluteKeywords) {
      if (claim.includes(keyword)) score += 0.5;
    }
    
    // 规则4: 包含效率提升声明
    if (claim.includes('效率提升') || claim.includes('性能提升')) {
      const match = claim.match(/(\d+)[%-]\d+[%]/);
      if (match) {
        const percent = parseInt(match[1]);
        if (percent > 30) score += 0.6; // 大幅提升需要验证
      }
    }
    
    // 应用怀疑水平
    score *= this.skepticism;
    
    return score > 0.3;
  }
  
  /**
   * 获取挑战原因
   */
  _getChallengeReason(claim, confidence) {
    const reasons = [];
    
    if (confidence > 0.8) {
      reasons.push('过度自信');
    }
    
    if (claim.includes('模拟') || claim.includes('估算')) {
      reasons.push('基于模拟/估算数据');
    }
    
    if (claim.includes('效率提升') || claim.includes('性能提升')) {
      reasons.push('性能声明需要验证');
    }
    
    if (claim.includes('完美') || claim.includes('完全解决')) {
      reasons.push('绝对化表述存疑');
    }
    
    return reasons.join(', ') || '需要进一步验证';
  }
  
  /**
   * 获取建议
   */
  _getSuggestions(claim) {
    const suggestions = [];
    
    if (claim.includes('效率提升') || claim.includes('性能提升')) {
      suggestions.push('进行真实基准测试');
      suggestions.push('测量实际用户场景');
    }
    
    if (claim.includes('模拟') || claim.includes('估算')) {
      suggestions.push('使用真实数据验证');
      suggestions.push('设计可重复实验');
    }
    
    if (claim.includes('架构') || claim.includes('设计')) {
      suggestions.push('创建原型验证');
      suggestions.push('进行压力测试');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('收集具体证据');
      suggestions.push('验证可重复性');
    }
    
    return suggestions.slice(0, 3);
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
      skepticism: this.skepticism
    };
  }
  
  /**
   * 设置怀疑水平
   */
  setSkepticism(level) {
    this.skepticism = Math.max(0, Math.min(1, level));
    console.log(`[Skeptic] 怀疑水平设置为: ${this.skepticism}`);
  }
}

module.exports = SkepticLayerSimple;