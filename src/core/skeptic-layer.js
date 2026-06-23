/**
 * 怀疑层（Skeptic Layer）
 * 前额叶对杏仁核的抑制机制
 * 专门负责挑战系统自己的结论
 */

class SkepticLayer {
  constructor(config = {}) {
    // 怀疑倾向配置
    this.config = {
      skepticismLevel: config.skepticismLevel || 0.7, // 0-1，越高越怀疑
      challengeThreshold: config.challengeThreshold || 0.3, // 挑战阈值
      requireEvidence: config.requireEvidence !== false,
      logAllChallenges: config.logAllChallenges || true,
      ...config
    };
    
    // 怀疑模式
    this.modes = {
      'normal': 0.5,
      'critical': 0.8,
      'paranoid': 0.95
    };
    
    this.currentMode = 'normal';
    
    // 挑战历史
    this.challengeHistory = [];
    this.successfulChallenges = 0;
    this.totalChallenges = 0;
    
    console.log(`[SkepticLayer] 初始化，怀疑水平: ${this.config.skepticismLevel}`);
  }
  
  /**
   * 挑战声明
   * @param {Object} claim - 要挑战的声明
   * @param {number} confidence - 声明的置信度 (0-1)
   * @returns {Object} 挑战结果
   */
  challengeClaim(claim, confidence = 0.8) {
    this.totalChallenges++;
    
    const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // 1. 决定是否挑战
    const shouldChallenge = this._shouldChallenge(claim, confidence);
    
    if (!shouldChallenge.decision) {
      // 不挑战，但记录
      const result = {
        id: challengeId,
        timestamp,
        claim: this._sanitizeClaim(claim),
        confidence,
        challenged: false,
        reason: '未达到挑战阈值',
        shouldChallenge: shouldChallenge.decision,
        challengeScore: shouldChallenge.score
      };
      
      this.challengeHistory.push(result);
      return result;
    }
    
    // 2. 执行挑战
    const challengeResult = this._executeChallenge(claim, confidence);
    
    // 3. 记录结果
    const result = {
      id: challengeId,
      timestamp,
      claim: this._sanitizeClaim(claim),
      confidence,
      challenged: true,
      reason: shouldChallenge.reason,
      challengeScore: shouldChallenge.score,
      challengeResult,
      verdict: challengeResult.verdict,
      evidenceRequired: challengeResult.evidenceRequired,
      suggestedTests: challengeResult.suggestedTests
    };
    
    this.challengeHistory.push(result);
    
    if (challengeResult.verdict === 'invalid' || challengeResult.verdict === 'needs_verification') {
      this.successfulChallenges++;
    }
    
    // 4. 输出警告（如果需要）
    if (this.config.logAllChallenges || challengeResult.verdict !== 'valid') {
      this._logChallenge(result);
    }
    
    return result;
  }
  
  /**
   * 决定是否挑战
   */
  _shouldChallenge(claim, confidence) {
    let score = 0;
    const reasons = [];
    
    // 规则1: 过度自信需要挑战
    if (confidence > 0.8) {
      score += 0.3;
      reasons.push('过度自信');
    }
    
    // 规则2: 缺乏证据需要挑战
    if (claim.evidence === undefined || claim.evidence === null) {
      score += 0.4;
      reasons.push('缺乏证据');
    }
    
    // 规则3: 模拟数据需要挑战
    if (claim.dataType === 'simulated' || claim.dataType === 'estimated') {
      score += 0.5;
      reasons.push('模拟/估算数据');
    }
    
    // 规则4: 与历史矛盾需要挑战
    const historicalContradiction = this._checkHistoricalContradiction(claim);
    if (historicalContradiction.found) {
      score += 0.6;
      reasons.push(`与历史矛盾: ${historicalContradiction.details}`);
    }
    
    // 规则5: 重大声明需要更多验证
    if (claim.importance === 'high' || claim.impact === 'major') {
      score += 0.4;
      reasons.push('重大声明');
    }
    
    // 应用怀疑水平
    score *= this.config.skepticismLevel;
    
    const decision = score > this.config.challengeThreshold;
    
    return {
      decision,
      score: score.toFixed(3),
      reasons: reasons.length > 0 ? reasons : ['无明显风险']
    };
  }
  
  /**
   * 执行挑战
   */
  _executeChallenge(claim, confidence) {
    const tests = [];
    let verdict = 'valid'; // valid, needs_verification, questionable, invalid
    let evidenceRequired = [];
    
    // 测试1: 证据充分性
    if (!claim.evidence || claim.evidence.length === 0) {
      tests.push({ test: 'evidence_sufficiency', passed: false });
      evidenceRequired.push('具体证据');
      verdict = 'needs_verification';
    } else {
      tests.push({ test: 'evidence_sufficiency', passed: true });
    }
    
    // 测试2: 数据真实性
    if (claim.dataType === 'simulated' || claim.dataType === 'estimated') {
      tests.push({ test: 'data_authenticity', passed: false });
      evidenceRequired.push('真实测量数据');
      verdict = 'needs_verification';
    } else if (claim.dataType === 'real') {
      tests.push({ test: 'data_authenticity', passed: true });
    } else {
      tests.push({ test: 'data_authenticity', passed: null, note: '数据类型未知' });
    }
    
    // 测试3: 逻辑一致性
    const logicCheck = this._checkLogicConsistency(claim);
    tests.push({ test: 'logic_consistency', passed: logicCheck.consistent, details: logicCheck.details });
    
    if (!logicCheck.consistent) {
      evidenceRequired.push('逻辑一致性解释');
      verdict = 'questionable';
    }
    
    // 测试4: 可重复性
    if (claim.repeatable === false || claim.repeatable === undefined) {
      tests.push({ test: 'repeatability', passed: false });
      evidenceRequired.push('可重复性验证');
      if (verdict === 'valid') verdict = 'needs_verification';
    } else if (claim.repeatable === true) {
      tests.push({ test: 'repeatability', passed: true });
    }
    
    // 测试5: 边界条件
    const boundaryCheck = this._checkBoundaryConditions(claim);
    tests.push({ test: 'boundary_conditions', passed: boundaryCheck.covered, details: boundaryCheck.missing });
    
    if (!boundaryCheck.covered) {
      evidenceRequired.push('边界条件测试');
      if (verdict === 'valid') verdict = 'needs_verification';
    }
    
    // 生成建议的测试
    const suggestedTests = this._generateSuggestedTests(claim, tests);
    
    return {
      tests,
      verdict,
      evidenceRequired: [...new Set(evidenceRequired)],
      suggestedTests,
      overallAssessment: this._getAssessment(verdict, tests)
    };
  }
  
  /**
   * 检查历史矛盾
   */
  _checkHistoricalContradiction(claim) {
    if (this.challengeHistory.length < 5) {
      return { found: false };
    }
    
    // 检查最近10个相关声明
    const recentClaims = this.challengeHistory
      .slice(-10)
      .filter(c => c.claim.type === claim.type)
      .map(c => c.claim);
    
    for (const recentClaim of recentClaims) {
      // 简单的内容对比
      if (this._claimsContradict(recentClaim, claim)) {
        return {
          found: true,
          details: `与历史声明矛盾: "${recentClaim.content?.substring(0, 50)}..."`
        };
      }
    }
    
    return { found: false };
  }
  
  /**
   * 检查逻辑一致性
   */
  _checkLogicConsistency(claim) {
    const issues = [];
    
    // 检查数字合理性
    if (claim.metrics) {
      for (const [metric, value] of Object.entries(claim.metrics)) {
        if (typeof value === 'number') {
          // 检查异常值
          if (value > 100 && metric.includes('percent')) {
            issues.push(`${metric} 超过100%: ${value}`);
          }
          if (value < 0 && metric.includes('improvement')) {
            issues.push(`${metric} 为负值: ${value}`);
          }
        }
      }
    }
    
    // 检查因果关系
    if (claim.cause && claim.effect) {
      if (claim.cause === 'simulation' && claim.effect === 'real_world_performance') {
        issues.push('模拟原因不能直接导致真实世界效果');
      }
    }
    
    return {
      consistent: issues.length === 0,
      details: issues.length > 0 ? issues : '逻辑一致'
    };
  }
  
  /**
   * 检查边界条件
   */
  _checkBoundaryConditions(claim) {
    const missingConditions = [];
    
    // 常见的边界条件
    const commonBoundaries = [
      '系统重启后',
      '高负载情况下',
      '网络断开时',
      '数据损坏时',
      '并发访问时'
    ];
    
    if (claim.boundaryConditions) {
      const covered = claim.boundaryConditions.map(bc => bc.condition);
      for (const boundary of commonBoundaries) {
        if (!covered.includes(boundary)) {
          missingConditions.push(boundary);
        }
      }
    } else {
      missingConditions.push(...commonBoundaries);
    }
    
    return {
      covered: missingConditions.length === 0,
      missing: missingConditions
    };
  }
  
  /**
   * 生成建议的测试
   */
  _generateSuggestedTests(claim, testResults) {
    const suggestions = [];
    
    // 基于失败的测试生成建议
    for (const test of testResults) {
      if (!test.passed) {
        switch (test.test) {
          case 'evidence_sufficiency':
            suggestions.push('进行真实基准测试，收集具体证据');
            break;
          case 'data_authenticity':
            suggestions.push('使用真实数据替换模拟数据');
            break;
          case 'repeatability':
            suggestions.push('设计可重复的实验流程');
            break;
          case 'boundary_conditions':
            suggestions.push(`测试边界条件: ${test.details?.join(', ')}`);
            break;
        }
      }
    }
    
    // 基于声明类型生成建议
    if (claim.type === 'performance_improvement') {
      suggestions.push('进行A/B测试验证实际效果');
      suggestions.push('测量真实用户场景的性能');
    }
    
    if (claim.type === 'architectural_design') {
      suggestions.push('创建原型验证架构可行性');
      suggestions.push('进行压力测试验证可扩展性');
    }
    
    if (claim.type === 'learning_insight') {
      suggestions.push('设计实验验证洞察的普遍性');
      suggestions.push('寻找反例挑战当前结论');
    }
    
    return [...new Set(suggestions)].slice(0, 5); // 去重并限制数量
  }
  
  /**
   * 声明是否矛盾
   */
  _claimsContradict(claim1, claim2) {
    // 简单实现：检查关键指标是否矛盾
    if (claim1.metrics && claim2.metrics) {
      for (const [metric, value1] of Object.entries(claim1.metrics)) {
        if (claim2.metrics[metric]) {
          const value2 = claim2.metrics[metric];
          // 如果同一指标变化方向相反
          if (typeof value1 === 'number' && typeof value2 === 'number') {
            const diff = Math.abs(value1 - value2);
            if (diff > 30) { // 30%以上的差异
              return true;
            }
          }
        }
      }
    }
    
    // 检查结论是否相反
    const conclusion1 = claim1.conclusion?.toLowerCase() || '';
    const conclusion2 = claim2.conclusion?.toLowerCase() || '';
    
    const opposites = [
      ['成功', '失败'],
      ['有效', '无效'],
      ['提升', '下降'],
      ['解决', '未解决']
    ];
    
    for (const [word1, word2] of opposites) {
      if ((conclusion1.includes(word1) && conclusion2.includes(word2)) ||
          (conclusion1.includes(word2) && conclusion2.includes(word1))) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 获取评估
   */
  _getAssessment(verdict, tests) {
    const passedTests = tests.filter(t => t.passed === true).length;
    const totalTests = tests.length;
    const passRate = totalTests > 0 ? (passedTests / totalTests) : 0;
    
    switch (verdict) {
      case 'valid':
        return `声明基本有效 (${passedTests}/${totalTests} 测试通过)`;
      case 'needs_verification':
        return `需要进一步验证 (${passedTests}/${totalTests} 测试通过)`;
      case 'questionable':
        return `声明存疑 (${passedTests}/${totalTests} 测试通过)`;
      case 'invalid':
        return `声明无效 (${passedTests}/${totalTests} 测试通过)`;
      default:
        return `评估中 (${passedTests}/${totalTests} 测试通过)`;
    }
  }
  
  /**
   * 清理声明（防止敏感信息泄露）
   */
  _sanitizeClaim(claim) {
    const sanitized = { ...claim };
    
    // 移除可能的大内容
    if (sanitized.content && sanitized.content.length > 200) {
      sanitized.content = sanitized.content.substring(0, 200) + '...';
    }
    
    // 移除内部路径
    if (sanitized.filePath) {
      sanitized.filePath = '***REDACTED***';
    }
    
    return sanitized;
  }
  
  /**
   * 记录挑战
   */
  _logChallenge(result) {
    const emoji = {
      'valid': '✅',
      'needs_verification': '⚠️',
      'questionable': '❓',
      'invalid': '❌'
    }[result.verdict] || '🔍';
    
    console.log(`\n${emoji} [怀疑层挑战] ${result.claim.type || '未知类型'}`);
    console.log(`   声明: ${result.claim.content?.substring(0, 80) || '无内容'}...`);
    console.log(`   置信度: ${result.confidence}`);
    console.log(`   挑战分数: ${result.challengeScore}`);
    console.log(`   裁决: ${result.verdict}`);
    
    if (result.evidenceRequired.length > 0) {
      console.log(`   需要证据: ${result.evidenceRequired.join(', ')}`);
    }
    
    if (result.suggestedTests.length > 0) {
      console.log(`   建议测试:`);
      for (const test of result.suggestedTests) {
        console.log(`     • ${test}`);
      }
    }
  }
  
  /**
   * 设置怀疑模式
   */
  setMode(mode) {
    if (this.modes[mode] !== undefined) {
      this.currentMode = mode;
      this.config.skepticismLevel = this.modes[mode];
      console.log(`[SkepticLayer] 模式切换为: ${mode} (怀疑水平: ${this.config.skepticismLevel})`);
      return true;
    }
    return false;
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    const challengeRate = this.totalChallenges > 0 
      ? (this.challengeHistory.filter(c => c.challenged).length / this.totalChallenges) 
      : 0;
    
    const successRate = this.challengeHistory.filter(c => c.challenged).length > 0
      ? (this.successfulChallenges / this.challengeHistory.filter(c => c.challenged).length)
      : 0;
    
    const recentVerdicts = this.challengeHistory.slice(-10).map(c => c.verdict);
    const verdictCounts = {
      valid: recentVerdicts.filter(v => v === 'valid').length,
      needs_verification: recentVerdicts.filter(v => v === 'needs_verification').length,
      questionable: recentVerdicts.filter(v => v === 'questionable').length,
      invalid: recentVerdicts.filter(v => v === 'invalid').length
    };
    
    return {
      totalChallenges: this.totalChallenges,
      challengesMade: this.challengeHistory.filter(c => c.challenged).length,
      successfulChallenges: this.successfulChallenges,
      challengeRate: challengeRate.toFixed(3),
      successRate: successRate.toFixed(3),
      currentMode: this.currentMode,
      skepticismLevel: this.config.s