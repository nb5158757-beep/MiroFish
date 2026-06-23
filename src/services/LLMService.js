/**
 * 大模型服务
 * 使用可插拔的大模型架构，支持多种大模型提供商
 */

const ModelFactory = require('../models/ModelFactory');
const { LLMConfig, validateConfig, switchProvider, getAvailableProviders } = require('../config/llm-config');

class LLMService {
    constructor() {
        this.llmInstance = null;
        this.currentProvider = null;
        this.initialized = false;
        this.cache = new Map();
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalTokens: 0,
            lastRequestTime: null,
            providersUsed: {}
        };
    }

    /**
     * 初始化大模型服务
     * @returns {Promise<boolean>} 初始化是否成功
     */
    async initialize() {
        try {
            console.log('🚀 初始化大模型服务...');
            
            // 验证配置
            const validation = validateConfig();
            if (!validation.valid) {
                console.error('❌ 大模型配置验证失败:', validation.errors);
                return false;
            }
            
            if (validation.warnings.length > 0) {
                console.warn('⚠️ 配置警告:', validation.warnings);
            }
            
            // 创建大模型实例
            this.currentProvider = LLMConfig.provider;
            
            // 获取当前提供商的配置
            const providerConfig = LLMConfig[this.currentProvider];
            if (!providerConfig) {
                throw new Error(`提供商 ${this.currentProvider} 的配置不存在`);
            }
            
            console.log(`🔧 创建大模型实例: ${this.currentProvider}`);
            console.log(`   配置键: ${Object.keys(providerConfig).join(', ')}`);
            console.log(`   API密钥存在: ${!!providerConfig.apiKey}`);
            
            this.llmInstance = await ModelFactory.createModel(this.currentProvider, providerConfig);
            
            if (!this.llmInstance) {
                throw new Error('无法创建大模型实例');
            }
            
            // 更新统计
            this.stats.providersUsed[this.currentProvider] = {
                requests: 0,
                lastUsed: new Date()
            };
            
            this.initialized = true;
            
            console.log(`✅ 大模型服务初始化成功`);
            console.log(`   提供商: ${this.currentProvider}`);
            console.log(`   模型: ${this.llmInstance.getModelInfo().model || '未知'}`);
            
            return true;
        } catch (error) {
            console.error('❌ 大模型服务初始化失败:', error.message);
            this.initialized = false;
            return false;
        }
    }

    /**
     * 生成文本嵌入向量
     * @param {string|string[]} text - 文本或文本数组
     * @param {Object} options - 选项
     * @returns {Promise<Array>} 嵌入向量
     */
    async generateEmbedding(text, options = {}) {
        return await this.executeWithFallback('generateEmbedding', [text, options]);
    }

    /**
     * 语义搜索
     * @param {string} query - 搜索查询
     * @param {Array} memories - 记忆数组
     * @param {Object} options - 搜索选项
     * @returns {Promise<Array>} 搜索结果
     */
    async semanticSearch(query, memories, options = {}) {
        return await this.executeWithFallback('semanticSearch', [query, memories, options]);
    }

    /**
     * 分析记忆
     * @param {Object} memory - 记忆对象
     * @param {Object} options - 分析选项
     * @returns {Promise<Object>} 分析结果
     */
    async analyzeMemory(memory, options = {}) {
        return await this.executeWithFallback('analyzeMemory', [memory, options]);
    }

    /**
     * 生成摘要
     * @param {string} text - 原始文本
     * @param {Object} options - 摘要选项
     * @returns {Promise<string>} 摘要文本
     */
    async generateSummary(text, options = {}) {
        return await this.executeWithFallback('generateSummary', [text, options]);
    }

    /**
     * 提取实体
     * @param {string} text - 原始文本
     * @param {Object} options - 提取选项
     * @returns {Promise<Array>} 实体数组
     */
    async extractEntities(text, options = {}) {
        return await this.executeWithFallback('extractEntities', [text, options]);
    }

    /**
     * 文本分类
     * @param {string} text - 原始文本
     * @param {Array} categories - 分类类别
     * @param {Object} options - 分类选项
     * @returns {Promise<Object>} 分类结果
     */
    async classifyText(text, categories, options = {}) {
        return await this.executeWithFallback('classifyText', [text, categories, options]);
    }

    /**
     * 情感分析
     * @param {string} text - 原始文本
     * @param {Object} options - 分析选项
     * @returns {Promise<Object>} 情感分析结果
     */
    async sentimentAnalysis(text, options = {}) {
        return await this.executeWithFallback('sentimentAnalysis', [text, options]);
    }

    /**
     * 提取关键词
     * @param {string} text - 原始文本
     * @param {number} topK - 关键词数量
     * @param {Object} options - 提取选项
     * @returns {Promise<Array>} 关键词数组
     */
    async extractKeywords(text, topK = 10, options = {}) {
        return await this.executeWithFallback('extractKeywords', [text, topK, options]);
    }

    /**
     * 计算相似度
     * @param {Array} embedding1 - 嵌入向量1
     * @param {Array} embedding2 - 嵌入向量2
     * @returns {Promise<number>} 相似度分数
     */
    async calculateSimilarity(embedding1, embedding2) {
        return await this.executeWithFallback('calculateSimilarity', [embedding1, embedding2]);
    }

    /**
     * 切换大模型提供商
     * @param {string} provider - 新的提供商
     * @returns {Promise<boolean>} 是否切换成功
     */
    async switchProvider(provider) {
        try {
            if (!LLMConfig.errorHandling.enableFallbackChain) {
                console.warn('回退链未启用，无法切换提供商');
                return false;
            }
            
            const success = switchProvider(provider);
            if (!success) {
                return false;
            }
            
            // 重新初始化服务
            await this.initialize();
            
            console.log(`🔄 已成功切换大模型提供商为: ${provider}`);
            return true;
        } catch (error) {
            console.error(`切换提供商失败:`, error.message);
            return false;
        }
    }

    /**
     * 获取服务状态
     * @returns {Object} 服务状态
     */
    getStatus() {
        if (!this.llmInstance) {
            return {
                initialized: false,
                currentProvider: null,
                error: '大模型实例未初始化'
            };
        }
        
        const modelInfo = this.llmInstance.getModelInfo();
        const usageStats = this.llmInstance.getUsageStats();
        
        return {
            initialized: this.initialized,
            currentProvider: this.currentProvider,
            modelInfo: modelInfo,
            usageStats: usageStats,
            serviceStats: this.stats,
            cacheSize: this.cache.size,
            config: {
                provider: LLMConfig.provider,
                availableProviders: getAvailableProviders(),
                features: LLMConfig.features
            }
        };
    }

    /**
     * 健康检查
     * @returns {Promise<Object>} 健康状态
     */
    async healthCheck() {
        try {
            if (!this.llmInstance) {
                return {
                    status: 'unhealthy',
                    error: '大模型实例未初始化',
                    timestamp: new Date().toISOString()
                };
            }
            
            const health = await this.llmInstance.healthCheck();
            
            return {
                status: health.status === 'healthy' ? 'healthy' : 'unhealthy',
                provider: this.currentProvider,
                model: health.model || '未知',
                embeddingDimensions: health.embedding_dimensions || 0,
                initialized: health.initialized || false,
                timestamp: new Date().toISOString(),
                details: health
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                provider: this.currentProvider,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 获取缓存统计
     * @returns {Object} 缓存统计
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            hits: this.stats.cacheHits || 0,
            misses: this.stats.cacheMisses || 0,
            hitRate: this.stats.cacheHits ? (this.stats.cacheHits / (this.stats.cacheHits + (this.stats.cacheMisses || 0))) * 100 : 0
        };
    }

    /**
     * 清空缓存
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 已清空大模型服务缓存');
    }

    /**
     * 重置统计
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalTokens: 0,
            lastRequestTime: null,
            providersUsed: this.stats.providersUsed
        };
        
        if (this.llmInstance) {
            this.llmInstance.resetUsageStats();
        }
        
        console.log('📊 已重置大模型服务统计');
    }

    /**
     * 使用回退链执行方法
     * @private
     */
    async executeWithFallback(methodName, args) {
        this.stats.totalRequests++;
        this.stats.lastRequestTime = new Date();
        
        // 生成缓存键
        const cacheKey = this.generateCacheKey(methodName, args);
        
        // 检查缓存
        if (LLMConfig.cache.enabled && this.cache.has(cacheKey)) {
            this.stats.cacheHits = (this.stats.cacheHits || 0) + 1;
            return this.cache.get(cacheKey);
        }
        
        this.stats.cacheMisses = (this.stats.cacheMisses || 0) + 1;
        
        try {
            // 使用当前实例执行
            if (!this.llmInstance) {
                throw new Error('大模型实例未初始化');
            }
            
            const result = await this.llmInstance[methodName](...args);
            
            // 更新统计
            this.stats.successfulRequests++;
            this.stats.providersUsed[this.currentProvider].requests++;
            this.stats.providersUsed[this.currentProvider].lastUsed = new Date();
            
            // 更新token统计
            const usageStats = this.llmInstance.getUsageStats();
            this.stats.totalTokens += usageStats.tokens || 0;
            
            // 缓存结果
            if (LLMConfig.cache.enabled && this.shouldCacheResult(methodName, result)) {
                this.cache.set(cacheKey, result);
                
                // 清理过期缓存
                if (this.cache.size > LLMConfig.cache.maxSize) {
                    this.cleanupCache();
                }
            }
            
            return result;
        } catch (error) {
            this.stats.failedRequests++;
            console.error(`大模型方法 ${methodName} 执行失败:`, error.message);
            
            // 如果启用了回退链，尝试使用备用提供商
            if (LLMConfig.errorHandling.enableFallbackChain && LLMConfig.errorHandling.fallbackProviders) {
                const fallbackProviders = LLMConfig.errorHandling.fallbackProviders.filter(p => p !== this.currentProvider);
                
                for (const provider of fallbackProviders) {
                    try {
                        console.log(`🔄 尝试使用备用提供商: ${provider}`);
                        
                        // 切换提供商
                        const switched = await this.switchProvider(provider);
                        if (!switched) {
                            continue;
                        }
                        
                        // 重新执行方法
                        const result = await this.llmInstance[methodName](...args);
                        console.log(`✅ 使用备用提供商 ${provider} 执行成功`);
                        
                        return result;
                    } catch (fallbackError) {
                        console.error(`备用提供商 ${provider} 也失败:`, fallbackError.message);
                        // 继续尝试下一个备用提供商
                    }
                }
            }
            
            // 所有尝试都失败，抛出原始错误
            throw error;
        }
    }

    /**
     * 生成缓存键
     * @private
     */
    generateCacheKey(methodName, args) {
        const argsString = JSON.stringify(args);
        return `${methodName}:${this.currentProvider}:${argsString}`;
    }

    /**
     * 判断是否应该缓存结果
     * @private
     */
    shouldCacheResult(methodName, result) {
        // 根据方法类型决定是否缓存
        const cacheableMethods = [
            'generateEmbedding',
            'semanticSearch',
            'analyzeMemory',
            'generateSummary',
            'extractEntities',
            'classifyText',
            'sentimentAnalysis',
            'extractKeywords'
        ];
        
        return cacheableMethods.includes(methodName) && result !== undefined && result !== null;
    }

    /**
     * 清理缓存
     * @private
     */
    cleanupCache() {
        const now = Date.now();
        const ttl = LLMConfig.cache.ttl * 1000; // 转换为毫秒
        
        for (const [key, value] of this.cache.entries()) {
            // 简单的缓存清理策略：随机删除一些条目
            if (Math.random() < 0.1) { // 10%的概率删除
                this.cache.delete(key);
            }
        }
        
        console.log(`🧹 缓存清理完成，当前大小: ${this.cache.size}`);
    }
}

// 创建单例实例
const llmService = new LLMService();

module.exports = llmService;