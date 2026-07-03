import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const RELEASE_DIR = path.join(ROOT_DIR, 'release');
const TARGET_DIR = path.join(ROOT_DIR, 'src-tauri', 'target', 'release');
const BUNDLE_DIR = path.join(TARGET_DIR, 'bundle');
const APP_NAME = 'LightOfficeTools';
const VERSION = '1.0.0';

const TARGETS = {
  nsis: {
    name: '安装版 (NSIS)',
    ext: '.exe',
    dir: 'nsis',
    pattern: /setup\.exe$/i,
    outputName: `${APP_NAME}_v${VERSION}_setup.exe`
  },
  msi: {
    name: '安装版 (MSI)',
    ext: '.msi',
    dir: 'msi',
    pattern: /\.msi$/i,
    outputName: `${APP_NAME}_v${VERSION}_installer.msi`
  }
};

function logStep(msg) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${msg}`);
  console.log('='.repeat(60));
}

function logSuccess(msg) {
  console.log(`✅ ${msg}`);
}

function logError(msg) {
  console.error(`❌ ${msg}`);
}

function logInfo(msg) {
  console.log(`ℹ️  ${msg}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyDirSync(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src);
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function buildTauri(bundleType) {
  logStep(`正在构建 ${TARGETS[bundleType].name}...`);
  
  try {
    execSync(`npm run tauri build -- --bundles ${bundleType}`, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: { ...process.env }
    });
    logSuccess(`${TARGETS[bundleType].name} 构建完成`);
    return true;
  } catch (err) {
    logError(`${TARGETS[bundleType].name} 构建失败: ${err.message}`);
    return false;
  }
}

function createPortableVersion() {
  logStep('创建便携版...');
  
  let exePath = path.join(TARGET_DIR, `${APP_NAME}.exe`);
  
  if (!fs.existsSync(exePath)) {
    exePath = path.join(TARGET_DIR, `light-office-tools.exe`);
  }
  
  if (!fs.existsSync(exePath)) {
    const files = fs.readdirSync(TARGET_DIR).filter(f => f.endsWith('.exe'));
    logError(`可执行文件不存在: ${APP_NAME}.exe 或 light-office-tools.exe`);
    logInfo(`目录中的exe文件: ${files.join(', ')}`);
    return null;
  }
  
  const portableDir = path.join(RELEASE_DIR, `${APP_NAME}_v${VERSION}_portable`);
  ensureDir(portableDir);
  
  const destExe = path.join(portableDir, `${APP_NAME}.exe`);
  fs.copyFileSync(exePath, destExe);
  const filesToCopy = [];
  const srcDir = TARGET_DIR;
  const entries = fs.readdirSync(srcDir);
  
  for (const entry of entries) {
    if (entry.endsWith('.dll') || entry.endsWith('.pdb')) {
      filesToCopy.push(entry);
    }
  }
  
  for (const file of filesToCopy) {
    const src = path.join(srcDir, file);
    const dest = path.join(portableDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }
  
  const libreofficeSrc = path.join(ROOT_DIR, 'src-tauri', 'resources', 'libreoffice');
  if (fs.existsSync(libreofficeSrc)) {
    logInfo('复制 LibreOffice 到便携版目录...');
    copyDirSync(libreofficeSrc, path.join(portableDir, 'libreoffice'));
    logSuccess('LibreOffice 复制完成');
  } else {
    logInfo('LibreOffice 资源目录不存在，跳过复制');
  }
  
  const readmeContent = `轻量化办公文档工具箱 v${VERSION} 便携版

使用说明:
1. 双击 ${APP_NAME}.exe 运行
2. 无需安装，即开即用
3. 首次运行可能需要几秒钟初始化

系统要求:
- Windows 10 及以上版本
- 64 位操作系统
- 已安装 WebView2 (Windows 11 自带)

提示: 如需添加到开始菜单或创建桌面快捷方式，请使用安装版
`;
  
  fs.writeFileSync(path.join(portableDir, 'README.txt'), readmeContent, 'utf-8');
  
  const exeSize = fs.statSync(destExe).size;
  const sizeMb = (exeSize / 1024 / 1024).toFixed(2);
  
  logSuccess(`便携版已创建 (${sizeMb} MB): ${portableDir}`);
  
  return {
    target: 'portable',
    name: `${APP_NAME}_v${VERSION}_portable/`,
    size: sizeMb,
    isDir: true
  };
}

function collectInstallerFiles() {
  logStep('收集安装包到 release 目录...');
  
  ensureDir(RELEASE_DIR);
  
  const collected = [];
  
  for (const [target, info] of Object.entries(TARGETS)) {
    const searchDir = path.join(BUNDLE_DIR, info.dir);
    
    if (!fs.existsSync(searchDir)) {
      logError(`${info.name} 输出目录不存在: ${searchDir}`);
      continue;
    }
    
    const files = fs.readdirSync(searchDir);
    const found = files.find(f => info.pattern.test(f));
    
    if (found) {
      const srcPath = path.join(searchDir, found);
      const destPath = path.join(RELEASE_DIR, info.outputName);
      
      fs.copyFileSync(srcPath, destPath);
      
      const size = fs.statSync(destPath).size;
      const sizeMb = (size / 1024 / 1024).toFixed(2);
      
      logSuccess(`${info.name}: ${info.outputName} (${sizeMb} MB)`);
      collected.push({ target, name: info.outputName, size: sizeMb });
    } else {
      logError(`${info.name}: 未找到输出文件 (目录: ${searchDir})`);
      logInfo(`目录中的文件: ${files.join(', ')}`);
    }
  }
  
  return collected;
}

function writeReadme(collected) {
  const readmePath = path.join(RELEASE_DIR, 'README.txt');
  
  const content = `轻量化办公文档工具箱 v${VERSION}
${'='.repeat(50)}

发布日期: ${new Date().toLocaleDateString('zh-CN')}

包含文件:
${collected.map(c => `  - ${c.name} (${c.size} MB)`).join('\n')}

版本说明:
  - 安装版 (setup.exe / .msi): 双击运行安装，支持开始菜单快捷方式
  - 便携版 (文件夹): 无需安装，直接运行 LightOfficeTools.exe

系统要求:
  - Windows 10 及以上版本
  - 64 位操作系统
  - 已安装 WebView2 (Windows 11 自带)

功能模块:
  - PDF工具箱: 合并、拆分、压缩、转图片
  - 文档转换: Excel/CSV互转、Markdown/HTML互转、编码转换
  - 文本处理: 替换、去重、排序、统计、大小写转换
  - 编码解码: Base64、URL、哈希计算、Unicode
  - JSON工具: 格式化、校验、压缩
  - 计算转换: 时间戳转换、进制转换、UUID生成
  - 图片处理: 压缩、格式转换、尺寸调整、取色器
  - 系统辅助: 二维码生成、二维码扫描
  - 打印中心: 单文件打印、批量打印、打印队列

反馈与支持:
  - 如遇到问题，请提交 Issue

${'='.repeat(50)}
`;
  
  fs.writeFileSync(readmePath, content, 'utf-8');
  logSuccess(`已生成 README.txt`);
}

function main() {
  console.log(`
   ██████╗ ███████╗███████╗██╗ ██████╗███████╗
  ██╔═══██╗██╔════╝██╔════╝██║██╔════╝██╔════╝
  ██║   ██║█████╗  █████╗  ██║██║     █████╗  
  ██║   ██║██╔══╝  ██╔══╝  ██║██║     ██╔══╝  
  ╚██████╔╝██║     ██║     ██║╚██████╗███████╗
   ╚═════╝ ╚═╝     ╚═╝     ╚═╝ ╚═════╝╚══════╝
        Office Tools - Build Script
`);
  
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? args : ['installer', 'portable'];
  
  const wantInstaller = targets.includes('installer') || targets.includes('nsis') || targets.includes('msi');
  const wantPortable = targets.includes('portable');
  
  console.log(`目标版本: ${[
    wantInstaller ? '安装版(NSIS+MSI)' : '',
    wantPortable ? '便携版' : ''
  ].filter(Boolean).join(', ')}`);
  console.log(`版本号: ${VERSION}`);
  
  const collected = [];
  
  if (wantInstaller) {
    if (buildTauri('nsis')) {
      
    }
    if (buildTauri('msi')) {
      
    }
    const installerFiles = collectInstallerFiles();
    collected.push(...installerFiles);
  }
  
  if (wantPortable) {
    if (!wantInstaller) {
      logStep('构建 Release 版本...');
      try {
        execSync('npm run tauri build -- --no-bundle', {
          cwd: ROOT_DIR,
          stdio: 'inherit',
          env: { ...process.env }
        });
      } catch (err) {
        logError(`构建失败: ${err.message}`);
      }
    }
    
    const portable = createPortableVersion();
    if (portable) {
      collected.push(portable);
    }
  }
  
  if (collected.length > 0) {
    writeReadme(collected);
  }
  
  logStep('构建完成');
  
  console.log(`
成功: ${collected.length} 个版本

输出目录: ${RELEASE_DIR}

文件列表:
${collected.map(c => `  📦 ${c.name} (${c.size} MB)`).join('\n')}
`);
  
  if (collected.length === 0) {
    process.exit(1);
  }
}

main();
