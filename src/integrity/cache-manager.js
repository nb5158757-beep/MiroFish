/**
 * MemFlow AI 完整性检查缓存管理器
 * 三级缓存策略优化性能
 */

class CacheManager {
  constructor(options = {}) {
    this.options = {
      l1MaxSize: 1000,      // L1缓存最大条目数
      l2MaxSize: 10000,     // L2缓存最大条目数
      l1TTL: 300000,        // L1缓存TTL(5分钟)
      l2TTL: 3600000,       // L2缓存TTL(1小时)
      cleanupInterval: 60000, // 清理间隔(1分钟)
      ...options
    };
    
    // 三级缓存
    this.l1Cache = new Map();  // 内存缓存（快速）
    this.l2Cache = new Map();  // 持久缓存（模拟）
    this.l3Cache = null;       // 分布式缓存（预留）
    
    // 缓存统计
    this.stats = {
      l1Hits: 0,
      l2Hits: 0,
      l3Hits: 0,
      misses: 0,
      writes: 0,
      evictions: 0,
      totalOperations: 0
    };
    
    // 启动定期清理
    this.startCleanupTimer();
  }

  /**
   * 获取缓存值
   */
  async get(key, category = 'default') {
    this.stats.totalOperations++;
    
    const fullKey = `${category}:${key}`;
    
    // 1. 检查L1缓存
    const l1Entry = this.l1Cache.get(fullKey);
    if (l1Entry && !this.isExpired(l1Entry)) {
      this.stats.l1Hits++;
      l1Entry.accessCount++;
      l1Entry.lastAccessed = Date.now();
      return l1Entry.value;
    }
    
    // 2. 检查L2缓存
    const l2Entry = this.l2Cache.get(fullKey);
    if (l2Entry && !this.isExpired(l2Entry)) {
      this.stats.l2Hits++;
      
      // 提升到L1缓存
      this.setL1(fullKey, l2Entry.value, l2Entry.category);
      
      l2Entry.accessCount++;
      l2Entry.lastAccessed = Date.now();
      return l2Entry.value;
    }
    
    // 3. 检查L3缓存（预留）
    if (this.l3Cache) {
      // 这里可以集成Redis等分布式缓存
    }
    
    // 缓存未命中
    this.stats.misses++;
    return null;
  }

  /**
   * 设置缓存值
   */
  async set(key, value, category = 'default', ttl = null) {
    this.stats.totalOperations++;
    this.stats.writes++;
    
    const fullKey = `${category}:${key}`;
    const actualTTL = ttl || this.getDefaultTTL(category);
    
    // 设置到L1和L2缓存
    this.setL1(fullKey, value, category, actualTTL);
    this.setL2(fullKey, value, category, actualTTL);
    
    return true;
  }

  /**
   * 设置L1缓存
   */
  setL1(key, value, category, ttl = null) {
    const entry = {
      value,
      category,
      ttl: ttl || this.options.l1TTL,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1
    };
    
    // 检查缓存大小，必要时淘汰
    if (this.l1Cache.size >= this.options.l1MaxSize) {
      this.evictFromL1();
    }
    
    this.l1Cache.set(key, entry);
    return entry;
  }

  /**
   * 设置L2缓存
   */
  setL2(key, value, category, ttl = null) {
    const entry = {
      value,
      category,
      ttl: ttl || this.options.l2TTL,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1
    };
    
    // 检查缓存大小，必要时淘汰
    if (this.l2Cache.size >= this.options.l2MaxSize) {
      this.evictFromL2();
    }
    
    this.l2Cache.set(key, entry);
    return entry;
  }

  /**
   * 从L1缓存淘汰
   */
  evictFromL1() {
    if (this.l1Cache.size === 0) return;
    
    // LRU淘汰策略：淘汰最近最少使用的
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.l1Cache.delete(oldestKey);
      this.stats.evictions++;
      console.log(`🗑️ L1缓存淘汰: ${oldestKey}`);
    }
  }

  /**
   * 从L2缓存淘汰
   */
  evictFromL2() {
    if (this.l2Cache.size === 0) return;
    
    // LFU淘汰策略：淘汰访问次数最少的
    let leastFrequentKey = null;
    let minAccessCount = Infinity;
    
    for (const [key, entry] of this.l2Cache.entries()) {
      if (entry.accessCount < minAccessCount) {
        minAccessCount = entry.accessCount;
        leastFrequentKey = key;
      }
    }
    
    if (leastFrequentKey) {
      this.l2Cache.delete(leastFrequentKey);
      this.stats.evictions++;
      console.log(`🗑️ L2缓存淘汰: ${leastFrequentKey}`);
    }
  }

  /**
   * 检查是否过期
   */
  isExpired(entry) {
    if (!entry || !entry.createdAt || !entry.ttl) {
      return true;
    }
    
    const now = Date.now();
    return now - entry.createdAt > entry.ttl;
  }

  /**
   * 获取默认TTL
   */
  getDefaultTTL(category) {
    const categoryTTL = {
      'similarity': 300000,      // 5分钟
      'embedding': 1800000,      // 30分钟
      'contradiction': 600000,   // 10分钟
      'time_analysis': 300000,   // 5分钟
      'logical_analysis': 600000, // 10分钟
      'default': 300000          // 5分钟
    };
    
    return categoryTTL[category] || this.options.l1TTL;
  }

  /**
   * 删除缓存
   */
  async delete(key, category = 'default') {
    const fullKey = `${category}:${key}`;
    
    let deleted = false;
    
    if (this.l1Cache.has(fullKey)) {
      this.l1Cache.delete(fullKey);
      deleted = true;
    }
    
    if (this.l2Cache.has(fullKey)) {
      this.l2Cache.delete(fullKey);
      deleted = true;
    }
    
    return deleted;
  }

  /**
   * 清除类别缓存
   */
  async clearCategory(category) {
    const prefix = `${category}:`;
    
    // 清除L1缓存
    for (const key of this.l1Cache.keys()) {
      if (key.startsWith(prefix)) {
        this.l1Cache.delete(key);
      }
    }
    
    // 清除L2缓存
    for (const key of this.l2Cache.keys()) {
      if (key.startsWith(prefix)) {
        this.l2Cache.delete(key);
      }
    }
    
    console.log(`🗑️ 清除类别缓存: ${category}`);
    return true;
  }

  /**
   * 清除所有缓存
   */
  async clearAll() {
    this.l1Cache.clear();
    this.l2Cache.clear();
    
    this.stats = {
      l1Hits: 0,
      l2Hits: 0,
      l3Hits: 0,
      misses: 0,
      writes: 0,
      evictions: 0,
      totalOperations: 0
    };
    
    console.log('🗑️ 所有缓存已清除');
    return true;
  }

  /**
   * 启动清理定时器
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupExpired();
    }, this.options.cleanupInterval);
  }

  /**
   * 清理过期缓存
   */
  cleanupExpired() {
    const now = Date.now();
    let l1Cleaned = 0;
    let l2Cleaned = 0;
    
    // 清理L1过期缓存
    for (const [key, entry] of this.l1Cache.entries()) {
      if (this.isExpired(entry)) {
        this.l1Cache.delete(key);
        l1Cleaned++;
      }
    }
    
    // 清理L2过期缓存
    for (const [key, entry] of this.l2Cache.entries()) {
      if (this.isExpired(entry)) {
        this.l2Cache.delete(key);
        l2Cleaned++;
      }
    }
    
    if (l1Cleaned > 0 || l2Cleaned > 0) {
      console.log(`🧹 清理过期缓存: L1=${l1Cleaned}, L2=${l2Cleaned}`);
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const totalHits = this.stats.l1Hits + this.stats.l2Hits + this.stats.l3Hits;
    const totalRequests = this.stats.totalOperations;
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    
    return {
      ...this.stats,
      cacheSizes: {
        l1: this.l1Cache.size,
        l2: this.l2Cache.size,
        l3: this.l3Cache ? 'connected' : 'disabled'
      },
      hitRate: hitRate.toFixed(2) + '%',
      l1HitRate: totalRequests > 0 ? (this.stats.l1Hits / totalRequests * 100).toFixed(2) + '%' : '0%',
      l2HitRate: totalRequests > 0 ? (this.stats.l2Hits / totalRequests * 100).toFixed(2) + '%' : '0%',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 预热缓存
   */
  async warmup(keys, category = 'default') {
    console.log(`🔥 预热缓存: ${keys.length}个键, 类别: ${category}`);
    
    let warmed = 0;
    for (const key of keys) {
      // 这里可以预加载常用数据
      // 实际实现中会根据具体需求预加载
      warmed++;
    }
    
    console.log(`✅ 缓存预热完成: ${warmed}个键`);
    return warmed;
  }

  /**
   * 导出缓存数据（用于调试）
   */
  exportCacheData(limit = 100) {
    const data = {
      l1: [],
      l2: [],
      stats: this.getStats(),
      exportTime: new Date().toISOString()
    };
    
    // 导出L1缓存（限制数量）
    let count = 0;
    for (const [key, entry] of this.l1Cache.entries()) {
      if (count >= limit) break;
      
      data.l1.push({
        key,
        category: entry.category,
        age: Date.now() - entry.createdAt,
        accessCount: entry.accessCount,
        ttl: entry.ttl
      });
      count++;
    }
    
    // 导出L2缓存（限制数量）
    count = 0;
    for (const [key, entry] of this.l2Cache.entries()) {
      if (count >= limit) break;
      
      data.l2.push({
        key,
        category: entry.category,
        age: Date.now() - entry.createdAt,
        accessCount: entry.accessCount,
        ttl: entry.ttl
      });
      count++;
    }
    
    return data;
  }

  /**
   * 性能测试
   */
  async performanceTest(iterations = 1000) {
    console.log(`🧪 开始缓存性能测试: ${iterations}次迭代`);
    
    const startTime = Date.now();
    
    // 测试写入性能
    const writeStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await this.set(`test_key_${i}`, `test_value_${i}`, 'performance_test');
    }
    const writeTime = Date.now() - writeStart;
    
    // 测试读取性能
    const readStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await this.get(`test_key_${i}`, 'performance_test');
    }
    const readTime = Date.now() - readStart;
    
    // 测试混合操作
    const mixedStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      if (i % 2 === 0) {
        await this.set(`mixed_key_${i}`, `mixed_value_${i}`, 'performance_test');
      } else {
        await this.get(`mixed_key_${i - 1}`, 'performance_test');
      }
    }
    const mixedTime = Date.now() - mixedStart;
    
    const totalTime = Date.now() - startTime;
    
    // 清理测试数据
    await this.clearCategory('performance_test');
    
    return {
      iterations,
      writeTime: `${writeTime}ms (${(writeTime / iterations).toFixed(3)}ms/op)`,
      readTime: `${readTime}ms (${(readTime / iterations).toFixed(3)}ms/op)`,
      mixedTime: `${mixedTime}ms (${(mixedTime / iterations).toFixed(3)}ms/op)`,
      totalTime: `${totalTime}ms`,
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };
  }
}

// 导出模块
module.exports = CacheManager;