<div align="center">

[English Doc → README.md](README.md)

</div>

<div align="center">

![版本](https://img.shields.io/badge/版本-1.0.0-blue?style=for-the-badge)
![构建状态](https://img.shields.io/badge/构建-通过-brightgreen?style=for-the-badge)
![许可证](https://img.shields.io/badge/许可证-MIT-orange?style=for-the-badge)
![Stars](https://img.shields.io/github/stars/YOUR_USERNAME/YOUR_REPO?style=for-the-badge)
![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D6?style=for-the-badge&logo=windows&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-1.75%2B-DEA584?style=for-the-badge&logo=rust&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3.4-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white)

</div>

---

<div align="center">

# 轻量化办公文档工具箱

### 一款轻量级、完全离线的桌面办公工具集

**完全离线 · 秒开即用 · 隐私优先 · 无冗余**

</div>

---

## 📌 项目简介

轻量化办公文档工具箱（Light Office Tools）是一款基于 Tauri 2.0 构建的桌面应用，提供一整套办公文档处理实用工具。与那些需要安装、依赖网络的臃肿办公套件不同，本工具完全在本地运行，即开即用，绝不会将您的数据上传到云端。

### 🎯 解决的痛点

- **无需网络** — 所有功能离线可用，完美适配受限网络环境
- **告别臃肿** — 单个轻量级可执行文件，便携版无需安装
- **隐私保护** — 所有处理在本地完成，您的文件绝不会离开您的电脑
- **工具整合** — 用一个统一工具替代数十个单一用途的网站和小应用

### 🌟 核心亮点

1. **100% 离线** — 所有处理均在本地运行，除可选的 OCR 模型下载外无任何网络请求
2. **极速启动** — Rust 驱动的后端 + WebView2 前端，1 秒内启动完成
3. **功能丰富** — 30+ 工具，涵盖文本、图片、PDF、编解码、计算、打印等
4. **清爽界面** — 现代化界面设计，支持明暗主题、毛玻璃效果、直观布局

---

## 📑 目录

- [项目简介](#-项目简介)
- [功能特性](#-功能特性)
- [技术栈](#-技术栈)
- [前置环境](#-前置环境)
- [快速上手](#-快速上手)
- [配置说明](#-配置说明)
- [项目结构](#-项目结构)
- [开发脚本](#-开发脚本)
- [使用示例](#-使用示例)
- [常见问题](#-常见问题)
- [贡献指南](#-贡献指南)
- [更新日志](#-更新日志)
- [开源许可证](#-开源许可证)
- [联系方式](#-联系方式)

---

## ✨ 功能特性

### 🟢 基础功能

| 分类 | 工具列表 |
|------|----------|
| **文本处理** | 文本替换、去重、排序、统计、大小写转换 |
| **编码 / 解码** | Base64、URL 编码、Unicode、哈希计算 (MD5/SHA1/SHA256/SHA512) |
| **JSON 工具** | 格式化、校验、压缩/精简 |
| **计算工具** | 时间戳转换、进制转换、UUID 生成器 |
| **图片工具** | 压缩、格式转换、尺寸调整、取色器 |
| **文档转换** | Excel 转换、Markdown 转换、编码转换 |
| **PDF 工具** | 合并、分割、压缩、PDF 转图片 |
| **二维码** | 生成二维码、图片识别二维码 |
| **打印管理** | 单文件打印、批量打印、打印队列、打印机管理 |

### 🔵 高级功能

- **拖拽上传** — 全局拖拽支持，自动识别文件类型
- **批量处理** — 基于队列的批量处理，支持暂停/继续
- **文件预览** — 内置预览面板，支持左右拖拽调整大小
- **主题支持** — 明暗双主题，毛玻璃设计风格
- **多格式支持** — 处理常见办公文档格式（PDF、Excel、Word、图片）
- **打印机管理** — 网络打印机扫描、打印机保存、连接测试
- **便携模式** — 所有数据与可执行文件同目录，不修改系统设置

---

## 🛠️ 技术栈

### 前端

- **框架**: Vue 3.4（Composition API + `<script setup>`）
- **构建工具**: Vite 5.2
- **开发语言**: TypeScript 5.4
- **UI 组件库**: Naive UI 2.38
- **CSS 框架**: Tailwind CSS 3.4
- **状态管理**: Pinia 2.1
- **路由**: Vue Router 4.3
- **图标库**: @vicons/ionicons5

### 后端（Rust）

- **框架**: Tauri 2.0
- **版本**: Rust 2021
- **核心依赖**:
  - `lopdf` — PDF 文档操作
  - `image` — 图片处理（RustImage 库）
  - `qrcode` — 二维码生成
  - `sha2` / `sha1` / `md-5` — 加密哈希
  - `base64` — Base64 编解码
  - `encoding_rs` — 字符编码转换
  - `tokio` — 异步运行时
  - `serde` / `serde_json` — 序列化

### 前端工具库

- `pdf-lib` — PDF 创建与修改
- `xlsx` (SheetJS) — Excel 文件处理
- `mammoth` — Word 文档转 HTML
- `marked` — Markdown 解析
- `tesseract.js` — OCR（JavaScript 备选方案）
- `jimp` / `sharp` — 图片处理

### 工具链

- **包管理器**: npm
- **版本控制**: Git
- **CI/CD**: [在此填写您的 CI 工具]

---

## 📋 前置环境

### 系统要求

| 组件 | 最低配置 | 推荐配置 |
|------|----------|----------|
| **操作系统** | Windows 10 1809+ | Windows 11 22H2+ |
| **WebView2** | 运行时已预装 | 最新稳定版 |
| **内存** | 2 GB | 4 GB+ |
| **磁盘空间** | 50 MB | 200 MB+（含 OCR 模型） |
| **CPU** | x86_64 / ARM64 | 多核处理器 |

### 开发环境

- **Node.js**: >= 18.0.0（推荐 LTS 版本：20.x）
- **npm**: >= 9.0.0
- **Rust**: >= 1.75.0（stable 通道）
- **Microsoft Visual Studio Build Tools**（仅 Windows）:
  - "使用 C++ 的桌面开发" 工作负载
  - Windows 10/11 SDK
- **WebView2** — Windows 11 已预装；Windows 10 需手动下载

### 环境变量

无需强制配置任何环境变量。可选配置项：

```bash
# 可选：自定义缓存目录
# LIGHT_OFFICE_CACHE_DIR=/path/to/cache

# 可选：自定义 OCR 模型目录
# LIGHT_OFFICE_OCR_MODELS_DIR=/path/to/ocr_models
```

### API 密钥 / 凭证

本项目不需要任何 API 密钥或第三方服务凭证。所有功能均可离线使用。

---

## 🚀 快速上手

### 方案一：本地开发启动

#### 1. 克隆仓库

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

#### 2. 安装前端依赖

```bash
# 使用 npm
npm install

# 或使用 pnpm（推荐）
# pnpm install
```

#### 3. 安装 Rust 依赖

Rust 依赖由 Cargo 自动获取。验证 Rust 安装：

```bash
rustc --version
cargo --version
```

如果未安装 Rust，请从 [rustup.rs](https://rustup.rs/) 安装。

#### 4. 启动开发服务器

```bash
# 启动 Tauri 开发模式（前端 + 后端一起启动）
npm run tauri:dev

# 或仅启动前端（浏览器预览）
npm run dev
```

#### 5. 访问应用

- **Tauri 开发模式**: 应用窗口自动打开
- **浏览器预览**: 访问 `http://localhost:1420`

> **注意**: 浏览器预览不包含 Rust 后端功能（文件操作、打印等）。使用 Tauri 开发模式以获得完整功能。

---

### 方案二：Docker / docker-compose 一键部署

> **注意**: 这是一款桌面 Tauri 应用。Docker 主要用于 CI/构建环境。

#### Dockerfile（构建环境）

```dockerfile
FROM rust:1.75-bullseye

# 安装 Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# 安装 WebView2 依赖（用于无头构建）
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

WORKDIR /app

# 复制 package 文件并安装依赖
COPY package.json package-lock.json ./
RUN npm ci

# 复制 Rust 清单
COPY src-tauri/Cargo.toml src-tauri/Cargo.lock ./src-tauri/

# 复制源代码
COPY . .

# 构建应用
RUN npm run build
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  build-env:
    build: .
    volumes:
      - ./dist-release:/app/dist-release
    command: npm run build:all
```

#### 使用 Docker 构建

```bash
docker-compose up --build
```

构建输出将位于 `./dist-release/` 目录中。

---

### 方案三：生产服务器上线部署

#### 构建发布版本

```bash
# 构建所有发布版本（MSI + NSIS 安装包 + 便携版）
npm run build:all

# 仅构建 MSI 安装包
npm run build:installer

# 仅构建便携版
npm run build:portable
```

输出位置：
- **MSI 安装包**: `dist-release/msi-installer/`
- **NSIS 安装包**: `dist-release/nsis-installer/`
- **便携版**: `dist-release/portable/`

#### 便携版部署

1. 将整个便携版文件夹复制到目标机器
2. 直接运行 `LightOfficeTools.exe`
3. 所有数据（缓存、配置、日志、ocr_models）存储在同一目录

#### 安装版部署

1. 运行 MSI/NSIS 安装程序
2. 按照安装向导操作
3. 选择安装位置（默认：`%LOCALAPPDATA%\Programs\LightOfficeTools`）
4. 默认数据存储在 `%USERPROFILE%\Documents\LightOfficeTools\`

#### 进程守护说明

这是一款桌面应用，不是服务器程序。无需守护进程或 Nginx 配置。应用作为标准 Windows 桌面程序运行。

---

## ⚙️ 配置说明

### Tauri 配置（`src-tauri/tauri.conf.json`）

| 参数 | 类型 | 默认值 | 说明 | 风险等级 |
|------|------|--------|------|----------|
| `productName` | string | `"LightOfficeTools"` | 应用显示名称 | 低 |
| `version` | string | `"1.0.0"` | 应用版本号 | 低 |
| `identifier` | string | `"com.lightoffice.tools"` | 应用唯一标识（反向 DNS） | **高** — 代码签名时必须唯一 |
| `app.windows[0].title` | string | `"轻量化办公文档工具箱"` | 窗口标题栏文字 | 低 |
| `app.windows[0].width` | number | `1200` | 初始窗口宽度 | 低 |
| `app.windows[0].height` | number | `800` | 初始窗口高度 | 低 |
| `app.windows[0].dragDropEnabled` | boolean | `true` | 启用文件拖拽 | 中 — 如不需要可禁用以增强安全 |
| `plugins.fs.scope` | string[] | 见配置 | 文件系统访问范围 | **高** — 仅限制在必要路径 |
| `bundle.targets` | string[] | `["msi", "nsis"]` | 构建目标格式 | 低 |
| `bundle.category` | string | `"Productivity"` | 应用商店分类 | 低 |

### 前端配置

#### 主题配置

主题通过 Pinia store 管理（`src/stores/app.ts`）：

```typescript
// 可选主题：'light' | 'dark'
// 默认值：'light'
```

#### 主题色

```typescript
// 主色：'#1677ff'（商务蓝）
// 可在设置 store 中配置
```

### Rust Cargo 配置（`src-tauri/Cargo.toml`）

| 配置项 | 值 | 作用 |
|--------|-----|------|
| `panic = "abort"` | abort | 减小二进制体积，不展开堆栈 |
| `codegen-units = 1` | 1 | 更好的优化（编译更慢） |
| `lto = true` | true | 链接时优化（更小 + 更快） |
| `opt-level = "s"` | "s" | 优化二进制体积 |
| `strip = true` | true | 移除调试符号 |

> **警告**: 修改 release profile 设置可能影响二进制体积、性能或调试能力。请谨慎修改。

---

## 📁 项目结构

```
office-tools/
├── public/                          # 静态资源，复制到 dist 根目录
│   └── app-icon.png                 # 应用图标
├── scripts/                         # 构建和工具脚本
│   ├── build-release.js             # 多目标发布构建脚本
│   ├── create-default-icon.js       # 默认图标生成
│   └── generate-icons.js            # 多格式图标生成
├── src/                             # 前端源代码
│   ├── assets/                      # 静态资源（样式、图片）
│   │   └── styles/
│   │       └── main.css             # 全局样式 & Tailwind 入口
│   ├── components/                  # 可复用 Vue 组件
│   │   ├── common/                  # 通用业务组件
│   │   │   ├── ActionBar.vue        # 底部操作栏
│   │   │   ├── FileDropZone.vue     # 拖拽上传区域
│   │   │   └── ToolLayout.vue       # 统一工具页布局
│   │   ├── layout/                  # 布局组件
│   │   │   ├── AppFooter.vue        # 底部状态栏
│   │   │   ├── AppHeader.vue        # 顶部搜索栏
│   │   │   └── AppSidebar.vue       # 左侧导航栏
│   │   └── print/                   # 打印相关组件
│   │       └── PrintPreview.vue     # 打印预览组件
│   ├── composables/                 # Vue 组合式函数（可复用逻辑）
│   │   ├── useFileOperation.ts      # 文件操作工具
│   │   └── useNotification.ts       # 通知工具
│   ├── router/                      # Vue Router 配置
│   │   └── index.ts                 # 路由定义
│   ├── stores/                      # Pinia 状态管理
│   │   ├── app.ts                   # 应用全局状态（主题等）
│   │   └── settings.ts              # 用户设置
│   ├── views/                       # 页面组件（路由级）
│   │   ├── calculate/               # 计算工具
│   │   │   ├── BaseConvert.vue      # 进制转换
│   │   │   ├── TimestampConvert.vue # 时间戳转换
│   │   │   └── UuidGenerator.vue    # UUID 生成器
│   │   ├── codec/                   # 编解码工具
│   │   │   ├── Base64Codec.vue      # Base64 编解码
│   │   │   ├── HashCalc.vue         # 哈希计算器
│   │   │   ├── UnicodeCodec.vue     # Unicode 转换
│   │   │   └── UrlCodec.vue         # URL 编解码
│   │   ├── convert/                 # 文档转换工具
│   │   │   ├── EncodingConvert.vue  # 文本编码转换
│   │   │   ├── ExcelConvert.vue     # Excel 格式转换
│   │   │   └── MarkdownConvert.vue  # Markdown 转换
│   │   ├── image/                   # 图片处理工具
│   │   │   ├── ColorPicker.vue      # 取色器
│   │   │   ├── ImageCompress.vue    # 图片压缩
│   │   │   ├── ImageConvert.vue     # 图片格式转换
│   │   │   └── ImageResize.vue      # 图片尺寸调整
│   │   ├── json/                    # JSON 工具
│   │   │   ├── JsonCompress.vue     # JSON 压缩
│   │   │   ├── JsonFormat.vue       # JSON 格式化
│   │   │   └── JsonValidate.vue     # JSON 校验
│   │   ├── pdf/                     # PDF 工具
│   │   │   ├── PdfCompress.vue      # PDF 压缩
│   │   │   ├── PdfMerge.vue         # PDF 合并
│   │   │   ├── PdfSplit.vue         # PDF 分割
│   │   │   └── PdfToImages.vue      # PDF 转图片
│   │   ├── print/                   # 打印管理
│   │   │   ├── BatchPrint.vue       # 批量打印
│   │   │   ├── PrintManager.vue     # 打印管理面板
│   │   │   ├── PrintQueue.vue       # 打印队列
│   │   │   └── SinglePrint.vue      # 单文件打印
│   │   ├── system/                  # 系统工具
│   │   │   ├── QrCodeGenerator.vue  # 二维码生成
│   │   │   └── QrCodeScanner.vue    # 二维码识别
│   │   ├── text/                    # 文本处理工具
│   │   │   ├── TextCase.vue         # 大小写转换
│   │   │   ├── TextDedup.vue        # 文本去重
│   │   │   ├── TextReplace.vue      # 文本查找替换
│   │   │   ├── TextSort.vue         # 文本排序
│   │   │   └── TextStats.vue        # 文本统计
│   │   └── HomeView.vue             # 首页 / 仪表盘
│   ├── App.vue                      # 根 Vue 组件
│   ├── main.ts                      # 应用入口
│   └── vite-env.d.ts                # Vite 类型定义
├── src-tauri/                       # Rust 后端（Tauri）
│   ├── capabilities/                # Tauri 能力定义
│   │   └── default.json             # 默认能力集
│   ├── gen/                         # 生成的 schema（构建产物）
│   │   └── schemas/                 # JSON schema 文件
│   ├── icons/                       # 应用图标（所有格式）
│   │   ├── android/                 # Android 图标
│   │   ├── ios/                     # iOS 图标
│   │   ├── icon.ico                 # Windows 图标
│   │   ├── icon.icns                # macOS 图标
│   │   └── icon.png                 # 源图标
│   ├── src/                         # Rust 源代码
│   │   ├── commands/                # Tauri 命令处理器
│   │   │   ├── codec.rs             # 编解码命令（Base64 等）
│   │   │   ├── encoding.rs          # 编码转换命令
│   │   │   ├── file.rs              # 文件操作命令
│   │   │   ├── hash.rs              # 哈希计算命令
│   │   │   ├── image.rs             # 图片处理命令
│   │   │   ├── mod.rs               # 命令模块导出
│   │   │   ├── pdf.rs               # PDF 处理命令
│   │   │   ├── print.rs             # 打印管理命令
│   │   │   └── qrcode.rs            # 二维码命令
│   │   ├── lib.rs                   # 库入口 & Tauri 构建器
│   │   └── main.rs                  # 二进制入口
│   ├── Cargo.lock                   # Rust 依赖锁定文件
│   ├── Cargo.toml                   # Rust 清单 & 依赖
│   └── tauri.conf.json              # Tauri 配置
├── .gitignore                       # Git 忽略规则
├── index.html                       # Vite HTML 入口
├── package.json                     # NPM 清单 & 脚本
├── package-lock.json                # NPM 锁定文件
└── README_zh-CN.md                  # 本文档

```

---

## 📜 开发脚本

### 构建命令

```bash
# 启动 Vite 开发服务器（仅前端，浏览器预览）
npm run dev

# 构建前端生产版本
npm run build

# 本地预览生产构建
npm run preview
```

### Tauri 命令

```bash
# 启动 Tauri 开发模式（完整应用 + Rust 后端）
npm run tauri:dev

# 构建 Tauri 发布版本
npm run tauri:build

# 查看 Tauri CLI 帮助
npm run tauri -- --help
```

### 发布构建命令

```bash
# 构建所有发布版本（安装包 + 便携版）
npm run build:all

# 仅构建 MSI + NSIS 安装包
npm run build:installer

# 仅构建便携版
npm run build:portable

# 构建发布版（tauri:build 的别名）
npm run build:release
```

### 代码质量

```bash
# TypeScript 类型检查
npx vue-tsc --noEmit

# 使用 Prettier 格式化代码（如已配置）
# npx prettier --write .

# 代码检查（如已配置 ESLint）
# npm run lint
```

### 工具脚本

```bash
# 生成所有格式的应用图标
npm run generate-icons
```

### Git 操作

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git

# 创建功能分支
git checkout -b feature/your-feature-name

# 提交更改
git add .
git commit -m "feat: 添加您的功能描述"

# 推送并创建 PR
git push origin feature/your-feature-name
```

---

## 💻 使用示例

### 示例 1：PDF 合并（使用 Tauri API）

```typescript
import { invoke } from '@tauri-apps/api/core'

interface MergeResult {
  success: boolean
  output_path: string
  page_count: number
}

async function mergePdfs(inputFiles: string[], outputPath: string): Promise<MergeResult> {
  const result = await invoke<MergeResult>('pdf_merge', {
    inputPaths: inputFiles,
    outputPath: outputPath
  })
  return result
}

// 使用示例
const result = await mergePdfs(
  ['C:/文档/文件1.pdf', 'C:/文档/文件2.pdf'],
  'C:/输出/合并文件.pdf'
)
console.log(`已合并 ${result.page_count} 页 → ${result.output_path}`)
```

### 示例 2：图片压缩（使用 Tauri API）

```typescript
import { invoke } from '@tauri-apps/api/core'

interface CompressResult {
  success: boolean
  output_path: string
  original_size: number
  compressed_size: number
  ratio: number
}

async function compressImage(
  inputPath: string,
  outputPath: string,
  quality: number = 75
): Promise<CompressResult> {
  return await invoke<CompressResult>('image_compress', {
    inputPath,
    outputPath,
    quality
  })
}

// 使用示例
const result = await compressImage(
  'C:/照片/照片.jpg',
  'C:/照片/照片_压缩后.jpg',
  80
)
console.log(`压缩完成：减少了 ${((1 - result.ratio) * 100).toFixed(1)}%`)
```

### 示例 3：哈希计算（使用 Tauri API）

```typescript
import { invoke } from '@tauri-apps/api/core'

interface HashResult {
  md5: string
  sha1: string
  sha256: string
  sha512: string
}

async function calculateFileHashes(filePath: string): Promise<HashResult> {
  return await invoke<HashResult>('calculate_hashes', {
    filePath
  })
}

// 使用示例
const hashes = await calculateFileHashes('C:/文档/文档.pdf')
console.log('MD5:', hashes.md5)
console.log('SHA256:', hashes.sha256)
```

### 示例 4：二维码生成（使用 Tauri API）

```typescript
import { invoke } from '@tauri-apps/api/core'

async function generateQrCode(
  content: string,
  size: number = 256
): Promise<string> {
  // 返回 base64 编码的 PNG 图片
  return await invoke<string>('generate_qrcode', {
    content,
    size
  })
}

// 使用示例
const base64Image = await generateQrCode('https://example.com', 512)
const img = document.createElement('img')
img.src = `data:image/png;base64,${base64Image}`
document.body.appendChild(img)
```

---

## ❓ 常见问题

### Q1：应用启动失败，提示 "WebView2 not found" 错误

**A**: 安装 [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/zh-cn/microsoft-edge/webview2/)。Windows 11 已预装，但 Windows 10 可能需要手动安装。

### Q2：Rust 构建失败，提示 "linker `link.exe` not found"

**A**: 安装 Microsoft Visual Studio Build Tools：

1. 从 [Visual Studio Build Tools](https://visualstudio.microsoft.com/zh-hans/visual-cpp-build-tools/) 下载
2. 运行安装程序
3. 选择 "使用 C++ 的桌面开发" 工作负载
4. 确保勾选了 Windows 10/11 SDK
5. 点击安装

### Q3：`npm run tauri:dev` 报错 cargo 相关错误

**A**: 尝试以下步骤：

```bash
# 清理 Rust 构建缓存
cd src-tauri && cargo clean && cd ..

# 重新安装依赖
npm install

# 更新 Rust 工具链
rustup update stable
```

### Q4：拖拽上传不生效

**A**: 请检查以下几点：

1. `src-tauri/tauri.conf.json` 中 `app.windows[0]` 下已设置 `dragDropEnabled: true`
2. 您正在 Tauri 模式下运行（不是浏览器预览）
3. 当前页面支持该文件类型
4. Windows 下如果从高权限程序拖拽失败，尝试以管理员身份运行

### Q5：PDF/图片处理速度很慢

**A**: 性能优化建议：

1. 使用 release 构建（`npm run tauri:build`），不要用 dev 构建
2. 批量操作时，使用队列系统管理并发
3. 大文件需要时间 — 查看进度条了解状态
4. 确保有足够的可用内存（推荐 4GB+）

### Q6：如何重置应用数据？

**A**: 根据您使用的版本：

- **便携版**：删除 EXE 同级目录下的 `cache/`、`config/`、`logs/` 文件夹
- **安装版**：删除 `%USERPROFILE%\Documents\LightOfficeTools\` 文件夹

### Q7：可以在 macOS 或 Linux 上使用吗？

**A**: 目前仅 Windows 得到官方支持和测试。Tauri 框架是跨平台的，因此只需对构建配置做少量修改，macOS 和 Linux 版本应该也可以构建。

---

## 🤝 贡献指南

我们欢迎社区贡献！以下是参与方式：

### 分支命名规范

```
feature/<描述>    # 新功能
fix/<描述>        # Bug 修复
docs/<描述>       # 文档更新
refactor/<描述>   # 代码重构
chore/<描述>      # 构建/工具变更
```

示例：
- `feature/pdf-compression`
- `fix/drag-drop-windows`
- `docs/readme-translation`

### Git 提交规范

我们遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范：

```
<类型>(<范围>): <描述>

[可选正文]

[可选页脚]
```

**类型**：
- `feat` — 新功能
- `fix` — Bug 修复
- `docs` — 文档变更
- `style` — 代码风格（格式化等）
- `refactor` — 代码重构（功能不变）
- `perf` — 性能优化
- `test` — 添加/更新测试
- `chore` — 构建/工具变更

**示例**：
```
feat(pdf): 添加 PDF 压缩功能
fix(image): 修复 Windows 下图片旋转问题
docs: 更新 README 添加 Docker 说明
```

### Pull Request 提交流程

1. **Fork 仓库** — 点击 GitHub 上的 Fork 按钮
2. **克隆您的 Fork** — `git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git`
3. **创建分支** — `git checkout -b feature/your-feature`
4. **进行修改** — 实现您的功能或修复
5. **充分测试** — 确保所有功能正常工作
6. **提交更改** — 遵循上述提交规范
7. **推送到您的 Fork** — `git push origin feature/your-feature`
8. **创建 Pull Request** — 从您的 Fork 提交到主仓库
9. **等待审核** — 处理维护者的反馈

### 代码风格规范

#### 前端（Vue / TypeScript）

- 使用 Composition API 和 `<script setup>`
- 使用 TypeScript 类型（尽量避免 `any`）
- 遵循 Vue 3 风格指南建议
- 组件名使用 PascalCase
- 变量和函数使用 camelCase
- CSS 类名使用 kebab-case（Tailwind 工具类除外）

#### 后端（Rust）

- 遵循标准 Rust 格式化（`cargo fmt`）
- 提交前运行 `cargo clippy`
- 为公开函数添加文档注释
- 正确处理错误（使用 `Result`，生产代码避免 `unwrap()`）
- 为核心功能添加测试

### 搭建开发环境

详细设置说明请参见 [快速上手 → 方案一](#方案一本地开发启动)。

---

## 📝 更新日志

本项目所有重要变更都将记录在此部分。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
并遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

### [1.0.0] — 2026-07-01

#### 新增
- 首次公开发布
- 文本处理工具（替换、去重、排序、统计、大小写）
- 编解码工具（Base64、URL、哈希、Unicode）
- JSON 工具（格式化、校验、压缩）
- 计算工具（时间戳、进制转换、UUID）
- 图片工具（压缩、转换、调整、取色）
- 文档转换工具（Excel、Markdown、编码）
- PDF 工具（合并、分割、压缩、转图片）
- 二维码生成与识别
- 打印管理（单文件、批量、队列、打印机管理）
- 明暗主题支持
- 毛玻璃 UI 设计
- 拖拽文件上传
- 便携版和安装版发布构建

#### 已知问题
- OCR 功能需要额外下载模型
- macOS 和 Linux 版本尚未测试

---

## 📄 开源许可证

本项目采用 **MIT 许可证** — 详见 [LICENSE](LICENSE) 文件。

```
MIT 许可证

版权所有 (c) 2026 轻量化办公文档工具箱贡献者

特此免费授予任何获得本软件副本和相关文档文件（下称"软件"）的人不受限制地
处置该软件的权利，包括但不限于使用、复制、修改、合并、发布、分发、再许可、
和/或销售软件副本的权利，并允许向其提供软件的人比照上述这样做，须符合以下
条件：

上述版权声明和本许可声明应包含在软件的所有副本或主要部分中。

本软件按"原样"提供，不提供任何形式的明示或暗示保证，包括但不限于对适销性、
特定用途适用性和非侵权性的保证。在任何情况下，作者或版权持有人均不对因
本软件或本软件的使用或其他交易而产生、引起或与之相关的任何索赔、损害或其他
责任承担责任，无论是合同诉讼、侵权诉讼还是其他形式的诉讼。
```

---

## 📧 联系方式

### 维护者

- **您的名字** — [@YOUR_GITHUB](https://github.com/YOUR_GITHUB)

### 项目链接

- **仓库地址**: [https://github.com/YOUR_USERNAME/YOUR_REPO](https://github.com/YOUR_USERNAME/YOUR_REPO)
- **问题反馈**: [https://github.com/YOUR_USERNAME/YOUR_REPO/issues](https://github.com/YOUR_USERNAME/YOUR_REPO/issues)
- **讨论区**: [https://github.com/YOUR_USERNAME/YOUR_REPO/discussions](https://github.com/YOUR_USERNAME/YOUR_REPO/discussions)

### 提交问题

如果您遇到任何 Bug 或有功能建议，请在 GitHub 上 [提交 Issue](https://github.com/YOUR_USERNAME/YOUR_REPO/issues/new)，并附上：

1. 问题的清晰描述
2. 复现步骤
3. 预期行为
4. 您的操作系统版本和应用版本
5. 如有可能，附上截图

---

<div align="center">

**如果觉得这个项目有帮助，请给它一个 ⭐ Star！**

用 ❤️ 由轻量化办公文档工具箱社区打造

</div>
