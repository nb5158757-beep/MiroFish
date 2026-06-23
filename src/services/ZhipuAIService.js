/**
 * 智谱AI服务
 * 提供语义搜索、嵌入生成、智能分析等功能
 */

const axios = require('axios');
const { ZhipuConfig, validateConfig } = require('../config/zhipu-config');

class ZhipuAIService {
    constructor() {
        this.config = ZhipuConfig;
        this.validation = validateConfig();
        
        if (!this.validation.valid) {
            console.warn('⚠️ 智谱AI配置验证失败:', this.validation.errors);
        } else {
            console.log('✅ 智谱AI配置验证通过');
            console.log(`🔑 API密钥: ${this.validation.apiKeyPreview}`);
        }
        
        // 创建axios实例
        this.client = axios.create({
            baseURL: this.config.baseURL,
            timeout: this.config.defaults.embedding.timeout,
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        // 请求计数器（用于限流）
        this.requestCount = 0;
        this.resetTime = Date.now();
        
        // 嵌入缓存
        this.embeddingCache = new Map();
    }
    
    /**
     * 检查限流
     */
    checkRateLimit() {
        const now = Date.now();
        const elapsed = now - this.resetTime;
        
        // 每分钟重置计数器
        if (elapsed > 60000) {
            this.requestCount = 0;
            this.resetTime = now;
        }
        
        // 检查是否超过限制
        if (this.requestCount >= this.config.limits.requestsPerMinute) {
            const waitTime = 60000 - elapsed;
            console.warn(`⚠️ 请求频率限制，等待 ${Math.ceil(waitTime / 1000)} 秒`);
            return false;
        }
        
        this.requestCount++;
        return true;
    }
    
    /**
     * 从缓存获取嵌入
     */
    getFromCache(text) {
        if (!this.config.cache.enabled) return null;
        
        const cacheKey = text.trim().toLowerCase();
        const cached = this.embeddingCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.config.cache.ttl * 1000) {
            console.log('📦 从缓存获取嵌入');
            return cached.embedding;
        }
        
        return null;
    }
    
    /**
     * 保存到缓存
     */
    saveToCache(text, embedding) {
        if (!this.config.cache.enabled) return;
        
        const cacheKey = text.trim().toLowerCase();
        this.embeddingCache.set(cacheKey, {
            embedding: embedding,
            timestamp: Date.now()
        });
        
        // 限制缓存大小
        if (this.embeddingCache.size > this.config.cache.maxSize) {
            const oldestKey = this.embeddingCache.keys().next().value;
            this.embeddingCache.delete(oldestKey);
        }
    }
    
    /**
     * 生成文本嵌入
     */
    async generateEmbedding(text) {
        if (!text || text.trim() === '') {
            throw new Error('文本内容不能为空');
        }
        
        // 检查缓存
        const cached = this.getFromCache(text);
        if (cached) {
            return cached;
        }
        
        // 检查限流
        if (!this.checkRateLimit()) {
            throw new Error('请求频率限制，请稍后重试');
        }
        
        // 截断超长文本
        const processedText = text.length > this.config.limits.embeddingMaxLength
            ? text.substring(0, this.config.limits.embeddingMaxLength) + '...'
            : text;
        
        try {
            console.log(`🔍 生成嵌入: ${processedText.substring(0, 50)}...`);
            
            const response = await this.client.post('/embeddings', {
                model: this.config.models.embedding,
                input: processedText
            });
            
            if (response.data && response.data.data && response.data.data.length > 0) {
                const embedding = response.data.data[0].embedding;
                
                // 验证嵌入维度
                if (embedding.length !== this.config.defaults.embedding.dimensions) {
                    console.warn(`⚠️ 嵌入维度异常: 期望 ${this.config.defaults.embedding.dimensions}, 实际 ${embedding.length}`);
                }
                
                // 保存到缓存
                this.saveToCache(text, embedding);
                
                console.log(`✅ 嵌入生成成功，维度: ${embedding.length}`);
                return embedding;
            } else {
                throw new Error('嵌入生成失败：响应数据格式错误');
            }
        } catch (error) {
            console.error('❌ 嵌入生成失败:', error.message);
            
            if (error.response) {
                console.error('响应状态:', error.response.status);
                console.error('响应数据:', error.response.data);
                
                if (error.response.status === 401) {
                    throw new Error('API密钥无效或已过期');
                } else if (error.response.status === 429) {
                    throw new Error('API调用频率限制，请稍后重试');
                } else if (error.response.status >= 500) {
                    throw new Error('智谱AI服务器错误，请稍后重试');
                }
            }
            
            throw new Error(`嵌入生成失败: ${error.message}`);
        }
    }
    
    /**
     * 批量生成嵌入
     */
    async generateEmbeddingsBatch(texts) {
        if (!Array.isArray(texts) || texts.length === 0) {
            throw new Error('文本数组不能为空');
        }
        
        if (texts.length > this.config.limits.maxBatchSize) {
            console.warn(`⚠️ 批量大小超过限制，将分批处理`);
            return this.processInBatches(texts);
        }
        
        const results = [];
        
        for (const text of texts) {
            try {
                const embedding = await this.generateEmbedding(text);
                results.push({
                    text: text,
                    embedding: embedding,
                    success: true,
                    dimensions: embedding.length
                });
            } catch (error) {
                results.push({
                    text: text,
                    error: error.message,
                    success: false
                });
            }
            
            // 添加延迟避免频率限制
            await this.delay(100);
        }
        
        return results;
    }
    
    /**
     * 分批处理
     */
    async processInBatches(texts, batchSize = this.config.limits.maxBatchSize) {
        const batches = [];
        for (let i = 0; i < texts.length; i += batchSize) {
            batches.push(texts.slice(i, i + batchSize));
        }
        
        const allResults = [];
        
        for (let i = 0; i < batches.length; i++) {
            console.log(`🔄 处理批次 ${i + 1}/${batches.length}`);
            const batchResults = await this.generateEmbeddingsBatch(batches[i]);
            allResults.push(...batchResults);
            
            // 批次间延迟
            if (i < batches.length - 1) {
                await this.delay(500);
            }
        }
        
        return allResults;
    }
    
    /**
     * 计算余弦相似度
     */
    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) {
            return 0;
        }
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        
        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);
        
        if (normA === 0 || normB === 0) {
            return 0;
        }
        
        return dotProduct / (normA * normB);
    }
    
    /**
     * 语义搜索
     */
    async semanticSearch(query, memories, options = {}) {
        const {
            threshold = 0.7,
            limit = 10,
            includeScores = true
        } = options;
        
        console.log(`🔍 开始语义搜索: "${query.substring(0, 50)}..."`);
        
        try {
            // 生成查询嵌入
            const queryEmbedding = await this.generateEmbedding(query);
            
            // 计算相似度
            const results = [];
            let processed = 0;
            
            for (const memory of memories) {
                processed++;
                if (processed % 10 === 0) {
                    console.log(`📊 处理进度: ${processed}/${memories.length}`);
                }
                
                try {
                    let memoryEmbedding;
                    
                    // 如果记忆已有嵌入，直接使用
                    if (memory.embedding && memory.embedding.length > 0) {
                        memoryEmbedding = memory.embedding;
                    } else {
                        // 否则生成嵌入
                        memoryEmbedding = await this.generateEmbedding(memory.content);
                        // 可以在这里保存嵌入到记忆对象中
                    }
                    
                    // 计算相似度
                    const similarity = this.cosineSimilarity(queryEmbedding, memoryEmbedding);
                    
                    if (similarity >= threshold) {
                        results.push({
                            ...memory,
                            similarity: similarity,
                            relevance: similarity,
                            embedding_dimensions: memoryEmbedding.length
                        });
                    }
                } catch (error) {
                    console.warn(`⚠️ 处理记忆 ${memory.id} 失败:`, error.message);
                    // 跳过这条记忆
                }
                
                // 添加延迟避免频率限制
                await this.delay(50);
            }
            
            // 按相似度排序
            results.sort((a, b) => b.similarity - a.similarity);
            
            // 限制结果数量
            const limitedResults = results.slice(0, limit);
            
            console.log(`✅ 语义搜索完成，找到 ${limitedResults.length} 条相关记忆`);
            
            return {
                query: query,
                results: limitedResults,
                total_found: results.length,
                threshold: threshold,
                search_type: 'semantic',
                query_embedding_dimensions: queryEmbedding.length,
                processing_time: processed
            };
            
        } catch (error) {
            console.error('❌ 语义搜索失败:', error);
            throw error;
        }
    }
    
    /**
     * 智能问答
     */
    async chatCompletion(messages, options = {}) {
        const {
            model = this.config.models.chat,
            temperature = this.config.defaults.chat.temperature,
            max_tokens = this.config.defaults.chat.max_tokens
        } = options;
        
        if (!this.checkRateLimit()) {
            throw new Error('请求频率限制，请稍后重试');
        }
        
        try {
            const response = await this.client.post('/chat/completions', {
                model: model,
                messages: messages,
                temperature: temperature,
                max_tokens: max_tokens
            });
            
            if (response.data && response.data.choices && response.data.choices.length > 0) {
                return {
                    content: response.data.choices[0].message.content,
                    usage: response.data.usage,
                    model: response.data.model
                };
            } else {
                throw new Error('聊天完成失败：响应数据格式错误');
            }
        } catch (error) {
            console.error('❌ 聊天完成失败:', error.message);
            throw new Error(`聊天完成失败: ${error.message}`);
        }
    }
    
    /**
     * 记忆总结
     */
    async summarizeMemory(memoryContent, options = {}) {
        const messages = [
            {
                role: 'system',
                content: '你是一个专业的记忆总结助手。请将用户提供的记忆内容进行简洁、准确的总结，提取关键信息。'
            },
            {
                role: 'user',
                content: `请总结以下记忆内容：\n\n${memoryContent}`
            }
        ];
        
        try {
            const result = await this.chatCompletion(messages, {
                temperature: 0.3,
                max_tokens: 500,
                ...options
            });
            
            return {
                summary: result.content,
                original_length: memoryContent.length,
                summary_length: result.content.length,
                compression_ratio: (result.content.length / memoryContent.length).toFixed(2),
                model: result.model
            };
        } catch (error) {
            console.error('❌ 记忆总结失败:', error);
            throw error;
        }
    }
    
    /**
     * 测试连接
     */
    async testConnection() {
        try {
            const testEmbedding = await this.generateEmbedding(this.config.test.testQuery);
            
            return {
                success: true,
                message: '智谱AI连接测试成功',
                api_key_valid: true,
                embedding_dimensions: testEmbedding.length,
                expected_dimensions: this.config.defaults.embedding.dimensions,
                test_query: this.config.test.testQuery
            };
        } catch (error) {
            return {
                success: false,
                message: '智谱AI连接测试失败',
                error: error.message,
                api_key_valid: false
            };
        }
    }
    
    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 获取服务状态
     */
    getStatus() {
        return {
            config_valid: this.validation.valid,
            api_key_set: this.validation.apiKeySet,
            request_count: this.requestCount,
            cache_size: this.embeddingCache.size,
            rate_limit_remaining: Math.max(0, this.config.limits.requestsPerMinute - this.requestCount),
            features_enabled: this.config.features
        };
    }
}

// 导出单例实例
module.exports = new ZhipuAIService();