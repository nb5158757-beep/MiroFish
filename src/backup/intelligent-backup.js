/**
 * 智能备份系统
 * 基于记忆分析结果，只备份重要的记忆
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class IntelligentBackup {
  constructor(config = {}) {
    this.config = {
      // 备份配置
      backupDir: path.join(process.env.HOME, '.openclaw', 'backup'),
      maxBackups: 7,                    // 保留最近7天备份
      compressBackups: true,            // 是否压缩备份
      
      // 分析配置
      analyzerConfig: {
        weights: {
          keywordMatch: 2,
          projectRelated: 8,           // 进一步降低项目相关权重
          technicalDecision: 10,
          problemSolution: 8,
          riskWarning: 12,
          lengthFactor: 0.05,
          recentAccess: 3
        },
        thresholds: {
          highImportance: 25,
          mediumImportance: 12,
          minLength: 100
        }
      },
      
      // 备份策略
      strategy: {
        backupHighImportance: true,     // 备份高重要性记忆
        backupMediumImportance: false,  // 不备份中重要性记忆（除非高重要性不足）
        minHighImportance: 3,           // 至少备份3个高重要性记忆
        maxTotalBackup: 10,             // 最多备份10个记忆文件
        includeSystemFiles: true,       // 包含系统文件
        ...config.strategy
      },
      
      ...config
    };
    
    // 确保备份目录存在
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
    }
    
    this.MemoryAnalyzer = require('../analysis/memory-analyzer');
    this.analyzer = new this.MemoryAnalyzer(this.config.analyzerConfig);
    
    this.stats = {
      totalBackups: 0,
      successfulBackups: 0,
      failedBackups: 0,
      totalFilesBackedUp: 0,
      totalSizeBackedUp: 0
    };
    
    console.log('[IntelligentBackup] 初始化完成');
    console.log(`   备份目录: ${this.config.backupDir}`);
    console.log(`   分析配置: ${JSON.stringify(this.config.analyzerConfig.thresholds)}`);
  }
  
  /**
   * 执行智能备份
   * @returns {Object} 备份结果
   */
  async executeBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `smart-backup-${timestamp.split('T')[0]}`;
    const backupPath = path.join(this.config.backupDir, backupName);
    
    console.log(`\n[IntelligentBackup] 开始智能备份: ${backupName}`);
    console.log('='.repeat(60));
    
    try {
      // 创建备份目录
      fs.mkdirSync(backupPath, { recursive: true });
      
      // 步骤1：分析记忆重要性
      console.log('🔍 步骤1: 分析记忆重要性...');
      const analysisResults = this._analyzeMemories();
      
      // 步骤2：选择要备份的记忆
      console.log('📋 步骤2: 选择备份记忆...');
      const memoriesToBackup = this._selectMemoriesToBackup(analysisResults);
      
      // 步骤3：备份选择的记忆
      console.log('💾 步骤3: 备份记忆文件...');
      const backupResults = await this._backupMemories(memoriesToBackup, backupPath);
      
      // 步骤4：备份系统文件
      console.log('⚙️ 步骤4: 备份系统文件...');
      const systemResults = await this._backupSystemFiles(backupPath);
      
      // 步骤5：创建备份报告
      console.log('📊 步骤5: 生成备份报告...');
      const report = this._createBackupReport(
        backupName,
        backupPath,
        analysisResults,
        memoriesToBackup,
        backupResults,
        systemResults
      );
      
      // 步骤6：清理旧备份
      console.log('🧹 步骤6: 清理旧备份...');
      const cleanupResult = this._cleanupOldBackups();
      
      // 更新统计
      this.stats.totalBackups++;
      this.stats.successfulBackups++;
      this.stats.totalFilesBackedUp += backupResults.backedUpCount + systemResults.backedUpCount;
      this.stats.totalSizeBackedUp += backupResults.totalSize + systemResults.totalSize;
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ 智能备份完成！');
      console.log('='.repeat(60));
      
      return {
        success: true,
        backupName,
        backupPath,
        report,
        stats: {
          memoriesAnalyzed: analysisResults.length,
          memoriesBackedUp: backupResults.backedUpCount,
          systemFilesBackedUp: systemResults.backedUpCount,
          totalSize: backupResults.totalSize + systemResults.totalSize,
          cleanupRemoved: cleanupResult.removedCount
        }
      };
      
    } catch (error) {
      console.error('\n❌ 备份失败:', error.message);
      this.stats.totalBackups++;
      this.stats.failedBackups++;
      
      return {
        success: false,
        error: error.message,
        backupPath: backupPath
      };
    }
  }
  
  /**
   * 分析所有记忆文件
   */
  _analyzeMemories() {
    const memoryDir = path.join(__dirname, '../../../memory');
    return this.analyzer.analyzeDirectory(memoryDir);
  }
  
  /**
   * 选择要备份的记忆
   */
  _selectMemoriesToBackup(analysisResults) {
    // 按重要性排序
    const sortedResults = [...analysisResults].sort((a, b) => b.score - a.score);
    
    // 选择高重要性记忆
    const highImportance = sortedResults.filter(r => r.importance === 'high');
    
    // 如果高重要性记忆不足，补充中等重要性
    let selected = highImportance;
    if (selected.length < this.config.strategy.minHighImportance) {
      const mediumImportance = sortedResults.filter(r => r.importance === 'medium');
      const needed = this.config.strategy.minHighImportance - selected.length;
      selected = [...selected, ...mediumImportance.slice(0, needed)];
    }
    
    // 应用数量限制
    if (selected.length > this.config.strategy.maxTotalBackup) {
      selected = selected.slice(0, this.config.strategy.maxTotalBackup);
    }
    
    console.log(`   分析完成: ${analysisResults.length} 个记忆文件`);
    console.log(`   高重要性: ${highImportance.length} 个`);
    console.log(`   选择备份: ${selected.length} 个`);
    
    return selected;
  }
  
  /**
   * 备份记忆文件
   */
  async _backupMemories(memoriesToBackup, backupPath) {
    const memoryBackupDir = path.join(backupPath, 'memories');
    fs.mkdirSync(memoryBackupDir, { recursive: true });
    
    let backedUpCount = 0;
    let totalSize = 0;
    const failedFiles = [];
    
    for (const memory of memoriesToBackup) {
      try {
        const sourcePath = memory.filePath;
        const fileName = path.basename(sourcePath);
        const destPath = path.join(memoryBackupDir, fileName);
        
        // 复制文件
        fs.copyFileSync(sourcePath, destPath);
        
        // 获取文件大小
        const stats = fs.statSync(destPath);
        totalSize += stats.size;
        backedUpCount++;
        
        console.log(`   ✅ ${fileName} (${memory.importance}, ${memory.score}分)`);
        
      } catch (error) {
        console.log(`   ❌ ${path.basename(memory.filePath)}: ${error.message}`);
        failedFiles.push({
          file: memory.filePath,
          error: error.message
        });
      }
    }
    
    return {
      backedUpCount,
      totalSize,
      failedFiles,
      memoryBackupDir
    };
  }
  
  /**
   * 备份系统文件
   */
  async _backupSystemFiles(backupPath) {
    if (!this.config.strategy.includeSystemFiles) {
      return { backedUpCount: 0, totalSize: 0, systemBackupDir: null };
    }
    
    const systemBackupDir = path.join(backupPath, 'system');
    fs.mkdirSync(systemBackupDir, { recursive: true });
    
    const systemFiles = [
      {
        name: 'MemFlow AI 源代码',
        source: path.join(__dirname, '../../src'),
        dest: path.join(systemBackupDir, 'src')
      },
      {
        name: 'MemFlow AI 配置',
        source: path.join(__dirname, '../../config'),
        dest: path.join(systemBackupDir, 'config')
      },
      {
        name: 'MemFlow AI 数据',
        source: path.join(__dirname, '../../data'),
        dest: path.join(systemBackupDir, 'data')
      },
      {
        name: '项目文件',
        source: path.join(__dirname, '../../../memory/projects'),
        dest: path.join(systemBackupDir, 'projects')
      }
    ];
    
    let backedUpCount = 0;
    let totalSize = 0;
    const failedFiles = [];
    
    for (const file of systemFiles) {
      try {
        if (fs.existsSync(file.source)) {
          // 复制目录或文件
          this._copyRecursive(file.source, file.dest);
          
          // 计算大小
          const size = this._getDirectorySize(file.dest);
          totalSize += size;
          backedUpCount++;
          
          console.log(`   ✅ ${file.name}`);
        } else {
          console.log(`   ⚠️ ${file.name} (不存在)`);
        }
      } catch (error) {
        console.log(`   ❌ ${file.name}: ${error.message}`);
        failedFiles.push({
          file: file.name,
          error: error.message
        });
      }
    }
    
    return {
      backedUpCount,
      totalSize,
      failedFiles,
      systemBackupDir
    };
  }
  
  /**
   * 创建备份报告
   */
  _createBackupReport(backupName, backupPath, analysisResults, memoriesToBackup, backupResults, systemResults) {
    const reportPath = path.join(backupPath, 'backup-report.json');
    
    const report = {
      backupName,
      backupPath,
      timestamp: new Date().toISOString(),
      
      // 分析统计
      analysis: {
        totalMemories: analysisResults.length,
        highImportance: analysisResults.filter(r => r.importance === 'high').length,
        mediumImportance: analysisResults.filter(r => r.importance === 'medium').length,
        lowImportance: analysisResults.filter(r => r.importance === 'low').length
      },
      
      // 备份内容
      backup: {
        memoriesBackedUp: backupResults.backedUpCount,
        memoriesSize: backupResults.totalSize,
        systemFilesBackedUp: systemResults.backedUpCount,
        systemSize: systemResults.totalSize,
        totalSize: backupResults.totalSize + systemResults.totalSize,
        
        // 备份的记忆列表
        memories: memoriesToBackup.map(m => ({
          fileName: path.basename(m.filePath),
          importance: m.importance,
          score: m.score,
          size: m.fileSize,
          reasons: m.reasons.slice(0, 3)
        })),
        
        // 失败的文件
        failedFiles: [...backupResults.failedFiles, ...systemResults.failedFiles]
      },
      
      // 配置信息
      config: {
        strategy: this.config.strategy,
        analyzerConfig: this.config.analyzerConfig
      }
    };
    
    // 保存报告
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // 也创建可读的文本报告
    const textReportPath = path.join(backupPath, 'backup-report.txt');
    const textReport = this._createTextReport(report);
    fs.writeFileSync(textReportPath, textReport);
    
    return {
      reportPath,
      textReportPath,
      summary: report
    };
  }
  
  /**
   * 创建文本报告
   */
  _createTextReport(report) {
    return `
智能备份报告
============

备份名称: ${report.backupName}
备份时间: ${report.timestamp}
备份路径: ${report.backupPath}

📊 分析统计
-----------
总记忆文件: ${report.analysis.totalMemories}
高重要性: ${report.analysis.highImportance}
中重要性: ${report.analysis.mediumImportance}
低重要性: ${report.analysis.lowImportance}

💾 备份内容
-----------
记忆文件备份: ${report.backup.memoriesBackedUp} 个 (${this._formatSize(report.backup.memoriesSize)})
系统文件备份: ${report.backup.systemFilesBackedUp} 项 (${this._formatSize(report.backup.systemSize)})
总大小: ${this._formatSize(report.backup.totalSize)}

📋 备份的记忆文件
----------------
${report.backup.memories.map((m, i) => 
  `${i + 1}. ${m.fileName} (${m.importance}, ${m.score}分, ${this._formatSize(m.size)})\n   原因: ${m.reasons.join(', ')}`
).join('\n\n')}

⚙️ 备份配置
----------
备份策略: ${JSON.stringify(report.config.strategy, null, 2)}
分析配置: ${JSON.stringify(report.config.analyzerConfig.thresholds, null, 2)}

${report.backup.failedFiles.length > 0 ? `
❌ 备份失败的文件
-----------------
${report.backup.failedFiles.map(f => `• ${f.file}: ${f.error}`).join('\n')}
` : ''}

备份完成时间: ${new Date().toISOString()}
    `.trim();
  }
  
  /**
   * 清理旧备份
   */
  _cleanupOldBackups() {
    try {
      const backups = fs.readdirSync(this.config.backupDir)
        .filter(name => name.startsWith('smart-backup-'))
        .map(name => ({
          name,
          path: path.join(this.config.backupDir, name),
          time: fs.statSync(path.join(this.config.backupDir, name)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // 按时间倒序排序
      
      // 保留最近的maxBackups个备份
      const toRemove = backups.slice(this.config.maxBackups);
      let removedCount = 0;
      
      for (const backup of toRemove) {
        try {
          fs.rmSync(backup.path, { recursive: true, force: true });
          console.log(`   删除旧备份: ${backup.name}`);
          removedCount++;
        } catch (error) {
          console.log(`   删除失败 ${backup.name}: ${error.message}`);
        }
      }
      
      return {
        removedCount,
        totalBackups: backups.length,
        keptBackups: Math.min(backups.length, this.config.maxBackups)
      };
      
    } catch (error) {
      console.log(`   清理失败: ${error.message}`);
      return { removedCount: 0, error: error.message };
    }
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      config: {
        backupDir: this.config.backupDir,
        maxBackups: this.config.maxBackups,
        strategy: this.config.strategy
      }
    };
  }
  
  // ========== 工具方法 ==========
  
  /**
   * 递归复制目录
   */
  _copyRecursive(source, destination) {
    if (fs.statSync(source).isDirectory()) {
      if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
      }
      
      const files = fs.readdirSync(source);
      for (const file of files) {
        const srcPath = path.join(source, file);
        const destPath = path.join(destination, file);
        this._copyRecursive(srcPath, destPath);
      }
    } else {
      fs.copyFileSync(source, destination);
    }
  }
  
  /**
   * 获取目录大小
   */
  _getDirectorySize(dir) {
    let totalSize = 0;
    
    const traverse = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          traverse(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
    };
    
    traverse(dir);
    return totalSize;
  }
  
  /**
   * 格式化文件大小
   */
  _formatSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = IntelligentBackup;