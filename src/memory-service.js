#!/usr/bin/env node
/**
 * memory-service.js - 记忆系统持续服务 (v2)
 * 
 * 每次被调用时：
 * 1. 检查索引是否最新（增量更新）
 * 2. 自动识别查询属于哪个记忆仓（vault）
 * 3. 优先从对应仓搜索，再扩大范围
 * 4. 返回结构化上下文
 * 
 * 使用方式:
 *   node memory-service.js "用户的问题"              ← 自动识别仓
 *   node memory-service.js --vault 商业战略 "问题"    ← 指定仓搜索
 *   node memory-service.js --vault-list               ← 列出所有仓
 * 
 * 输出: JSON格式的记忆上下文
 */

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// 配置
const WORKSPACE = path.resolve(__dirname, '../..');
const MEMORY_DIR = path.join(WORKSPACE, 'memory');
const MEMFLOW_DIR = __dirname.replace('/src', '');
const INDEX_FILE = path.join(MEMFLOW_DIR, '.memflow-index-boot.json');

// 加载配置
let config = {};
try {
    config = yaml.load(fs.readFileSync(path.join(MEMFLOW_DIR, 'config/default.yaml'), 'utf8'));
} catch(e) {}

// 设置代理
const proxy = config.embedding?.zhipu?.proxy || '';
if (proxy) {
    process.env.HTTPS_PROXY = proxy;
    process.env.HTTP_PROXY = proxy;
}

const Search = require('./search/memflow-search-incremental.js');

let searchInstance = null;

// 仓定义（关键词映射）
const VAULTS = {
    '商业战略': ['战略', '竞争', '三才', '定价', '定位', '战场', '利润分配', '出牌', '战役', '打法', '对手', '低价', '高价'],
    '产品技术': ['配方', '工艺参数', '质量', '检测', '工序', '原料', '生产', '设备', '二代'],
    '市场渠道': ['加盟', '招商', '经销商', '渠道', '展会', '客户', '师傅', '施工', '销售', '门店', '代理商'],
    '经验学习': ['毛选', '选集', '资治', '通鉴', '盐铁', '左传', '天道', '书单', '学习', '读书', '商业', '智慧', '经验'],
    '系统技术': ['OpenClaw', '升级', '版本', '更新', 'cron', 'heartbeat', '记忆', 'memory', 'index', '索引', '搜索', '修复'],
    '财务运营': ['成本', '核算', '营收', '利润', '报表', '库存', '财务', '费用', '数据', '日报', '账', '价格', '预算'],
    '软件制作': ['脚本', '工具', '程序', '软件', 'HTML', 'canvas', 'Excel', '代码', '开发', '网页', 'APP', '小程序']
};

// 自动识别查询属于哪个仓
function detectVaultFromQuery(query) {
    const q = query.toLowerCase();
    const scores = {};
    
    for (const [vault, keywords] of Object.entries(VAULTS)) {
        scores[vault] = keywords.filter(kw => q.includes(kw)).length;
    }
    
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (sorted[0][1] > 0) {
        return sorted[0][0];
    }
    return null; // 无法识别时搜全部
}

async function initSearch() {
    if (searchInstance) return searchInstance;
    
    searchInstance = new Search({
        memoryDir: MEMORY_DIR,
        workspaceDir: WORKSPACE,
        indexFile: INDEX_FILE,
        similarityThreshold: 0.35,
        maxResults: 5
    });
    
    return searchInstance;
}

// 先从指定仓搜索，如果结果不够再扩大
async function searchWithVault(query, vault) {
    const search = await initSearch();
    
    if (vault) {
        // 先只搜该仓
        const narrow = await search.search(query, { vault, maxResults: 3, similarityThreshold: 0.3 });
        if (narrow.results.length >= 2) {
            return narrow;
        }
        
        // 结果不够，扩大到全部仓
        const wide = await search.search(query, { maxResults: 5, similarityThreshold: 0.3 });
        
        // 把该仓的结果排在前面
        const vaultResults = wide.results.filter(r => r.vault === vault);
        const otherResults = wide.results.filter(r => r.vault !== vault);
        wide.results = [...vaultResults, ...otherResults].slice(0, 5);
        
        return wide;
    }
    
    // 无指定仓，搜全部
    return await search.search(query, { maxResults: 5, similarityThreshold: 0.3 });
}

// 获取最近的记忆文件摘要
function getRecentNotes() {
    const files = fs.readdirSync(MEMORY_DIR)
        .filter(f => f.endsWith('.md'))
        .sort()
        .slice(-3);
    
    return files.map(f => {
        const content = fs.readFileSync(path.join(MEMORY_DIR, f), 'utf8').substring(0, 200);
        return { file: f, preview: content.replace(/\n/g, ' ').substring(0, 150) };
    });
}

// 获取索引统计
function getIndexStats(search) {
    if (!search || !search.index) {
        return { segments: 0, vaults: {} };
    }
    
    const vaultCount = {};
    for (const item of search.index) {
        const v = item.vault || '未分类';
        vaultCount[v] = (vaultCount[v] || 0) + 1;
    }
    
    return {
        segments: search.index.length,
        vaults: vaultCount
    };
}

// 主函数
async function main() {
    const args = process.argv.slice(2);
    
    // 处理 --vault-list
    if (args[0] === '--vault-list') {
        const search = await initSearch();
        await search.initialize();
        const stats = getIndexStats(search);
        
        console.log(JSON.stringify({
            success: true,
            vaults: Object.entries(stats.vaults)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => ({ name, count })),
            total: stats.segments
        }, null, 2));
        return;
    }
    
    // 处理 --vault 指定仓
    let vault = null;
    let query = '';
    
    if (args[0] === '--vault' && args.length > 1) {
        vault = args[1];
        query = args.slice(2).join(' ');
    } else {
        query = args.join(' ');
    }
    
    if (!query) {
        console.log(JSON.stringify({ success: false, error: '缺少查询内容' }));
        process.exit(1);
    }
    
    // 如果没指定仓，自动识别
    if (!vault) {
        vault = detectVaultFromQuery(query);
    }
    
    console.error(`[记忆服务] 查询: "${query.substring(0, 50)}..." 仓: ${vault || '全部'}`);
    const start = Date.now();
    
    // 加载索引
    const search = await initSearch();
    await search.initialize();
    
    // 搜索（带仓感知）
    const searchResult = await searchWithVault(query, vault);
    
    // 获取索引统计
    const stats = getIndexStats(search);
    
    const elapsed = Date.now() - start;
    
    // 去重输出
    const seen = new Set();
    const uniqueMemories = (searchResult.results || []).filter(m => {
        const key = m.file + (m.text || '').substring(0, 40);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    
    const output = {
        success: true,
        query,
        vault: vault || '全部',
        total: uniqueMemories.length,
        segments: stats.segments,
        duration: elapsed,
        context: {
            memories: uniqueMemories.slice(0, 4).map(m => ({
                date: m.file ? m.file.replace('.md', '') : '未知',
                vault: m.vault || '未分类',
                score: Math.round(m.similarity * 100),
                text: (m.text || '').substring(0, 300)
            })),
            recent: getRecentNotes().slice(-2),
            index: {
                total: stats.segments,
                vaults: stats.vaults
            }
        },
        summary: uniqueMemories.length > 0 
            ? `[${vault || '全部'}] 找到 ${uniqueMemories.length} 条相关记忆`
            : `[${vault || '全部'}] 未找到直接相关记忆`
    };
    
    console.log(JSON.stringify(output, null, 2));
    console.error(`[记忆服务] 完成: ${elapsed}ms, ${uniqueMemories.length}条`);
}

main().catch(e => {
    console.log(JSON.stringify({
        success: false,
        error: e.message,
        stack: e.stack?.substring(0, 200)
    }));
});
