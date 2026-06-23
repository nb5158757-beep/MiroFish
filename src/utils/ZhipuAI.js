/**
 * 智谱AI集成工具
 * 用于语义搜索和嵌入生成
 */

const axios = require('axios');

class ZhipuAI {
    constructor(apiKey = null) {
        this.apiKey = apiKey || process.env.ZHIPU_API_KEY;
        this.baseURL = 'https://open.bigmodel.cn/api/paas/v4';
        this.embeddingModel = 'embedding-2';
        this.chatModel = 'glm-4';
        
        if (!this.apiKey) {
            console.warn('⚠️ 智谱AI API密钥未配置，语义搜索功能将不可用');
        }
    }

    /**
     * 设置API密钥
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        console.log('✅ 智谱AI API密钥已设置');
    }

    /**
     * 生成文本嵌入
     */
    async generateEmbedding(text) {
        if (!this.apiKey) {
            throw new Error('智谱AI API密钥未配置');
        }

        if (!text || text.trim() === '') {
            throw new Error('文本内容不能为空');
        }

        try {
            const response = await axios.post(
                `${this.baseURL}/embeddings`,
                {
                    model: this.embeddingModel,
                    input: text
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            if (response.data && response.data.data && response.data.data.length > 0) {
                return response.data.data[0].embedding;
            } else {
                throw new Error('嵌入生成失败：响应数据格式错误');
            }
        } catch (error) {
            console.error('智谱AI嵌入生成失败:', error.message);
            
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
     * 批量生成文本嵌入
     */
    async generateEmbeddings(texts) {
        if (!Array.isArray(texts) || texts.length === 0) {
            throw new Error('文本数组不能为空');
        }

        // 智谱AI API支持批量处理，但这里简化处理，逐个生成
        const embeddings = [];
        for (const text of texts) {
            try {
                const embedding = await this.generateEmbedding(text);
                embeddings.push({
                    text: text,
                    embedding: embedding,
                    success: true
                });
            } catch (error) {
                embeddings.push({
                    text: text,
                    error: error.message,
                    success: false
                });
            }
        }

        return embeddings;
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
        if (!this.apiKey) {
            throw new Error('智谱AI API密钥未配置，无法进行语义搜索');
        }

        const {
            threshold = 0.7,
            limit = 10,
            includeScores = true
        } = options;

        try {
            // 生成查询嵌入
            console.log('🔍 生成查询嵌入...');
            const queryEmbedding = await this.generateEmbedding(query);
            
            // 计算相似度
            console.log('📊 计算相似度...');
            const results = [];
            
            for (const memory of memories) {
                try {
                    let memoryEmbedding;
                    
                    // 如果记忆已有嵌入，直接使用
                    if (memory.embedding && memory.embedding.length > 0) {
                        memoryEmbedding = memory.embedding;
                    } else {
                        // 否则生成嵌入
                        console.log(`生成记忆 ${memory.id} 的嵌入...`);
                        memoryEmbedding = await this.generateEmbedding(memory.content);
                        // 可以在这里保存嵌入到记忆对象中
                    }
                    
                    // 计算相似度
                    const similarity = this.cosineSimilarity(queryEmbedding, memoryEmbedding);
                    
                    if (similarity >= threshold) {
                        results.push({
                            ...memory,
                            similarity: similarity,
                            relevance: similarity // 兼容性字段
                        });
                    }
                } catch (error) {
                    console.warn(`处理记忆 ${memory.id} 失败:`, error.message);
                    // 跳过这条记忆
                }
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
                search_type: 'semantic'
            };
            
        } catch (error) {
            console.error('语义搜索失败:', error);
            throw error;
        }
    }

    /**
     * 智能问答
     */
    async chatCompletion(messages, options = {}) {
        if (!this.apiKey) {
            throw new Error('智谱AI API密钥未配置');
        }

        const {
            model = this.chatModel,
            temperature = 0.7,
            max_tokens = 1000
        } = options;

        try {
            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: model,
                    messages: messages,
                    temperature: temperature,
                    max_tokens: max_tokens
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );

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
            console.error('智谱AI聊天完成失败:', error.message);
            
            if (error.response) {
                console.error('响应状态:', error.response.status);
                console.error('响应数据:', error.response.data);
            }
            
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
                compression_ratio: (result.content.length / memoryContent.length).toFixed(2)
            };
        } catch (error) {
            console.error('记忆总结失败:', error);
            throw error;
        }
    }

    /**
     * 记忆分类
     */
    async classifyMemory(memoryContent, categories = ['工作', '学习', '生活', '技术', '其他']) {
        const categoriesText = categories.join('、');
        
        const messages = [
            {
                role: 'system',
                content: `你是一个记忆分类助手。请将用户提供的记忆内容分类到以下类别中：${categoriesText}。如果都不合适，请选择"其他"。`
            },
            {
                role: 'user',
                content: `请分类以下记忆内容：\n\n${memoryContent}\n\n请只返回类别名称，不要解释。`
            }
        ];

        try {
            const result = await this.chatCompletion(messages, {
                temperature: 0.1,
                max_tokens: 50
            });

            const classification = result.content.trim();
            
            // 验证分类结果是否在允许的类别中
            if (categories.includes(classification)) {
                return classification;
            } else {
                return '其他';
            }
        } catch (error) {
            console.error('记忆分类失败:', error);
            return '其他'; // 失败时返回默认分类
        }
    }

    /**
     * 重要性评估
     */
    async evaluateImportance(memoryContent, options = {}) {
        const messages = [
            {
                role: 'system',
                content: '你是一个记忆重要性评估助手。请根据记忆内容的重要性、相关性、时效性等因素，给出1-10的重要性评分（10为最重要）。请只返回数字评分，不要解释。'
            },
            {
                role: 'user',
                content: `请评估以下记忆内容的重要性（1-10分）：\n\n${memoryContent}`
            }
        ];

        try {
            const result = await this.chatCompletion(messages, {
                temperature: 0.2,
                max_tokens: 10,
                ...options
            });

            const score = parseInt(result.content.trim());
            
            // 验证评分范围
            if (isNaN(score) || score < 1 || score > 10) {
                return 5; // 默认中等重要性
            }
            
            return score;
        } catch (error) {
            console.error('重要性评估失败:', error);
            return 5; // 失败时返回默认评分
        }
    }

    /**
     * 测试API连接
     */
    async testConnection() {
        if (!this.apiKey) {
            return {
                success: false,
                error: 'API密钥未配置'
            };
        }

        try {
            // 使用一个简单的测试查询
            const testEmbedding = await this.generateEmbedding('测试连接');
            
            return {
                success: true,
                message: '智谱AI连接测试成功',
                embedding_length: testEmbedding.length,
                api_key_set: true
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                api_key_set: true
            };
        }
    }

    /**
     * 获取API使用情况
     */
    async getUsage() {
        // 注意：智谱AI可能没有直接的使用情况API
        // 这里返回一个占位符响应
        return {
            note: '使用情况信息需要从智谱AI控制台获取',
            suggestion: '请访问 https://open.bigmodel.cn/usercenter/apikeys 查看使用情况'
        };
    }
}

// 导出单例实例
module.exports = new ZhipuAI();