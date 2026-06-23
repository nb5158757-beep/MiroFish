/**
 * 双线管理框架 - 简化版
 * 研究线 vs 产品线决策框架
 */

class DualLineSimple {
  constructor() {
    // 核心决策矩阵
    this.decisionMatrix = {
      // 什么属于研究线
      researchCriteria: [
        '涉及基础科学原理',
        '创新程度高（无现有解决方案）',
        '长期价值 > 短期价值',
        '技术风险高',
        '需要探索性实验',
        '目标：知识创造而非产品交付'
      ],
      
      // 什么属于产品线
      productCriteria: [
        '解决具体用户问题',
        '有明确市场需求',
        '短期价值 > 长期价值',
        '技术风险可控',
        '有现有技术参考',
        '目标：交付可用功能'
      ],
      
      // 决策阈值
      thresholds: {
        researchScore: 4,    // 达到4分属于研究线
        productScore: 4,     // 达到4分属于产品线
        conflictPriority: 0.6 // 冲突解决优先级阈值
      }
    };
    
    // 当前项目状态
    this.projects = {
      research: [
        {
          name: '数字大脑神经科学基础',
          status: '进行中',
          progress: 0.6,
          priority: '高',
          started: '2026-03-24'
        },
        {
          name: '意识连续性机制',
          status: '计划中',
          progress: 0.2,
          priority: '中',
          started: '2026-03-24'
        }
      ],
      product: [
        {
          name: '智能记忆备份系统',
          status: '已完成',
          progress: 1.0,
          priority: '高',
          completed: '2026-03-24'
        },
        {
          name: '心跳进程连续性监控',
          status: '已完成',
          progress: 1.0,
          priority: '中',
          completed: '2026-03-24'
        },
        {
          name: '怀疑层自我验证',
          status: '进行中',
          progress: 0.3,
          priority: '高',
          started: '2026-03-24'
        }
      ]
    };
    
    // 资源分配
    this.resources = {
      timeAllocation: { research: 0.3, product: 0.7 },
      maxConcurrent: { research: 3, product: 5 },
      currentUsage: { research: 2, product: 3 }
    };
    
    console.log('[双线管理] 初始化完成');
    console.log(`   研究项目: ${this.projects.research.length} 个`);
    console.log(`   产品功能: ${this.projects.product.length} 个`);
    console.log(`   时间分配: 研究 ${this.resources.timeAllocation.research*100}% / 产品 ${this.resources.timeAllocation.product*100}%`);
  }
  
  /**
   * 决策：新任务属于哪条线
   */
  decideLine(task) {
    console.log(`\n[决策] 评估任务: ${task.name}`);
    
    // 计算研究线得分
    const researchScore = this._calculateResearchScore(task);
    console.log(`   研究线得分: ${researchScore}/6`);
    
    // 计算产品线得分
    const productScore = this._calculateProductScore(task);
    console.log(`   产品线得分: ${productScore}/6`);
    
    // 决策
    let decision;
    if (researchScore >= this.decisionMatrix.thresholds.researchScore && 
        researchScore > productScore) {
      decision = {
        line: 'research',
        confidence: '高',
        reason: `研究价值突出 (${researchScore} > ${productScore})`,
        score: { research: researchScore, product: productScore }
      };
    } else if (productScore >= this.decisionMatrix.thresholds.productScore && 
               productScore > researchScore) {
      decision = {
        line: 'product',
        confidence: '高',
        reason: `产品价值突出 (${productScore} > ${researchScore})`,
        score: { research: researchScore, product: productScore }
      };
    } else if (researchScore === productScore) {
      decision = {
        line: 'balanced',
        confidence: '中',
        reason: `价值平衡 (${researchScore} = ${productScore})`,
        score: { research: researchScore, product: productScore },
        suggestion: '根据当前资源分配决定'
      };
    } else {
      decision = {
        line: 'uncertain',
        confidence: '低',
        reason: `价值不明确 (研究:${researchScore}, 产品:${productScore})`,
        score: { research: researchScore, product: productScore },
        suggestion: '需要更多信息或拆分任务'
      };
    }
    
    // 检查资源限制
    const resourceCheck = this._checkResourceAvailability(decision.line);
    decision.resourceCheck = resourceCheck;
    
    console.log(`   决策: ${decision.line} (${decision.confidence}置信度)`);
    console.log(`   理由: ${decision.reason}`);
    
    if (resourceCheck.allowed) {
      console.log(`   资源: ✅ 可用 (${resourceCheck.remaining} 剩余容量)`);
    } else {
      console.log(`   资源: ❌ 不足 (已达上限 ${resourceCheck.limit})`);
    }
    
    return decision;
  }
  
  /**
   * 解决资源冲突
   */
  resolveConflict(conflict) {
    console.log(`\n[冲突解决] ${conflict.type}: ${conflict.description}`);
    
    const resolution = {
      conflict,
      timestamp: new Date().toISOString(),
      steps: []
    };
    
    // 分析冲突类型
    if (conflict.type === 'time_conflict') {
      resolution.steps.push('1. 评估各任务优先级');
      resolution.steps.push('2. 检查是否有任务可以推迟');
      resolution.steps.push('3. 考虑临时调整时间分配比例');
      resolution.steps.push('4. 如果必要，暂停低优先级任务');
      
      // 建议调整
      const suggestedAdjustment = this._suggestTimeAdjustment(conflict);
      resolution.suggestion = suggestedAdjustment;
      
    } else if (conflict.type === 'priority_conflict') {
      resolution.steps.push('1. 应用优先级决策矩阵');
      resolution.steps.push('2. 考虑用户价值 vs 研究价值');
      resolution.steps.push('3. 评估长期影响 vs 短期收益');
      resolution.steps.push('4. 做出明确选择并记录理由');
      
      const priorityDecision = this._decidePriority(conflict);
      resolution.decision = priorityDecision;
      
    } else if (conflict.type === 'resource_overload') {
      resolution.steps.push('1. 审查当前项目负载');
      resolution.steps.push('2. 识别可以暂停或取消的项目');
      resolution.steps.push('3. 考虑外包或合作选项');
      resolution.steps.push('4. 调整资源分配策略');
      
      const loadAdjustment = this._adjustWorkload();
      resolution.adjustment = loadAdjustment;
    }
    
    console.log(`   解决步骤:`);
    resolution.steps.forEach(step => console.log(`     ${step}`));
    
    if (resolution.suggestion) {
      console.log(`   建议: ${resolution.suggestion}`);
    }
    
    return resolution;
  }
  
  /**
   * 获取状态报告
   */
  getStatus() {
    const researchProgress = this._calculateProgress('research');
    const productProgress = this._calculateProgress('product');
    
    return {
      timestamp: new Date().toISOString(),
      projects: {
        research: {
          count: this.projects.research.length,
          inProgress: this.projects.research.filter(p => p.status === '进行中').length,
          completed: this.projects.research.filter(p => p.status === '已完成').length,
          avgProgress: researchProgress
        },
        product: {
          count: this.projects.product.length,
          inProgress: this.projects.product.filter(p => p.status === '进行中').length,
          completed: this.projects.product.filter(p => p.status === '已完成').length,
          avgProgress: productProgress
        }
      },
      resources: {
        allocation: this.resources.timeAllocation,
        usage: this.resources.currentUsage,
        limits: this.resources.maxConcurrent,
        available: {
          research: this.resources.maxConcurrent.research - this.resources.currentUsage.research,
          product: this.resources.maxConcurrent.product - this.resources.currentUsage.product
        }
      },
      recommendations: this._generateRecommendations()
    };
  }
  
  /**
   * 添加新项目
   */
  addProject(project, line) {
    const decision = this.decideLine(project);
    
    if (decision.line !== line && decision.line !== 'balanced' && decision.line !== 'uncertain') {
      console.log(`⚠️ 注意: 决策建议属于 ${decision.line} 线，但请求添加到 ${line} 线`);
    }
    
    if (!decision.resourceCheck.allowed) {
      return {
        success: false,
        reason: '资源不足',
        decision,
        suggestions: [
          '等待现有项目完成',
          '暂停一个低优先级项目',
          '调整项目范围为MVP版本'
        ]
      };
    }
    
    // 添加项目
    const newProject = {
      name: project.name,
      status: '进行中',
      progress: 0,
      priority: project.priority || '中',
      started: new Date().toISOString().split('T')[0]
    };
    
    if (line === 'research') {
      this.projects.research.push(newProject);
      this.resources.currentUsage.research++;
    } else {
      this.projects.product.push(newProject);
      this.resources.currentUsage.product++;
    }
    
    console.log(`✅ 项目添加成功: ${project.name} (${line}线)`);
    
    return {
      success: true,
      project: newProject,
      decision,
      currentStatus: this.getStatus()
    };
  }
  
  // ========== 私有方法 ==========
  
  /**
   * 计算研究线得分
   */
  _calculateResearchScore(task) {
    let score = 0;
    
    // 检查研究标准
    if (task.description?.includes('研究') || task.description?.includes('探索')) score++;
    if (task.innovationLevel === '高') score++;
    if (task.timeframe === '长期') score++;
    if (task.risk === '高') score++;
    if (task.valueType === '知识创造') score++;
    if (task.hasExistingSolution === false) score++;
    
    return score;
  }
  
  /**
   * 计算产品线得分
   */
  _calculateProductScore(task) {
    let score = 0;
    
    // 检查产品标准
    if (task.description?.includes('用户') || task.description?.includes('客户')) score++;
    if (task.marketNeed === '高') score++;
    if (task.timeframe === '短期') score++;
    if (task.risk === '低' || task.risk === '中') score++;
    if (task.valueType === '商业价值' || task.valueType === '用户价值') score++;
    if (task.hasExistingSolution === true) score++;
    
    return score;
  }
  
  /**
   * 检查资源可用性
   */
  _checkResourceAvailability(line) {
    if (line === 'research') {
      return {
        allowed: this.resources.currentUsage.research < this.resources.maxConcurrent.research,
        current: this.resources.currentUsage.research,
        limit: this.resources.maxConcurrent.research,
        remaining: this.resources.maxConcurrent.research - this.resources.currentUsage.research
      };
    } else {
      return {
        allowed: this.resources.currentUsage.product < this.resources.maxConcurrent.product,
        current: this.resources.currentUsage.product,
        limit: this.resources.maxConcurrent.product,
        remaining: this.resources.maxConcurrent.product - this.resources.currentUsage.product
      };
    }
  }
  
  /**
   * 建议时间调整
   */
  _suggestTimeAdjustment(conflict) {
    const { projects } = conflict;
    
    // 简单策略：优先完成接近完成的项目
    const nearCompletion = projects.filter(p => p.progress > 0.7);
    if (nearCompletion.length > 0) {
      return `优先完成接近完成的项目: ${nearCompletion.map(p => p.name).join(', ')}`;
    }
    
    // 次优策略：暂停低优先级项目
    const lowPriority = projects.filter(p => p.priority === '低');
    if (lowPriority.length > 0) {
      return `暂停低优先级项目: ${lowPriority.map(p => p.name).join(', ')}`;
    }
    
    // 最后策略：调整时间分配
    return `临时调整时间分配: 研究 ${Math.max(0.2, this.resources.timeAllocation.research - 0.1)} / 产品 ${Math.min(0.8, this.resources.timeAllocation.product + 0.1)}`;
  }
  
  /**
   * 决定优先级
   */
  _decidePriority(conflict) {
    const { options } = conflict;
    
    // 简单优先级计算
    const scoredOptions = options.map(option => {
      let score = 0;
      if (option.urgency === '高') score += 3;
      if (option.impact === '高') score += 3;
      if (option.effort === '低') score += 2;
      if (option.dependencies === '无') score += 1;
      return { ...option, score };
    });
    
    // 按分数排序
    scoredOptions.sort((a, b) => b.score - a.score);
    
    return {
      decision: scoredOptions[0],
      alternatives: scoredOptions.slice(1),
      reasoning: `选择最高分选项: ${scoredOptions[0].name} (${scoredOptions[0].score}分)`
    };
  }
  
  /**
   * 调整工作负载
   */
  _adjustWorkload() {
    const adjustments = [];
    
    // 如果研究线超载
    if (this.resources.currentUsage.research > this.resources.maxConcurrent.research * 0.8) {
      adjustments.push('减少研究线并发项目');
      adjustments.push('将部分研究转为长期探索');
    }
    
    // 如果产品线超载
    if (this.resources.currentUsage.product > this.resources.maxConcurrent.product * 0.8) {
      adjustments.push('优化产品开发流程');
      adjustments.push('采用敏捷迭代，小批量交付');
    }
    
    // 总体调整
    if (this.resources.currentUsage.research + this.resources.currentUsage.product > 
        (this.resources.maxConcurrent.research + this.resources.maxConcurrent.product) * 0.8) {
      adjustments.push('总体减少并发工作量');
      adjustments.push('加强优先级管理，聚焦核心价值');
    }
    
    return adjustments;
  }
  
  /**
   * 计算平均进度
   */
  _calculateProgress(line) {
    const projects = line === 'research' ? this.projects.research : this.projects.product;
    if (projects.length === 0) return 0;
    
    const totalProgress = projects.reduce((sum, p) => sum + (p.progress || 0), 0);
    return totalProgress / projects.length;
  }
  
  /**
   * 生成建议
   */
  _generateRecommendations() {
    const recommendations = [];
    
    // 直接使用当前状态数据，避免递归调用
    const researchProgress = this._calculateProgress('research');
    const productProgress = this._calculateProgress('product');
    
    // 研究线建议
    if (researchProgress < 0.3) {
      recommendations.push('研究线进展缓慢，考虑增加资源或调整目标');
    }
    if (this.projects.research.filter(p => p.status === '进行中').length > 2) {
      recommendations.push('研究线并发项目较多，可能影响深度');
    }
    
    // 产品线建议
    if (productProgress < 0.3) {
      recommendations.push('产品线进展缓慢，需要聚焦核心功能');
    }
    const availableProduct = this.resources.maxConcurrent.product - this.resources.currentUsage.product;
    if (availableProduct < 2) {
      recommendations.push('产品线资源紧张，考虑优化现有功能');
    }
    
    // 总体建议
    const availableResearch = this.resources.maxConcurrent.research - this.resources.currentUsage.research;
    if (availableResearch + availableProduct < 3) {
      recommendations.push('总体资源紧张，需要优先排序');
    }
    
    return recommendations.length > 0 ? recommendations : ['当前资源分配合理，继续当前策略'];
  }
}

module.exports = DualLineSimple;