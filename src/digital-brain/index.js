/**
 * 数字大脑主模块
 * 导出所有神经科学核心类
 */

// 从 neuroscience-core.js 提取关键类定义
class DigitalNeuron {
  constructor(id, config = {}) {
    this.id = id;
    this.membranePotential = -70;
    this.threshold = -55;
    this.restingPotential = -70;
    this.refractoryPeriod = 0;
    this.lastFired = 0;
    this.firingRate = 0;
    this.neurotransmitters = {
      glutamate: 0, gaba: 0, dopamine: 0,
      serotonin: 0, acetylcholine: 0
    };
    this.synapses = { excitatory: new Map(), inhibitory: new Map() };
    this.activityHistory = [];
    Object.assign(this, config);
  }
  
  update(time, inputs = []) {
    if (time - this.lastFired < this.refractoryPeriod) {
      this.membranePotential = this.restingPotential;
      return false;
    }
    
    let totalInput = inputs.reduce((sum, input) => sum + (input.strength || 0), 0);
    this.membranePotential = this.restingPotential + totalInput;
    
    if (this.membranePotential >= this.threshold) {
      this.lastFired = time;
      this.refractoryPeriod = 2;
      this.neurotransmitters.glutamate = Math.min(1, this.neurotransmitters.glutamate + 0.3);
      this.activityHistory.push({ time, fired: true });
      return true;
    }
    
    this.activityHistory.push({ time, fired: false });
    return false;
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

class NeuralEnsemble {
  constructor(name, neuronCount = 100) {
    this.name = name;
    this.neurons = [];
    
    for (let i = 0; i < neuronCount; i++) {
      this.neurons.push(new DigitalNeuron(`${name}_neuron_${i}`));
    }
    
    // 创建随机连接
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
    
    this.synchronization = 0;
    this.attention = 0.5;
    this.rhythm = 'beta';
  }
  
  update(time, externalInput = 0) {
    let firedCount = 0;
    
    for (const neuron of this.neurons) {
      const inputs = [];
      
      if (externalInput > 0) {
        inputs.push({ strength: externalInput * this.attention });
      }
      
      for (const [type, synapses] of Object.entries(neuron.synapses)) {
        for (const [targetId, synapse] of synapses) {
          const targetNeuron = this.neurons.find(n => n.id === targetId);
          if (targetNeuron && targetNeuron.lastFired > time - 10) {
            const effect = synapse.strength * (type === 'excitatory' ? 1 : -1);
            inputs.push({ strength: effect });
          }
        }
      }
      
      if (neuron.update(time, inputs)) {
        firedCount++;
      }
    }
    
    this.synchronization = firedCount / this.neurons.length;
    
    const recentFires = this.neurons.filter(n => n.lastFired > time - 1000).length;
    const ensembleFiringRate = recentFires / this.neurons.length;
    
    // 更新脑波节律
    if (ensembleFiringRate > 30) this.rhythm = 'gamma';
    else if (ensembleFiringRate > 12) this.rhythm = 'beta';
    else if (ensembleFiringRate > 8) this.rhythm = 'alpha';
    else if (ensembleFiringRate > 4) this.rhythm = 'theta';
    else this.rhythm = 'delta';
    
    return { firedCount, synchronization: this.synchronization, firingRate: ensembleFiringRate, rhythm: this.rhythm };
  }
  
  setAttention(level) {
    this.attention = Math.max(0, Math.min(1, level));
    for (const neuron of this.neurons) {
      neuron.neurotransmitters.acetylcholine = this.attention * 0.5;
    }
  }
  
  getStats() {
    const activeNeurons = this.neurons.filter(n => n.lastFired > Date.now() - 100).length;
    const avgFiringRate = activeNeurons / this.neurons.length * 10;
    
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

class BrainRegion {
  constructor(name, config = {}) {
    this.name = name;
    this.ensembles = {};
    this.connections = [];
    
    const defaultConfigs = {
      prefrontal: { ensembles: ['working_memory', 'decision', 'planning'], neuronCount: 300 },
      hippocampus: { ensembles: ['encoding', 'retrieval'], neuronCount: 200 },
      amygdala: { ensembles: ['emotion', 'fear'], neuronCount: 150 },
      neocortex: { ensembles: ['sensory', 'motor'], neuronCount: 250 }
    };
    
    const regionConfig = defaultConfigs[name] || { ensembles: ['default'], neuronCount: 200 };
    
    for (const ensembleName of regionConfig.ensembles) {
      this.ensembles[ensembleName] = new NeuralEnsemble(
        `${name}_${ensembleName}`,
        Math.floor(regionConfig.neuronCount / regionConfig.ensembles.length)
      );
    }
    
    Object.assign(this, config);
  }
  
  update(time, regionInputs = {}) {
    const results = {};
    for (const [ensembleName, ensemble] of Object.entries(this.ensembles)) {
      const input = regionInputs[ensembleName] || 0;
      results[ensembleName] = ensemble.update(time, input);
    }
    return results;
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
    const rhythms = Object.values(ensembleStats).map(s => s.rhythm);
    const rhythmCounts = { gamma: 0, beta: 0, alpha: 0, theta: 0, delta: 0 };
    
    for (const rhythm of rhythms) {
      if (rhythmCounts[rhythm] !== undefined) rhythmCounts[rhythm]++;
    }
    
    let maxCount = 0;
    let dominant = 'beta';
    for (const [rhythm, count] of Object.entries(rhythmCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominant = rhythm;
      }
    }
    
    return {
      region: this.name,
      activeRatio: (totalActive / totalNeurons).toFixed(3),
      firingRate: overallFiring.toFixed(1),
      rhythm: dominant,
      connections: this.connections.length
    };
  }
}

class DigitalBrain {
  constructor() {
    this.regions = {
      prefrontal: new BrainRegion('prefrontal'),
      hippocampus: new BrainRegion('hippocampus'),
      amygdala: new BrainRegion('amygdala'),
      neocortex: new BrainRegion('neocortex')
    };
    
    this.globalState = {
      arousal: 0.5,
      focus: 0.7,
      mood: 0.6,
      consciousness: 0,
      time: 0
    };
  }
  
  step() {
    this.globalState.time += 1;
    const time = this.globalState.time;
    
    // 更新全局状态
    const hour = (time / 3600000) % 24;
    if (hour >= 22 || hour < 6) {
      this.globalState.arousal *= 0.99;
    } else if (hour >= 6 && hour < 12) {
      this.globalState.arousal = Math.min(1, this.globalState.arousal * 1.01);
    }
    
    this.globalState.focus += (Math.random() - 0.5) * 0.02;
    this.globalState.focus = Math.max(0.3, Math.min(1, this.globalState.focus));
    
    this.globalState.mood += (Math.random() - 0.5) * 0.01;
    this.globalState.mood = Math.max(0, Math.min(1, this.globalState.mood));
    
    // 更新脑区
    const regionResults = {};
    for (const [regionName, region] of Object.entries(this.regions)) {
      const inputs = this._getRegionInputs(regionName);
      regionResults[regionName] = region.update(time, inputs);
    }
    
    // 更新意识水平（简化）
    const totalActivity = Object.values(regionResults).reduce((sum, result) => {
      return sum + Object.values(result).reduce((s, r) => s + (r.firedCount || 0), 0);
    }, 0);
    
    this.globalState.consciousness = Math.min(1, totalActivity / 1000);
    
    return {
      time,
      globalState: { ...this.globalState },
      regionResults
    };
  }
  
  _getRegionInputs(regionName) {
    const arousal = this.globalState.arousal;
    const focus = this.globalState.focus;
    const mood = this.globalState.mood;
    
    switch (regionName) {
      case 'prefrontal':
        return {
          working_memory: focus * 8,
          decision: arousal * 7,
          planning: focus * 5
        };
      case 'hippocampus':
        return {
          encoding: arousal * 6,
          retrieval: focus * 4
        };
      case 'amygdala':
        return {
          emotion: mood * 5,
          fear: (1 - mood) * 3
        };
      case 'neocortex':
        return {
          sensory: arousal * 6,
          motor: focus * 4
        };
      default:
        return {};
    }
  }
  
  getBrainState() {
    const regionStates = {};
    for (const [name, region] of Object.entries(this.regions)) {
      regionStates[name] = region.getRegionState();
    }
    
    return {
      time: this.globalState.time,
      globalState: { ...this.globalState },
      regionStates
    };
  }
}

// 导出所有类
module.exports = {
  DigitalNeuron,
  NeuralEnsemble,
  BrainRegion,
  DigitalBrain
};