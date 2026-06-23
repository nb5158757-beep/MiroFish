  calculatePredictionConfidence(skill, taskAnalysis) {
    let confidence = 0.5;
    
    // 使用次数越多，置信度越高
    confidence += Math.min(skill.usageCount / 20, 0.3);
    
    // 历史数据越丰富，置信度越高
    if (skill.executionHistory && skill.executionHistory.length >= 3) {
      confidence += 0.1;
    }
    if (skill.executionHistory && skill.executionHistory.length >= 10) {
      confidence += 0.1;
    }
    
    // 任务分析越详细，置信度越高
    confidence += (taskAnalysis.metadata.confidence - 0.5) * 0.2;
    
    // 技能特征越完整，置信度越高
    const featureCompleteness = this.calculateFeatureCompleteness(skill);
    confidence += featureCompleteness * 0.1;
    
    return Math.max(0.1, Math.min(0.99, confidence));
  }

  /**
   * 生成推荐理由
   */
  generateRecommendationReasons(prediction, taskAnalysis) {
    const reasons = [];
    const { skill, matchScore, predictions } = prediction;
    
    // 匹配度理由
    if (matchScore > 0.8) {
      reasons.push('高度匹配当前任务需求');
    } else if (matchScore > 0.6) {
      reasons.push('良好匹配当前任务需求');
    }
    
    // 成功率理由
    if (predictions.successProbability > 0.9) {
      reasons.push('预计成功率超过90%');
    } else if (predictions.successProbability > 0.8) {
      reasons.push('预计成功率超过80%');
    }
    
    // 效率理由
    if (predictions.estimatedTime < 30000) {
      reasons.push('预计执行时间短（30秒内）');
    } else if (predictions.estimatedTime < 120000) {
      reasons.push('预计执行时间适中（2分钟内）');
    }
    
    // 经验理由
    if (skill.usageCount > 10) {
      reasons.push('经过多次实践验证');
    } else if (skill.usageCount > 3) {
      reasons.push('有一定实践经验');
    }
    
    // 熟练度理由
    if (skill.proficiency > 0.8) {
      reasons.push('技能熟练度高');
    } else if (skill.proficiency > 0.6) {
      reasons.push('技能掌握良好');
    }
    
    // 如果没有足够理由，添加通用理由
    if (reasons.length === 0) {
      reasons.push('适用于当前任务类型的通用技能');
    }
    
    return reasons;
  }

  /**
   * 生成执行建议
   */
  generateExecutionSuggestions(prediction, taskAnalysis) {
    const suggestions = [];
    const { skill, predictions } = prediction;
    
    // 基于风险的建议
    predictions.riskFactors.forEach(risk => {
      switch (risk.type) {
        case 'low-success-rate':
          suggestions.push('建议先在小规模测试，验证效果后再正式执行');
          break;
        case 'low-proficiency':
          suggestions.push('建议在执行过程中密切关注，必要时人工干预');
          break;
        case 'complex-task-inexperience':
          suggestions.push('建议分阶段执行，每阶段验证结果后再继续');
          break;
        case 'urgent-task-risk':
          suggestions.push('建议准备备用方案，以防执行失败');
          break;
      }
    });
    
    // 基于任务复杂度的建议
    if (taskAnalysis.features.complexity === 'complex' || 
        taskAnalysis.features.complexity === 'very-complex') {
      suggestions.push('建议记录详细执行日志，便于问题排查');
    }
    
    // 基于紧急程度的建议
    if (taskAnalysis.features.urgency === 'high') {
      suggestions.push('建议设置执行超时，避免长时间等待');
    }
    
    // 基于技能特征的建议
    if (skill.features.requiresValidation) {
      suggestions.push('执行完成后建议进行结果验证');
    }
    
    if (skill.features.recommendedParameters) {
      suggestions.push(`建议使用参数: ${JSON.stringify(skill.features.recommendedParameters)}`);
    }
    
    return suggestions.length > 0 ? suggestions : ['按默认配置执行即可'];
  }

  /**
   * 更新上下文窗口
   */
  updateContextWindow(matchPattern) {
    const key = `${matchPattern.taskType}:${matchPattern.taskDomain}`;
    
    // 保持上下文窗口大小（最近10次匹配）
    if (this.contextWindow.size >= 10) {
      const oldestKey = Array.from(this.contextWindow.keys())[0];
      this.contextWindow.delete(oldestKey);
    }
    
    this.contextWindow.set(key, matchPattern);
  }

  /**
   * 调整相似度阈值
   */
  adjustSimilarityThreshold(currentMatchScore) {
    // 自适应调整：如果匹配分数高，可以适当降低阈值；如果匹配分数低，适当提高阈值
    const adjustment = (currentMatchScore - 0.7) * this.learningRate;
    this.similarityThreshold = Math.max(0.3, Math.min(0.9, this.similarityThreshold + adjustment));
    
    console.log(`📊 相似度阈值调整为: ${this.similarityThreshold.toFixed(2)}`);
  }

  /**
   * 检查类型兼容性
   */
  areTypesCompatible(skillType, taskType) {
    const compatibilityMap = {
      'data-processing': ['analysis', 'creation'],
      'analysis': ['data-processing', 'search'],
      'creation': ['data-processing', 'automation'],
      'maintenance': ['optimization', 'fix'],
      'search': ['analysis', 'data-processing'],
      'automation': ['creation', 'data-processing']
    };
    
    return compatibilityMap[skillType]?.includes(taskType) || false;
  }

  /**
   * 检查领域相关性
   */
  areDomainsRelated(skillDomain, taskDomain) {
    const relatedDomains = {
      'excel': ['data', 'documentation'],
      'web': ['development', 'communication'],
      'memory': ['data', 'search'],
      'development': ['web', 'automation'],
      'documentation': ['communication', 'data'],
      'communication': ['documentation', 'web']
    };
    
    return relatedDomains[skillDomain]?.includes(taskDomain) || false;
  }

  /**
   * 检查复杂度兼容性
   */
  isComplexityCompatible(skillComplexity, taskComplexity) {
    const complexityOrder = ['simple', 'medium', 'complex', 'very-complex'];
    const skillIndex = complexityOrder.indexOf(skillComplexity);
    const taskIndex = complexityOrder.indexOf(taskComplexity);
    
    // 技能复杂度可以处理同等或更低复杂度的任务
    return skillIndex >= taskIndex;
  }

  /**
   * 检查技能是否适合紧急任务
   */
  isSkillSuitableForUrgency(skill, urgency) {
    // 高成功率的技能适合紧急任务
    if (urgency === 'high') {
      return skill.successRate > 0.8;
    }
    return true;
  }

  /**
   * 检查技能是否适合重要任务
   */
  isSkillSuitableForImportance(skill, importance) {
    // 高熟练度的技能适合重要任务
    if (importance === 'high' || importance === 'critical') {
      return skill.proficiency > 0.7;
    }
    return true;
  }

  /**
   * 检查技能是否适合环境
   */
  isSkillSuitableForEnvironment(skill, environmentalFactors) {
    // 这里可以根据具体环境因素检查
    // 目前默认都适合
    return true;
  }

  /**
   * 检查技能是否适合时间
   */
  isSkillSuitableForTime(skill, temporalFactors) {
    // 这里可以根据时间因素检查
    // 目前默认都适合
    return true;
  }

  /**
   * 计算特征完整性
   */
  calculateFeatureCompleteness(skill) {
    let completeness = 0;
    const requiredFeatures = ['type', 'category', 'domain', 'complexity', 'keywords'];
    
    requiredFeatures.forEach(feature => {
      if (skill.features[feature]) {
        if (Array.isArray(skill.features[feature])) {
          completeness += skill.features[feature].length > 0 ? 0.2 : 0;
        } else {
          completeness += skill.features[feature] ? 0.2 : 0;
        }
      }
    });
    
    return completeness;
  }
}

module.exports = IntelligentSkillMatcher;