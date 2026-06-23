# MemFlow AI 快速开始指南

## ⚡ 5分钟上手

### 1. 安装
```bash
# 方式1: npm安装
npm install memflow-ai

# 方式2: 直接使用
npx memflow-ai init
```

### 2. 基本配置
```javascript
// config.js
module.exports = {
  // 情绪状态控制（解决偷懒）
  emotionControl: {
    enabled: true,
    defaultState: "深度分析",
    confidenceRequirement: 0.8
  },
  
  // Token监督（平衡使用）
  tokenSupervision: {
    enabled: true,
    simpleQuestion: 100,      // 简单问题token数
    mediumQuestion: 300,      // 中等问题token数
    complexQuestion: 800,     // 复杂问题token数
    criticalDecision: 2000    // 关键决策token数
  },
  
  // 适配器配置
  adapters: {
    openclaw: true,
    claudeCode: true,
    cursor: true,
    codex: true
  }
};
```

### 3. 核心使用示例

#### 示例1: 解决大模型偷懒
```javascript
const MemFlowAI = require('memflow-ai');

const memflow = new MemFlowAI();

// 情绪状态注入，强制深度推理
const enhancedPrompt = memflow.injectEmotionState(
  "分析这个代码的性能问题",
  "深度分析",  // 情绪状态
  0.9          // 自信度要求
);

// 使用增强后的prompt
const result = await aiModel.generate(enhancedPrompt);
```

#### 示例2: 智能token分配
```javascript
// 自动根据问题复杂度分配token
const question = "解释量子计算的基本原理";
const tokenBudget = memflow.allocateTokens(question);

console.log(`分配token数: ${tokenBudget}`);
// 输出: 分配token数: 800 (复杂问题)
```

#### 示例3: 多平台适配
```javascript
// 使用OpenClaw适配器
const openclawAdapter = memflow.getAdapter('openclaw');
await openclawAdapter.connect();

// 使用Claude Code适配器  
const claudeAdapter = memflow.getAdapter('claude-code');
await claudeAdapter.connect();

// 记忆在不同平台间同步
const memory = {
  content: "项目架构设计决策",
  platform: "universal"  // 通用记忆
};
await memflow.syncMemory(memory);
```

### 4. 高级功能

#### 记忆筛选和沉淀
```javascript
// 添加记忆
await memflow.addMemory({
  content: "使用React Hooks的最佳实践",
  tags: ["react", "最佳实践", "前端"],
  importance: 0.8,
  usageCount: 0
});

// 智能搜索（自动筛选重要记忆）
const memories = await memflow.search("React性能优化");
// 只返回相关且重要的记忆
```

#### 技能自动学习
```javascript
// 系统会自动学习常用技能
const commonSkills = await memflow.getLearnedSkills();
// 输出: ["代码审查", "性能分析", "架构设计", "错误调试"]
```

### 5. 命令行工具

```bash
# 初始化配置
memflow init

# 添加记忆
memflow add "重要会议记录：决定采用微服务架构"

# 搜索记忆
memflow search "微服务"

# 查看统计
memflow stats

# 导出数据
memflow export --format json
```

### 6. 集成到现有项目

#### Web应用集成
```javascript
// 前端集成
import { MemFlowClient } from 'memflow-ai/client';

const client = new MemFlowClient({
  endpoint: 'https://api.memflow.ai',
  apiKey: 'your-api-key'
});

// 实时记忆同步
client.onMemoryUpdate((memory) => {
  console.log('新记忆:', memory);
});
```

#### CI/CD集成
```yaml
# .github/workflows/memflow.yml
name: MemFlow AI Integration

on: [push, pull_request]

jobs:
  memflow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: memflow-ai/action@v1
        with:
          command: 'analyze'
          token: ${{ secrets.MEMFLOW_TOKEN }}
```

### 7. 故障排除

#### 常见问题
1. **安装失败**: 检查Node.js版本(>=16)
2. **连接错误**: 检查网络和API密钥
3. **性能问题**: 调整缓存配置
4. **记忆丢失**: 启用自动备份

#### 调试模式
```javascript
const memflow = new MemFlowAI({
  debug: true,  // 开启调试
  logLevel: 'verbose'
});
```

### 8. 下一步

- 查看完整API文档
- 探索高级配置选项
- 加入社区讨论
- 贡献代码或文档

---

**有问题？** 查看完整文档或提交Issue！ 🚀