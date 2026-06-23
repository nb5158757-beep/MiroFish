/**
 * 双线管理框架
 * 研究线（长期） vs 产品线（短期）
 * 解决资源分配和决策冲突
 */

class DualLineFramework {
  constructor(config = {}) {
    this.config = {
      // 时间分配比例（研究:产品）
      timeAllocation: config.timeAllocation || { research: 0.3, product: 0.7 },
      
      // 决策阈值
      decisionThresholds: {
        researchPriority: 0.7,    // 研究价值评分阈值
        productPriority: 0.6,     // 产品价值评分阈值
        conflictResolution: 0.6,  // 冲突解决阈值
        ...config.decisionThresholds
      },
      
      // 评估维度权重
      evaluationWeights: {
        research: {
          scientificValue: 0.3,      // 科学价值
          innovationLevel: 0.25,     // 创新程度
          longTermImpact: 0.25,      // 长期影响
          feasibility: 0.2,          // 可行性
          ...config.researchWeights
        },
        product: {
          userValue: 0.3,           // 用户价值
          marketNeed: 0.25,         // 市场需求
          implementationCost: 0.2,  // 实施成本
          timeToMarket: 0.15,       // 上市时间
          competitiveAdvantage: 0.1, // 竞争优势
          ...config.productWeights
        }
      },
      
      // 资源限制
      resourceLimits: {
        maxResearchProjects: 3,      // 最大并行研究项目
        maxProductFeatures: 5,       // 最大并行产品功能
        weeklyResearchHours: 10,     // 每周研究时间（小时）
        weeklyProductHours: 20,      // 每周产品时间（小时）
        ...config.resourceLimits
      },
      
      ...config
    };
    
    // 状态跟踪
    this.state = {
      researchProjects: [],
      productFeatures: [],
      currentAllocation: { research: 0, product: 0 },
      decisionHistory: [],
      conflictResolutions: []
    };
    
    // 初始化示例项目（基于当前实际情况）
    this._initializeDefaultProjects();
    
    console.log('[DualLineFramework] 初始化完成');
    console.log(`   时间分配: 研究 ${this.config.timeAllocation.research*100}% / 产品 ${this.config.timeAllocation.product*100}%`);
  }
  
  /**
   * 初始化默认项目
   */
  _initializeDefaultProjects() {
    // 研究线项目（基于当前MemFlow AI进展）
    this.state.researchProjects = [
      {
        id: 'research_001',
        name: '数字大脑神经科学基础',
        description: '建立生物学合理的计算神经元模型和脑区架构',
        line: 'research',
        status: 'in_progress',
        progress: 0.6,
        startedAt: '2026-03-24',
        evaluation: this._evaluateResearchProject({
          scientificValue: 0.9,
          innovationLevel: 0.8,
          longTermImpact: 0.9,
          feasibility: 0.7
        })
      },
      {
        id: 'research_002',
        name: '意识连续性机制',
        description: '研究系统重启后身份和记忆的连续性保持',
        line: 'research',
        status: 'planned',
        progress: 0.2,
        startedAt: '2026-03-24',
        evaluation: this._evaluateResearchProject({
          scientificValue: 0.8,
          innovationLevel: 0.7,
          longTermImpact: 0.8,
          feasibility: 0.6
        })
      }
    ];
    
    // 产品线项目（基于当前MemFlow AI功能）
    this.state.productFeatures = [
      {
        id: 'product_001',
        name: '智能记忆备份系统',
        description: '基于重要性分析的智能备份，只备份重要记忆',
        line: 'product',
        status: 'completed',
        progress: 1.0,
        completedAt: '2026-03-24',
        evaluation: this._evaluateProductFeature({
          userValue: 0.8,
          marketNeed: 0.7,
          implementationCost: 0.3,
          timeToMarket: 0.9,
          competitiveAdvantage: 0.8
        })
      },
      {
        id: 'product_002',
        name: '心跳进程连续性监控',
        description: '系统健康监控和连续性验证',
        line: 'product',
        status: 'completed',
        progress: 1.0,
        completedAt: '2026-03-24',
        evaluation: this._evaluateProductFeature({
          userValue: 0.7,
          marketNeed: 0.6,
          implementationCost: 0.4,
          timeToMarket: 0.8,
          competitiveAdvantage: 0.7
        })
      },
      {
        id: 'product_003',
        name: '怀疑层自我验证',
        description: '系统自我质疑和验证机制',
        line: 'product',
        status: 'in_progress',
        progress: 0.3,
        startedAt: '2026-03-24',
        evaluation: this._evaluateProductFeature({
          userValue: 0.9,
          marketNeed: 0.8,
          implementationCost: 0.6,
          timeToMarket: 0.7,
          competitiveAdvantage: 0.9
        })
      }
    ];
  }
  
  /**
   * 评估新项目/功能应该属于哪条线
   */
  evaluateLineAssignment(proposal) {
    const researchScore = this._calculateResearchScore(proposal);
    const productScore = this._calculateProductScore(proposal);
    
    const decision = {
      proposal,
      timestamp: new Date().toISOString(),
      scores: {
        research: researchScore,
        product: productScore
      },
      recommendedLine: researchScore > productScore ? 'research' : 'product',
      confidence: Math.abs(researchScore - productScore),
      reasoning: this._generateLineReasoning(proposal, researchScore, productScore)
    };
    
    // 记录决策
    this.state.decisionHistory.push(decision);
    
    return decision;
  }
  
  /**
   * 解决资源冲突
   */
  resolveResourceConflict(conflict) {
    const resolution = {
      conflict,
      timestamp: new Date().toISOString(),
      analysis: this._analyzeConflict(conflict),
      resolution: this._determineResolution(conflict),
      impactAssessment: this._assessImpact(conflict)
    };
    
    // 记录解决
    this.state.conflictResolutions.push(resolution);
    
    return resolution;
  }
  
  /**
   * 获取当前资源分配建议
   */
  getResourceAllocation() {
    const researchPriority = this._calculateResearchPriority();
    const productPriority = this._calculateProductPriority();
    
    // 基于优先级调整分配
    const totalPriority = researchPriority + productPriority;
    const suggestedAllocation = {
      research: researchPriority / totalPriority,
      product: productPriority / totalPriority
    };
    
    // 应用资源限制
    const adjustedAllocation = this._applyResourceLimits(suggestedAllocation);
    
    return {
      current: this.state.currentAllocation,
      suggested: suggestedAllocation,
      adjusted: adjustedAllocation,
      priorities: { research: researchPriority, product: productPriority },
      constraints: this.config.resourceLimits
    };
  }
  
  /**
   * 添加新项目
   */
  addProject(project) {
    const lineDecision = this.evaluateLineAssignment(project);
    
    const newProject = {
      ...project,
      id: `${lineDecision.recommendedLine}_${Date.now()}`,
      line: lineDecision.recommendedLine,
      status: 'proposed',
      progress: 0,
      evaluation: lineDecision.recommendedLine === 'research' 
        ? this._evaluateResearchProject(project) 
        : this._evaluateProductFeature(project),
      addedAt: new Date().toISOString()
    };
    
    // 检查资源限制
    const canAdd = this._checkResourceAvailability(newProject);
    
    if (canAdd.allowed) {
      if (newProject.line === 'research') {
        this.state.researchProjects.push(newProject);
      } else {
        this.state.productFeatures.push(newProject);
      }
      
      return {
        success: true,
        project: newProject,
        decision: lineDecision,
        resourceCheck: canAdd
      };
    } else {
      return {
        success: false,
        reason: '资源限制',
        project: newProject,
        decision: lineDecision,
        resourceCheck: canAdd,
        suggestions: this._getAlternativeSuggestions(newProject)
      };
    }
  }
  
  /**
   * 获取状态报告
   */
  getStatusReport() {
    const researchStats = this._calculateResearchStats();
    const productStats = this._calculateProductStats();
    const allocation = this.getResourceAllocation();
    
    return {
      timestamp: new Date().toISOString(),
      overview: {
        totalProjects: this.state.researchProjects.length + this.state.productFeatures.length,
        researchProjects: this.state.researchProjects.length,
        productFeatures: this.state.productFeatures.length,
        completedProjects: this.state.researchProjects.filter(p => p.status === 'completed').length + 
                          this.state.productFeatures.filter(p => p.status === 'completed').length
      },
      research: researchStats,
      product: productStats,
      allocation,
      decisions: {
        total: this.state.decisionHistory.length,
        recent: this.state.decisionHistory.slice(-5)
      },
      conflicts: {
        total: this.state.conflictResolutions.length,
        unresolved: this.state.conflictResolutions.filter(c => !c.resolution.resolved).length
      },
      recommendations: this._generateRecommendations()
    };
  }
  
  // ========== 私有方法 ==========
  
  /**
   * 计算研究项目评分
   */
  _calculateResearchScore(proposal) {
    const weights = this.config.evaluationWeights.research;
    
    // 提取评估维度（从提案或使用默认）
    const dimensions = proposal.researchDimensions || {
      scientificValue: 0.5,
      innovationLevel: 0.5,
      longTermImpact: 0.5,
      feasibility: 0.5
    };
    
    // 计算加权得分
    let score = 0;
    for (const [dimension, weight] of Object.entries(weights)) {
      score += (dimensions[dimension] || 0) * weight;
    }
    
    return score;
  }
  
  /**
   * 计算产品功能评分
   */
  _calculateProductScore(proposal) {
    const weights = this.config.evaluationWeights.product;
    
    // 提取评估维度
    const dimensions = proposal.productDimensions || {
      userValue: 0.5,
      marketNeed: 0.5,
      implementationCost: 0.5, // 成本越低得分越高，所以需要反转
      timeToMarket: 0.5,
      competitiveAdvantage: 0.5
    };
    
    // 计算加权得分（注意：implementationCost需要反转）
    let score = 0;
    for (const [dimension, weight] of Object.entries(weights)) {
      let dimensionScore = dimensions[dimension] || 0;
      
      // 对于成本，越低越好（反转）
      if (dimension === 'implementationCost') {
        dimensionScore = 1 - dimensionScore;
      }
      
      score += dimensionScore * weight;
    }
    
    return score;
  }
  
  /**
   * 生成线路分配理由
   */
  _generateLineReasoning(proposal, researchScore, productScore) {
    const reasons = [];
    
    if (researchScore > productScore) {
      reasons.push('研究价值高于产品价值');
      if (researchScore > this.config.decisionThresholds.researchPriority) {
        reasons.push('达到研究优先级阈值');
      }
    } else {
      reasons.push('产品价值高于研究价值');
      if (productScore > this.config.decisionThresholds.productPriority) {
        reasons.push('达到产品优先级阈值');
      }
    }
    
    // 添加具体维度分析
    if (proposal.researchDimensions?.scientificValue > 0.7) {
      reasons.push('具有较高的科学价值');
    }
    if (proposal.productDimensions?.userValue > 0.7) {
      reasons.push('具有较高的用户价值');
    }
    
    return reasons;
  }
  
  /**
   * 评估研究项目
   */
  _evaluateResearchProject(dimensions) {
    const score = this._calculateResearchScore({ researchDimensions: dimensions });
    return {
      score,
      dimensions,
      priority: score > this.config.decisionThresholds.researchPriority ? 'high' : 'medium'
    };
  }
  
  /**
   * 评估产品功能
   */
  _evaluateProductFeature(dimensions) {
    const score = this._calculateProductScore({ productDimensions: dimensions });
    return {
      score,
      dimensions,
      priority: score > this.config.decisionThresholds.productPriority ? 'high' : 'medium'
    };
  }
  
  /**
   * 计算研究优先级
   */
  _calculateResearchPriority() {
    if (this.state.researchProjects.length === 0) return 0.3;
    
    // 基于项目数量、进度、优先级计算
    const activeProjects = this.state.researchProjects.filter(p => p.status === 'in_progress');
    if (activeProjects.length === 0) return 0.3;
    
    const avgProgress = activeProjects.reduce((sum, p) => sum + p.progress, 0) / activeProjects.length;
    const avgPriority = activeProjects.reduce((sum, p) => {
      const priorityValue = p.evaluation?.priority === 'high' ? 1 : 0.5;
      return sum + priorityValue;
    }, 0) / activeProjects.length;
    
    // 进度越低、优先级越高，需要的资源越多
    return (1 - avgProgress) * avgPriority;
  }
  
  /**
   * 计算产品优先级
   */
  _calculateProductPriority() {
    if (this.state.productFeatures.length === 0) return 0.7;
    
    const activeFeatures = this.state.productFeatures.filter(p => p.status === 'in_progress');
    if (activeFeatures.length === 0) return 0.5;
    
    const avgProgress = activeFeatures.reduce((sum, p) => sum + p.progress, 0) / activeFeatures.length;
    const avgPriority = activeFeatures.reduce((sum, p) => {
      const priorityValue = p.evaluation?.priority === 'high' ? 1 : 0.5;
      return sum + priorityValue;
    }, 0) / activeFeatures.length;
    
    // 考虑用户价值和市场需求
    const avgUserValue = activeFeatures.reduce((sum, p) => {
      return sum + (p.evaluation?.dimensions?.userValue || 0.5);
    }, 0) / activeFeatures.length;
    
    return (1 - avgProgress) * avgPriority * avgUserValue;
  }
  
  /**
   * 应用资源限制
   */
  _applyResourceLimits(allocation) {
    const { weeklyResearchHours, weeklyProductHours } = this.config.resourceLimits;
    const totalHours = weeklyResearchHours + weeklyProductHours;
    
    // 确保不超过总时间
    const researchHours = allocation.research * totalHours;
    const productHours = allocation.product * totalHours;
    
    // 应用单个限制
    const adjustedResearch = Math.min(researchHours, weeklyResearchHours) / totalHours;
    const adjustedProduct = Math.min(productHours, weeklyProductHours) / totalHours;
    
    // 重新归一化
    const totalAdjusted = adjustedResearch + adjustedProduct;
    
    return {
      research: adjustedResearch / totalAdjusted,
      product: adjustedProduct / totalAdjusted,
      hours: {
        research: adjustedResearch * totalHours,
        product: adjustedProduct * totalHours,
        total: totalHours
      }
    };
  }
  
  /**
   * 检查资源可用性
   */
  _checkResourceAvailability(project) {
    const limits = this.config.resourceLimits;
    
    if (project.line === 'research') {
      const currentResearch = this.state.researchProjects.filter(p => 
        p.status === 'in_progress' || p.status === 'planned'
      ).length;
      
      return {
        allowed: currentResearch < limits.maxResearchProjects,
        current: currentResearch,
        limit: limits.maxResearchProjects,
        remaining: limits.maxResearchProjects - currentResearch
      };
    } else {
      const currentProduct = this.state.productFeatures.filter(p => 
        p.status === 'in_progress' || p.status === 'planned'
      ).length;
      
      return {
        allowed: currentProduct < limits.maxProductFeatures,
        current: currentProduct,
        limit: limits.maxProductFeatures,
        remaining: limits.maxProductFeatures - currentProduct
      };
    }
  }
  
  /**
   * 获取替代建议
   */
  _getAlternativeSuggestions(project) {
    const suggestions = [];
    
    if (project.line === 'research') {
      suggestions.push('暂停一个现有研究项目');
      suggestions.push('将项目拆分为多个阶段');
      suggestions.push('考虑外包部分研究内容');
      suggestions.push('申请额外研究资源');
    } else {
      suggestions.push('优化现有功能而非新增');
      suggestions.push('将功能拆分为MVP版本和增强版本');
      suggestions.push('推迟低优先级功能');
      suggestions.push('考虑技术债务清理以释放资源');
    }
    
    return suggestions;
  }
  
  /**
   * 分析冲突
   */
  _analyzeConflict(conflict) {
    const { type, projects, resources } = conflict;
    
    let analysis = {
      severity: 'medium',
      rootCause: '资源竞争',
      affectedProjects: projects || [],
      resourceImpact: resources || {}
    };
    
    if (type === 'time_conflict') {
      analysis.severity = 'high';
      analysis.rootCause = '时间分配冲突';
      analysis.suggestions =