/**
 * 数字大脑 - 神经科学核心模块
 * 为人脑上传奠定生物学基础
 */

class DigitalNeuron {
  /**
   * 数字神经元 - 模拟生物神经元
   */
  constructor(id, config = {}) {
    this.id = id;
    this.membranePotential = -70;
    this.threshold = -55;
    this.restingPotential = -70;
    this.refractoryPeriod = 0;
    this.lastFired = 0;
    this.firingRate = 0;
    
    // 神经递质
    this.neurotransmitters = {
      glutamate: 0, gaba: 0, dopamine: 0,
      serotonin: 0, acetylcholine: 0
    };
    
    // 突触
    this.synapses = { excitatory: new Map(), inhibitory: new Map() };
    this.activityHistory = [];
    
    Object.assign(this, config);
  }
  
  update(time, inputs = []) {
    // 不应期检查
    if (time - this.lastFired < this.refractoryPeriod) {
      this.membranePotential = this.restingPotential;
      return false;
    }
    
    // 处理输入
    let totalInput = inputs.reduce((sum, input) => {
      return sum + (input.strength || 0);
    }, 0);
    
    // 更新膜电位
    this.membranePotential = this.restingPotential + totalInput;
    
    // 检查动作电位
    if (this.membranePotential >= this.threshold) {
      this.lastFired = time;
      this.refractoryPeriod = 2;
      this._releaseNeurotransmitters();
      this.activityHistory.push({ time, fired: true });
      return true;
    }
    
    this.activityHistory.push({ time, fired: false });
    return false;
  }
  
  _releaseNeurotransmitters() {
    this.neurotransmitters.glutamate = Math.min(1, this.neurotransmitters.glutamate + 0.3);
  }
  
  addSynapse(target, strength = 0.5, type = 'excitatory') {
    this.synapses[type].set(target.id, { target: target.id, strength });
  }
  
  getState() {
    return {
      id: this.id,
      potential: this.membranePotential,
      firingRate: this.firingRate,
      lastFired: this.lastFired
    };
  }
}

/**
 * 神经集群
 */
class NeuralEnsemble {
  constructor(name, neuronCount = 100) {
    this.name = name;
    this.neurons = [];
    
    // 创建神经元
    for (let i = 0; i < neuronCount; i++) {
      const neuron = new DigitalNeuron(`${name}_neuron_${i}`);
      this.neurons.push(neuron);
    }
    
    // 随机连接（小世界网络）
    this._createRandomConnections();
    
    this.synchronization = 0;
    this.attention = 0.5;
    this.rhythm = 'beta';
  }
  
  _createRandomConnections() {
    const connectionProbability = 0.1;
    
    for (let i = 0; i < this.neurons.length; i++) {
      for (let j = 0; j < this.neurons.length; j++) {
        if (i !== j && Math.random() < connectionProbability) {
          const strength = 0.3 + Math.random() * 0.4;
          const type = Math.random() > 0.8 ? 'inhibitory' : 'excitatory';
          this.neurons[i].addSynapse(this.neurons[j], strength, type);
        }
      }
    }
  }
  
  update(time, externalInput = 0) {
    let firedCount = 0;
    
    for (const neuron of this.neurons) {
      // 收集输入
      const inputs = [];
      
      // 外部输入
      if (externalInput > 0) {
        inputs.push({ strength: externalInput * this.attention });
      }
      
      // 内部连接输入
      for (const [type, synapses] of Object.entries(neuron.synapses)) {
        for (const [targetId, synapse] of synapses) {
          const targetNeuron = this.neurons.find(n => n.id === targetId);
          if (targetNeuron && targetNeuron.lastFired > time - 10) {
            const effect = synapse.strength * (type === 'excitatory' ? 1 : -1);
            inputs.push({ strength: effect });
          }
        }
      }
      
      // 更新神经元
      if (neuron.update(time, inputs)) {
        firedCount++;
      }
    }
    
    // 更新同步水平
    this.synchronization = firedCount / this.neurons.length;
    
    // 更新发放率
    const recentFires = this.neurons.filter(n => 
      n.lastFired > time - 1000
    ).length;
    const ensembleFiringRate = recentFires / this.neurons.length;
    
    // 更新脑波节律
    this._updateBrainRhythm(ensembleFiringRate);
    
    return {
      firedCount,
      synchronization: this.synchronization,
      firingRate: ensembleFiringRate,
      rhythm: this.rhythm
    };
  }
  
  _updateBrainRhythm(firingRate) {
    // 根据集群活动确定脑波节律
    if (firingRate > 30) {
      this.rhythm = 'gamma'; // γ波：高级认知
    } else if (firingRate > 12) {
      this.rhythm = 'beta';  // β波：专注、思考
    } else if (firingRate > 8) {
      this.rhythm = 'alpha'; // α波：放松、创意
    } else if (firingRate > 4) {
      this.rhythm = 'theta'; // θ波：学习、记忆
    } else {
      this.rhythm = 'delta'; // δ波：深度睡眠
    }
  }
  
  setAttention(level) {
    this.attention = Math.max(0, Math.min(1, level));
    
    // 注意力影响神经递质
    for (const neuron of this.neurons) {
      neuron.neurotransmitters.acetylcholine = this.attention * 0.5;
    }
  }
  
  getStats() {
    const activeNeurons = this.neurons.filter(n => n.lastFired > Date.now() - 100).length;
    const avgFiringRate = activeNeurons / this.neurons.length * 10; // 转换为Hz
    
    return {
      name: this.name,
      neuronCount: this.neurons.length,
      activeNeurons,
      firingRate: avgFiringRate.toFixed(1),
      synchronization: this.synchronization.toFixed(3),
      rhythm: this.rhythm,
      attention: this.attention.toFixed(2)
    };
  }
}

/**
 * 脑区模拟
 */
class BrainRegion {
  constructor(name, config = {}) {
    this.name = name;
    this.ensembles = {};
    this.connections = [];
    
    // 默认配置
    this.defaultConfig = {
      prefrontal: { ensembles: ['working_memory', 'decision', 'planning'], neuronCount: 1000 },
      hippocampus: { ensembles: ['encoding', 'retrieval', 'consolidation'], neuronCount: 800 },
      amygdala: { ensembles: ['emotion', 'fear', 'reward'], neuronCount: 500 },
      neocortex: { ensembles: ['sensory', 'motor', 'association'], neuronCount: 1500 }
    };
    
    this._initRegion(config);
  }
  
  _initRegion(config) {
    const regionConfig = this.defaultConfig[this.name] || {
      ensembles: ['default'],
      neuronCount: 500
    };
    
    // 创建神经集群
    for (const ensembleName of regionConfig.ensembles) {
      this.ensembles[ensembleName] = new NeuralEnsemble(
        `${this.name}_${ensembleName}`,
        Math.floor(regionConfig.neuronCount / regionConfig.ensembles.length)
      );
    }
    
    // 区域特定配置
    if (this.name === 'prefrontal') {
      // 前额叶：高注意力，执行控制
      for (const ensemble of Object.values(this.ensembles)) {
        ensemble.setAttention(0.8);
      }
    } else if (this.name === 'hippocampus') {
      // 海马体：记忆相关，θ波主导
      for (const ensemble of Object.values(this.ensembles)) {
        ensemble.rhythm = 'theta';
      }
    } else if (this.name === 'amygdala') {
      // 杏仁核：情绪处理
      for (const ensemble of Object.values(this.ensembles)) {
        // 增加情绪相关神经递质
        // 这里简化处理
      }
    }
    
    Object.assign(this, config);
  }
  
  update(time, regionInputs = {}) {
    const results = {};
    
    for (const [ensembleName, ensemble] of Object.entries(this.ensembles)) {
      const input = regionInputs[ensembleName] || 0;
      results[ensembleName] = ensemble.update(time, input);
    }
    
    // 区域间协调
    this._coordinateEnsembles();
    
    return results;
  }
  
  _coordinateEnsembles() {
    // 计算区域整体状态
    let totalFiring = 0;
    let ensembleCount = 0;
    
    for (const ensemble of Object.values(this.ensembles)) {
      totalFiring += ensemble.getStats().firingRate;
      ensembleCount++;
    }
    
    const avgFiring = totalFiring / ensembleCount;
    
    // 根据区域类型调整
    if (this.name === 'prefrontal' && avgFiring < 20) {
      // 前额叶活动不足，提高注意力
      for (const ensemble of Object.values(this.ensembles)) {
        ensemble.setAttention(Math.min(1, ensemble.attention + 0.1));
      }
    }
  }
  
  connectTo(targetRegion, connectionType = 'excitatory', strength = 0.3) {
    this.connections.push({
      target: targetRegion.name,
      type: connectionType,
      strength,
      active: true
    });
    
    console.log(`[BrainRegion] ${this.name} -> ${targetRegion.name} 连接建立`);
  }
  
  getRegionState() {
    const ensembleStats = {};
    let totalActive = 0;
    let totalNeurons = 0;
    
    for (const [name, ensemble] of Object.entries(this.ensembles)) {
      const stats = ensemble.getStats();
      ensembleStats[name] = stats;
      totalActive += stats.activeNeurons;
      totalNeurons += stats.neuronCount;
    }
    
    const overallFiring = totalActive / totalNeurons * 10;
    
    // 确定区域主导节律
    const rhythms = Object.values(ensembleStats).map(s => s.rhythm);
    const dominantRhythm = this._getDominantRhythm(rhythms);
    
    return {
      region: this.name,
      ensembles: Object.keys(this.ensembles),
      activeRatio: (totalActive / totalNeurons).toFixed(3),
      firingRate: overallFiring.toFixed(1),
      rhythm: dominantRhythm,
      connections: this.connections.length,
      ensembleStats
    };
  }
  
  _getDominantRhythm(rhythms) {
    const counts = { gamma: 0, beta: 0, alpha: 0, theta: 0, delta: 0 };
    
    for (const rhythm of rhythms) {
      if (counts[rhythm] !== undefined) {
        counts[rhythm]++;
      }
    }
    
    let maxCount = 0;
    let dominant = 'beta';
    
    for (const [rhythm, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        dominant = rhythm;
      }
    }
    
    return dominant;
  }
}

/**
 * 完整数字大脑
 */
class DigitalBrain {
  constructor() {
    this.regions = {};
    this.globalState = {
      arousal: 0.5,      // 唤醒水平
      focus: 0.7,        // 专注度
      mood: 0.6,         // 情绪状态
      consciousness: 0,  // 意识水平
      time: 0           // 内部时钟
    };
    
    this._initBrainRegions();
    this._establishConnections();
    
    console.log('[DigitalBrain] 数字大脑初始化完成');
  }
  
  _initBrainRegions() {
    // 核心脑区
    this.regions.prefrontal = new BrainRegion('prefrontal');
    this.regions.hippocampus = new BrainRegion('hippocampus');
    this.regions.amygdala = new BrainRegion('amygdala');
    this.regions.neocortex = new BrainRegion('neocortex');
    
    // 可选脑区
    this.regions.thalamus = new BrainRegion('thalamus', {
      ensembles: ['relay', 'regulation'],
      neuronCount: 400
    });
    
    this.regions.basalGanglia = new BrainRegion('basal_ganglia', {
      ensembles: ['action_selection', 'habit'],
      neuronCount: 300
    });
    
    console.log(`[DigitalBrain] 创建 ${Object.keys(this.regions).length} 个脑区`);
  }
  
  _establishConnections() {
    // 建立关键神经通路
    
    // 前额叶-海马体通路：工作记忆
    this.regions.prefrontal.connectTo(this.regions.hippocampus, 'excitatory', 0.4);
    this.regions.hippocampus.connectTo(this.regions.prefrontal, 'excitatory', 0.3);
    
    // 杏仁核-前额叶通路：情绪调节
    this.regions.amygdala.connectTo(this.regions.prefrontal, 'excitatory', 0.5);
    this.regions.prefrontal.connectTo(this.regions.amygdala, 'inhibitory', 0.4);
    
    // 丘脑-皮层通路：感觉中继
    this.regions.thalamus.connectTo(this.regions.neocortex, 'excitatory', 0.6);
    this.regions.neocortex.connectTo(this.regions.thalamus, 'excitatory', 0.3);
    
    // 基底节-运动通路：动作选择
    this.regions.basalGanglia.connectTo(this.regions.neocortex, 'excitatory', 0.4);
    
    console.log('[DigitalBrain] 神经通路建立完成');
  }
  
  /**
   * 运行一个时间步长（模拟1ms）
   */
  step() {
    this.globalState.time += 1;
    const time = this.globalState.time;
    
    // 更新全局状态
    this._updateGlobalState();
    
    // 准备区域输入
    const regionInputs = this._prepareRegionInputs();
    
    // 更新所有脑区
    const regionResults = {};
    
    for (const [regionName, region] of Object.entries(this.regions)) {
      regionResults[regionName] = region.update(time, regionInputs[regionName] || {});
    }
    
    // 处理区域间交互
    this._processInterRegionInteractions(regionResults);
    
    // 更新意识水平
    this._updateConsciousness(regionResults);
    
    return {
      time,
      globalState: { ...this.globalState },
      regionResults,
      brainState: this.getBrainState()
    };
  }
  
  _updateGlobalState() {
    // 昼夜节律影响
    const hour = (this.globalState.time / 3600000) % 24;
    
    if (hour >= 22 || hour < 6) {
      // 夜间：唤醒水平降低
      this.globalState.arousal *= 0.99;
    } else if (hour >= 6 && hour < 12) {
      // 早晨：唤醒水平提高
      this.globalState.arousal = Math.min(1, this.globalState.arousal * 1.01);
    }
    
    // 专注度自然波动
    this.globalState.focus += (Math.random() - 0.5) * 0.02;
    this.globalState.focus = Math.max(0.3, Math.min(1, this.globalState.focus));
    
    // 情绪缓慢变化
    this.globalState.mood += (Math.random() - 0.5) * 0.01;
    this.globalState.mood = Math.max(0, Math.min(1, this.globalState.mood));
  }
  
  _prepareRegionInputs() {
    const inputs = {};
    
    // 根据全局状态生成输入
    const arousalInput = this.globalState.arousal * 10;
    const focusInput = this.globalState.focus * 8;
    const moodInput = this.globalState.mood * 5;
    
    // 前额叶：专注度和唤醒输入
    inputs.prefrontal = {
      working_memory: focusInput,
      decision: arousalInput * 0.7,
      planning: focusInput * 0.5
    };
    
    // 海马体：记忆相关输入
    inputs.hippocampus = {
      encoding: arousalInput * 0.6,
      retrieval: focusInput * 0.4,
      consolidation: 2 // 基础巩固活动
    };
    
    // 杏仁核：情绪输入
    inputs.amygdala = {
      emotion: moodInput,
      fear: (1 - this.globalState.mood) * 3,
      reward: this.globalState.mood * 4
    };
    
    // 新皮层：感觉和