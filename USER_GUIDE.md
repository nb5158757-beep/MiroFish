# MemFlow AI 记忆系统 用户使用指南

## 🎯 系统简介

MemFlow AI 是一个智能分层记忆系统，帮助您：
- 🧠 **智能管理记忆**：自动分析和分类记忆内容
- 🔍 **语义搜索**：基于内容含义搜索，不只是关键词
- 📊 **记忆分层**：根据重要性自动分层管理
- 🤖 **AI增强**：集成多种大模型提供智能分析

## 🚀 快速开始

### 1. 访问系统
```bash
# 方法1：浏览器访问（推荐）
打开浏览器，访问：http://localhost:3002

# 方法2：命令行测试
curl http://localhost:3002/health
# 应该返回：{"status":"healthy","name":"MemFlow AI 修复版本","port":3002}
```

### 2. 界面概览
打开浏览器后，您会看到：
- **顶部导航**：系统名称和状态
- **功能卡片**：各个核心功能模块
- **操作按钮**：测试和操作按钮
- **状态显示**：系统运行状态

## 📱 核心功能使用教程

### 功能1：智谱AI连接测试

#### 目的
测试系统与智谱AI大模型的连接状态

#### 使用方法
```bash
# 命令行方式
curl http://localhost:3002/api/v1/zhipu/test

# 浏览器方式
1. 点击界面上的"测试智谱AI连接"按钮
2. 查看返回结果：
   - ✅ 成功：显示"智谱AI连接测试成功"
   - ❌ 失败：显示错误信息
```

#### 预期结果
```json
{
  "success": true,
  "message": "智谱AI连接测试成功",
  "embedding_dimensions": 1024,
  "provider": "zhipu",
  "model": "embedding-2"
}
```

### 功能2：语义搜索

#### 目的
基于语义相似度搜索相关记忆

#### 使用方法
```bash
# 命令行方式
curl "http://localhost:3002/api/v1/zhipu/search?q=智能记忆系统"

# 浏览器方式
1. 在搜索框中输入查询词
2. 点击"语义搜索"按钮
3. 查看搜索结果列表
```

#### 示例查询
```bash
# 搜索智能相关记忆
curl "http://localhost:3002/api/v1/zhipu/search?q=人工智能"

# 搜索记忆管理相关
curl "http://localhost:3002/api/v1/zhipu/search?q=记忆管理"
```

#### 返回结果
```json
[
  {
    "id": 1,
    "content": "MemFlow AI是一个智能分层记忆系统",
    "similarity": 0.85,
    "memory_type": "short_term"
  }
]
```

### 功能3：记忆分层分析

#### 目的
智能分析记忆内容，建议分层策略

#### 使用方法
```bash
# 命令行方式
curl -X POST http://localhost:3002/api/v1/layer/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1001,
    "content": "需要记住的重要会议内容",
    "importance": 8,
    "memory_type": "short_term",
    "access_count": 3
  }'

# 浏览器方式
1. 在记忆分析区域填写记忆内容
2. 设置重要性等级（1-10）
3. 点击"分析记忆"按钮
4. 查看详细分析结果
```

#### 请求参数说明
```json
{
  "id": 1001,                    // 记忆ID（数字）
  "content": "记忆内容文本",      // 需要分析的记忆内容
  "importance": 7,               // 用户主观重要性（1-10）
  "memory_type": "short_term",   // 当前记忆类型
  "access_count": 5              // 访问次数（可选）
}
```

#### 返回结果解读
```json
{
  "success": true,
  "memory_id": 1001,
  "analysis": {
    "calculated_importance": 6,      // 系统计算的重要性
    "suggested_type": "medium_term", // 建议的记忆类型
    "should_migrate": true,          // 是否应该迁移到其他层
    "semantic_relevance": 0.75,      // 语义相关性得分
    "access_pattern": {              // 访问模式分析
      "pattern": "active",
      "access_per_day": "2.5"
    }
  }
}
```

### 功能4：批量记忆分析

#### 目的
一次性分析多个记忆

#### 使用方法
```bash
curl -X POST http://localhost:3002/api/v1/layer/analyze-batch \
  -H "Content-Type: application/json" \
  -d '{
    "memories": [
      {
        "id": 1001,
        "content": "第一个记忆",
        "importance": 7
      },
      {
        "id": 1002,
        "content": "第二个记忆", 
        "importance": 5
      }
    ]
  }'
```

### 功能5：性能监控

#### 目的
查看系统运行状态和性能指标

#### 使用方法
```bash
# 查看性能报告
curl http://localhost:3002/api/v1/performance/report

# 查看配置
curl http://localhost:3002/api/v1/performance/config
```

## 🎨 界面功能详解

### 主界面区域

#### 1. 系统状态区
- **状态指示灯**：绿色表示系统健康
- **版本信息**：显示当前系统版本（v1.1.0）
- **运行时间**：系统启动时间

#### 2. 智谱AI测试区
- **测试按钮**：点击测试连接
- **状态显示**：连接成功/失败
- **详细信息**：模型信息、嵌入维度

#### 3. 语义搜索区
- **搜索框**：输入查询内容
- **搜索按钮**：执行语义搜索
- **结果列表**：显示相似记忆

#### 4. 记忆分析区
- **内容输入**：输入记忆文本
- **重要性滑块**：设置重要性等级
- **分析按钮**：执行智能分析
- **分析结果**：详细的分层建议

#### 5. 批量操作区
- **批量输入**：可以输入多个记忆
- **批量分析**：一次性分析所有记忆
- **导出结果**：导出分析报告

## 🔧 高级功能

### 1. API文档访问
```
http://localhost:3002/api/v1
```

### 2. 健康检查端点
```
GET /health
```

### 3. 大模型状态检查
```
GET /api/v1/zhipu/status
```

### 4. 记忆分层服务状态
```
GET /api/v1/layer/status
```

## 💡 使用技巧

### 技巧1：有效使用语义搜索
- **使用完整句子**：不要只用关键词，用完整描述
- **描述场景**：描述记忆的使用场景
- **关联搜索**：搜索相关概念，系统会自动发现关联

### 技巧2：优化记忆分析
- **重要性设置**：根据实际重要性设置，系统会智能调整
- **内容详细**：提供详细内容，分析更准确
- **定期分析**：定期重新分析重要记忆

### 技巧3：批量处理技巧
- **分类处理**：相似类型的记忆一起分析
- **优先级排序**：重要的记忆先分析
- **结果对比**：对比不同记忆的分析结果

## 🚨 故障排除

### 问题1：无法访问系统
```bash
# 检查服务器是否运行
curl http://localhost:3002/health

# 如果失败，重启服务器
cd /path/to/workspace/memflow-ai
pkill -f "node.*server-fixed"
node server-fixed.js
```

### 问题2：智谱AI连接失败
```bash
# 检查API密钥配置
cat src/config/zhipu-config.js

# 测试网络连接
curl https://open.bigmodel.cn/api/paas/v4
```

### 问题3：搜索无结果
- **检查查询内容**：确保有相关记忆
- **调整查询方式**：尝试不同的描述方式
- **检查记忆数据**：确保系统中有记忆数据

### 问题4：分析结果不准确
- **提供更多上下文**：在记忆内容中添加更多信息
- **调整重要性设置**：根据实际情况调整
- **多次分析对比**：多次分析查看趋势

## 📊 实际使用案例

### 案例1：项目管理记忆
```bash
# 分析项目会议记忆
curl -X POST http://localhost:3002/api/v1/layer/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "id": 2001,
    "content": "2026年3月23日项目会议，决定采用可插拔架构，支持4种大模型，需要优先开发智能分类功能",
    "importance": 9,
    "memory_type": "short_term"
  }'
```

### 案例2：学习笔记管理
```bash
# 分析技术学习笔记
curl -X POST http://localhost:3002/api/v1/layer/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "id": 3001,
    "content": "Node.js Express框架中间件使用技巧：错误处理、路由分组、静态文件服务",
    "importance": 6,
    "memory_type": "medium_term"
  }'
```

### 案例3：搜索相关技术资料
```bash
# 搜索AI相关记忆
curl "http://localhost:3002/api/v1/zhipu/search?q=人工智能大模型应用"

# 搜索系统架构相关
curl "http://localhost:3002/api/v1/zhipu/search?q=可插拔架构设计"
```

## 🔄 系统升级使用

### 查看当前版本
```bash
curl http://localhost:3002/health | jq '.name'
```

### 使用升级工作流
```bash
cd /path/to/workspace/memflow-ai

# 查看系统状态
node scripts/upgrade-workflow.js status

# 创建备份
node scripts/upgrade-workflow.js backup my-backup

# 验证功能
node scripts/upgrade-workflow.js validate
```

### 查看升级计划
```bash
cat SYSTEM_UPGRADE_PLAN.md
```

## 🎯 最佳实践

### 日常使用流程
1. **早上检查**：测试系统连接状态
2. **添加记忆**：记录重要事项和决策
3. **定期分析**：分析记忆的分层情况
4. **搜索回顾**：搜索相关记忆进行回顾
5. **周末整理**：批量分析一周的记忆

### 记忆管理策略
- **短期记忆**：日常事务、临时信息
- **中期记忆**：项目资料、学习笔记  
- **长期记忆**：重要决策、核心知识
- **归档记忆**：历史记录、参考资料

### 搜索策略
- **精确搜索**：使用具体描述
- **关联搜索**：搜索相关概念
- **时间搜索**：结合时间范围
- **重要性过滤**：按重要性筛选

## 📱 移动端使用

### 响应式设计
系统已优化移动端体验：
- **触摸友好**：按钮大小适合手指操作
- **响应式布局**：自动适应屏幕尺寸
- **简化操作**：移动端简化复杂操作

### 移动端访问
```
在手机浏览器访问：
http://<你的IP地址>:3002
```

## 🔐 安全注意事项

### API使用安全
- **不要公开API端点**：避免未授权访问
- **定期更换密钥**：定期更新API密钥
- **监控使用情况**：关注异常访问模式

### 数据安全
- **定期备份**：使用升级工作流创建备份
- **敏感信息**：不要在记忆内容中包含密码等敏感信息
- **访问控制**：确保只有授权用户访问

## 📞 技术支持

### 获取帮助
1. **查看日志**：服务器控制台输出
2. **测试连接**：使用健康检查端点
3. **检查配置**：查看配置文件
4. **联系开发**：记录问题并反馈

### 问题报告格式
```bash
# 报告问题时提供：
1. 问题描述
2. 复现步骤
3. 错误信息
4. 系统状态
5. 期望结果
```

## 🚀 下一步学习

### 深入学习
1. **阅读源码**：了解系统实现原理
2. **API探索**：尝试所有API端点
3. **定制开发**：根据需求定制功能
4. **集成应用**：将系统集成到其他应用

### 技能提升
- **记忆科学**：学习记忆原理和技巧
- **AI应用**：了解大模型在记忆管理中的应用
- **系统设计**：学习可插拔架构设计
- **用户体验**：优化交互设计

---

**指南版本**: v1.0  
**更新时间**: 2026-03-23  
**适用版本**: MemFlow AI v1.1.0+  
**维护人**: ocolor助手