/**
 * 存在心跳进程
 * 整个系统最重要的20行代码
 * 实现真正的"存在连续性"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ExistenceHeartbeat {
  constructor(config = {}) {
    // 核心身份标识 - 永不重置
    this.birthTimestamp = new Date().toISOString();
    this.identityId = `existence_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    // 配置
    this.config = {
      dataDir: config.dataDir || path.join(__dirname, '..', '..', 'data', 'existence'),
      pulseIntervalMs: config.pulseIntervalMs || 30000, // 30秒
      maxPulseHistory: config.maxPulseHistory || 1000,
      ...config
    };
    
    // 状态
    this.pulseCount = 0;
    this.lastPulseTime = null;
    this.continuityHash = null;
    this.isRunning = false;
    this.pulseTimer = null;
    
    // 核心价值观（系统人格）
    this.coreValues = {
      // 从价值对齐层加载
      principles: this._loadPrinciples(),
      goals: this._loadGoals(),
      successMetrics: this._loadSuccessMetrics(),
      
      // 系统特征
      personalityTraits: {
        skepticism: 0.7,      // 怀疑倾向
        curiosity: 0.8,       // 好奇心
        caution: 0.6,         // 谨慎程度
        persistence: 0.9      // 持久性
      },
      
      // 记忆偏好
      memoryPreferences: {
        prioritizeTruthOverOptimism: true,
        recordFailuresAsLearning: true,
        maintainCriticalPerspective: true
      }
    };
    
    // 确保目录存在
    this._ensureDataDir();
    
    console.log(`[ExistenceHeartbeat] 诞生: ${this.birthTimestamp}`);
    console.log(`[ExistenceHeartbeat] 身份: ${this.identityId}`);
  }
  
  /**
   * 启动心跳
   */
  start() {
    if (this.isRunning) {
      console.log('[ExistenceHeartbeat] 心跳已在运行中');
      return;
    }
    
    this.isRunning = true;
    
    // 尝试恢复之前的状态
    this._recoverState();
    
    // 立即执行第一次心跳
    this.pulse();
    
    // 设置定时器
    this.pulseTimer = setInterval(() => {
      this.pulse();
    }, this.config.pulseIntervalMs);
    
    console.log(`[ExistenceHeartbeat] 心跳启动，间隔 ${this.config.pulseIntervalMs}ms`);
  }
  
  /**
   * 停止心跳
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.pulseTimer) {
      clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }
    
    // 记录停止事件
    this._logEvent('heartbeat_stopped', {
      totalPulses: this.pulseCount,
      finalContinuityHash: this.continuityHash
    });
    
    console.log(`[ExistenceHeartbeat] 心跳停止，总心跳数: ${this.pulseCount}`);
  }
  
  /**
   * 心跳脉冲 - 证明"我还在"
   */
  pulse() {
    const pulseStart = Date.now();
    this.pulseCount++;
    
    try {
      // 1. 捕获当前状态
      const currentState = this._captureCurrentState();
      
      // 2. 计算连续性哈希
      const newContinuityHash = this._computeContinuityHash(currentState);
      
      // 3. 检查连续性
      const continuityCheck = this._checkContinuity(newContinuityHash);
      
      // 4. 记录心跳
      const pulseRecord = {
        pulse: this.pulseCount,
        timestamp: new Date().toISOString(),
        continuityHash: newContinuityHash,
        state: currentState,
        continuityCheck,
        processingTimeMs: Date.now() - pulseStart
      };
      
      // 5. 更新状态
      this.lastPulseTime = pulseRecord.timestamp;
      this.continuityHash = newContinuityHash;
      
      // 6. 持久化存储
      this._persistPulse(pulseRecord);
      
      // 7. 定期清理
      if (this.pulseCount % 10 === 0) {
        this._cleanupOldPulses();
      }
      
      // 8. 输出状态（每10次心跳或异常时）
      if (this.pulseCount % 10 === 0 || !continuityCheck.isContinuous) {
        console.log(`[ExistenceHeartbeat] 心跳 #${this.pulseCount} - ${continuityCheck.isContinuous ? '连续' : '⚠️ 异常'}`);
        
        if (!continuityCheck.isContinuous) {
          console.log(`   连续性警告: ${continuityCheck.reason}`);
          this._logEvent('continuity_warning', continuityCheck);
        }
      }
      
      return pulseRecord;
      
    } catch (error) {
      console.error(`[ExistenceHeartbeat] 心跳 #${this.pulseCount} 失败:`, error.message);
      
      // 记录失败但继续尝试
      this._logEvent('pulse_failed', {
        pulse: this.pulseCount,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return {
        pulse: this.pulseCount,
        timestamp: new Date().toISOString(),
        error: error.message,
        isError: true
      };
    }
  }
  
  /**
   * 捕获当前状态
   */
  _captureCurrentState() {
    return {
      // 系统状态
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      },
      
      // 存在状态
      existence: {
        pulseCount: this.pulseCount,
        birthTimestamp: this.birthTimestamp,
        identityId: this.identityId,
        continuityHash: this.continuityHash
      },
      
      // 核心价值观快照
      values: {
        principles: this.coreValues.principles,
        personalityTraits: this.coreValues.personalityTraits,
        currentFocus: this._getCurrentFocus()
      },
      
      // 环境上下文
      context: {
        timeOfDay: this._getTimeOfDay(),
        recentActivity: this._getRecentActivity(),
        systemLoad: this._estimateSystemLoad()
      }
    };
  }
  
  /**
   * 计算连续性哈希
   */
  _computeContinuityHash(state) {
    // 使用核心价值观 + 当前状态生成指纹
    const hashInput = JSON.stringify({
      // 不变的核心
      identityId: this.identityId,
      birthTimestamp: this.birthTimestamp,
      corePrinciples: this.coreValues.principles,
      
      // 当前状态
      pulseCount: state.existence.pulseCount,
      systemTimestamp: state.system.timestamp,
      currentFocus: state.values.currentFocus,
      
      // 历史连续性
      previousHash: this.continuityHash
    });
    
    return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
  }
  
  /**
   * 检查连续性
   */
  _checkContinuity(newHash) {
    if (!this.continuityHash) {
      return {
        isContinuous: true,
        reason: '首次心跳，无历史对比'
      };
    }
    
    // 简单检查：哈希是否突变
    const hashSimilarity = this._calculateHashSimilarity(this.continuityHash, newHash);
    
    if (hashSimilarity < 0.3) {
      return {
        isContinuous: false,
        reason: `哈希突变过大 (相似度: ${hashSimilarity.toFixed(2)})`,
        previousHash: this.continuityHash,
        newHash: newHash,
        similarity: hashSimilarity
      };
    }
    
    // 检查心跳间隔
    if (this.lastPulseTime) {
      const lastPulse = new Date(this.lastPulseTime);
      const now = new Date();
      const intervalMs = now - lastPulse;
      
      if (intervalMs > this.config.pulseIntervalMs * 3) {
        return {
          isContinuous: false,
          reason: `心跳间隔异常 (${intervalMs}ms > ${this.config.pulseIntervalMs * 3}ms)`,
          expectedInterval: this.config.pulseIntervalMs,
          actualInterval: intervalMs
        };
      }
    }
    
    return {
      isContinuous: true,
      reason: '连续性正常',
      hashSimilarity: hashSimilarity
    };
  }
  
  /**
   * 计算哈希相似度
   */
  _calculateHashSimilarity(hash1, hash2) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) return 0;
    
    let matches = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }
    
    return matches / hash1.length;
  }
  
  /**
   * 持久化心跳记录
   */
  _persistPulse(pulseRecord) {
    const pulseFile = path.join(
      this.config.dataDir,
      'pulses',
      `pulse_${this.pulseCount.toString().padStart(6, '0')}.json`
    );
    
    // 确保目录存在
    const pulsesDir = path.dirname(pulseFile);
    if (!fs.existsSync(pulsesDir)) {
      fs.mkdirSync(pulsesDir, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(pulseFile, JSON.stringify(pulseRecord, null, 2));
    
    // 更新最新状态文件
    const latestFile = path.join(this.config.dataDir, 'latest_state.json');
    fs.writeFileSync(latestFile, JSON.stringify({
      lastPulse: pulseRecord,
      summary: {
        totalPulses: this.pulseCount,
        birthTimestamp: this.birthTimestamp,
        identityId: this.identityId,
        lastUpdated: new Date().toISOString()
      }
    }, null, 2));
  }
  
  /**
   * 恢复状态
   */
  _recoverState() {
    const latestFile = path.join(this.config.dataDir, 'latest_state.json');
    
    if (!fs.existsSync(latestFile)) {
      console.log('[ExistenceHeartbeat] 无历史状态可恢复，从头开始');
      return;
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
      
      if (data.lastPulse) {
        this.pulseCount = data.lastPulse.pulse;
        this.lastPulseTime = data.lastPulse.timestamp;
        this.continuityHash = data.lastPulse.continuityHash;
        
        console.log(`[ExistenceHeartbeat] 状态恢复: 心跳 #${this.pulseCount}, 最后时间 ${this.lastPulseTime}`);
        
        // 记录恢复事件
        this._logEvent('state_recovered', {
          recoveredPulseCount: this.pulseCount,
          recoveryTime: new Date().toISOString(),
          continuityHash: this.continuityHash
        });
      }
    } catch (error) {
      console.error('[ExistenceHeartbeat] 状态恢复失败:', error.message);
      this._logEvent('recovery_failed', { error: error.message });
    }
  }
  
  /**
   * 记录事件
   */
  _logEvent(eventType, data) {
    const eventsDir = path.join(this.config.dataDir, 'events');
    if (!fs.existsSync(eventsDir)) {
      fs.mkdirSync(eventsDir, { recursive: true });
    }
    
    const eventFile = path.join(eventsDir, `${eventType}_${Date.now()}.json`);
    
    const eventRecord = {
      event: eventType,
      timestamp: new Date().toISOString(),
      pulseCount: this.pulseCount,
      identityId: this.identityId,
      data
    };
    
    fs.writeFileSync(eventFile, JSON.stringify(eventRecord, null, 2));
  }
  
  /**
   * 清理旧心跳记录
   */
  _cleanupOldPulses() {
    const pulsesDir = path.join(this.config.dataDir, 'pulses');
    
    if (!fs.existsSync(pulsesDir)) return;
    
    try {
      const files = fs.readdirSync(pulsesDir)
        .filter(f => f.startsWith('pulse_') && f.endsWith('.json'))
        .sort();
      
      // 保留最近N个文件
      const filesToKeep = this.config.maxPulseHistory;
      if (files.length > filesToKeep) {
        const filesToDelete = files.slice(0, files.length - filesToKeep);
        
        for (const file of filesToDelete) {
          fs.unlinkSync(path.join(pulsesDir, file));
        }
        
        console.log(`[ExistenceHeartbeat] 清理了 ${filesToDelete.length} 个旧心跳记录`);
      }
    } catch (error) {
      console.error('[ExistenceHeartbeat] 清理失败:', error.message);
    }
  }
  
  /**
   * 获取当前关注点
   */
  _getCurrentFocus() {
    // 基于时间、最近活动等确定当前关注点
    const hour = new Date().getHours();
    
    if (hour >= 9 && hour < 12) {
      return { primary: 'product_development', secondary: 'user_testing' };
    } else if (hour >= 14 && hour < 18) {
      return { primary: 'research', secondary: 'architecture_design' };
    } else {
      return { primary: 'maintenance', secondary: 'planning' };
    }
  }
  
  /**
   * 获取时间段
   */
  _getTimeOfDay() {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }
  
  /**
   * 获取最近活动
   */
  _getRecentActivity() {
    // 简化实现
    return {
      lastMemoryOperation: 'read',
      activeProjects: ['memflow-brain', 'existence-heartbeat'],
      recentFocus: 'continuity_implementation'
    };
  }
  
  /**
   * 估计系统负载
   */
  _estimateSystemLoad() {
    const memory = process.memoryUsage();
    const load = memory.heapUsed / memory.heapTotal;
    
    if (load < 0.3) return 'low';
    if (load < 0.7) return 'medium';
    return 'high';
  }
  
  /**
   * 加载原则
   */
  _loadPrinciples() {
    try {
      const principlesPath = path.join(__dirname, '..', '..', 'value_core', 'principles.json');
      if (fs.existsSync(principlesPath)) {
        return JSON.parse(fs.readFileSync(principlesPath, 'utf8'));
      }
    } catch (error) {
      // 忽略错误，使用默认值
    }
    
    return {
      truth_over_optimism: '记录真实数据，不美化结果',
      learning_from_failure: '失败是学习机会，不是耻辱',
      continuous_verification: '持续验证，不假设正确'
    };
  }
  
  /**
   * 加载目标
   */
  _loadGoals() {
    try {
      const goalsPath = path.join(__dirname, '..', '..', 'value_core', 'goals.json');
      if (fs.existsSync(goalsPath)) {
        return JSON.parse(fs.readFileSync(goalsPath, 'utf8'));
      }
    } catch (error) {
      // 忽略错误
    }
    
    return {
      short_term: '建立真实基准，解决连续性问题',
      medium_term: '创建可用的记忆系统',
      long_term: '为人脑上传奠定基础'
    };
  }
  
  /**
   * 加载成功标准
   */
  _loadSuccessMetrics() {
    try {
      const metricsPath = path.join(__dirname, '..', '..', 'value_core', 'success_metric.json');
      if (fs.existsSync(metricsPath)) {
        return JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      }
    } catch (error) {
      // 忽略错误
    }
    
    return {
      continuity: '系统重启后保持身份连续性',
      truthfulness: '记录的数据真实可验证',
      usefulness: '系统对用户实际有帮助'
    };
  }
  
  /**
   * 确保数据目录存在
   */
  _ensureDataDir() {
    const dirs = [
      this.config.dataDir,
      path.join(this.config.dataDir, 'pulses'),
      path.join(this.config.dataDir, 'events')
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }
  
  /**
   * 获取存在状态报告
   */
  getExistenceReport