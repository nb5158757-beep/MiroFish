  extractTopics(text) {
    // 简化的主题提取
    const topics = [];
    const words = text.toLowerCase().split(/\W+/);
    
    const commonTopics = [
      'project', 'development', 'code', 'design', 'test',
      'learning', 'research', 'study', 'practice',
      'work', 'task', 'meeting', 'report',
      'memory', 'search', 'ai', 'system'
    ];
    
    commonTopics.forEach(topic => {
      if (text.toLowerCase().includes(topic)) {
        topics.push(topic);
      }
    });
    
    return topics.length > 0 ? topics : ['general'];
  }

  searchInHall(hall, query) {
    // 模拟在Hall中搜索
    return Promise.resolve([
      { id: 1, content: `找到与${hall}相关的记忆`, relevance: 0.8 },
      { id: 2, content: `${hall}领域的相关信息`, relevance: 0.7 }
    ]);
  }

  mergeAndSortResults(results) {
    // 合并和排序结果
    const merged = results.flat();
    merged.sort((a, b) => b.relevance - a.relevance);
    return merged.slice(0, 10);
  }
}

// 堆数据结构实现
class MinHeap {
  constructor(comparator = (a, b) => a - b) {
    this.heap = [];
    this.comparator = comparator;
  }
  
  push(value) {
    this.heap.push(value);
    this.bubbleUp(this.heap.length - 1);
  }
  
  pop() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();
    
    const root = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.sinkDown(0);
    return root;
  }
  
  size() {
    return this.heap.length;
  }
  
  toArray() {
    return [...this.heap].sort(this.comparator);
  }
  
  bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.comparator(this.heap[index], this.heap[parent]) >= 0) break;
      [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
      index = parent;
    }
  }
  
  sinkDown(index) {
    const length = this.heap.length;
    while (true) {
      let left = 2 * index + 1;
      let right = 2 * index + 2;
      let smallest = index;
      
      if (left < length && this.comparator(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left;
      }
      
      if (right < length && this.comparator(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right;
      }
      
      if (smallest === index) break;
      
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

class MaxHeap extends MinHeap {
  constructor(comparator = (a, b) => b - a) {
    super(comparator);
  }
}

module.exports = MemPalaceAlgorithmAdapter;