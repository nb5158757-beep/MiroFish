/**
 * 智谱AI配置
 * 使用用户提供的API密钥
 */

const ZHIPU_API_KEY = '0bf62c3d864c4ea891d722ece0ccefbd.SdcntuG3A8Vi7NXz';

const ZhipuConfig = {
    // API配置
    apiKey: ZHIPU_API_KEY,
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    
    // 模型配置
    models: {
        embedding: 'embedding-2',      // 嵌入模型
        chat: 'glm-4',                 // 聊天模型
        chatLong: 'glm-4-long',        // 长文本模型
        vision: 'glm-4v'               // 视觉模型
    },
    
    // 默认参数
    defaults: {
        embedding: {
            dimensions: 1024,          // embedding-2维度
            timeout: 10000             // 10秒超时
        },
        chat: {
            temperature: 0.7,
            max_tokens: 1000,
            timeout: 15000
        }
    },
    
    // 功能开关
    features: {
        semanticSearch: true,          // 语义搜索
        memorySummarization: true,     // 记忆总结
        importanceEvaluation: true,    // 重要性评估
        autoCategorization: true,      // 自动分类
        smartTagging: true             // 智能标签
    },
    
    // 限制配置
    limits: {
        maxBatchSize: 10,              // 最大批量处理数
        requestsPerMinute: 60,         // 每分钟请求限制
        dailyLimit: 1000,              // 每日限制
        embeddingMaxLength: 8192       // 嵌入最大文本长度
    },
    
    // 缓存配置
    cache: {
        enabled: true,
        ttl: 3600,                     // 缓存时间(秒)
        maxSize: 1000                  // 最大缓存条目
    },
    
    // 错误处理
    errorHandling: {
        maxRetries: 3,
        retryDelay: 1000,
        fallbackToKeyword: true        // 失败时回退到关键词搜索
    },
    
    // 测试配置
    test: {
        enabled: true,
        testQuery: 'MemFlow AI智能记忆系统',
        expectedEmbeddingLength: 1024
    }
};

// 验证配置
function validateConfig() {
    const errors = [];
    
    if (!ZhipuConfig.apiKey || ZhipuConfig.apiKey.trim() === '') {
        errors.push('API密钥不能为空');
    }
    
    if (!ZhipuConfig.apiKey.includes('.')) {
        errors.push('API密钥格式可能不正确');
    }
    
    if (ZhipuConfig.apiKey.length < 30) {
        errors.push('API密钥长度异常');
    }
    
    return {
        valid: errors.length === 0,
        errors: errors,
        apiKeySet: !!ZhipuConfig.apiKey,
        apiKeyLength: ZhipuConfig.apiKey.length,
        apiKeyPreview: ZhipuConfig.apiKey.substring(0, 10) + '...' + ZhipuConfig.apiKey.substring(ZhipuConfig.apiKey.length - 10)
    };
}

// 获取安全配置（隐藏敏感信息）
function getSafeConfig() {
    const config = { ...ZhipuConfig };
    config.apiKey = '***' + config.apiKey.substring(config.apiKey.length - 8);
    return config;
}

module.exports = {
    ZhipuConfig,
    validateConfig,
    getSafeConfig
};