/**
 * MemFlow AI 技能沉淀引擎
 * 从任务执行中自动提取、沉淀、升级技能
 * 实现"越用越聪明"的智能技能复用系统
 */

class SkillPrecipitationEngine {
  constructor() {
    this.skillRepository = new Map(); // 技能库
    this.executionHistory = []; // 执行历史
    this.skillPatterns = new Map(); // 技能模式库
    this.learningRate = 0.1; // 学习速率
  }

  /**
   * 核心方法：从任务执行中沉淀技能
   * @param {Object} task - 任务对象
   * @param {Object} execution - 执行过程和结果
   * @returns {Object} 沉淀后的技能
   */
  async precipitateSkillFromExecution(task, execution) {
    console.log(`🎯 开始从任务中沉淀技能: ${task.name || task.type}`);
    
    try {
      // 1. 分析任务特征
      const taskFeatures = this.analyzeTaskFeatures(task);
      
      // 2. 提取执行模式
      const executionPattern = this.extractExecutionPattern(execution);
      
      // 3. 识别关键成功因素
      const successFactors = this.identifySuccessFactors(execution);
      
      // 4. 封装为可复用技能
      const skill = this.encapsulateSkill({
        taskFeatures,
        executionPattern,
        successFactors,
        originalTask: task,
        executionResult: execution.result
      });
      
      // 5. 存储到技能库
      await this.storeSkill(skill);
      
      // 6. 建立技能索引
      await this.indexSkill(skill);
      
      console.log(`✅ 技能沉淀完成: ${skill.name} (ID: ${skill.id})`);
      return skill;
      
    } catch (error) {
      console.error('❌ 技能沉淀失败:', error);
      throw error;
    }
  }

  /**
   * 分析任务特征
   */
  analyzeTaskFeatures(task) {
    const features = {
      // 基础特征
      type: task.type || 'unknown',
      category: this.categorizeTask(task),
      complexity: this.estimateComplexity(task),
      domain: this.identifyDomain(task),
      
      // 内容特征
      keywords: this.extractKeywords(task),
      entities: this.extractEntities(task),
      requirements: task.requirements || [],
      
      // 上下文特征
      context: task.context || {},
      constraints: task.constraints || {},
      priority: task.priority || 'medium',
      
      // 时间特征
      createdAt: new Date().toISOString(),
      estimatedDuration: task.estimatedDuration || 0
    };
    
    return features;
  }

  /**
   * 提取执行模式
   */
  extractExecutionPattern(execution) {
    const pattern = {
      // 执行步骤
      steps: execution.steps || [],
      stepCount: execution.steps ? execution.steps.length : 0,
      
      // 工具使用
      toolsUsed: execution.toolsUsed || [],
      toolSequence: execution.toolSequence || [],
      
      // 决策点
      decisions: execution.decisions || [],
      decisionPoints: execution.decisionPoints || [],
      
      // 执行参数
      parameters: execution.parameters || {},
      configurations: execution.configurations || {},
      
      // 执行流程
      workflow: execution.workflow || [],
      dependencies: execution.dependencies || [],
      
      // 执行统计
      startTime: execution.startTime,
      endTime: execution.endTime,
      duration: execution.duration || 0,
      success: execution.success || false
    };
    
    return pattern;
  }

  /**
   * 识别关键成功因素
   */
  identifySuccessFactors(execution) {
    const factors = {
      // 技术因素
      correctTools: execution.correctTools || [],
      optimalParameters: execution.optimalParameters || {},
      efficientWorkflow: execution.efficientWorkflow || false,
      
      // 知识因素
      domainKnowledge: execution.domainKnowledge || [],
      proceduralKnowledge: execution.proceduralKnowledge || [],
      contextualKnowledge: execution.contextualKnowledge || [],
      
      // 决策因素
      goodDecisions: execution.goodDecisions || [],
      avoidedMistakes: execution.avoidedMistakes || [],
      adaptiveAdjustments: execution.adaptiveAdjustments || [],
      
      // 结果因素
      qualityMetrics: execution.qualityMetrics || {},
      efficiencyMetrics: execution.efficiencyMetrics || {},
      satisfactionMetrics: execution.satisfactionMetrics || {}
    };
    
    return factors;
  }

  /**
   * 封装为可复用技能
   */
  encapsulateSkill(skillData) {
    const skillId = `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const skill = {
      // 基础信息
      id: skillId,
      name: this.generateSkillName(skillData.taskFeatures),
      description: this.generateSkillDescription(skillData),
      version: '1.0.0',
      
      // 来源信息
      sourceTask: skillData.originalTask,
      sourceExecution: skillData.executionResult,
      precipitatedAt: new Date().toISOString(),
      
      // 技能特征
      features: skillData.taskFeatures,
      pattern: skillData.executionPattern,
      successFactors: skillData.successFactors,
      
      // 执行能力
      canExecute: true,
      executionFunction: this.createExecutionFunction(skillData),
      validationFunction: this.createValidationFunction(skillData),
      
      // 性能指标
      proficiency: 0.5, // 初始熟练度
      successRate: skillData.executionResult.success ? 1.0 : 0.0,
      efficiency: this.calculateEfficiency(skillData),
      reliability: this.calculateReliability(skillData),
      
      // 使用统计
      usageCount: 0,
      lastUsed: null,
      totalSuccess: skillData.executionResult.success ? 1 : 0,
      totalFailures: skillData.executionResult.success ? 0 : 1,
      
      // 元数据
      tags: this.generateTags(skillData),
      categories: this.generateCategories(skillData),
      dependencies: this.identifyDependencies(skillData),
      
      // 升级信息
      upgradeHistory: [],
      canBeUpgraded: true,
      upgradePotential: this.assessUpgradePotential(skillData)
    };
    
    return skill;
  }

  /**
   * 存储技能到技能库
   */
  async storeSkill(skill) {
    this.skillRepository.set(skill.id, skill);
    
    // 同时存储到模式库
    const patternKey = this.createPatternKey(skill);
    this.skillPatterns.set(patternKey, skill.id);
    
    console.log(`💾 技能已存储: ${skill.name} -> ${skill.id}`);
    return true;
  }

  /**
   * 建立技能索引
   */
  async indexSkill(skill) {
    // 建立特征索引
    this.indexByFeature(skill, 'type', skill.features.type);
    this.indexByFeature(skill, 'category', skill.features.category);
    this.indexByFeature(skill, 'domain', skill.features.domain);
    
    // 建立关键词索引
    skill.features.keywords.forEach(keyword => {
      this.indexByKeyword(skill, keyword);
    });
    
    // 建立标签索引
    skill.tags.forEach(tag => {
      this.indexByTag(skill, tag);
    });
    
    console.log(`🔍 技能已索引: ${skill.name} (${skill.features.keywords.length}个关键词)`);
    return true;
  }

  /**
   * 辅助方法：任务分类
   */
  categorizeTask(task) {
    const categories = {
      'excel': ['表格', 'excel', '报表', 'xlsx'],
      'web': ['网站', 'web', 'http', '域名'],
      'memory': ['记忆', 'memory', '搜索', '索引'],
      'development': ['开发', '代码', '编程', '项目'],
      'analysis': ['分析', '数据', '统计', '报告'],
      'automation': ['自动化', '脚本', '任务', '流程']
    };
    
    const taskText = JSON.stringify(task).toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => taskText.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  }

  /**
   * 辅助方法：提取关键词
   */
  extractKeywords(task) {
    const text = JSON.stringify(task);
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    
    // 过滤常见词
    const commonWords = ['the', 'and', 'for', 'with', 'this', 'that', 'have', 'from'];
    const filtered = words.filter(word => 
      !commonWords.includes(word) && 
      word.length > 2
    );
    
    // 去重并取前10个
    return [...new Set(filtered)].slice(0, 10);
  }

  /**
   * 辅助方法：生成技能名称
   */
  generateSkillName(features) {
    const domain = features.domain || '通用';
    const type = features.type || '任务';
    const mainKeyword = features.keywords[0] || '处理';
    
    return `${domain}${type}${mainKeyword}技能`;
  }

  /**
   * 辅助方法：生成技能描述
   */
  generateSkillDescription(skillData) {
    const features = skillData.taskFeatures;
    const pattern = skillData.executionPattern;
    
    return `用于${features.category}领域的${features.type}任务，包含${pattern.stepCount}个步骤，使用${pattern.toolsUsed.length}种工具。`;
  }

  /**
   * 辅助方法：创建执行函数
   */
  createExecutionFunction(skillData) {
    // 这里会生成实际的执行逻辑
    // 目前先返回一个占位函数
    return async (task) => {
      console.log(`🔧 执行技能: ${skillData.taskFeatures.type} 任务`);
      // 实际执行逻辑会根据skillData中的模式来生成
      return { success: true, message: '技能执行完成' };
    };
  }

  /**
   * 辅助方法：索引管理
   */
  indexByFeature(skill, featureName, featureValue) {
    const indexKey = `feature:${featureName}:${featureValue}`;
    // 实际实现中会使用更复杂的索引结构
    console.log(`📌 建立特征索引: ${indexKey} -> ${skill.id}`);
  }

  indexByKeyword(skill, keyword) {
    const indexKey = `keyword:${keyword}`;
    console.log(`📌 建立关键词索引: ${indexKey} -> ${skill.id}`);
  }

  indexByTag(skill, tag) {
    const indexKey = `tag:${tag}`;
    console.log(`📌 建立标签索引: ${indexKey} -> ${skill.id}`);
  }

  /**
   * 创建模式键
   */
  createPatternKey(skill) {
    const features = skill.features;
    return `${features.type}:${features.category}:${features.domain}`;
  }

  /**
   * 计算效率
   */
  calculateEfficiency(skillData) {
    const pattern = skillData.executionPattern;
    if (!pattern.duration) return 0.5;
    
    // 简单的效率计算：步骤越少，时间越短，效率越高
    const stepEfficiency = 1 / (pattern.stepCount || 1);
    const timeEfficiency = 1 / (pattern.duration / 1000 || 1); // 转换为秒
    
    return (stepEfficiency + timeEfficiency) / 2;
  }

  /**
   * 计算可靠性
   */
  calculateReliability(skillData) {
    const result = skillData.executionResult;
    return result.success ? 0.8 : 0.2; // 基础可靠性评分
  }

  /**
   * 生成标签
   */
  generateTags(skillData) {
    const tags = [];
    const features = skillData.taskFeatures;
    
    tags.push(features.type);
    tags.push(features.category);
    tags.push(features.domain);
    
    // 添加前3个关键词作为标签
    tags.push(...features.keywords.slice(0, 3));
    
    return [...new Set(tags)].filter(tag => tag && tag.length > 1);
  }

  /**
   * 生成分类
   */
  generateCategories(skillData) {
    return [
      skillData.taskFeatures.category,
      skillData.taskFeatures.domain,
      'precipitated-skill'
    ].filter(Boolean);
  }

  /**
   * 识别依赖
   */
  identifyDependencies(skillData) {
    const pattern = skillData.executionPattern;
    const dependencies = [];
    
    // 工具依赖
    if (pattern.toolsUsed && pattern.toolsUsed.length > 0) {
      dependencies.push(...pattern.toolsUsed.map(tool => `tool:${tool}`));
    }
    
    // 知识依赖
    const factors = skillData.successFactors;
    if (factors.domainKnowledge && factors.domainKnowledge.length > 0) {
      dependencies.push(...factors.domainKnowledge.map(knowledge => `knowledge:${knowledge}`));
    }
    
    return dependencies;
  }

  /**
   * 评估升级潜力
   */
  assessUpgradePotential(skillData) {
    let potential = 0.5; // 基础潜力
    
    // 如果步骤较多，升级潜力大
    const pattern = skillData.executionPattern;
    if (pattern.stepCount > 5) potential += 0.2;
    
    // 如果使用了多种工具，升级潜力大
    if (pattern.toolsUsed && pattern.toolsUsed.length > 3) potential += 0.1;
    
    // 如果执行时间较长，升级潜力大
    if (pattern.duration > 30000) potential += 0.2; // 超过30秒
    
    return Math.min(potential, 1.0);
  }

  /**
   * 估计任务复杂度
   */
  estimateComplexity(task) {
    const text = JSON.stringify(task);
    const length = text.length;
    
    if (length < 500) return 'simple';
    if (length < 2000) return 'medium';
    return 'complex';
  }

  /**
   * 识别领域
   */
  identifyDomain(task) {
    const domains = {
      'excel': ['excel', '表格', '报表', 'xlsx'],
      'web': ['网站', 'web', 'http', 'html'],
      'memory': ['记忆', '搜索', '索引', '存储'],
      'development': ['开发', '代码', '编程', '项目'],
      'data': ['数据', '分析', '统计', '处理']
    };
    
    const taskText = JSON.stringify(task).toLowerCase();
    
    for (const [domain, keywords] of Object.entries(domains)) {
      if (keywords.some(keyword => taskText.includes(keyword))) {
        return domain;
      }
    }
    
    return 'general';
  }

  /**
   * 提取实体
   */
  extractEntities(task) {
    // 简单的实体提取
    const entities = [];
    const text = JSON.stringify(task);
    
    // 提取看起来像实体的词（大写开头、特定格式等）
    const entityPatterns = [
      /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g, // 大写开头的词
      /[a-zA-Z]+\.[a-zA-Z]+/g, // 带点的词（如openclaw.ai）
      /\b\d{4}-\d{2}-\d{2}\b/g, // 日期
      /\bhttps?:\/\/[^\s]+\b/g // URL
    ];
    
    entityPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      entities.push(...matches);
    });
    
    return [...new Set(entities)];
  }
}

module.exports = SkillPrecipitationEngine;