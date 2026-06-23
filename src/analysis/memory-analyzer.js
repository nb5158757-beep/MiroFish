/**
 * 记忆智能分析器
 * MemFlow智能分析核心模块
 * 目标：智能识别"要被牢记的"重要记忆
 */

const fs = require('fs');
const path = require('path');

class MemoryAnalyzer {
  constructor(config = {}) {
    this.config = {
      // 重要性判断规则权重
      weights: {
        keywordMatch: 2,       // 关键词匹配（降低权重）
        projectRelated: 15,    // 项目相关
        technicalDecision: 10, // 技术决策
        problemSolution: 8,    // 问题解决
        riskWarning: 12,       // 风险警告
        lengthFactor: 0.05,    // 长度因子（每100字符，降低权重）
        recentAccess: 3,       // 近期访问（7天内）
        ...config.weights
      },
      
      // 关键词配置
      keywords: {
        important: ['重要', '关键', '核心', '必须', '必要', '优先'],
        decision: ['决定', '决策', '方案', '计划', '策略'],
        technical: ['架构', '设计', '实现', '代码', '算法', '模型'],
        problem: ['问题', '解决', '修复', 'bug', '错误', '故障'],
        risk: ['风险', '警告', '危险', '问题', '困难', '挑战'],
        project: ['OCOLOR', 'MemFlow', '记忆', '大脑', '智能'],
        ...config.keywords
      },
      
      // 阈值配置
      thresholds: {
        highImportance: 25,    // 高重要性阈值（提高）
        mediumImportance: 12,  // 中重要性阈值
        minLength: 50,         // 最小分析长度（进一步降低以便测试）
        ...config.thresholds
      },
      
      // 文件配置
      fileConfig: {
        memoryDir: path.join(__dirname, '../../../memory'),
        projectsDir: 'projects',
        importantDir: 'important',
        ...config.fileConfig
      }
    };
    
    this.analysisCache = new Map();
    this.stats = {
      totalAnalyzed: 0,
      highImportance: 0,
      mediumImportance: 0,
      lowImportance: 0,
      cacheHits: 0
    };
    
    console.log('[MemoryAnalyzer] 初始化完成');
  }
  
  /**
   * 分析单个记忆文件的重要性
   * @param {string} filePath - 记忆文件路径
   * @param {string} content - 文件内容（可选，不提供则读取文件）
   * @returns {Object} 分析结果
   */
  analyzeMemory(filePath, content = null) {
    const cacheKey = filePath + (content ? '_' + content.length : '');
    
    // 检查缓存
    if (this.analysisCache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.analysisCache.get(cacheKey);
    }
    
    try {
      // 读取内容（如果未提供）
      const memoryContent = content || this._readFileContent(filePath);
      if (!memoryContent || memoryContent.length < this.config.thresholds.minLength) {
        return this._createAnalysisResult(filePath, 0, 'low', ['内容过短或为空']);
      }
      
      // 计算重要性分数
      let score = 0;
      const reasons = [];
      
      // 规则1：关键词匹配
      const keywordScore = this._calculateKeywordScore(memoryContent);
      if (keywordScore > 0) {
        score += keywordScore;
        reasons.push(`关键词匹配: +${keywordScore}`);
      }
      
      // 规则2：项目相关性
      const projectScore = this._calculateProjectScore(memoryContent);
      if (projectScore > 0) {
        score += projectScore;
        reasons.push(`项目相关: +${projectScore}`);
      }
      
      // 规则3：技术决策
      const technicalScore = this._calculateTechnicalScore(memoryContent);
      if (technicalScore > 0) {
        score += technicalScore;
        reasons.push(`技术决策: +${technicalScore}`);
      }
      
      // 规则4：问题解决
      const problemScore = this._calculateProblemScore(memoryContent);
      if (problemScore > 0) {
        score += problemScore;
        reasons.push(`问题解决: +${problemScore}`);
      }
      
      // 规则5：风险警告
      const riskScore = this._calculateRiskScore(memoryContent);
      if (riskScore > 0) {
        score += riskScore;
        reasons.push(`风险警告: +${riskScore}`);
      }
      
      // 规则6：长度因子
      const lengthScore = Math.floor(memoryContent.length / 100) * this.config.weights.lengthFactor;
      if (lengthScore > 0) {
        score += lengthScore;
        reasons.push(`内容长度: +${lengthScore.toFixed(1)}`);
      }
      
      // 规则7：文件位置（projects目录自动重要）
      const locationScore = this._calculateLocationScore(filePath);
      if (locationScore > 0) {
        score += locationScore;
        reasons.push(`特殊位置: +${locationScore}`);
      }
      
      // 确定重要性等级
      let importance;
      if (score >= this.config.thresholds.highImportance) {
        importance = 'high';
        this.stats.highImportance++;
      } else if (score >= this.config.thresholds.mediumImportance) {
        importance = 'medium';
        this.stats.mediumImportance++;
      } else {
        importance = 'low';
        this.stats.lowImportance++;
      }
      
      // 创建分析结果
      const result = this._createAnalysisResult(filePath, score, importance, reasons, memoryContent);
      
      // 缓存结果
      this.analysisCache.set(cacheKey, result);
      this.stats.totalAnalyzed++;
      
      return result;
      
    } catch (error) {
      console.error(`[MemoryAnalyzer] 分析文件失败: ${filePath}`, error);
      return this._createAnalysisResult(filePath, 0, 'low', [`分析错误: ${error.message}`]);
    }
  }
  
  /**
   * 批量分析记忆目录
   * @param {string} directory - 目录路径
   * @returns {Array} 分析结果数组
   */
  analyzeDirectory(directory = null) {
    const targetDir = directory || this.config.fileConfig.memoryDir;
    const results = [];
    
    try {
      const files = fs.readdirSync(targetDir);
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(targetDir, file);
          const result = this.analyzeMemory(filePath);
          results.push(result);
        }
      }
      
      // 按重要性排序
      results.sort((a, b) => b.score - a.score);
      
      return results;
      
    } catch (error) {
      console.error(`[MemoryAnalyzer] 分析目录失败: ${targetDir}`, error);
      return [];
    }
  }
  
  /**
   * 获取需要备份的重要记忆
   * @param {number} limit - 限制数量（可选）
   * @returns {Array} 需要备份的文件路径数组
   */
  getImportantMemories(limit = null) {
    const allResults = this.analyzeDirectory();
    const importantResults = allResults.filter(r => r.importance === 'high');
    
    // 如果高重要性记忆不足，包含中等重要性
    let backupResults = importantResults;
    if (backupResults.length < 5) {
      const mediumResults = allResults.filter(r => r.importance === 'medium');
      backupResults = [...importantResults, ...mediumResults.slice(0, 10 - backupResults.length)];
    }
    
    // 应用数量限制
    if (limit && backupResults.length > limit) {
      backupResults = backupResults.slice(0, limit);
    }
    
    return backupResults.map(r => ({
      filePath: r.filePath,
      score: r.score,
      importance: r.importance,
      reasons: r.reasons
    }));
  }
  
  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.analysisCache.size,
      config: {
        thresholds: this.config.thresholds,
        weights: this.config.weights
      }
    };
  }
  
  /**
   * 清除缓存
   */
  clearCache() {
    this.analysisCache.clear();
    console.log('[MemoryAnalyzer] 缓存已清除');
  }
  
  // ========== 私有方法 ==========
  
  /**
   * 读取文件内容
   */
  _readFileContent(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`读取文件失败: ${error.message}`);
    }
  }
  
  /**
   * 计算关键词匹配分数
   */
  _calculateKeywordScore(content) {
    let score = 0;
    const lowerContent = content.toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.config.keywords)) {
      for (const keyword of keywords) {
        const lowerKeyword = keyword.toLowerCase();
        if (lowerContent.includes(lowerKeyword)) {
          score += this.config.weights.keywordMatch;
          break; // 每个类别只加一次分
        }
      }
    }
    
    return score;
  }
  
  /**
   * 计算项目相关性分数
   */
  _calculateProjectScore(content) {
    const lowerContent = content.toLowerCase();
    let score = 0;
    
    for (const keyword of this.config.keywords.project) {
      const lowerKeyword = keyword.toLowerCase();
      if (lowerContent.includes(lowerKeyword)) {
        score += this.config.weights.projectRelated;
        break;
      }
    }
    
    return score;
  }
  
  /**
   * 计算技术决策分数
   */
  _calculateTechnicalScore(content) {
    const lowerContent = content.toLowerCase();
    let score = 0;
    
    for (const keyword of this.config.keywords.technical) {
      const lowerKeyword = keyword.toLowerCase();
      if (lowerContent.includes(lowerKeyword)) {
        score += this.config.weights.technicalDecision;
        break;
      }
    }
    
    return score;
  }
  
  /**
   * 计算问题解决分数
   */
  _calculateProblemScore(content) {
    const lowerContent = content.toLowerCase();
    let hasProblem = false;
    let hasSolution = false;
    
    // 检查是否包含问题描述
    for (const keyword of ['问题', 'bug', '错误', '故障']) {
      if (lowerContent.includes(keyword)) {
        hasProblem = true;
        break;
      }
    }
    
    // 检查是否包含解决方案
    for (const keyword of ['解决', '修复', '处理', '方案']) {
      if (lowerContent.includes(keyword)) {
        hasSolution = true;
        break;
      }
    }
    
    // 既有问题描述又有解决方案，分数更高
    if (hasProblem && hasSolution) {
      return this.config.weights.problemSolution;
    } else if (hasProblem || hasSolution) {
      return this.config.weights.problemSolution / 2;
    }
    
    return 0;
  }
  
  /**
   * 计算风险警告分数
   */
  _calculateRiskScore(content) {
    const lowerContent = content.toLowerCase();
    let score = 0;
    
    for (const keyword of this.config.keywords.risk) {
      const lowerKeyword = keyword.toLowerCase();
      if (lowerContent.includes(lowerKeyword)) {
        score += this.config.weights.riskWarning;
        break;
      }
    }
    
    return score;
  }
  
  /**
   * 计算文件位置分数
   */
  _calculateLocationScore(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // projects目录下的文件自动重要
    if (normalizedPath.includes('/projects/')) {
      return 50; // 高权重
    }
    
    // 文件名包含"重要"、"关键"等
    const fileName = path.basename(filePath).toLowerCase();
    if (fileName.includes('重要') || fileName.includes('关键')) {
      return 30;
    }
    
    return 0;
  }
  
  /**
   * 创建分析结果对象
   */
  _createAnalysisResult(filePath, score, importance, reasons, content = null) {
    const fileName = path.basename(filePath);
    const fileSize = content ? content.length : 0;
    
    return {
      filePath,
      fileName,
      fileSize,
      score: Math.round(score * 10) / 10, // 保留一位小数
      importance,
      reasons,
      timestamp: new Date().toISOString(),
      summary: content ? this._generateSummary(content) : '无内容'
    };
  }
  
  /**
   * 生成内容摘要
   */
  _generateSummary(content, maxLength = 200) {
    if (!content || content.length <= maxLength) {
      return content || '';
    }
    
    // 尝试找到第一个段落结束
    const firstParagraphEnd = content.indexOf('\n\n');
    if (firstParagraphEnd > 0 && firstParagraphEnd <= maxLength) {
      return content.substring(0, firstParagraphEnd) + '...';
    }
    
    // 否则截断
    return content.substring(0, maxLength) + '...';
  }
}

module.exports = MemoryAnalyzer;