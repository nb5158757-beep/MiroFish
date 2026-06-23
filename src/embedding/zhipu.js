/**
 * 智谱AI嵌入模型集成
 * 支持代理配置，解决OpenClaw无法配置代理的问题
 */

const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');

class ZhipuEmbedding {
  /**
   * 创建智谱AI嵌入实例
   * @param {Object} config 配置对象
   * @param {string} config.apiKey 智谱AI API密钥
   * @param {string} [config.baseUrl] API基础URL
   * @param {string} [config.proxy] 代理地址，如 http://127.0.0.1:7890
   * @param {number} [config.timeout] 请求超时时间（毫秒）
   */
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.ZHIPU_API_KEY;
    this.baseUrl = config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4';
    
    // 检查是否配置了代理（直连更稳定）
    this.proxy = config.proxy && config.proxy.trim() ? config.proxy : '';
    if (!this.proxy) {
      this.proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
    }
    
    this.timeout = config.timeout || 30000;
    this.model = config.model || 'embedding-2';
    
    if (!this.apiKey) {
      throw new Error('智谱AI API密钥未配置');
    }
    
    // 创建HTTP代理agent（如果配置了有效的代理）
    this.agent = this.proxy ? new HttpsProxyAgent(this.proxy) : undefined;
    
    console.log(`[ZhipuEmbedding] 初始化完成，模型: ${this.model}${this.proxy ? ', 代理: ' + this.proxy : ', 直连'}`);
  }
  
  /**
   * 生成文本嵌入向量
   * @param {string|string[]} input 输入文本或文本数组
   * @returns {Promise<number[]|number[][]>} 嵌入向量
   */
  async embed(input) {
    const isBatch = Array.isArray(input);
    const texts = isBatch ? input : [input];
    
    try {
      const result = await this._callAPI(texts);
      
      if (isBatch) {
        // 批量返回：二维数组
        return result.data.map(item => item.embedding);
      } else {
        // 单条返回：一维数组
        return result.data[0].embedding;
      }
    } catch (error) {
      console.error('[ZhipuEmbedding] 嵌入生成失败:', error.message);
      throw error;
    }
  }
  
  /**
   * 调用智谱AI API
   * @private
   */
  async _callAPI(texts) {
    const url = new URL(`${this.baseUrl}/embeddings`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MemFlow-AI/1.0'
      },
      timeout: this.timeout
    };
    
    // 如果配置了代理，使用代理agent
    if (this.agent) {
      options.agent = this.agent;
    }
    
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              console.log(`[ZhipuEmbedding] API调用成功，token使用: ${result.usage?.total_tokens || '未知'}`);
              resolve(result);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (error) {
            reject(new Error(`响应解析失败: ${error.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`请求失败: ${error.message}`));
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`请求超时 (${this.timeout}ms)`));
      });
      
      const requestBody = JSON.stringify({
        model: this.model,
        input: texts
      });
      
      console.log(`[ZhipuEmbedding] 发送请求，文本数量: ${texts.length}, 长度: ${requestBody.length}字节`);
      req.write(requestBody);
      req.end();
    });
  }
  
  /**
   * 测试API连接
   * @returns {Promise<boolean>} 连接是否成功
   */
  async testConnection() {
    try {
      const testText = '连接测试';
      const embedding = await this.embed(testText);
      
      if (embedding && Array.isArray(embedding) && embedding.length > 0) {
        console.log(`[ZhipuEmbedding] 连接测试成功，向量维度: ${embedding.length}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[ZhipuEmbedding] 连接测试失败:', error.message);
      return false;
    }
  }
  
  /**
   * 获取模型信息
   * @returns {Object} 模型信息
   */
  getModelInfo() {
    return {
      provider: 'zhipu',
      model: this.model,
      dimensions: 1024, // 智谱AI embedding-2的维度
      maxTokens: 8192,
      supportsBatch: true,
      hasProxy: !!this.proxy
    };
  }
}

module.exports = ZhipuEmbedding;