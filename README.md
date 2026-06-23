# MemFlow AI - 智能记忆筛选和沉淀平台

## 🎯 一句话介绍
解决大模型偷懒问题，节省95%+ token，适配所有AI智能体。

## ✨ 核心功能
- **情绪状态控制**：解决大模型偷懒根源（基于Anthropic研究）
- **智能token分配**：平衡效率与质量，动态调整推理深度
- **通用适配架构**：支持OpenClaw、Claude Code、Cursor、Codex等所有智能体
- **记忆筛选优化**：超越Claude-Mem，解决"不在存而在筛"的难点
- **技能沉淀系统**：越用越聪明，自动学习和复用

## 🚀 快速开始

### 安装
```bash
npm install memflow-ai
# 或
npx memflow-ai init
```

### 基本使用
```javascript
const MemFlowAI = require('memflow-ai');

// 初始化
const memflow = new MemFlowAI({
  emotionControl: true,    // 开启情绪状态控制
  tokenSupervision: true,  // 开启token监督
  adapter: 'universal'     // 使用通用适配器
});

// 添加记忆
await memflow.addMemory({
  content: "项目重要决策",
  tags: ["决策", "重要"],
  emotionState: "深度分析"
});

// 智能搜索
const results = await memflow.search("如何解决大模型偷懒？");
```

## 🔧 适配所有AI智能体

### OpenClaw
```javascript
const adapter = memflow.getAdapter('openclaw');
```

### Claude Code
```javascript
const adapter = memflow.getAdapter('claude-code');
```

### Cursor / Codex
```javascript
const adapter = memflow.getAdapter('cursor');
```

## 📊 性能指标
- **Token节省率**: >95%（匹配Claude-Mem）
- **响应时间**: <50ms
- **缓存命中率**: >80%
- **筛选准确率**: >95%

## 🎯 解决的核心问题

### 1. 大模型偷懒问题
通过情绪状态注入，强制模型进入深度推理模式。

### 2. Token浪费问题
智能分配token，简单问题少token，复杂问题多token。

### 3. 平台碎片化问题
通用适配器，一套代码适配所有AI智能体。

### 4. 记忆筛选难题
智能算法筛选重要记忆，解决"不在存而在筛"。

## 💡 项目架构

```
memflow-ai/
├── src/              # 核心代码（记忆搜索、矛盾检测、实体关联）
├── config/           # 配置文件
├── scripts/          # 辅助脚本
├── schema/           # MemFlow Wiki 配置框架（Karpathy LLM Wiki 模式）
│   ├── SCHEMA.md     # 统一操作手册 - 任何LLM看了就知道怎么维护记忆系统
│   ├── INDEX.md      # 全局文件索引 - 快速定位知识
│   └── changelog.md  # 统一操作日志 - 可回溯
├── docs/             # 文档
└── memory/           # 示例记忆文件
```

## 🧬 与 Karpathy LLM Wiki 的对比

| 特性 | Karpathy LLM Wiki | MemFlow AI |
|------|-------------------|------------|
| 核心思想 | 增量构建持久化wiki | ✅ 一致 — 编译真相+时间线 |
| Schema文件 | CLAUDE.md（概念性） | ✅ SCHEMA.md（可执行操作手册） |
| 文件索引 | index.md | ✅ INDEX.md + RESOLVER.md 双索引 |
| 操作日志 | log.md | ✅ changelog.md 标准格式 |
| 矛盾检测 | 手动lint | ✅ 自动 contradiction-detector.js |
| 实体关联 | 手动维护 | ✅ 自动 entity-linker.js |
| 日常整合 | 无 | ✅ Dream Cycle 6步自动执行 |
| 编译真相刷新 | 无 | ✅ truth-refresher.js 自动刷新 |

## 📈 路线图
- **v0.9.0-beta** (2026-04-15): 核心功能发布
- **v1.0.0** (2026-04-30): 性能优化 + 多语言支持
- **v1.1.0** (2026-05-15): 浏览器插件 + 离线模式
- **v2.0.0** (2026-06): 集成Karpathy LLM Wiki模式 + Dream Cycle 自动化运维

## 🤝 贡献
欢迎贡献代码、文档、示例！

## 📄 许可证
MIT License

## 💬 联系我们
- GitHub Issues: 问题反馈
- Email: 技术支持
- Twitter: 最新动态

---

**MemFlow AI - 让AI记忆更智能，让开发更高效** 🚀