/**
 * 记忆分层算法配置
 * 定义智能记忆分层规则和参数
 */

const MemoryLayerConfig = {
    // 记忆类型定义
    memoryTypes: {
        SHORT_TERM: 'short_term',      // 短期记忆 (0-7天)
        MEDIUM_TERM: 'medium_term',    // 中期记忆 (7-30天)
        LONG_TERM: 'long_term'         // 长期记忆 (30天以上)
    },
    
    // 时间分层规则 (单位: 天)
    timeLayers: {
        short_term: {
            min_days: 0,
            max_days: 7,
            description: '短期记忆，近期内容'
        },
        medium_term: {
            min_days: 7,
            max_days: 30,
            description: '中期记忆，过渡内容'
        },
        long_term: {
            min_days: 30,
            max_days: 365 * 10, // 10年
            description: '长期记忆，重要内容'
        }
    },
    
    // 重要性评分规则 (1-10分)
    importanceRules: {
        weights: {
            access_frequency: 0.3,     // 访问频率权重
            recency: 0.25,             // 新鲜度权重
            semantic_relevance: 0.2,   // 语义相关性权重
            user_rating: 0.15,         // 用户评分权重
            content_length: 0.1        // 内容长度权重
        },
        
        thresholds: {
            high_importance: 7,        // 高重要性阈值
            medium_importance: 4,      // 中重要性阈值
            low_importance: 1          // 低重要性阈值
        },
        
        // 访问频率评分
        accessFrequency: {
            never: 1,                  // 从未访问
            rare: 3,                   // 很少访问 (1-2次)
            occasional: 5,             // 偶尔访问 (3-5次)
            frequent: 7,               // 经常访问 (6-10次)
            very_frequent: 9           // 非常频繁 (>10次)
        },
        
        // 新鲜度评分 (距离上次访问的天数)
        recency: {
            today: 10,                 // 今天
            this_week: 8,              // 本周
            this_month: 6,             // 本月
            last_3_months: 4,          // 近3个月
            last_year: 2,              // 近1年
            older: 1                   // 更早
        }
    },
    
    // 语义相关性配置
    semanticConfig: {
        similarity_threshold: 0.7,     // 相似度阈值
        cluster_size: 5,               // 聚类大小
        max_related_memories: 10       // 最大相关记忆数
    },
    
    // 自动迁移规则
    autoMigration: {
        enabled: true,
        schedule: 'daily',             // 每日执行
        batch_size: 50,                // 每次处理数量
        
        // 升级规则 (满足条件可升级到更高层级)
        upgradeRules: {
            short_to_medium: {
                min_importance: 6,
                min_access_count: 3,
                min_age_days: 3
            },
            medium_to_long: {
                min_importance: 8,
                min_access_count: 5,
                min_age_days: 15,
                semantic_cluster_size: 3
            }
        },
        
        // 降级规则 (满足条件可能降级)
        downgradeRules: {
            long_to_medium: {
                max_importance: 3,
                max_access_count: 1,
                max_recency_days: 90
            },
            medium_to_short: {
                max_importance: 2,
                max_access_count: 0,
                max_recency_days: 30
            }
        }
    },
    
    // 清理规则
    cleanupRules: {
        enabled: true,
        // 短期记忆清理 (低重要性且长时间未访问)
        short_term: {
            max_age_days: 14,          // 最大保留14天
            min_importance: 2,         // 低于此重要性可能被清理
            min_access_count: 0        // 访问次数要求
        },
        // 中期记忆归档 (转移到长期或清理)
        medium_term: {
            review_interval_days: 30,  // 每30天审查一次
            archive_threshold: 0.6,    // 归档阈值
            cleanup_threshold: 0.2     // 清理阈值
        }
    },
    
    // 学习算法配置
    learningConfig: {
        // 基于用户行为的自适应调整
        adaptive_weights: true,
        learning_rate: 0.1,
        
        // 模式识别
        pattern_recognition: {
            enabled: true,
            min_pattern_length: 3,
            confidence_threshold: 0.8
        },
        
        // 预测模型
        prediction: {
            enabled: true,
            lookback_days: 7,
            forecast_days: 3
        }
    },
    
    // 性能优化
    performance: {
        cache_enabled: true,
        cache_ttl: 3600,               // 缓存1小时
        batch_processing: true,
        max_concurrent: 5              // 最大并发数
    },
    
    // 监控和日志
    monitoring: {
        log_level: 'info',
        metrics_enabled: true,
        alert_thresholds: {
            error_rate: 0.05,          // 错误率阈值
            processing_time: 5000,     // 处理时间阈值(ms)
            memory_usage: 0.8          // 内存使用率阈值
        }
    }
};

// 辅助函数
function getMemoryTypeByAge(ageInDays) {
    if (ageInDays <= MemoryLayerConfig.timeLayers.short_term.max_days) {
        return MemoryLayerConfig.memoryTypes.SHORT_TERM;
    } else if (ageInDays <= MemoryLayerConfig.timeLayers.medium_term.max_days) {
        return MemoryLayerConfig.memoryTypes.MEDIUM_TERM;
    } else {
        return MemoryLayerConfig.memoryTypes.LONG_TERM;
    }
}

function calculateImportanceScore(memory, context = {}) {
    let score = 0;
    const weights = MemoryLayerConfig.importanceRules.weights;
    
    // 1. 访问频率评分
    const accessCount = memory.access_count || 0;
    let accessScore = 1;
    if (accessCount === 0) accessScore = MemoryLayerConfig.importanceRules.accessFrequency.never;
    else if (accessCount <= 2) accessScore = MemoryLayerConfig.importanceRules.accessFrequency.rare;
    else if (accessCount <= 5) accessScore = MemoryLayerConfig.importanceRules.accessFrequency.occasional;
    else if (accessCount <= 10) accessScore = MemoryLayerConfig.importanceRules.accessFrequency.frequent;
    else accessScore = MemoryLayerConfig.importanceRules.accessFrequency.very_frequent;
    
    score += accessScore * weights.access_frequency;
    
    // 2. 新鲜度评分
    const lastAccessed = new Date(memory.last_accessed_at || memory.created_at);
    const now = new Date();
    const daysSinceAccess = Math.floor((now - lastAccessed) / (1000 * 60 * 60 * 24));
    
    let recencyScore = MemoryLayerConfig.importanceRules.recency.older;
    if (daysSinceAccess === 0) recencyScore = MemoryLayerConfig.importanceRules.recency.today;
    else if (daysSinceAccess <= 7) recencyScore = MemoryLayerConfig.importanceRules.recency.this_week;
    else if (daysSinceAccess <= 30) recencyScore = MemoryLayerConfig.importanceRules.recency.this_month;
    else if (daysSinceAccess <= 90) recencyScore = MemoryLayerConfig.importanceRules.recency.last_3_months;
    else if (daysSinceAccess <= 365) recencyScore = MemoryLayerConfig.importanceRules.recency.last_year;
    
    score += recencyScore * weights.recency;
    
    // 3. 用户评分 (如果有)
    const userRating = memory.user_rating || memory.importance || 5;
    score += (userRating / 10) * 10 * weights.user_rating;
    
    // 4. 内容长度评分
    const contentLength = memory.content ? memory.content.length : 0;
    const lengthScore = Math.min(contentLength / 1000, 1) * 10; // 每1000字符得1分，最多10分
    score += lengthScore * weights.content_length;
    
    // 5. 语义相关性评分 (如果有上下文)
    if (context.semanticRelevance) {
        score += context.semanticRelevance * 10 * weights.semantic_relevance;
    }
    
    // 归一化到1-10分
    return Math.min(Math.max(Math.round(score), 1), 10);
}

function shouldUpgradeMemory(memory, currentType, targetType) {
    const rules = MemoryLayerConfig.autoMigration.upgradeRules;
    
    if (currentType === MemoryLayerConfig.memoryTypes.SHORT_TERM && 
        targetType === MemoryLayerConfig.memoryTypes.MEDIUM_TERM) {
        
        const ageInDays = Math.floor((new Date() - new Date(memory.created_at)) / (1000 * 60 * 60 * 24));
        const importance = memory.calculated_importance || memory.importance || 5;
        const accessCount = memory.access_count || 0;
        
        return importance >= rules.short_to_medium.min_importance &&
               accessCount >= rules.short_to_medium.min_access_count &&
               ageInDays >= rules.short_to_medium.min_age_days;
    }
    
    if (currentType === MemoryLayerConfig.memoryTypes.MEDIUM_TERM && 
        targetType === MemoryLayerConfig.memoryTypes.LONG_TERM) {
        
        const ageInDays = Math.floor((new Date() - new Date(memory.created_at)) / (1000 * 60 * 60 * 24));
        const importance = memory.calculated_importance || memory.importance || 5;
        const accessCount = memory.access_count || 0;
        
        return importance >= rules.medium_to_long.min_importance &&
               accessCount >= rules.medium_to_long.min_access_count &&
               ageInDays >= rules.medium_to_long.min_age_days;
    }
    
    return false;
}

module.exports = {
    MemoryLayerConfig,
    getMemoryTypeByAge,
    calculateImportanceScore,
    shouldUpgradeMemory
};