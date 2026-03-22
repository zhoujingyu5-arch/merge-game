/**
 * 合成大西瓜 - 网页版
 * 核心游戏逻辑
 */

// 游戏配置
const CONFIG = {
    CANVAS_WIDTH: 400,
    CANVAS_HEIGHT: 600,
    GRAVITY: 0.5,
    BOUNCE: 0.3,
    FRICTION: 0.98,
    GAME_OVER_HEIGHT: 80,
    SPAWN_HEIGHT: 50,
    // 移动端适配
    isMobile: window.innerWidth <= 600
};

// 物品等级配置
const ITEM_LEVELS = [
    { level: 0, radius: 15, color: '#9C27B0', name: '葡萄', score: 10 },
    { level: 1, radius: 20, color: '#E91E63', name: '樱桃', score: 20 },
    { level: 2, radius: 25, color: '#FF5722', name: '橘子', score: 40 },
    { level: 3, radius: 30, color: '#FFEB3B', name: '柠檬', score: 80 },
    { level: 4, radius: 35, color: '#8BC34A', name: '猕猴桃', score: 160 },
    { level: 5, radius: 40, color: '#4CAF50', name: '青苹果', score: 320 },
    { level: 6, radius: 50, color: '#F44336', name: '苹果', score: 640 },
    { level: 7, radius: 60, color: '#795548', name: '椰子', score: 1280 },
    { level: 8, radius: 75, color: '#FF9800', name: '柚子', score: 2560 },
    { level: 9, radius: 90, color: '#4CAF50', name: '西瓜', score: 5120 }
];

// 游戏状态
let gameState = {
    items: [],
    score: 0,
    highScore: parseInt(localStorage.getItem('mergeGameHighScore')) || 0,
    nextItemLevel: 0,
    isGameOver: false,
    mouseX: CONFIG.CANVAS_WIDTH / 2
};

// 获取画布
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');

// 物品类
class Item {
    constructor(x, y, level) {
        this.x = x;
        this.y = y;
        this.level = level;
        this.config = ITEM_LEVELS[level];
        this.radius = this.config.radius;
        this.vx = 0;
        this.vy = 0;
        this.isDragging = false;
        this.isPreview = false;
        this.toRemove = false;
    }

    update() {
        if (this.isPreview || this.isDragging) return;

        // 重力
        this.vy += CONFIG.GRAVITY;
        
        // 摩擦力
        this.vx *= CONFIG.FRICTION;
        this.vy *= CONFIG.FRICTION;
        
        // 更新位置
        this.x += this.vx;
        this.y += this.vy;
        
        // 边界碰撞
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -CONFIG.BOUNCE;
        }
        if (this.x + this.radius > CONFIG.CANVAS_WIDTH) {
            this.x = CONFIG.CANVAS_WIDTH - this.radius;
            this.vx *= -CONFIG.BOUNCE;
        }
        if (this.y + this.radius > CONFIG.CANVAS_HEIGHT) {
            this.y = CONFIG.CANVAS_HEIGHT - this.radius;
            this.vy *= -CONFIG.BOUNCE;
        }
    }

    draw(ctx) {
        // 绘制圆形
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.config.color;
        ctx.fill();
        
        // 绘制边框
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 绘制高光
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fill();
        
        // 绘制文字
        ctx.fillStyle = 'white';
        ctx.font = `bold ${this.radius * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.config.name, this.x, this.y);
    }
}

// 初始化游戏
function init() {
    // 移动端适配画布大小
    setupCanvas();
    
    updateScoreDisplay();
    generateNextItem();
    
    // 鼠标/触摸事件
    setupInputEvents();
    
    // 开始游戏循环
    gameLoop();
}

// 设置画布大小
function setupCanvas() {
    const maxWidth = Math.min(window.innerWidth - 20, 400);
    const scale = maxWidth / CONFIG.CANVAS_WIDTH;
    
    if (scale < 1) {
        canvas.style.width = maxWidth + 'px';
        canvas.style.height = (CONFIG.CANVAS_HEIGHT * scale) + 'px';
    }
}

// 设置输入事件
function setupInputEvents() {
    // 鼠标事件
    canvas.addEventListener('mousemove', handleInputMove);
    canvas.addEventListener('mousedown', handleInputStart);
    
    // 触摸事件
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // 防止页面滚动
    document.body.addEventListener('touchmove', function(e) {
        if (e.target === canvas) {
            e.preventDefault();
        }
    }, { passive: false });
}

// 处理输入移动
function handleInputMove(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
    gameState.mouseX = (e.clientX - rect.left) * scaleX;
}

// 处理输入开始（点击/触摸）
function handleInputStart(e) {
    if (CONFIG.isMobile) {
        dropItem();
    }
}

// 处理触摸开始
function handleTouchStart(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
    gameState.mouseX = (e.touches[0].clientX - rect.left) * scaleX;
    
    // 移动端触摸即掉落
    dropItem();
}

// 处理触摸移动
function handleTouchMove(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
    gameState.mouseX = (e.touches[0].clientX - rect.left) * scaleX;
}

// 生成下一个物品
function generateNextItem() {
    gameState.nextItemLevel = Math.floor(Math.random() * 3); // 0-2级随机
    drawPreview();
}

// 绘制预览
function drawPreview() {
    previewCtx.clearRect(0, 0, 50, 50);
    const config = ITEM_LEVELS[gameState.nextItemLevel];
    
    previewCtx.beginPath();
    previewCtx.arc(25, 25, config.radius * 0.8, 0, Math.PI * 2);
    previewCtx.fillStyle = config.color;
    previewCtx.fill();
    previewCtx.strokeStyle = 'rgba(0,0,0,0.2)';
    previewCtx.lineWidth = 2;
    previewCtx.stroke();
}

// 掉落物品
function dropItem() {
    if (gameState.isGameOver) return;
    
    const x = Math.max(30, Math.min(CONFIG.CANVAS_WIDTH - 30, gameState.mouseX));
    const item = new Item(x, CONFIG.SPAWN_HEIGHT, gameState.nextItemLevel);
    gameState.items.push(item);
    
    generateNextItem();
}

// 检查碰撞
function checkCollisions() {
    for (let i = 0; i < gameState.items.length; i++) {
        for (let j = i + 1; j < gameState.items.length; j++) {
            const item1 = gameState.items[i];
            const item2 = gameState.items[j];
            
            if (item1.toRemove || item2.toRemove) continue;
            
            const dx = item2.x - item1.x;
            const dy = item2.y - item1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = item1.radius + item2.radius;
            
            if (distance < minDistance) {
                // 相同等级可以合成
                if (item1.level === item2.level && item1.level < ITEM_LEVELS.length - 1) {
                    mergeItems(item1, item2);
                } else {
                    // 物理反弹
                    const angle = Math.atan2(dy, dx);
                    const targetX = item1.x + Math.cos(angle) * minDistance;
                    const targetY = item1.y + Math.sin(angle) * minDistance;
                    
                    const ax = (targetX - item2.x) * 0.1;
                    const ay = (targetY - item2.y) * 0.1;
                    
                    item1.vx -= ax;
                    item1.vy -= ay;
                    item2.vx += ax;
                    item2.vy += ay;
                }
            }
        }
    }
}

// 合成物品
function mergeItems(item1, item2) {
    item1.toRemove = true;
    item2.toRemove = true;
    
    const newX = (item1.x + item2.x) / 2;
    const newY = (item1.y + item2.y) / 2;
    const newLevel = item1.level + 1;
    
    // 添加分数
    gameState.score += ITEM_LEVELS[newLevel].score;
    updateScoreDisplay();
    
    // 创建新物品
    const newItem = new Item(newX, newY, newLevel);
    newItem.vx = (item1.vx + item2.vx) / 2;
    newItem.vy = (item1.vy + item2.vy) / 2;
    gameState.items.push(newItem);
    
    // 播放合成特效（可以在这里添加粒子效果）
    console.log(`合成! ${ITEM_LEVELS[item1.level].name} → ${ITEM_LEVELS[newLevel].name}`);
}

// 检查游戏结束
function checkGameOver() {
    for (const item of gameState.items) {
        if (!item.isPreview && item.y - item.radius < CONFIG.GAME_OVER_HEIGHT) {
            // 检查是否稳定（速度很小）
            if (Math.abs(item.vy) < 0.5 && Math.abs(item.vx) < 0.5) {
                gameOver();
                return;
            }
        }
    }
}

// 游戏结束
function gameOver() {
    gameState.isGameOver = true;
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('gameOver').style.display = 'flex';
}

// 重置游戏
function resetGame() {
    gameState.items = [];
    gameState.score = 0;
    gameState.isGameOver = false;
    updateScoreDisplay();
    generateNextItem();
    document.getElementById('gameOver').style.display = 'none';
}

// 更新分数显示
function updateScoreDisplay() {
    document.getElementById('score').textContent = gameState.score;
    
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('mergeGameHighScore', gameState.highScore);
    }
    
    document.getElementById('highScore').textContent = gameState.highScore;
}

// 看广告获得高级物品
function watchAdForItem() {
    // 模拟观看广告
    alert('📺 观看广告中... (模拟)\n\n获得高级物品!');
    
    const x = Math.max(50, Math.min(CONFIG.CANVAS_WIDTH - 50, gameState.mouseX));
    const highLevel = Math.min(Math.floor(gameState.nextItemLevel + 3), ITEM_LEVELS.length - 1);
    const item = new Item(x, CONFIG.SPAWN_HEIGHT, highLevel);
    gameState.items.push(item);
}

// 看广告双倍分数
function watchAdForScore() {
    // 模拟观看广告
    alert('📺 观看广告中... (模拟)\n\n分数翻倍!');
    
    gameState.score *= 2;
    updateScoreDisplay();
}

// 游戏主循环
function gameLoop() {
    // 清空画布
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // 绘制游戏结束线
    ctx.strokeStyle = 'rgba(255,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.GAME_OVER_HEIGHT);
    ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.GAME_OVER_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // 绘制下一个物品的预览位置
    if (!gameState.isGameOver) {
        const config = ITEM_LEVELS[gameState.nextItemLevel];
        const previewX = Math.max(config.radius, Math.min(CONFIG.CANVAS_WIDTH - config.radius, gameState.mouseX));
        
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(previewX, CONFIG.SPAWN_HEIGHT, config.radius, 0, Math.PI * 2);
        ctx.fillStyle = config.color;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    // 更新和绘制所有物品
    gameState.items = gameState.items.filter(item => !item.toRemove);
    
    for (const item of gameState.items) {
        item.update();
        item.draw(ctx);
    }
    
    // 检查碰撞
    checkCollisions();
    
    // 检查游戏结束
    if (!gameState.isGameOver) {
        checkGameOver();
    }
    
    // 继续下一帧
    requestAnimationFrame(gameLoop);
}

// 启动游戏
init();
