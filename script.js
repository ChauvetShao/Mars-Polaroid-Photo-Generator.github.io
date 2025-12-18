const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const uploadInput = document.getElementById('upload');
const downloadBtn = document.getElementById('download-btn');
const loading = document.getElementById('loading');

// Config
const CONFIG = {
    width: 900,
    height: 1100,
    photoHeight: 720,
    colors: {
        bg: '#f5f1eb', // Old Paper White
        border: '#8c2f2f', // Mars Red
        divider: '#6e1f1f',
        text: '#3a0f0f',
        date: '#7a1f1f'
    },
    fonts: {
        mono: '24px "Space Mono", monospace',
        hand: '48px "LXGW WenKai", "Ma Shan Zheng", cursive'
    },
    lyrics: [
        ["在孤独里", "我依然狂奔"],
        ["星尘的尽头", "是你的回响"],
        ["这里没有引力", "只有思念"],
        ["第 19 个太阳日", "风沙很大"],
        ["记录此刻", "永恒的红"],
        ["致遥远的", "蓝色星球"],
        ["漫游指南", "丢失在风里"],
        ["不朽的", "是此刻的沉默"]
    ],
    assets: {
        flowers: Array.from({length: 16}, (_, i) => `resources/flower${i+1}.png`),
        flowerbeds: Array.from({length: 8}, (_, i) => `resources/flowerbed${i+1}.png`),
        trees: ['resources/tree.png', 'resources/tree2.png']
    }
};

function loadAsset(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.warn(`Failed to load asset: ${src}`);
            resolve(null);
        };
        img.src = src;
    });
}

async function generateMarsPolaroid() {
    if (!currentImage) return;

    // Show loading state
    loading.classList.remove('hidden');
    downloadBtn.disabled = true;

    try {
        const ctx = canvas.getContext('2d');
        const WIDTH = CONFIG.width;
        const HEIGHT = CONFIG.height;
        const PHOTO_HEIGHT = CONFIG.photoHeight;

        // 1. Pick and Load Random Resources (Collage Elements)
        const flowerCount = Math.floor(randomRange(4, 7));
        const flowerPaths = Array.from({length: flowerCount}, () => randomPick(CONFIG.assets.flowers));
        const treePath = randomPick(CONFIG.assets.trees);
        const flowerbedPath = randomPick(CONFIG.assets.flowerbeds);

        const [treeImg, flowerbedImg, ...flowerImgs] = await Promise.all([
            loadAsset(treePath),
            loadAsset(flowerbedPath),
            ...flowerPaths.map(p => loadAsset(p))
        ]);

        // 2. Setup Canvas
        canvas.width = WIDTH;
        canvas.height = HEIGHT;

        // 3. Draw Base Frame (Mars Red + Old Paper)
        drawMarsFrame(ctx, WIDTH, HEIGHT);

        // 4. Draw User Photo
        drawPhoto(ctx, currentImage, WIDTH, PHOTO_HEIGHT);

        // 5. Draw Collage Elements (Tree & Flowers)
        // Draw Tree (Left aligned, foreground)
        if (treeImg) drawTree(ctx, treeImg, HEIGHT);
        
        // Draw Flowers around frame
        drawFrameFlowers(ctx, flowerImgs.filter(img => img), WIDTH, PHOTO_HEIGHT);

        // 6. Draw Handwritten Lyrics
        const lyric = randomPick(CONFIG.lyrics);
        drawHandwrittenLyrics(ctx, lyric, WIDTH, PHOTO_HEIGHT + 80);

        // 7. Draw Date & Stamp
        drawDateAndStamp(ctx, WIDTH, HEIGHT);

        // 8. Draw Bottom Flowerbed (Foreground)
        if (flowerbedImg) drawBottomFlowerbed(ctx, flowerbedImg, WIDTH, HEIGHT);

        // 9. Apply Texture/Grain
        applyGrain(ctx, WIDTH, HEIGHT);
        
        // Enable download
        downloadBtn.disabled = false;

    } catch (error) {
        console.error("Error generating polaroid:", error);
    } finally {
        loading.classList.add('hidden');
    }
}

// === Drawing Functions ===

function drawMarsFrame(ctx, w, h) {
    // Old Paper White Background
    ctx.fillStyle = CONFIG.colors.bg;
    ctx.fillRect(0, 0, w, h);

    // Mars Red Border
    ctx.strokeStyle = CONFIG.colors.border;
    ctx.lineWidth = 12;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // Hand-drawn Divider Line
    ctx.strokeStyle = CONFIG.colors.divider;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(80, CONFIG.photoHeight + 60);
    ctx.lineTo(w - 80, CONFIG.photoHeight + 60);
    ctx.stroke();
}

function drawPhoto(ctx, img, w, h) {
    // Crop and draw image (Cover mode) to fit the photo area
    // Photo area is centered horizontally, starting from y=80
    const photoY = 80;
    const photoW = w - 160; // 80px padding on each side
    const photoH = h - 380; // Adjust height to fit above lyrics
    
    // We want a fixed photo height as per design, let's say 720 is the bottom line?
    // User code: drawPhoto(ctx, img, WIDTH, PHOTO_HEIGHT) -> ctx.drawImage(..., 80, nw, nh)
    // User code logic: const ratio = Math.max(w / img.width, h / img.height);
    // Let's adapt standard cover logic to fit inside the frame nicely
    
    const targetW = w - 100; // Slightly wider than user code implies?
    const targetH = 700;
    const targetX = 50;
    const targetY = 50;
    
    // Let's stick closer to user's "drawPhoto" logic but make it robust
    // User logic: ctx.drawImage(img, (w - nw) / 2, 80, nw, nh); 
    // This draws the WHOLE image scaled? Or cropped?
    // User's code: const ratio = Math.max(w / img.width, h / img.height);
    // This scales the image to COVER the width/height.
    
    const drawW = w - 80; // Margin 40
    const drawH = 720; // Fixed height
    const drawX = 40;
    const drawY = 40;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(drawX, drawY, drawW, drawH);
    ctx.clip();
    
    const imgRatio = img.width / img.height;
    const targetRatio = drawW / drawH;
    
    let renderW, renderH, renderX, renderY;
    
    if (imgRatio > targetRatio) {
        renderH = drawH;
        renderW = drawH * imgRatio;
        renderY = drawY;
        renderX = drawX - (renderW - drawW) / 2;
    } else {
        renderW = drawW;
        renderH = drawW / imgRatio;
        renderX = drawX;
        renderY = drawY - (renderH - drawH) / 2;
    }
    
    ctx.drawImage(img, renderX, renderY, renderW, renderH);
    
    // Inner Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.strokeRect(drawX, drawY, drawW, drawH);
    
    ctx.restore();
}

function drawHandwrittenLyrics(ctx, lines, w, startY) {
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = CONFIG.fonts.hand;
    ctx.textAlign = "left";

    let y = startY;
    lines.forEach(line => {
        const offsetX = 100 + Math.random() * 20;
        const rotate = (Math.random() - 0.5) * 0.02;

        ctx.save();
        ctx.translate(offsetX, y);
        ctx.rotate(rotate);
        ctx.fillText(line, 0, 0);
        ctx.restore();

        y += 60; // Line height
    });
}

function drawDateAndStamp(ctx, w, h) {
    const date = new Date();
    const text = `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`;

    ctx.fillStyle = CONFIG.colors.date;
    ctx.font = CONFIG.fonts.mono;
    ctx.textAlign = "right";
    ctx.fillText(text, w - 80, h - 60);

    // Stamp
    const stampX = w - 120;
    const stampY = h - 140;
    
    ctx.save();
    ctx.translate(stampX, stampY);
    ctx.rotate(randomRange(-0.2, 0.2));
    
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.strokeStyle = CONFIG.colors.date;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 16px "Space Mono"';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("MARS", 0, -5);
    ctx.font = '12px "Space Mono"';
    ctx.fillText("ARCHIVE", 0, 10);
    
    ctx.restore();
}

function applyGrain(ctx, w, h) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const grain = (Math.random() - 0.5) * 15;
        data[i] += grain;
        data[i + 1] += grain;
        data[i + 2] += grain;
    }

    ctx.putImageData(imageData, 0, 0);
}

function drawTree(ctx, img, h) {
    // Left aligned, anchored near bottom of photo area
    const scale = randomRange(0.6, 0.9);
    const w = img.width * scale;
    const renderH = img.height * scale;
    
    const maxWidth = 250;
    const renderW = Math.min(w, maxWidth);
    
    const x = -20; // Slightly off canvas
    const y = h - renderH - 100; // Anchored
    
    ctx.save();
    ctx.globalAlpha = 0.85;
    // Darken tree to match new style? Or keep original?
    // Let's add a sepia filter to blend with "Old Paper"
    ctx.filter = 'sepia(0.5) contrast(1.2)';
    ctx.drawImage(img, x, y, renderW, renderH);
    ctx.restore();
}

function drawFrameFlowers(ctx, imgs, w, h) {
    imgs.forEach(img => {
        // Position around the photo frame (40, 40, w-80, 720)
        const frameX = 40;
        const frameY = 40;
        const frameW = w - 80;
        const frameH = 720;
        
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        if (side === 0) { // Top
            x = randomRange(frameX, frameX + frameW);
            y = frameY;
        } else if (side === 1) { // Right
            x = frameX + frameW;
            y = randomRange(frameY, frameY + frameH);
        } else if (side === 2) { // Bottom
            x = randomRange(frameX, frameX + frameW);
            y = frameY + frameH;
        } else { // Left
            x = frameX;
            y = randomRange(frameY, frameY + frameH);
        }
        
        const size = randomRange(60, 100);
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(randomRange(0, Math.PI * 2));
        ctx.globalAlpha = 0.8;
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 5;
        ctx.drawImage(img, -size/2, -size/2, size, size);
        ctx.restore();
    });
}

function drawBottomFlowerbed(ctx, img, w, h) {
    const renderW = w;
    const renderH = img.height * (renderW / img.width);
    
    const x = 0;
    const y = h - renderH;
    
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.filter = 'sepia(0.3)';
    ctx.drawImage(img, x, y, renderW, renderH);
    ctx.restore();
}

// Helper: Random Utils
function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

// Redirect old function call to new one
function generatePolaroid() {
    generateMarsPolaroid();
}

