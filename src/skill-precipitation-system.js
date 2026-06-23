/**
 * MemFlow AI 智能技能沉淀系统 - 主集成文件
 * 整合技能沉淀、存储、匹配、升级全流程
 */

const SkillPrecipitationEngine = require('./skill-precipitation-engine.js');
const SkillRepository = require('./skill-repository.js');
const IntelligentSkillMatcher = require('./intelligent-skill-matcher.js');

class SkillPrecipitationSystem {
  constructor() {
    console.log('🚀 初始化智能技能沉淀系统...');
    
    // 初始化核心组件
    this.precipitationEngine = new SkillPrecipitationEngine();
    this.skillRepository = new SkillRepository();
    this.skillMatcher = new IntelligentSkillMatcher(this.skillRepository);
    
    // 系统状态
    this.systemStatus = 'initializing';
    this.initializedAt = null;
    this.stats = {
      totalSkillsPrecipitated: 0,
      totalSkillMatches: 0,
      totalSkillUpgrades: 0,
      averageMatchScore: 0
    };
    
    console.log('✅ 智能技能沉淀系统初始化完成');
  }

  /**
   * 启动系统
   */
  async start() {
    console.log('🔧 启动智能技能沉淀系统...');
    
    try {
      // 加载现有技能（如果有）
      await this.loadExistingSkills();
      
      // 启动监控
      this.startMonitoring();
      
      this.systemStatus = 'running';
      this.initializedAt = new Date().toISOString();
      
      console.log('🎉 智能技能沉淀系统已启动并运行');
      return true;
      
    } catch (error) {
      console.error('❌ 系统启动失败:', error);
      this.systemStatus = 'error';
      throw error;
    }
  }

  /**
   * 完整技能沉淀流程
   */
  async precipitateSkillFromTask(task, execution) {
    console.log(`🌊 开始完整技能沉淀流程: ${task.name || task.type}`);
    
    try {
      // 1. 从任务执行中沉淀技能
      const rawSkill = await this.precipitationEngine.precipitateSkillFromExecution(task, execution);
      
      // 2. 存储到技能库
      const storedSkill = await this.skillRepository.addSkill(rawSkill);
      
      // 3. 更新统计
      this.stats.totalSkillsPrecipitated++;
      
      console.log(`✅ 技能沉淀流程完成: ${storedSkill.name}`);
      return {
        success: true,
        skill: storedSkill,
        process: 'precipitation',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ 技能沉淀流程失败:', error);
      return {
        success: false,
        error: error.message,
        process: 'precipitation'
      };
    }
  }

  /**
   * 智能技能匹配流程
   */
  async matchSkillsForTask(task, context = {}) {
    console.log(`🔍 开始智能技能匹配流程: ${task.name || task.type}`);
    
    try {
      // 1. 智能匹配技能
      const recommendations = await this.skillMatcher.matchSkills(task, context);
      
      // 2. 更新统计
      this.stats.totalSkillMatches++;
      if (recommendations.length > 0) {
        const avgScore = recommendations.reduce((sum, rec) => sum + rec.matchScore, 0) / recommendations.length;
        this.stats.averageMatchScore = (this.stats.averageMatchScore * (this.stats.totalSkillMatches - 1) + avgScore) / this.stats.totalSkillMatches;
      }
      
      console.log(`✅ 技能匹配流程完成，找到${recommendations.length}个推荐`);
      return {
        success: true,
        recommendations: recommendations,
        stats: {
          totalMatches: this.stats.totalSkillMatches,
          averageScore: this.stats.averageMatchScore
        },
        process: 'matching',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ 技能匹配流程失败:', error);
      return {
        success: false,
        error: error.message,
        process: 'matching'
      };
    }
  }

  /**
   * 技能执行与反馈流程
   */
  async executeSkillAndProvideFeedback(skillId, task, executionResult) {
    console.log(`⚡ 开始技能执行与反馈流程: ${skillId}`);
    
    try {
      // 1. 记录技能使用
      const updatedSkill = await this.skillRepository.recordSkillUsage(skillId, executionResult);
      
      // 2. 分析执行效果
      const performanceAnalysis = this.analyzeExecutionPerformance(executionResult);
      
      // 3. 检查是否需要升级
      let upgradeResult = null;
      if (this.shouldTriggerUpgrade(updatedSkill, performanceAnalysis)) {
        upgradeResult = await this.upgradeSkill(skillId, performanceAnalysis);
        this.stats.totalSkillUpgrades++;
      }
      
      // 4. 学习优化
      await this.learnFromExecution(updatedSkill, task, executionResult, performanceAnalysis);
      
      console.log(`✅ 技能执行反馈流程完成`);
      return {
        success: true,
        skill: updatedSkill,
        performance: performanceAnalysis,
        upgrade: upgradeResult,
        process: 'execution-feedback',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ 技能执行反馈流程失败:', error);
      return {
        success: false,
        error: error.message,
        process: 'execution-feedback'
      };
    }
  }

  /**
   * 完整工作流：从任务到技能沉淀再到智能匹配
   */
  async completeWorkflow(task, execution, context = {}) {
    console.log(`🔄 开始完整工作流: ${task.name || task.type}`);
    
    const workflowLog = {
      task: task,
      startTime: new Date().toISOString(),
      steps: []
    };
    
    try {
      // 步骤1：沉淀技能
      workflowLog.steps.push({
        step: 'precipitation',
        startTime: new Date().toISOString()
      });
      
      const precipitationResult = await this.precipitateSkillFromTask(task, execution);
      workflowLog.steps[workflowLog.steps.length - 1].result = precipitationResult;
      workflowLog.steps[workflowLog.steps.length - 1].endTime = new Date().toISOString();
      
      if (!precipitationResult.success) {
        throw new Error(`技能沉淀失败: ${precipitationResult.error}`);
      }
      
      // 步骤2：智能匹配（验证沉淀效果）
      workflowLog.steps.push({
        step: 'matching-validation',
        startTime: new Date().toISOString()
      });
      
      const matchingResult = await this.matchSkillsForTask(task, context);
      workflowLog.steps[workflowLog.steps.length - 1].result = matchingResult;
      workflowLog.steps[workflowLog.steps.length - 1].endTime = new Date().toISOString();
      
      // 步骤3：检查匹配结果
      const precipitatedSkill = precipitationResult.skill;
      const isSkillRecommended = matchingResult.recommendations?.some(
        rec => rec.skill.id === precipitatedSkill.id
      );
      
      workflowLog.endTime = new Date().toISOString();
      workflowLog.duration = new Date(workflowLog.endTime) - new Date(workflowLog.startTime);
      
      console.log(`✅ 完整工作流完成，耗时${workflowLog.duration}ms`);
      return {
        success: true,
        workflow: workflowLog,
        precipitation: precipitationResult,
        matching: matchingResult,
        validation: {
          skillRecommended: isSkillRecommended,
          recommendationRank: isSkillRecommended ? 
            matchingResult.recommendations.findIndex(rec => rec.skill.id === precipitatedSkill.id) + 1 : null
        },
        summary: this.generateWorkflowSummary(precipitationResult, matchingResult, isSkillRecommended)
      };
      
    } catch (error) {
      workflowLog.endTime = new Date().toISOString();
      workflowLog.error = error.message;
      
      console.error('❌ 完整工作流失败:', error);
      return {
        success: false,
        error: error.message,
        workflow: workflowLog
      };
    }
  }

  /**
   * 获取系统状态
   */
  getSystemStatus() {
    const repoStats = this.skillRepository.getStatistics();
    
    return {
      system: {
        status: this.systemStatus,
        initializedAt: this.initializedAt,
        uptime: this.initializedAt ? 
          Date.now() - new Date(this.initializedAt).getTime() : 0
      },
      stats: {
        ...this.stats,
        repository: repoStats
      },
      components: {
        precipitationEngine: 'active',
        skillRepository: 'active',
        skillMatcher: 'active'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 导出技能库
   */
  async exportSkillLibrary(format = 'json') {
    return await this.skillRepository.exportSkills(format);
  }

  /**
   * 导入技能库
   */
  async importSkillLibrary(data, format = 'json') {
    return await this.skillRepository.importSkills(data, format);
  }

  /**
   * 搜索技能
   */
  async searchSkills(query, options = {}) {
    return await this.skillRepository.searchSkills(query, options);
  }

  /**
   * 获取技能详情
   */
  async getSkillDetails(skillId) {
    return await this.skillRepository.getSkill(skillId);
  }

  // ========== 私有方法 ==========

  /**
   * 加载现有技能
   */
  async loadExistingSkills() {
    // 这里可以从文件或数据库加载现有技能
    // 目前只是占位实现
    console.log('📂 加载现有技能...');
    return true;
  }

  /**
   * 启动监控
   */
  startMonitoring() {
    // 启动系统监控
    console.log('📊 启动系统监控...');
    
    // 定期输出统计信息
    setInterval(() => {
      if (this.systemStatus === 'running') {
        const stats = this.getSystemStatus();
        console.log(`📈 系统统计: ${stats.stats.totalSkillsPrecipitated}个技能, ${stats.stats.totalSkillMatches}次匹配`);
      }
    }, 60000); // 每分钟输出一次
  }

  /**
   * 分析执行性能
   */
  analyzeExecutionPerformance(executionResult) {
    const analysis = {
      success: executionResult.success,
      duration: executionResult.duration || 0,
      quality: executionResult.quality || 0.5,
      efficiency: executionResult.efficiency || 0.5,
      satisfaction: executionResult.satisfaction || 0.5,
      issues: executionResult.issues || []
    };
    
    // 计算综合性能分数
    analysis.overallScore = (
      (analysis.success ? 1 : 0) * 0.4 +
      analysis.quality * 0.2 +
      analysis.efficiency * 0.2 +
      analysis.satisfaction * 0.2
    );
    
    return analysis;
  }

  /**
   * 检查是否需要触发升级
   */
  shouldTriggerUpgrade(skill, performanceAnalysis) {
    // 基于性能分析决定是否需要升级
    if (!performanceAnalysis.success) return true;
    if (performanceAnalysis.overallScore < 0.7) return true;
    if (skill.usageCount > 0 && skill.usageCount % 5 === 0) return true; // 每使用5次检查一次
    
    return false;
  }

  /**
   * 升级技能
   */
  async upgradeSkill(skillId, performanceAnalysis) {
    const upgradeData = {
      reason: '基于执行性能优化',
      performanceAnalysis: performanceAnalysis,
      changes: this.generateUpgradeChanges(performanceAnalysis),
      timestamp: new Date().toISOString()
    };
    
    return await this.skillRepository.upgradeSkill(skillId, upgradeData);
  }

  /**
   * 从执行中学习
   */
  async learnFromExecution(skill, task, executionResult, performanceAnalysis) {
    // 这里可以更新匹配器的学习参数
    // 例如：调整相似度阈值、更新上下文等
    
    if (performanceAnalysis.success) {
      // 成功执行：加强该技能与类似任务的关联
      console.log(`🧠 从成功执行中学习: ${skill.name}`);
    } else {
      // 失败执行：分析原因并调整
      console.log(`🧠 从失败执行中学习: ${skill.name}`);
    }
  }

  /**
   * 生成升级变化
   */
  generateUpgradeChanges(performanceAnalysis) {
    const changes = [];
    
    if (!performanceAnalysis.success) {
      changes.push({
        type: 'failure-recovery',
        description: '优化失败处理逻辑',
        priority: 'high'
      });
    }
    
    if (performanceAnalysis.efficiency < 0.7) {
      changes.push({
        type: 'efficiency-optimization',
        description: '提升执行效率',
        priority: 'medium'
      });
    }
    
    if (performanceAnalysis.quality < 0.7) {
      changes.push({
        type: 'quality-improvement',
        description: '提升结果质量',
        priority: 'medium'
      });
    }
    
    return changes;
  }

  /**
   * 生成工作流总结
   */
  generateWorkflowSummary(precipitationResult, matchingResult, isSkillRecommended) {
    const summary = {
      skillCreated: precipitationResult.success,
      skillName: precipitationResult.skill?.name,
      recommendationsFound: matchingResult.recommendations?.length || 0,
      newSkillRecommended: isSkillRecommended,
      confidence: 0.5
    };
    
    // 计算置信度
    if (precipitationResult.success && isSkillRecommended) {
      summary.confidence = 0.8;
    } else if (precipitationResult.success) {
      summary.confidence = 0.6;
    } else {
      summary.confidence = 0.3;
    }
    
    // 生成建议
    summary.suggestions = [];
    
    if (isSkillRecommended) {
      summary.suggestions.push('新沉淀的技能被系统推荐，说明沉淀效果良好');
    } else if (precipitationResult.success) {
      summary.suggestions.push('新沉淀的技能未被立即推荐，可能需要更多使用数据');
    } else {
      summary.suggestions.push('技能沉淀失败，建议检查任务和执行数据');
    }
    
    return summary;
  }
}

module.exports = SkillPrecipitationSystem;