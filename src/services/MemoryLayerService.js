/**
 * 记忆分层服务
 * 实现智能记忆分层算法
 */

const {
    MemoryLayerConfig,
    getMemoryTypeByAge,
    calculateImportanceScore,
    shouldUpgradeMemory
} = require('../config/memory-layer-config');

// 使用新的可插拔大模型服务
const llmService = require('./LLMService');

class MemoryLayerService {
    constructor() {
        this.config = MemoryLayerConfig;
        this.llmService = llmService;
        
        // 缓存
        this.semanticCache = new Map();
        this.importanceCache = new Map();
        
        // 统计
        this.stats = {
            total_processed: 0,
            upgrades: 0,
            downgrades: 0,
            last_processed: null
        };
        
        this.initialized = false;
    }
    
    /**
     * 初始化服务
     * @returns {boolean} 初始化是否成功
     */
    initialize() {
        try {
            console.log('🧠 记忆分层服务初始化...');
            
            // 检查依赖服务
            if (!this.llmService || !this.llmService.initialized) {
                console.warn('⚠️ 大模型服务未初始化，部分功能可能受限');
            }
            
            this.initialized = true;
            console.log('✅ 记忆分层服务初始化成功');
            return true;
        } catch (error) {
            console.error('❌ 记忆分层服务初始化失败:', error.message);
            this.initialized = false;
            return false;
        }
        
        console.log('✅ 记忆分层服务初始化完成');
    }
    
    /**
     * 分析单个记忆
     */
    async analyzeMemory(memory, options = {}) {
        const {
            calculateSemantic = true,
            updateImportance = true,
            suggestLayer = true
        } = options;
        
        const analysis = {
            memory_id: memory.id,
            original_type: memory.memory_type,
            original_importance: memory.importance,
            analysis_time: new Date().toISOString()
        };
        
        try {
            // 1. 计算记忆年龄
            const createdDate = new Date(memory.created_at);
            const now = new Date();
            const ageInDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
            analysis.age_days = ageInDays;
            
            // 2. 基于时间的分层建议
            const timeBasedType = getMemoryTypeByAge(ageInDays);
            analysis.time_based_type = timeBasedType;
            
            // 3. 计算重要性评分
            if (updateImportance) {
                let semanticRelevance = null;
                
                // 如果需要语义分析
                if (calculateSemantic && this.config.importanceRules.weights.semantic_relevance > 0) {
                    try {
                        semanticRelevance = await this.calculateSemanticRelevance(memory);
                        analysis.semantic_relevance = semanticRelevance;
                    } catch (error) {
                        console.warn(`⚠️ 记忆 ${memory.id} 语义分析失败:`, error.message);
                    }
                }
                
                const importanceScore = calculateImportanceScore(memory, {
                    semanticRelevance: semanticRelevance
                });
                
                analysis.calculated_importance = importanceScore;
                analysis.importance_change = importanceScore - (memory.importance || 5);
                
                // 缓存重要性评分
                this.importanceCache.set(memory.id, {
                    score: importanceScore,
                    timestamp: Date.now()
                });
            }
            
            // 4. 分层建议
            if (suggestLayer) {
                const suggestedType = await this.suggestMemoryLayer(memory, analysis);
                analysis.suggested_type = suggestedType;
                analysis.should_migrate = suggestedType !== memory.memory_type;
                
                if (analysis.should_migrate) {
                    analysis.migration_direction = this.getMigrationDirection(
                        memory.memory_type, 
                        suggestedType
                    );
                }
            }
            
            // 5. 相关记忆分析
            if (calculateSemantic) {
                const relatedMemories = await this.findRelatedMemories(memory);
                analysis.related_memories_count = relatedMemories.length;
                analysis.semantic_cluster_size = relatedMemories.length;
            }
            
            // 6. 访问模式分析
            analysis.access_pattern = this.analyzeAccessPattern(memory);
            
            // 7. 清理建议
            analysis.cleanup_suggestion = this.getCleanupSuggestion(memory, analysis);
            
            analysis.success = true;
            
        } catch (error) {
            console.error(`❌ 记忆 ${memory.id} 分析失败:`, error);
            analysis.success = false;
            analysis.error = error.message;
        }
        
        // 更新统计
        this.stats.total_processed++;
        this.stats.last_processed = new Date().toISOString();
        
        return analysis;
    }
    
    /**
     * 批量分析记忆
     */
    async analyzeMemoriesBatch(memories, options = {}) {
        const {
            batchSize = this.config.performance.max_concurrent,
            progressCallback = null
        } = options;
        
        console.log(`🔍 开始批量分析 ${memories.length} 条记忆`);
        
        const results = [];
        const batches = [];
        
        // 分批
        for (let i = 0; i < memories.length; i += batchSize) {
            batches.push(memories.slice(i, i + batchSize));
        }
        
        // 处理每个批次
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            console.log(`🔄 处理批次 ${batchIndex + 1}/${batches.length}`);
            
            // 并行处理批次内的记忆
            const batchPromises = batch.map(async (memory, index) => {
                if (progressCallback) {
                    const overallIndex = batchIndex * batchSize + index;
                    progressCallback(overallIndex, memories.length);
                }
                
                try {
                    const analysis = await this.analyzeMemory(memory, options);
                    return analysis;
                } catch (error) {
                    console.error(`❌ 记忆 ${memory.id} 分析失败:`, error.message);
                    return {
                        memory_id: memory.id,
                        success: false,
                        error: error.message
                    };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // 批次间延迟
            if (batchIndex < batches.length - 1) {
                await this.delay(1000);
            }
        }
        
        console.log(`✅ 批量分析完成，成功: ${results.filter(r => r.success).length}, 失败: ${results.filter(r => !r.success).length}`);
        
        return {
            total: memories.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            analyses: results,
            stats: this.getStats()
        };
    }
    
    /**
     * 计算语义相关性
     */
    async calculateSemanticRelevance(memory) {
        const cacheKey = `relevance_${memory.id}`;
        
        // 检查缓存
        if (this.config.performance.cache_enabled) {
            const cached = this.semanticCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.config.performance.cache_ttl * 1000) {
                return cached.relevance;
            }
        }
        
        try {
            // 这里可以集成智谱AI进行更精确的语义分析
            // 暂时返回一个基于内容的简单评分
            const content = memory.content || '';
            const lengthScore = Math.min(content.length / 1000, 1);
            const keywordScore = this.extractKeywords(content).length / 10;
            
            const relevance = (lengthScore * 0.6 + keywordScore * 0.4);
            
            // 缓存结果
            if (this.config.performance.cache_enabled) {
                this.semanticCache.set(cacheKey, {
                    relevance: relevance,
                    timestamp: Date.now()
                });
            }
            
            return relevance;
            
        } catch (error) {
            console.warn(`⚠️ 语义相关性计算失败:`, error.message);
            return 0.5; // 默认值
        }
    }
    
    /**
     * 建议记忆分层
     */
    async suggestMemoryLayer(memory, analysis = null) {
        if (!analysis) {
            analysis = await this.analyzeMemory(memory, {
                calculateSemantic: false,
                updateImportance: true,
                suggestLayer: false
            });
        }
        
        const ageInDays = analysis.age_days;
        const importance = analysis.calculated_importance || memory.importance || 5;
        const accessCount = memory.access_count || 0;
        
        // 基于时间的初始分层
        let suggestedType = getMemoryTypeByAge(ageInDays);
        
        // 基于重要性调整
        if (importance >= this.config.importanceRules.thresholds.high_importance) {
            // 高重要性记忆，考虑升级
            if (suggestedType === this.config.memoryTypes.SHORT_TERM &&
                shouldUpgradeMemory(memory, suggestedType, this.config.memoryTypes.MEDIUM_TERM)) {
                suggestedType = this.config.memoryTypes.MEDIUM_TERM;
            } else if (suggestedType === this.config.memoryTypes.MEDIUM_TERM &&
                       shouldUpgradeMemory(memory, suggestedType, this.config.memoryTypes.LONG_TERM)) {
                suggestedType = this.config.memoryTypes.LONG_TERM;
            }
        } else if (importance <= this.config.importanceRules.thresholds.low_importance) {
            // 低重要性记忆，考虑降级
            if (suggestedType === this.config.memoryTypes.LONG_TERM &&
                ageInDays > this.config.autoMigration.downgradeRules.long_to_medium.max_recency_days) {
                suggestedType = this.config.memoryTypes.MEDIUM_TERM;
            } else if (suggestedType === this.config.memoryTypes.MEDIUM_TERM &&
                       accessCount <= this.config.autoMigration.downgradeRules.medium_to_short.max_access_count) {
                suggestedType = this.config.memoryTypes.SHORT_TERM;
            }
        }
        
        return suggestedType;
    }
    
    /**
     * 查找相关记忆
     */
    async findRelatedMemories(memory, limit = this.config.semanticConfig.max_related_memories) {
        // 这里可以集成智谱AI进行语义相似度计算
        // 暂时返回空数组
        return [];
    }
    
    /**
     * 分析访问模式
     */
    analyzeAccessPattern(memory) {
        const accessCount = memory.access_count || 0;
        const createdDate = new Date(memory.created_at);
        const now = new Date();
        const ageInDays = Math.max(1, Math.floor((now - createdDate) / (1000 * 60 * 60 * 24)));
        
        const accessPerDay = accessCount / ageInDays;
        
        let pattern = 'inactive';
        if (accessPerDay > 0.5) pattern = 'active';
        if (accessPerDay > 2) pattern = 'very_active';
        if (accessCount === 0) pattern = 'never_accessed';
        
        return {
            pattern: pattern,
            access_per_day: accessPerDay.toFixed(2),
            total_access: accessCount,
            age_days: ageInDays
        };
    }
    
    /**
     * 获取清理建议
     */
    getCleanupSuggestion(memory, analysis) {
        const ageInDays = analysis.age_days;
        const importance = analysis.calculated_importance || memory.importance || 5;
        const currentType = memory.memory_type;
        
        let suggestion = 'keep';
        let reason = '';
        
        // 短期记忆清理规则
        if (currentType === this.config.memoryTypes.SHORT_TERM) {
            if (ageInDays > this.config.cleanupRules.short_term.max_age_days &&
                importance < this.config.cleanupRules.short_term.min_importance) {
                suggestion = 'cleanup';
                reason = '短期记忆超期且重要性低';
            }
        }
        
        // 中期记忆归档建议
        if (currentType === this.config.memoryTypes.MEDIUM_TERM) {
            if (importance >= 8 && ageInDays > 15) {
                suggestion = 'archive_to_long';
                reason = '高重要性中期记忆建议归档到长期';
            } else if (importance <= 3 && ageInDays > 30) {
                suggestion = 'review_for_cleanup';
                reason = '低重要性中期记忆建议审查清理';
            }
        }
        
        return {
            action: suggestion,
            reason: reason,
            priority: this.getCleanupPriority(suggestion)
        };
    }
    
    /**
     * 获取清理优先级
     */
    getCleanupPriority(suggestion) {
        const priorities = {
            'cleanup': 'high',
            'review_for_cleanup': 'medium',
            'archive_to_long': 'low',
            'keep': 'none'
        };
        
        return priorities[suggestion] || 'none';
    }
    
    /**
     * 获取迁移方向
     */
    getMigrationDirection(fromType, toType) {
        const types = this.config.memoryTypes;
        
        if (fromType === types.SHORT_TERM && toType === types.MEDIUM_TERM) {
            return 'upgrade';
        } else if (fromType === types.MEDIUM_TERM && toType === types.LONG_TERM) {
            return 'upgrade';
        } else if (fromType === types.LONG_TERM && toType === types.MEDIUM_TERM) {
            return 'downgrade';
        } else if (fromType === types.MEDIUM_TERM && toType === types.SHORT_TERM) {
            return 'downgrade';
        } else {
            return 'same';
        }
    }
    
    /**
     * 提取关键词
     */
    extractKeywords(text) {
        if (!text) return [];
        
        // 简单的中文关键词提取
        const words = text.split(/[\s,，。.!?？;；:：'"“”()（）【】《》]+/);
        const keywords = words.filter(word => 
            word.length >= 2 && 
            !this.isStopWord(word)
        );
        
        return [...new Set(keywords)]; // 去重
    }
    
    /**
     * 判断停用词
     */
    isStopWord(word) {
        const stopWords = ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'];
        return stopWords.includes(word);
    }
    
    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            cache_sizes: {
                semantic: this.semanticCache.size,
                importance: this.importanceCache.size
            },
            config: {
                features_enabled: this.config.learningConfig.adaptive_weights,
                cache_enabled: this.config.performance.cache_enabled
            }
        };
    }
    
    /**
     * 重置统计
     */
    resetStats() {
        this.stats = {
            total_processed: 0,
            upgrades: 0,
            downgrades: 0,
            last_processed: null
        };
    }
    
    /**
     * 清理缓存
     */
    clearCache() {
        this.semanticCache.clear();
        this.importanceCache.clear();
        console.log('✅ 记忆分层缓存已清理');
    }
}

// 导出单例实例
module.exports = new MemoryLayerService();