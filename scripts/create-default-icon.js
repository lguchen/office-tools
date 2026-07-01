import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'app-icon.png');

const SIZE = 1024;

function createSvgIcon() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#a8d8ff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6bb3ff;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e8f4ff;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.15"/>
    </filter>
  </defs>
  
  <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="180" ry="180" fill="url(#bgGradient)"/>
  
  <g transform="translate(140, 200)" filter="url(#shadow)">
    <rect x="0" y="20" width="40" height="100" rx="20" fill="white" opacity="0.95"/>
    <rect x="0" y="460" width="40" height="100" rx="20" fill="white" opacity="0.95"/>
    <rect x="120" y="0" width="280" height="600" rx="20" fill="white" opacity="0.95"/>
    <rect x="160" y="60" width="200" height="70" rx="8" fill="#a8d8ff"/>
    <rect x="160" y="160" width="200" height="70" rx="8" fill="#a8d8ff"/>
    <rect x="160" y="260" width="200" height="70" rx="8" fill="#a8d8ff"/>
    <rect x="160" y="360" width="200" height="70" rx="8" fill="#a8d8ff"/>
    <rect x="160" y="460" width="200" height="70" rx="8" fill="#a8d8ff"/>
    <rect x="120" y="300" width="120" height="20" rx="10" fill="white" opacity="0.95"/>
  </g>
  
  <g transform="translate(450, 140)" filter="url(#shadow)">
    <path d="M0 40 L260 40 L360 140 L360 320 L0 320 Z" fill="white" opacity="0.95"/>
    <path d="M260 40 L260 140 L360 140" fill="none" stroke="white" stroke-width="6" opacity="0.8"/>
    <rect x="40" y="120" width="200" height="16" rx="8" fill="#a8d8ff"/>
    <rect x="40" y="160" width="200" height="16" rx="8" fill="#a8d8ff"/>
    <rect x="40" y="200" width="200" height="16" rx="8" fill="#a8d8ff"/>
    <rect x="40" y="240" width="140" height="16" rx="8" fill="#a8d8ff"/>
  </g>
  
  <g transform="translate(420, 480)" filter="url(#shadow)">
    <rect x="0" y="0" width="480" height="360" rx="20" fill="white" opacity="0.95"/>
    <rect x="30" y="30" width="420" height="40" rx="8" fill="#a8d8ff"/>
    <text x="50" y="62" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#6bb3ff">212</text>
    <rect x="140" y="35" width="260" height="14" rx="7" fill="#a8d8ff"/>
    <rect x="30" y="90" width="420" height="12" rx="6" fill="#a8d8ff" opacity="0.6"/>
    <rect x="30" y="120" width="380" height="12" rx="6" fill="#a8d8ff" opacity="0.6"/>
    <rect x="30" y="150" width="400" height="12" rx="6" fill="#a8d8ff" opacity="0.6"/>
    <rect x="30" y="180" width="350" height="12" rx="6" fill="#a8d8ff" opacity="0.6"/>
    <rect x="30" y="210" width="420" height="12" rx="6" fill="#a8d8ff" opacity="0.6"/>
    <rect x="30" y="240" width="380" height="12" rx="6" fill="#a8d8ff" opacity="0.6"/>
    <rect x="30" y="270" width="400" height="12" rx="6" fill="#a8d8ff" opacity="0.6"/>
  </g>
  
  <g transform="translate(380, 420)" opacity="0.9">
    <path d="M40 0 L20 0 Q0 0 0 20 L0 40" fill="none" stroke="white" stroke-width="24" stroke-linecap="round"/>
    <path d="M460 0 L480 0 Q500 0 500 20 L500 40" fill="none" stroke="white" stroke-width="24" stroke-linecap="round"/>
    <path d="M40 400 L20 400 Q0 400 0 380 L0 360" fill="none" stroke="white" stroke-width="24" stroke-linecap="round"/>
    <path d="M460 400 L480 400 Q500 400 500 380 L500 360" fill="none" stroke="white" stroke-width="24" stroke-linecap="round"/>
  </g>
  
  <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="180" ry="180" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="4"/>
</svg>`;
}

async function generateDefaultIcon() {
  console.log('🎨 生成默认应用图标...');
  
  const svg = createSvgIcon();
  const svgBuffer = Buffer.from(svg);
  
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  await sharp(svgBuffer)
    .png()
    .toFile(OUTPUT_PATH);
  
  console.log(`✅ 默认图标已生成: ${OUTPUT_PATH}`);
  console.log('');
  console.log('使用方法:');
  console.log('  1. 将你的图标图片放在 public/app-icon.png');
  console.log('  2. 运行 npm run generate-icons 生成所有尺寸的图标');
  console.log('');
  console.log('或者直接指定图片路径:');
  console.log('  npm run generate-icons -- path/to/your/icon.png');
}

generateDefaultIcon().catch(err => {
  console.error('生成图标失败:', err);
  process.exit(1);
});
