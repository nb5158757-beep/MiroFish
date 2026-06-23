#!/usr/bin/env node
/**
 * MemFlow AI 启动器
 * 串联所有模块：分层记忆 + 数字大脑 + 搜索 + 矛盾检测
 * 每次启动时执行：初始化→索引→分层→启动
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const WORKSPACE = path.join(ROOT, '..');

// ============================================
// 第一步：初始化分层记忆目录
// ============================================
function initLayers() {
  const configPath = path.join(ROOT, 'config', 'advanced-memory.yaml');
  const config = fs.existsSync(configPath) 
    ? yaml.load(fs.readFileSync(configPath, 'utf8'))
    : { memory_layers: {
        work: { path: './memory/0_work', capacity: 10, ttl: 3600 },
        short: { path: './memory/1_short', ttl: 604800 },
        medium: { path: './memory/2_medium', organization: 'daily' },
        long: { path: './memory/3_long', format: 'rule' },
        semantic: { path: './memory/4_semantic', provider: 'zhipu' },
        decay: { path: './memory/5_decay', recovery_window: 2592000 }
      }};

  console.log('📚 初始化记忆分层目录:');
  for (const [name, cfg] of Object.entries(config.memory_layers)) {
    const dir = path.join(ROOT, cfg.path || `./memory/0_${name}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const count = fs.readdirSync(dir).length;
    console.log(`  ${name.padEnd(10)} → ${dir} (${count}个文件)`);
  }
  return config;
}

// ============================================
// 第二步：将记忆文件按时间分到各层（软链/标记）
// ============================================
function classifyMemoryFiles(config) {
  const memoryDir = path.join(WORKSPACE, 'memory');
  const files = fs.readdirSync(memoryDir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      name: f,
      fullPath: path.join(memoryDir, f),
      // 从文件名提取日期: YYYY-MM-DD.md
      date: (() => {
        const m = f.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return null;
        return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
      })()
    }))
    .filter(f => f.date !== null)
    .sort((a, b) => b.date - a.date); // 最近的在前面

  const now = new Date();
  const layers = {
    work: [],    // 今天
    short: [],   // 1-7天
    medium: [],  // 7-30天
    long: [],    // 30天+
    semantic: [],
    decay: []
  };

  for (const file of files) {
    const daysDiff = (now - file.date) / (1000 * 60 * 60 * 24);
    if (daysDiff <= 1) layers.work.push(file);
    else if (daysDiff <= 7) layers.short.push(file);
    else if (daysDiff <= 30) layers.medium.push(file);
    else layers.long.push(file);
  }

  console.log('\n📊 记忆文件分层统计:');
  let total = 0;
  for (const [layer, layerFiles] of Object.entries(layers)) {
    const pct = ((layerFiles.length / files.length) * 100).toFixed(1);
    total += layerFiles.length;
    console.log(`  ${layer.padEnd(8)} ${String(layerFiles.length).padStart(3)}个文件 (${pct.padStart(5)}%)`);
  }
  console.log(`  ${'─'.repeat(20)}\n  总计 ${total}个记忆文件`);

  // 同步到分层的记忆目录
  const layerBase = path.join(ROOT, 'memory');
  for (const [layer, layerFiles] of Object.entries(layers)) {
    const layerDir = path.join(layerBase, layer.replace('memory_', ''));
    for (const file of layerFiles) {
      const target = path.join(layerDir, file.name);
      if (!fs.existsSync(target)) {
        try { fs.copyFileSync(file.fullPath, target); }
        catch(e) { /* ignore symlink errors on some fs */ }
      }
    }
  }

  return layers;
}

// ============================================
// 第三步：启动增量索引（批量请求优化版）
// ============================================
async function startSearch() {
  console.log('\n🔍 启动增量索引搜索...');
  const IncrementalSearch = require('./search/memflow-search-incremental.js');
  const search = new IncrementalSearch({
    memoryDir: path.join(WORKSPACE, 'memory'),
    workspaceDir: WORKSPACE,
    indexFile: path.join(ROOT, '.memflow-index-boot.json')
  });
  await search.initialize(false);
  const stats = search.getStats();
  console.log(`  ✅ 搜索就绪: ${stats.totalItems}个索引片段, ${stats.indexedFiles}个文件`);
  return search;
}

// ============================================
// 第四步：初始化数字大脑
// ============================================
function startDigitalBrain(layers) {
  console.log('\n🧠 初始化数字大脑...');
  let brain = null;
  try {
    const { DigitalBrain } = require('./digital-brain');
    brain = new DigitalBrain();
    
    // 注入分层记忆统计作为输入
    const layerData = {};
    for (const [layerName, layerFiles] of Object.entries(layers)) {
      layerData[layerName] = layerFiles.length;
    }
    
    // 模拟几步让大脑进入活跃状态
    for (let i = 0; i < 10; i++) {
      brain.step();
    }
    
    const state = brain.getBrainState();
    console.log(`  脑区状态: 前额叶(${state.regionStates.prefrontal.rhythm}) | 海马体(${state.regionStates.hippocampus.rhythm}) | 杏仁核(${state.regionStates.amygdala.rhythm})`);
    console.log(`  长期记忆: ${layerData.long || 0}个文件 | 中期: ${layerData.medium || 0} | 短期: ${layerData.short || 0}`);
    console.log(`  意识水平: ${(state.globalState.consciousness * 100).toFixed(0)}%`);
    console.log(`  ✅ 数字大脑就绪`);
  } catch (e) {
    console.log(`  ⚠️ 数字大脑加载跳过: ${e.message}`);
  }
  return brain;
}

// ============================================
// 第五步：初始化矛盾检测
// ============================================
function startContradictionDetection() {
  console.log('\n🔍 初始化矛盾检测器...');
  let contradiction = null;
  try {
    const ContradictionDetector = require('./integrity/contradiction-detector');
    contradiction = new ContradictionDetector();
    console.log(`  ✅ 矛盾检测就绪`);
  } catch (e) {
    console.log(`  ⚠️ 矛盾检测跳过: ${e.message}`);
  }
  return contradiction;
}

// ============================================
// 主流程
// ============================================
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  🧠 MemFlow AI 启动器 v0.10.0');
  console.log('  串联分层记忆 + 数字大脑 + 搜索 + 矛盾检测');
  console.log('═══════════════════════════════════════════\n');

  const startTime = Date.now();

  // 步骤1-2：初始化和分层
  const config = initLayers();
  const layers = classifyMemoryFiles(config);

  // 步骤3：启动搜索
  let search = null;
  try { search = await startSearch(); }
  catch (e) { console.error(`  ❌ 搜索启动失败: ${e.message}`); }

  // 步骤4：启动数字大脑
  const brain = startDigitalBrain(layers);

  // 步骤5：矛盾检测
  const contradiction = startContradictionDetection();

  // 汇总
  const duration = Date.now() - startTime;
  const status = {
    search: !!search,
    brain: !!brain,
    contradiction: !!contradiction,
    layers: Object.values(layers).reduce((a, b) => a + b.length, 0)
  };

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  ✅ 全部就绪! (${duration}ms)`);
  console.log(`  分层记忆: ${status.layers}个文件`);
  console.log(`  语义搜索: ${search ? '✅ 在线' : '❌ 离线'}`);
  console.log(`  数字大脑: ${brain ? '✅ 活跃' : '❌ 未启动'}`);
  console.log(`  矛盾检测: ${contradiction ? '✅ 监控中' : '❌ 未启动'}`);
  console.log(`═══════════════════════════════════════════`);

  // 保存启动状态，供其他模块查询
  const bootState = {
    bootTime: new Date().toISOString(),
    duration,
    status,
    layers: Object.fromEntries(
      Object.entries(layers).map(([k, v]) => [k, v.length])
    ),
    config: {
      search: {
        indexFile: path.join(ROOT, '.memflow-index-boot.json'),
        memoryDir: path.join(WORKSPACE, 'memory')
      }
    }
  };
  fs.writeFileSync(path.join(ROOT, '.boot-state.json'), JSON.stringify(bootState, null, 2));

  return bootState;
}

if (require.main === module) {
  main().catch(e => {
    console.error('❌ 启动失败:', e.message);
    process.exit(1);
  });
}

module.exports = main;
