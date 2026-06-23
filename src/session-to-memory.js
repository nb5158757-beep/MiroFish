/**
 * Session → Memory 桥接脚本
 * 读取OpenClaw会话日志，提取有价值对话，写入 memory/YYYY-MM-DD.md
 * 
 * 用法：node session-to-memory.js             # 读取最新session
 *       node session-to-memory.js --last       # 读取上一个已结束的session
 *       node session-to-memory.js --id <id>    # 指定session ID
 */

const fs = require('fs');
const path = require('path');

const OPENCLAW_ROOT = path.resolve(process.env.HOME || '/home/user', '.openclaw');
const SESSIONS_DIR = path.join(OPENCLAW_ROOT, 'agents/main/sessions');
const MEMORY_DIR = path.resolve(__dirname, '../../memory');
const MEMORY_MD = path.resolve(__dirname, '../../MEMORY.md');

// ==========================================
// 工具函数
// ==========================================

function today() {
  const now = new Date();
  const offset = 8 * 60;
  const local = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + offset * 60000);
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, '0');
  const d = String(local.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function nowStr() {
  return new Date().toISOString();
}

// ==========================================
// 核心功能
// ==========================================

/**
 * 读取trajectory.jsonl文件，提取所有用户+AI对话
 */
function extractConversation(sessionId) {
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.trajectory.jsonl`);
  if (!fs.existsSync(filePath)) {
    return { error: `文件不存在: ${filePath}`, messages: [] };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const messages = [];
  
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      // 方法1：从prompt.submitted里提取完整消息列表
      if (obj.type === 'prompt.submitted') {
        const data = obj.data || {};
        const allMsgs = data.allMessages || data.messages || [];
        for (const msg of allMsgs) {
          const role = msg.role;
          let text = '';
          const content = msg.content;
          if (Array.isArray(content)) {
            text = content.filter(c => c.type === 'text').map(c => c.text).join(' ');
          } else if (typeof content === 'string') {
            text = content;
          }
          text = text.trim();
          if (text && (role === 'user' || role === 'assistant')) {
            messages.push({ role, text, ts: obj.ts });
          }
        }
      }
      
      // 方法2：从trace.artifacts里提取
      if (obj.type === 'trace.artifacts') {
        const data = obj.data || {};
        const msgs = data.messages || [];
        for (const msg of msgs) {
          const role = msg.role;
          let text = '';
          const content = msg.content;
          if (Array.isArray(content)) {
            text = content.filter(c => c.type === 'text').map(c => c.text).join(' ');
          } else if (typeof content === 'string') {
            text = content;
          }
          text = text.trim();
          if (text && (role === 'user' || role === 'assistant')) {
            messages.push({ role, text, ts: obj.ts });
          }
        }
      }
    } catch (e) {
      // 跳过解析失败的行
    }
  }

  return { error: null, messages };
}

/**
 * 对对话消息去重
 */
function deduplicate(messages) {
  const seen = new Set();
  return messages.filter(msg => {
    const key = `${msg.role}:${msg.text.substring(0, 100)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 从对话中提取有价值的内容，用于记忆存档
 */
function extractKeyContent(messages) {
  // 收集用户问的关键问题
  const userMessages = messages.filter(m => m.role === 'user');
  // 收集AI回答中的关键信息（技术决策、项目进展等）
  const aiMessages = messages.filter(m => m.role === 'assistant');
  
  return { userMessages, aiMessages };
}

/**
 * 生成记忆文件内容
 */
function generateMemoryEntry(messages) {
  const deduped = deduplicate(messages);
  const todayStr = today();
  
  let content = `# ${todayStr} 记忆记录

## 📅 ${todayStr}
- **创建时间**: ${nowStr()}
- **创建来源**: Session-to-Memory 桥接脚本
- **对话记录**: ${deduped.length} 条消息

## 💡 今日会话

`;
  
  // 提取用户的核心询问（去重）
  const userQAs = [];
  let lastRole = '';
  for (const msg of deduped) {
    const roleLabel = msg.role === 'user' ? '**用户**:' : '**AI**:';
    const prefix = roleLabel;
    
    // 只记录关键对话（太长跳过）
    let text = msg.text;
    if (text.length > 500) {
      text = text.substring(0, 500) + '...';
    }
    
    if (msg.role === 'user') {
      content += `### 🗣️ 用户：\n> ${text}\n\n`;
    }
  }
  
  // 提取技术决策
  content += `### 技术决策\n`;
  for (const msg of deduped) {
    if (msg.role === 'assistant' && 
        (msg.text.includes('✅') || msg.text.includes('已装好') || 
         msg.text.includes('安装') || msg.text.includes('brew') ||
         msg.text.includes('授权') || msg.text.includes('权限'))) {
      content += `- ${msg.text.substring(0, 200)}\n`;
      break;
    }
  }
  
  content += `
## 📊 系统状态
- **OpenClaw版本**: 2026.5
- **运行模型**: deepseek/deepseek-chat
- **记忆搜索**: ✅ MemFlow AI 运行中
- **文件系统**: 正常

---
*本文件由 session-to-memory.js 自动生成*
`;
  
  return content;
}

/**
 * 写入记忆文件
 */
function writeMemoryFile(content) {
  const todayStr = today();
  const filePath = path.join(MEMORY_DIR, `${todayStr}.md`);
  
  // 如果文件已存在且有实质内容，则追加而不是覆盖
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf-8');
    // 如果是空模板（只有系统创建标志），直接覆盖
    const isTemplate = existing.includes('系统自动创建') && existing.includes('需要人工补充内容');
    if (!isTemplate && existing.length > 500) {
      console.log(`⚠️ 文件已存在且有实质内容 (${existing.length}字)，跳过覆盖`);
      console.log(`   如需更新请手动编辑: ${filePath}`);
      return { action: 'skipped', existing: true };
    }
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ 已写入记忆文件: ${filePath}`);
  return { action: 'written' };
}

/**
 * 找到最近的QQ Bot direct对话session
 */
function findLatestSession() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    return { error: `sessions目录不存在: ${SESSIONS_DIR}` };
  }
  
  const files = fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith('.trajectory.jsonl'))
    .map(f => ({
      id: f.replace('.trajectory.jsonl', ''),
      path: path.join(SESSIONS_DIR, f),
      mtime: fs.statSync(path.join(SESSIONS_DIR, f)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime);
  
  if (files.length === 0) {
    return { error: '没有找到session文件' };
  }
  
  return { error: null, sessions: files };
}

// ==========================================
// 主函数
// ==========================================

async function main() {
  const args = process.argv.slice(2);
  
  let targetSessionId = null;
  
  if (args.includes('--id')) {
    const idx = args.indexOf('--id');
    targetSessionId = args[idx + 1];
  } else if (args.includes('--last')) {
    // 读取前一个session
    const result = findLatestSession();
    if (result.error) {
      console.error('❌', result.error);
      process.exit(1);
    }
    // 当前正在聊的session是第一个，取第二个
    if (result.sessions.length < 2) {
      console.error('❌ 只有一个session（当前对话），没有历史session');
      process.exit(1);
    }
    targetSessionId = result.sessions[1].id;
  } else {
    // 默认读取最新（当前）session
    const result = findLatestSession();
    if (result.error) {
      console.error('❌', result.error);
      process.exit(1);
    }
    targetSessionId = result.sessions[0].id;
  }
  
  console.log(`📖 读取session: ${targetSessionId}`);
  
  const { error, messages } = extractConversation(targetSessionId);
  if (error) {
    console.error('❌', error);
    process.exit(1);
  }
  
  if (messages.length === 0) {
    console.log('⚠️ 未从中提取到对话消息');
    process.exit(0);
  }
  
  console.log(`📝 提取到 ${messages.length} 条消息`);
  
  // 生成记忆文件
  const content = generateMemoryEntry(messages);
  const result = writeMemoryFile(content);
  
  if (result.action === 'written') {
    console.log('📊 记忆文件已更新');
  }
}

if (require.main === module) {
  main().catch(e => {
    console.error('❌ 脚本出错:', e.message);
    process.exit(1);
  });
}

module.exports = { extractConversation, deduplicate, generateMemoryEntry, writeMemoryFile, findLatestSession };
