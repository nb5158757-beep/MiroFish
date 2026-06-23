  exportToMarkdown(skills) {
    let md = `# MemFlow AI 技能库导出\n\n`;
    md += `导出时间: ${new Date().toISOString()}\n`;
    md += `技能数量: ${skills.length}\n\n`;
    
    md += `## 技能列表\n\n`;
    
    skills.forEach((skill, index) => {
      md += `### ${index + 1}. ${skill.name}\n\n`;
      md += `- **ID**: ${skill.id}\n`;
      md += `- **版本**: ${skill.version}\n`;
      md += `- **类型**: ${skill.features.type}\n`;
      md += `- **分类**: ${skill.features.category}\n`;
      md += `- **领域**: ${skill.features.domain || '通用'}\n`;
      md += `- **熟练度**: ${(skill.proficiency * 100).toFixed(1)}%\n`;
      md += `- **成功率**: ${(skill.successRate * 100).toFixed(1)}%\n`;
      md += `- **使用次数**: ${skill.usageCount}\n`;
      md += `- **最后使用**: ${skill.lastUsed || '从未使用'}\n`;
      md += `- **描述**: ${skill.description || '无描述'}\n`;
      
      if (skill.tags && skill.tags.length > 0) {
        md += `- **标签**: ${skill.tags.join(', ')}\n`;
      }
      
      if (skill.features.keywords && skill.features.keywords.length > 0) {
        md += `- **关键词**: ${skill.features.keywords.slice(0, 5).join(', ')}\n`;
      }
      
      md += `\n`;
    });
    
    // 添加统计信息
    const stats = this.getStatistics();
    md += `## 统计信息\n\n`;
    md += `- **总技能数**: ${stats.totalSkills}\n`;
    md += `- **平均熟练度**: ${(stats.averageProficiency * 100).toFixed(1)}%\n`;
    md += `- **平均成功率**: ${(stats.averageSuccessRate * 100).toFixed(1)}%\n\n`;
    
    md += `### 按分类统计\n`;
    Object.entries(stats.byCategory).forEach(([category, count]) => {
      md += `- ${category}: ${count}个技能\n`;
    });
    
    return md;
  }
}

module.exports = SkillRepository;