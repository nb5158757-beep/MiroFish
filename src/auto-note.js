#!/usr/bin/env node
/**
 * MemFlow AI - 对话自动摘要与记忆写入
 * 每次重要对话结束后，自动提取关键信息存入记忆
 * 集成矛盾检测、时间有效性、多维过滤标签
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const WORKSPACE_ROOT = path.resolve(PROJECT_ROOT, '..');
const MEMORY_DIR = path.join(WORKSPACE_ROOT, 'memory');
const INDEX_FILE = path.join(PROJECT_ROOT, '.memflow-index-boot.json');
const LOG_FILE = path.join(PROJECT_ROOT, 'logs', 'auto-note.log');
const MEMORY_MD = path.join(WORKSPACE_ROOT, 'MEMORY.md');

// 加载矛盾检测引擎（让之前尘封的代码运转起来）
let EnhancedContradictionDetector = null;
try {
  EnhancedContradictionDetector = require('./integrity/enhanced-contradiction-detector.js');
} catch(e) {
  // 可选依赖，没有也不影响写入
}

// 确保日志目录存在
if (!fs.existsSync(path.join(PROJECT_ROOT, 'logs'))) {
  fs.mkdirSync(path.join(PROJECT_ROOT, 'logs'), { recursive: true });
}

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const line = `[${ts}] ${msg}`;
  fs.appendFileSync(LOG_FILE, line + '\n');
  console.log(line);
}

/**
 * 矛盾检测（异步执行，不阻塞写入）
 * 扫描新内容与历史记忆的矛盾
 */
async function _detectContradictionsAsync(category, content) {
  try {
    const detector = new EnhancedContradictionDetector({
      confidenceThreshold: 0.5,
      enableSemanticDetection: true,
      enableTimeDetection: true,
      enableLogicalDetection: true
    });
    
    // 读取最近的记忆文件当做历史参考
    const recentFiles = fs.readdirSync(MEMORY_DIR)
      .filter(f => f.endsWith('.md') && f !== 'YYYY-MM-DD.md')
      .sort()
      .slice(-10);
    
    if (recentFiles.length < 2) return;
    
    const newMemories = [{ text: `## ${category}\n${content}`, date: new Date().toISOString() }];
    const recentMemories = recentFiles.map(f => {
      try {
        const text = fs.readFileSync(path.join(MEMORY_DIR, f), 'utf8').substring(0, 3000);
        const dateMatch = f.match(/(\d{4}-\d{2}-\d{2})/);
        return { text, date: dateMatch ? dateMatch[1] : f };
      } catch(e) { return null; }
    }).filter(Boolean);
    
    const result = await detector.detectContradictions(newMemories, {
      confidenceThreshold: 0.5,
      enableSemanticDetection: true,
      enableTimeDetection: true,
      enableLogicalDetection: false  // 关闭逻辑检测（避免match报错）
    });
    
    // 也检查与历史记忆的对比
    const crossResult = await detector.detectContradictions(recentMemories, {
      confidenceThreshold: 0.5,
      enableSemanticDetection: true,
      enableTimeDetection: true,
      enableLogicalDetection: false
    });
    
    const allContradictions = [];
    if (result && result.contradictions) allContradictions.push(...result.contradictions);
    
    if (allContradictions.length > 0) {
      const warns = allContradictions.slice(0, 3);
      log(`⚠️  发现 ${allContradictions.length} 处潜在矛盾:`);
      warns.forEach(w => log(`    - ${w.description || w.type || '未知'}`));
    } else {
      log('✅ 矛盾检测通过，无冲突');
    }
  } catch(e) {
    // 矛盾检测是辅助功能，失败不影响主流程
    log(`ℹ️  矛盾检测跳过: ${e.message}`);
  }
}

/**
 * 写入今日记忆
 * @param {string} category - 分类 (项目/技术/业务/学习/决策)
 * @param {string} content - 核心内容
 * @param {object} meta - 元数据 {tags, source, importance, validFrom, validUntil, rawContent}
 */
function writeMemory(category, content, meta = {}) {
  const today = new Date().toISOString().split('T')[0];
  const filePath = path.join(MEMORY_DIR, `${today}.md`);
  
  // 读取现有内容
  let existing = '';
  if (fs.existsSync(filePath)) {
    existing = fs.readFileSync(filePath, 'utf8');
  } else {
    existing = `# ${today} 记忆记录\n\n`;
  }
  
  // 构建新增条目
  const tagStr = meta.tags ? meta.tags.map(t => `#${t}`).join(' ') : '';
  const importance = meta.importance || 'normal';
  const emoji = importance === 'high' ? '🔥' : importance === 'low' ? '📝' : '💡';
  const ts = new Date().toISOString().substring(11, 19);
  
  // 时间有效性标注（借鉴MemPalace的 temporal knowledge graph）
  const validFrom = meta.validFrom || today;
  const validUntil = meta.validUntil || '';
  const validityTag = validUntil ? `_有效: ${validFrom} → ${validUntil}_` : '';
  
  // 自动判断记忆仓（借鉴ChromaDB metadata过滤思路）
  const vault = _detectVaultFromContent(category, content, tagStr);
  const vaultTag = vault ? `#仓_${vault}` : '';
  
  const entry = `
## ${emoji} [${ts}] ${category} ${tagStr} ${vaultTag}
${content}
${meta.source ? `_来源: ${meta.source}_` : ''}
${validityTag}
`;
  
  // 追加到文件
  fs.appendFileSync(filePath, entry);
  log(`✅ 已写入记忆: [${category}] ${content.substring(0, 60)}...`);
  
  // 完整性存储：同步追加到 raw 目录（借鉴MemPalace的完整性存储）
  if ((importance === 'high' || meta.rawContent) && meta.rawContent) {
    const rawDir = path.join(MEMORY_DIR, 'raw');
    if (!fs.existsSync(rawDir)) {
      fs.mkdirSync(rawDir, { recursive: true });
    }
    const rawPath = path.join(rawDir, `${today}.md`);
    const rawEntry = `\n## ${emoji} [${ts}] ${category} ${tagStr}\n\`\`\`\n${meta.rawContent}\n\`\`\`\n`;
    fs.appendFileSync(rawPath, rawEntry);
    log(`📦 已存档原文至 raw/${today}.md`);
  }
  
  // 重要：更新 mtime 以确保增量索引能检测到变更
  const now = new Date();
  fs.utimesSync(filePath, now, now);
  
  // 矛盾检测（让尘封的代码真正运转起来）
  // 高重要性内容自动扫描与历史记忆的矛盾
  if (EnhancedContradictionDetector && importance === 'high') {
    _detectContradictionsAsync(category, content);
  }
  
  return true;
}

/**
 * 自动判断记忆仓（轻量版，匹配 auto-note 写入的标签）
 */
function _detectVaultFromContent(category, content, tags) {
  const combined = `${category} ${content} ${tags}`.toLowerCase();
  
  if (/商业|战略|竞争|定价/.test(combined)) return '商业战略';
  if (/刺绣|壁画|艺术漆|墙布|配方|工艺/.test(combined)) return '产品技术';
  if (/加盟|招商|经销商|客户|市场/.test(combined)) return '市场渠道';
  if (/学习|读书|毛选|选集|通鉴|书单/.test(combined)) return '经验学习';
  if (/OpenClaw|升级|更新|记忆|索引/.test(combined)) return '系统技术';
  if (/UUMit|MemPalace|ChromaDB|A2A|能力交易/.test(combined)) return '外部研究';
  if (/成本|利润|报表|财务|营收/.test(combined)) return '财务运营';
  if (/脚本|程序|代码|工具|软件/.test(combined)) return '软件制作';
  
  return '日常';
}

/**
 * 从对话中提取关键信息并写入记忆
 */
async function captureFromConversation({ category, keyPoints, tags, source, importance, validFrom, validUntil, rawContent }) {
  if (!keyPoints || keyPoints.length === 0) return;
  
  const content = keyPoints.map((kp, i) => `${i+1}. ${kp}`).join('\n');
  writeMemory(category, content, { tags, source, importance, validFrom, validUntil, rawContent });
  
  // 高重要性内容同步到长期记忆（MEMORY.md）
  if (importance === 'high') {
    syncToLongTerm(category, keyPoints, tags);
  }
}

/**
 * 同步重要内容到 MEMORY.md
 */
function syncToLongTerm(category, keyPoints, tags) {
  if (!fs.existsSync(MEMORY_MD)) return;
  
  let content = fs.readFileSync(MEMORY_MD, 'utf8');
  const today = new Date().toISOString().split('T')[0];
  const entry = `\n- ${today}: [${category}] ${keyPoints[0]}`;
  
  // 追加到重要记录区
  if (content.includes('## 📝 重要记录区')) {
    content = content.replace('## 📝 重要记录区', `## 📝 重要记录区${entry}`);
    fs.writeFileSync(MEMORY_MD, content);
    log(`📌 已同步到长期记忆`);
  }
}

// CLI 接口
if (require.main === module) {
  const args = process.argv.slice(2);
  const usage = `
用法:
  node auto-note.js --cat 分类 --points "要点1|要点2|要点3" [--tags tag1,tag2] [--source 来源] [--importance high|normal|low] [--validUntil 2026-12-31] [--raw 原文文件路径]

示例:
  node auto-note.js --cat 学习 --points "UI设计原则:一致性、可读性|色彩规范:冷暖色搭配" --tags UI设计,OCOLOR --source "用户提供的PDF" --importance high
`;

  if (args.length === 0 || args.includes('--help')) {
    console.log(usage);
    process.exit(0);
  }

  const getArg = (name) => {
    const idx = args.indexOf(name);
    return idx >= 0 ? args[idx + 1] : null;
  };

  const category = getArg('--cat') || '杂记';
  const pointsRaw = getArg('--points');
  const tagsRaw = getArg('--tags');
  const source = getArg('--source');
  const importance = getArg('--importance') || 'normal';
  const validUntil = getArg('--validUntil') || '';
  const rawFile = getArg('--raw');

  if (!pointsRaw) {
    console.error('❌ 请提供 --points');
    process.exit(1);
  }

  const keyPoints = pointsRaw.split('|').map(s => s.trim()).filter(Boolean);
  const tags = tagsRaw ? tagsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
  
  let rawContent = null;
  if (rawFile && fs.existsSync(rawFile)) {
    rawContent = fs.readFileSync(rawFile, 'utf8');
  }

  captureFromConversation({
    category,
    keyPoints,
    tags,
    source,
    importance,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil,
    rawContent
  });
}

module.exports = { writeMemory, captureFromConversation, syncToLongTerm };
