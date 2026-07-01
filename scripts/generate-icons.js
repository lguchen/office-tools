import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ICONS_DIR = path.join(__dirname, '..', 'src-tauri', 'icons');
const DEFAULT_SOURCE = path.join(__dirname, '..', 'public', 'app-icon.png');

const sourceImage = process.argv[2] || DEFAULT_SOURCE;

const ICON_SIZES = [
  { size: 32, name: '32x32.png' },
  { size: 128, name: '128x128.png' },
  { size: 256, name: '128x128@2x.png' },
  { size: 32, name: 'icon.ico', format: 'ico' },
  { size: 512, name: 'icon.png' },
  { size: 512, name: 'icon.icns', format: 'png' },
];

async function generateIcons() {
  if (!fs.existsSync(sourceImage)) {
    console.error(`❌ 源图片不存在: ${sourceImage}`);
    console.log('');
    console.log('使用方法:');
    console.log('  npm run generate-icons -- path/to/your/image.png');
    console.log('');
    console.log('或者将图片放在 public/app-icon.png 然后直接运行:');
    console.log('  npm run generate-icons');
    process.exit(1);
  }

  console.log(`🎨 正在从 ${sourceImage} 生成图标...`);
  console.log('');

  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  for (const icon of ICON_SIZES) {
    const outputPath = path.join(ICONS_DIR, icon.name);
    
    try {
      let pipeline = sharp(sourceImage).resize(icon.size, icon.size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });

      if (icon.format === 'ico') {
        pipeline = pipeline.png();
        await pipeline.toFile(outputPath);
      } else {
        await pipeline.png().toFile(outputPath);
      }
      
      console.log(`  ✅ ${icon.name} (${icon.size}x${icon.size})`);
    } catch (err) {
      console.error(`  ❌ ${icon.name} 生成失败:`, err.message);
    }
  }

  console.log('');
  console.log('✅ 图标生成完成!');
  console.log(`   输出目录: ${ICONS_DIR}`);
  console.log('');
  console.log('提示: 对于 Windows 的 .ico 文件和 macOS 的 .icns 文件，');
  console.log('      建议使用专业工具（如 icotool、iconutil）生成，');
  console.log('      或运行 npm run tauri icon path/to/image.png');
}

generateIcons().catch(err => {
  console.error('生成图标时出错:', err);
  process.exit(1);
});
