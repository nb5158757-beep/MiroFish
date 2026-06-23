/**
 * 存在心跳进程 - 简化版
 * 整个系统最重要的20行代码
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ExistenceHeartbeatSimple {
  constructor() {
    // 核心身份 - 永不重置
    this.birthTimestamp = new Date().toISOString();
    this.identityId = `existence_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    // 状态
    this.pulseCount = 0;
    this.continuityHash = null;
    
    // 数据目录
    this.dataDir = path.join(__dirname, '..', '..', 'data', 'existence');
    this._ensureDataDir();
    
    console.log(`[Heartbeat] 诞生: ${this.birthTimestamp}`);
    console.log(`[Heartbeat] 身份: ${this.identityId}`);
  }
  
  /**
   * 心跳脉冲 - 证明"我还在"
   */
  pulse() {
    this.pulseCount++;
    
    // 1. 捕获当前状态
    const state = this._captureState();
    
    // 2. 计算连续性哈希
    const newHash = this._computeHash(state);
    
    // 3. 检查连续性
    const continuityCheck = this._checkContinuity(newHash);
    
    // 4. 记录心跳
    const record = {
      pulse: this.pulseCount,
      timestamp: new Date().toISOString(),
      hash: newHash,
      state: state,
      check: continuityCheck
    };
    
    // 5. 更新并持久化
    this.continuityHash = newHash;
    this._savePulse(record);
    
    // 输出
    if (!continuityCheck.ok) {
      console.log(`[Heartbeat] ⚠️ 心跳 #${this.pulseCount} - ${continuityCheck.reason}`);
    } else if (this.pulseCount % 10 === 0) {
      console.log(`[Heartbeat] 心跳 #${this.pulseCount} - 连续`);
    }
    
    return record;
  }
  
  /**
   * 捕获状态
   */
  _captureState() {
    return {
      // 存在状态（核心不变）
      existence: {
        pulseCount: this.pulseCount,
        birth: this.birthTimestamp,
        identity: this.identityId
      },
      
      // 系统状态（移除变化内容）
      system: {
        uptime: Math.floor(process.uptime()), // 取整，减少微小变化
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
        // 移除 time，因为它每次都会变化
      },
      
      // 核心价值观（永远不变）
      values: {
        truth_over_optimism: true,
        learning_from_failure: true,
        continuous_verification: true
      }
    };
  }
  
  /**
   * 计算哈希（只基于不变内容）
   */
  _computeHash(state) {
    // 只对核心不变内容哈希，确保连续性检查有效
    const input = JSON.stringify({
      identity: this.identityId,
      birth: this.birthTimestamp,
      values: state.values
      // 排除 pulse 和 previous，因为它们每次变化
    });
    
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
  }
  
  /**
   * 检查连续性（新逻辑：基于身份和脉冲计数）
   */
  _checkContinuity(newHash) {
    if (!this.continuityHash) {
      return { ok: true, reason: '首次心跳', level: 'first_pulse' };
    }
    
    // 加载之前保存的状态，检查身份连续性
    try {
      const latestFile = path.join(this.dataDir, 'latest.json');
      if (fs.existsSync(latestFile)) {
        const previousState = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));
        
        // 核心检查1：身份ID是否一致
        const previousIdentity = previousState.summary?.identity || previousState.identityId;
        const identityMatch = previousIdentity === this.identityId;
        
        // 核心检查2：脉冲计数是否连续增长（允许重启后重新开始）
        const previousPulse = previousState.summary?.totalPulses || 
                             (previousState.lastPulse && previousState.lastPulse.pulse);
        const pulseContinuous = this.pulseCount === 1 ||  // 重启后首次心跳
                               previousPulse === this.pulseCount - 1; // 连续增长
        
        if (!identityMatch) {
          // 身份丢失：最严重的问题
          return {
            ok: false,
            level: 'identity_lost',
            reason: '身份ID不匹配 - 存在连续性中断',
            details: {
              previousIdentity: previousIdentity,
              currentIdentity: this.identityId
            }
          };
        } else if (!pulseContinuous && this.pulseCount > 1) {
          // 脉冲不连续：可能的心跳丢失
          return {
            ok: false,
            level: 'pulse_gap',
            reason: `脉冲计数不连续: ${previousPulse} → ${this.pulseCount}`,
            details: {
              gap: this.pulseCount - previousState.lastPulse - 1
            }
          };
        } else {
          // 连续性正常
          const hashSimilarity = this._calculateHashSimilarity(newHash, this.continuityHash);
          return {
            ok: true,
            level: hashSimilarity > 0.3 ? 'high_continuity' : 'normal_continuity',
            reason: `连续 (身份匹配，脉冲${pulseContinuous ? '连续' : '重启'})`,
            details: {
              identityMatch,
              pulseContinuous,
              hashSimilarity: hashSimilarity.toFixed(3)
            }
          };
        }
      }
    } catch (error) {
      // 状态文件读取失败
      console.warn(`[Heartbeat] 状态读取失败: ${error.message}`);
    }
    
    // 回退到哈希相似度检查
    const similarity = this._calculateHashSimilarity(newHash, this.continuityHash);
    if (similarity < 0.1) {
      return {
        ok: false,
        level: 'hash_mismatch',
        reason: `哈希不匹配 (相似度: ${similarity.toFixed(3)})`,
        similarity
      };
    }
    
    return {
      ok: true,
      level: 'hash_continuity',
      reason: `哈希连续 (相似度: ${similarity.toFixed(3)})`,
      similarity
    };
  }
  
  /**
   * 计算哈希相似度（辅助功能）
   */
  _calculateHashSimilarity(hash1, hash2) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) {
      return 0;
    }
    
    let matches = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }
    return matches / hash1.length;
  }
  
  /**
   * 保存心跳
   */
  _savePulse(record) {
    // 心跳记录
    const pulseFile = path.join(this.dataDir, `pulse_${this.pulseCount}.json`);
    fs.writeFileSync(pulseFile, JSON.stringify(record, null, 2));
    
    // 最新状态
    const latestFile = path.join(this.dataDir, 'latest.json');
    fs.writeFileSync(latestFile, JSON.stringify({
      lastPulse: record,
      summary: {
        totalPulses: this.pulseCount,
        birth: this.birthTimestamp,
        identity: this.identityId
      }
    }, null, 2));
  }
  
  /**
   * 恢复状态
   */
  recover() {
    const latestFile = path.join(this.dataDir, 'latest.json');
    
    if (!fs.existsSync(latestFile)) {
      console.log('[Heartbeat] 无历史状态，从头开始');
      return;
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
      
      if (data.lastPulse) {
        this.pulseCount = data.lastPulse.pulse;
        this.continuityHash = data.lastPulse.hash;
        
        console.log(`[Heartbeat] 恢复: 心跳 #${this.pulseCount}`);
        console.log(`[Heartbeat] 身份: ${data.summary.identity}`);
        console.log(`[Heartbeat] 诞生: ${data.summary.birth}`);
        
        return true;
      }
    } catch (error) {
      console.error('[Heartbeat] 恢复失败:', error.message);
    }
    
    return false;
  }
  
  /**
   * 确保目录存在
   */
  _ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }
  
  /**
   * 获取报告
   */
  getReport() {
    return {
      identity: this.identityId,
      birth: this.birthTimestamp,
      pulses: this.pulseCount,
      currentHash: this.continuityHash,
      dataDir: this.dataDir
    };
  }
}

module.exports = ExistenceHeartbeatSimple;