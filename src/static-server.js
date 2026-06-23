/**
 * 静态文件服务器
 * 用于提供前端HTML、CSS、JS文件
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

class StaticServer {
    constructor(app) {
        this.app = app;
        this.publicPath = path.join(__dirname, '..', 'public');
        
        // 确保public目录存在
        if (!fs.existsSync(this.publicPath)) {
            fs.mkdirSync(this.publicPath, { recursive: true });
        }
        
        // 确保js目录存在
        const jsPath = path.join(this.publicPath, 'js');
        if (!fs.existsSync(jsPath)) {
            fs.mkdirSync(jsPath, { recursive: true });
        }
        
        this.setupStaticRoutes();
    }
    
    setupStaticRoutes() {
        // 提供静态文件
        this.app.use(express.static(this.publicPath));
        
        // 主页面路由
        this.app.get('/', (req, res) => {
            const indexPath = path.join(this.publicPath, 'index.html');
            
            if (fs.existsSync(indexPath)) {
                res.sendFile(indexPath);
            } else {
                res.status(404).json({
                    success: false,
                    message: '前端页面未找到',
                    suggestion: '请确保public/index.html文件存在'
                });
            }
        });
        
        // 健康检查
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                name: 'MemFlow AI 静态文件服务器',
                version: '0.1.0',
                environment: 'development',
                public_path: this.publicPath,
                files: this.getPublicFiles()
            });
        });
        
        // 文件列表
        this.app.get('/files', (req, res) => {
            res.json({
                success: true,
                public_path: this.publicPath,
                files: this.getPublicFiles()
            });
        });
    }
    
    getPublicFiles() {
        try {
            const files = [];
            
            function scanDir(dir, baseDir = '') {
                const items = fs.readdirSync(dir);
                
                items.forEach(item => {
                    const fullPath = path.join(dir, item);
                    const relativePath = baseDir ? path.join(baseDir, item) : item;
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        files.push({
                            name: item,
                            path: relativePath,
                            type: 'directory',
                            size: '-'
                        });
                        scanDir(fullPath, relativePath);
                    } else {
                        files.push({
                            name: item,
                            path: relativePath,
                            type: 'file',
                            size: `${(stat.size / 1024).toFixed(2)} KB`,
                            extension: path.extname(item)
                        });
                    }
                });
            }
            
            scanDir(this.publicPath);
            return files;
            
        } catch (error) {
            console.error('获取公共文件列表失败:', error);
            return [];
        }
    }
    
    // 复制JavaScript文件到public/js目录
    copyJsFiles() {
        const sourceDir = path.join(__dirname, '..', 'public', 'js');
        const targetDir = path.join(this.publicPath, 'js');
        
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // 复制app.js
        const appJsSource = path.join(__dirname, '..', 'public', 'js', 'app.js');
        const appJsTarget = path.join(targetDir, 'app.js');
        
        if (fs.existsSync(appJsSource)) {
            fs.copyFileSync(appJsSource, appJsTarget);
            console.log('✅ 复制 app.js 到 public/js/');
        }
        
        // 复制app-continued.js
        const continuedJsSource = path.join(__dirname, '..', 'public', 'js', 'app-continued.js');
        const continuedJsTarget = path.join(targetDir, 'app-continued.js');
        
        if (fs.existsSync(continuedJsSource)) {
            fs.copyFileSync(continuedJsSource, continuedJsTarget);
            console.log('✅ 复制 app-continued.js 到 public/js/');
        }
    }
}

module.exports = StaticServer;