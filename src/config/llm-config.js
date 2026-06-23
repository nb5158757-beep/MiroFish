/**
 * 大模型配置
 * 支持智谱AI、OpenAI、Claude、DeepSeek等多种大模型
 */

const LLMConfig = {
    // 默认使用的大模型提供商
    provider: 'zhipu',  // 可选: zhipu, openai, claude, deepseek
    
    // 智谱AI配置
    zhipu: {
        apiKey: process.env.ZHIPU_API_KEY || '0bf62c3d864c4ea891d722ece0ccefbd.SdcntuG3A8Vi7NXz',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
        embeddingModel: 'embedding-2',
        chatModel: 'glm-4',
        chatLongModel: 'glm-4-long',
        visionModel: 'glm-4v',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000
    },
    
    // OpenAI配置
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: 'https://api.openai.com/v1',
        embeddingModel: 'text-embedding-3-small',
        chatModel: 'gpt-4',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000
    },
    
    // Claude配置
    claude: {
        apiKey: process.env.CLAUDE_API_KEY || '',
        baseURL: 'https://api.anthropic.com/v1',
        chatModel: 'claude-3-sonnet',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000
    },
    
    // DeepSeek配置
    deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        baseURL: 'https://api.deepseek.com/v1',
        chatModel: 'deepseek-chat',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000
    },
    
    // 通用配置
    cache: {
        enabled: true,
        ttl: 3600,
        maxSize: 1000
    },
    
    // 搜索配置
    search: {
        defaultSimilarityThreshold: 0.7,
        maxSearchResults: 10,
        enableHybridSearch: true
    },
    
    // 功能开关
    features: {
        semanticSearch: true,
        memorySummarization: true,
        importanceEvaluation: true,
        autoCategorization: true,
        smartTagging: true
    },
    
    // 限制配置
    limits: {
        maxBatchSize: 10,
        requestsPerMinute: 60,
        dailyLimit: 1000,
        embeddingMaxLength: 8192
    },
    
    // 错误处理
    errorHandling: {
        maxRetries: 3,
        retryDelay: 1000,
        fallbackToKeyword: true,
        enableFallbackChain: true,
        fallbackProviders: ['zhipu', 'openai', 'deepseek'] // 回退链顺序
    },
    
    // 监控配置
    monitoring: {
        enableMetrics: true,
        metricsInterval: 60000,
        logLevel: 'info'
    },
    
    // 调试配置
    debug: {
        enabled: false,
        logRequests: false,
        logResponses: false,
        logEmbeddings: false
    }
};

/**
 * 验证配置
 * @returns {Object} 验证结果
 */
function validateConfig() {
    const errors = [];
    const warnings = [];
    
    // 检查默认提供商配置
    const provider = LLMConfig.provider;
    const providerConfig = LLMConfig[provider];
    
    if (!providerConfig) {
        errors.push(`配置的提供商 ${provider} 不存在`);
    } else {
        // 检查API密钥
        if (!providerConfig.apiKey || providerConfig.apiKey.trim() === '') {
            errors.push(`${provider} API密钥不能为空`);
        }
        
        // 检查智谱AI密钥格式
        if (provider === 'zhipu' && !providerConfig.apiKey.includes('.')) {
            warnings.push('智谱AI API密钥格式可能不正确');
        }
    }
    
    // 检查回退链配置
    if (LLMConfig.errorHandling.enableFallbackChain) {
        const fallbackProviders = LLMConfig.errorHandling.fallbackProviders;
        if (!Array.isArray(fallbackProviders) || fallbackProviders.length === 0) {
            warnings.push('回退链配置为空或无效');
        } else {
            for (const fbProvider of fallbackProviders) {
                if (!LLMConfig[fbProvider]) {
                    warnings.push(`回退链中的提供商 ${fbProvider} 不存在`);
                }
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        provider,
        providerSet: !!providerConfig,
        providerConfig: providerConfig ? {
            ...providerConfig,
            apiKey: '***' + (providerConfig.apiKey ? providerConfig.apiKey.substring(providerConfig.apiKey.length - 8) : '')
        } : null
    };
}

/**
 * 获取安全配置（隐藏敏感信息）
 * @returns {Object} 安全配置
 */
function getSafeConfig() {
    const safeConfig = { ...LLMConfig };
    
    // 隐藏所有API密钥
    for (const provider of ['zhipu', 'openai', 'claude', 'deepseek']) {
        if (safeConfig[provider] && safeConfig[provider].apiKey) {
            safeConfig[provider].apiKey = '***' + safeConfig[provider].apiKey.substring(safeConfig[provider].apiKey.length - 8);
        }
    }
    
    return safeConfig;
}

/**
 * 获取当前激活的提供商配置
 * @returns {Object} 当前提供商配置
 */
function getActiveProviderConfig() {
    const provider = LLMConfig.provider;
    return {
        provider,
        config: LLMConfig[provider],
        ...LLMConfig
    };
}

/**
 * 切换大模型提供商
 * @param {string} provider - 新的提供商
 * @returns {boolean} 是否切换成功
 */
function switchProvider(provider) {
    const supportedProviders = ['zhipu', 'openai', 'claude', 'deepseek'];
    
    if (!supportedProviders.includes(provider)) {
        console.error(`不支持的提供商: ${provider}`);
        return false;
    }
    
    if (!LLMConfig[provider] || !LLMConfig[provider].apiKey) {
        console.error(`提供商 ${provider} 未配置或API密钥为空`);
        return false;
    }
    
    LLMConfig.provider = provider;
    console.log(`✅ 已切换大模型提供商为: ${provider}`);
    return true;
}

/**
 * 获取所有可用的提供商
 * @returns {Array} 提供商列表
 */
function getAvailableProviders() {
    const providers = [];
    
    for (const provider of ['zhipu', 'openai', 'claude', 'deepseek']) {
        const config = LLMConfig[provider];
        if (config && config.apiKey && config.apiKey.trim() !== '') {
            providers.push({
                id: provider,
                name: getProviderName(provider),
                configured: true,
                hasApiKey: true
            });
        } else {
            providers.push({
                id: provider,
                name: getProviderName(provider),
                configured: false,
                hasApiKey: false
            });
        }
    }
    
    return providers;
}

/**
 * 获取提供商名称
 * @private
 */
function getProviderName(provider) {
    const names = {
        zhipu: '智谱AI',
        openai: 'OpenAI',
        claude: 'Claude',
        deepseek: 'DeepSeek'
    };
    
    return names[provider] || provider;
}

module.exports = {
    LLMConfig,
    validateConfig,
    getSafeConfig,
    getActiveProviderConfig,
    switchProvider,
    getAvailableProviders
};