/**
 * 性能优化配置
 * 用于调整系统性能和资源使用
 */

const PerformanceConfig = {
    // 缓存配置
    cache: {
        // 智谱AI嵌入缓存
        zhipuEmbeddings: {
            enabled: true,
            ttl: 3600,              // 1小时
            maxSize: 1000,          // 最大缓存条目
            cleanupInterval: 300    // 每5分钟清理一次过期缓存
        },
        
        // 记忆分析结果缓存
        memoryAnalysis: {
            enabled: true,
            ttl: 1800,              // 30分钟
            maxSize: 500,
            cleanupInterval: 600
        },
        
        // 语义搜索结果缓存
        semanticSearch: {
            enabled: true,
            ttl: 900,               // 15分钟
            maxSize: 200,
            cleanupInterval: 300
        }
    },
    
    // 请求限制
    rateLimiting: {
        // 智谱AI API限制
        zhipuAPI: {
            requestsPerMinute: 60,  // 每分钟60次请求
            burstLimit: 10,         // 突发请求限制
            queueSize: 100          // 队列大小
        },
        
        // 记忆分析限制
        memoryAnalysis: {
            concurrentRequests: 5,  // 并发请求数
            batchSize: 10,          // 批量处理大小
            timeout: 30000          // 30秒超时
        }
    },
    
    // 批处理配置
    batchProcessing: {
        enabled: true,
        defaultBatchSize: 10,
        maxBatchSize: 50,
        delayBetweenBatches: 100,   // 批次间延迟(ms)
        retryAttempts: 3,
        retryDelay: 1000
    },
    
    // 内存管理
    memoryManagement: {
        // 最大内存使用限制
        maxHeapSize: 1024,          // 最大堆内存(MB)
        warningThreshold: 0.8,      // 内存警告阈值(80%)
        
        // 垃圾回收优化
        gcOptimization: {
            enabled: true,
            interval: 30000,        // 每30秒检查一次
            forceGCThreshold: 0.9   // 强制GC阈值
        },
        
        // 对象池
        objectPool: {
            enabled: true,
            poolSizes: {
                memoryObjects: 100,
                analysisResults: 50,
                searchResults: 20
            }
        }
    },
    
    // 数据库优化
    database: {
        // 连接池
        connectionPool: {
            enabled: true,
            maxConnections: 10,
            minConnections: 2,
            acquireTimeout: 30000,
            idleTimeout: 60000
        },
        
        // 查询优化
        queryOptimization: {
            enabled: true,
            maxQueryTime: 5000,     // 最大查询时间(ms)
            slowQueryThreshold: 1000,
            queryCache: true,
            cacheSize: 1000
        },
        
        // 索引优化
        indexing: {
            enabled: true,
            autoIndex: true,
            indexRebuildInterval: 3600000 // 每小时重建索引
        }
    },
    
    // 网络优化
    network: {
        // 连接池
        connectionPool: {
            enabled: true,
            maxSockets: 50,
            maxFreeSockets: 10,
            timeout: 30000
        },
        
        // 压缩
        compression: {
            enabled: true,
            threshold: 1024,        // 1KB以上启用压缩
            level: 6                // 压缩级别(1-9)
        },
        
        // 超时设置
        timeouts: {
            connect: 10000,         // 连接超时
            read: 30000,            // 读取超时
            write: 30000            // 写入超时
        }
    },
    
    // 日志和监控
    monitoring: {
        // 性能监控
        performance: {
            enabled: true,
            samplingRate: 0.1,      // 10%的请求采样
            metrics: ['responseTime', 'memoryUsage', 'cpuUsage', 'requestCount'],
            alertThresholds: {
                responseTime: 5000,     // 5秒
                errorRate: 0.05,        // 5%
                memoryUsage: 0.9        // 90%
            }
        },
        
        // 日志配置
        logging: {
            level: 'info',
            maxFileSize: 10485760,  // 10MB
            maxFiles: 10,
            compress: true
        },
        
        // 健康检查
        healthChecks: {
            enabled: true,
            interval: 30000,        // 每30秒
            timeout: 5000,
            checks: ['memory', 'cpu', 'disk', 'database', 'externalApis']
        }
    },
    
    // 自适应调整
    adaptive: {
        enabled: true,
        
        // 基于负载的调整
        loadBased: {
            enabled: true,
            checkInterval: 60000,   // 每1分钟检查一次
            adjustments: {
                lowLoad: {
                    cacheTTL: 7200,     // 2小时
                    batchSize: 20,
                    concurrentRequests: 10
                },
                normalLoad: {
                    cacheTTL: 3600,     // 1小时
                    batchSize: 10,
                    concurrentRequests: 5
                },
                highLoad: {
                    cacheTTL: 1800,     // 30分钟
                    batchSize: 5,
                    concurrentRequests: 3,
                    compressionLevel: 9
                }
            }
        },
        
        // 基于时间的调整
        timeBased: {
            enabled: true,
            schedules: {
                peakHours: {
                    start: '09:00',
                    end: '18:00',
                    adjustments: {
                        cacheTTL: 1800,
                        batchSize: 5,
                        concurrentRequests: 3
                    }
                },
                offPeak: {
                    start: '00:00',
                    end: '06:00',
                    adjustments: {
                        cacheTTL: 10800,    // 3小时
                        batchSize: 20,
                        concurrentRequests: 10,
                        compressionLevel: 1
                    }
                }
            }
        }
    },
    
    // 资源清理
    cleanup: {
        // 定期清理
        scheduled: {
            enabled: true,
            schedule: '0 2 * * *',  // 每天凌晨2点
            tasks: [
                'clearExpiredCache',
                'cleanupTempFiles',
                'optimizeDatabase',
                'rotateLogs'
            ]
        },
        
        // 内存清理
        memoryCleanup: {
            enabled: true,
            threshold: 0.7,         // 内存使用70%时触发
            aggressive: false,
            preserveEssential: true
        }
    },
    
    // 故障恢复
    faultTolerance: {
        // 重试机制
        retry: {
            enabled: true,
            maxAttempts: 3,
            backoff: {
                type: 'exponential',
                baseDelay: 1000,
                maxDelay: 10000
            },
            jitter: true
        },
        
        // 熔断器
        circuitBreaker: {
            enabled: true,
            failureThreshold: 5,    // 5次失败后熔断
            resetTimeout: 30000,    // 30秒后重置
            halfOpenMaxAttempts: 3
        },
        
        // 降级策略
        fallback: {
            enabled: true,
            strategies: {
                semanticSearch: 'keywordSearch',
                zhipuAI: 'localEmbedding',
                memoryAnalysis: 'basicAnalysis'
            }
        }
    }
};

// 性能监控指标
const PerformanceMetrics = {
    // 系统指标
    system: {
        memoryUsage: 0,
        cpuUsage: 0,
        diskUsage: 0,
        uptime: 0
    },
    
    // 应用指标
    application: {
        requestCount: 0,
        errorCount: 0,
        responseTime: 0,
        activeConnections: 0
    },
    
    // 缓存指标
    cache: {
        hitRate: 0,
        missRate: 0,
        size: 0,
        evictions: 0
    },
    
    // 外部服务指标
    externalServices: {
        zhipuAI: {
            requestCount: 0,
            successRate: 0,
            averageResponseTime: 0,
            errorCount: 0
        },
        database: {
            queryCount: 0,
            slowQueries: 0,
            connectionCount: 0
        }
    }
};

// 性能优化函数
class PerformanceOptimizer {
    constructor() {
        this.config = PerformanceConfig;
        this.metrics = { ...PerformanceMetrics };
        this.lastOptimization = Date.now();
        this.optimizationInterval = 60000; // 每1分钟优化一次
    }
    
    /**
     * 根据当前负载调整配置
     */
    adjustBasedOnLoad(currentLoad) {
        const adjustments = this.config.adaptive.loadBased.adjustments;
        
        if (currentLoad < 0.3) {
            return adjustments.lowLoad;
        } else if (currentLoad < 0.7) {
            return adjustments.normalLoad;
        } else {
            return adjustments.highLoad;
        }
    }
    
    /**
     * 根据时间调整配置
     */
    adjustBasedOnTime() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        
        const schedules = this.config.adaptive.timeBased.schedules;
        
        for (const [scheduleName, schedule] of Object.entries(schedules)) {
            if (this.isTimeInRange(currentTime, schedule.start, schedule.end)) {
                return schedule.adjustments;
            }
        }
        
        return this.config.adaptive.loadBased.adjustments.normalLoad;
    }
    
    /**
     * 检查时间是否在范围内
     */
    isTimeInRange(currentTime, startTime, endTime) {
        const current = this.timeToMinutes(currentTime);
        const start = this.timeToMinutes(startTime);
        const end = this.timeToMinutes(endTime);
        
        if (start <= end) {
            return current >= start && current <= end;
        } else {
            // 跨天的时间范围
            return current >= start || current <= end;
        }
    }
    
    /**
     * 时间转换为分钟
     */
    timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }
    
    /**
     * 更新性能指标
     */
    updateMetrics(metricType, key, value) {
        if (this.metrics[metricType] && this.metrics[metricType][key] !== undefined) {
            this.metrics[metricType][key] = value;
        }
    }
    
    /**
     * 获取性能报告
     */
    getPerformanceReport() {
        return {
            timestamp: new Date().toISOString(),
            config: this.getCurrentConfig(),
            metrics: this.metrics,
            optimizations: this.getRecentOptimizations(),
            recommendations: this.getOptimizationRecommendations()
        };
    }
    
    /**
     * 获取当前配置
     */
    getCurrentConfig() {
        const currentLoad = this.metrics.system.memoryUsage;
        const timeAdjustments = this.adjustBasedOnTime();
        const loadAdjustments = this.adjustBasedOnLoad(currentLoad);
        
        return {
            cache: {
                ...this.config.cache,
                zhipuEmbeddings: {
                    ...this.config.cache.zhipuEmbeddings,
                    ttl: loadAdjustments.cacheTTL || this.config.cache.zhipuEmbeddings.ttl
                }
            },
            batchProcessing: {
                ...this.config.batchProcessing,
                batchSize: loadAdjustments.batchSize || this.config.batchProcessing.defaultBatchSize
            },
            rateLimiting: {
                ...this.config.rateLimiting,
                memoryAnalysis: {
                    ...this.config.rateLimiting.memoryAnalysis,
                    concurrentRequests: loadAdjustments.concurrentRequests || this.config.rateLimiting.memoryAnalysis.concurrentRequests
                }
            }
        };
    }
    
    /**
     * 获取最近的优化
     */
    getRecentOptimizations() {
        return {
            lastOptimization: new Date(this.lastOptimization).toISOString(),
            timeBasedAdjustments: this.adjustBasedOnTime(),
            loadBasedAdjustments: this.adjustBasedOnLoad(this.metrics.system.memoryUsage)
        };
    }
    
    /**
     * 获取优化建议
     */
    getOptimizationRecommendations() {
        const recommendations = [];
        
        // 基于内存使用率的建议
        if (this.metrics.system.memoryUsage > 0.8) {
            recommendations.push({
                priority: 'high',
                action: '减少缓存大小',
                reason: '内存使用率超过80%',
                suggestion: '将缓存TTL减少50%，清理过期缓存'
            });
        }
        
        // 基于错误率的建议
        if (this.metrics.application.errorCount > 10 && 
            this.metrics.application.requestCount > 0) {
            const errorRate = this.metrics.application.errorCount / this.metrics.application.requestCount;
            if (errorRate > 0.1) {
                recommendations.push({
                    priority: 'high',
                    action: '检查外部服务连接',
                    reason: `错误率过高: ${(errorRate * 100).toFixed(1)}%`,
                    suggestion: '启用熔断器，增加重试延迟'
                });
            }
        }
        
        // 基于响应时间的建议
        if (this.metrics.application.responseTime > 5000) {
            recommendations.push({
                priority: 'medium',
                action: '优化数据库查询',
                reason: `平均响应时间过长: ${this.metrics.application.responseTime}ms`,
                suggestion: '添加查询缓存，优化索引'
            });
        }
        
        return recommendations;
    }
    
    /**
     * 定期优化
     */
    async periodicOptimization() {
        const now = Date.now();
        if (now - this.lastOptimization >= this.optimizationInterval) {
            console.log('🔄 执行定期性能优化...');
            
            // 更新配置
            const newConfig = this.getCurrentConfig();
            
            // 执行清理任务
            await this.executeCleanupTasks();
            
            // 更新最后优化时间
            this.lastOptimization = now;
            
            console.log('✅ 定期性能优化完成');
            return newConfig;
        }
        
        return null;
    }
    
    /**
     * 执行清理任务
     */
    async executeCleanupTasks() {
        const tasks = this.config.cleanup.scheduled.tasks;
        
        for (const task of tasks) {
            try {
                await this.executeCleanupTask(task);
            } catch (error) {
                console.warn(`清理任务 ${task} 失败:`, error.message);
            }
        }
    }
    
    /**
     * 执行单个清理任务
     */
    async executeCleanupTask(task) {
        switch(task) {
            case 'clearExpiredCache':
                console.log('🧹 清理过期缓存...');
                // 这里可以调用缓存清理逻辑
                break;
            case 'cleanupTempFiles':
                console.log('🗑️ 清理临时文件...');
                break;
            case 'optimizeDatabase':
                console.log('📊 优化数据库...');
                break;
            case 'rotateLogs':
                console.log('📄 轮换日志文件...');
                break;
        }
    }
}

// 导出配置和优化器
module.exports = {
    PerformanceConfig,
    PerformanceMetrics,
    PerformanceOptimizer
};