# 轻办公文档助手

> 纯本地离线办公文档处理工具，支持 Excel、Word、PDF 批量处理与 OCR 文字识别。基于 Tauri 2.0 构建，数据全程不联网，确保隐私安全。

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange)
![Vue](https://img.shields.io/badge/Vue-3-green)
![License](https://img.shields.io/badge/license-MIT-yellow)

---

## ✨ 功能特性

### 📊 Excel 批量处理
- **格式转换**：xlsx / xls / csv 格式互转
- **数据清理**：删除空行、空列、重复行、清除空格
- **数据合并**：多文件合并、多工作表合并
- **拆分表格**：按工作表/列内容/行数拆分
- **批量打印**：支持多文件批量打印
- **高级功能**：加密保护、水印添加

### 📄 Word 工具
- **格式转换**：DOCX 转 TXT / HTML / PDF
- **内容替换**：普通替换、正则表达式、清理空段落
- **批量打印**：多文件批量打印
- **文档预览**：文本/HTML 预览模式

### 📑 PDF 工具
- **格式转换**：PDF 转图片 / 文本 / Word
- **合并 PDF**：多个 PDF 合并为一个
- **拆分 PDF**：按页 / 范围 / 数量拆分
- **批量打印**：多文件批量打印

### 🔍 OCR 文字识别
- **离线识别**：纯本地运行，保护隐私
- **多语言支持**：简体中文、英文，单语言包即可独立使用
- **模型管理**：
  - 自定义下载源配置
  - 实时下载进度条
  - 暂停/继续/取消下载
  - 文件完整性校验
  - 四种状态可视化（未下载/下载中/已就绪/文件损坏）
- **批量识别**：多图批量识别
- **结果导出**：一键复制、导出 TXT

### 🖨 打印中心
- **打印机枚举**：自动识别系统所有打印机，标记默认打印机
- **参数配置**：纸张大小、打印方向、份数、页码范围、色彩模式、双面打印
- **批量打印**：多文件排队打印，实时进度
- **打印预览**：图片真实预览，文档类型占位预览

### 📝 批量重命名
- **基础命名**：前缀 + 序号 + 后缀，位数补零
- **查找替换**：支持正则表达式、区分大小写
- **大小写转换**：大写/小写/首字母大写
- **日期前后缀**：多种日期格式
- **扩展名修改**：统一修改文件扩展名
- **实时预览**：即时查看重命名效果

### 🔤 编码转换
- **自动检测**：智能识别源文件编码
- **多编码支持**：UTF-8 / GBK / GB2312 / GB18030 / ISO-8859-1 / UTF-16 / Big5 / Shift_JIS 等
- **BOM 支持**：可选添加 BOM 头
- **批量转换**：多文件批量处理
- **预览对比**：转换前后文本预览

### 📋 任务队列
- **任务管理**：等待/进行中/已完成/失败/已取消 全状态管理
- **进度追踪**：实时进度条、耗时统计
- **任务控制**：暂停/继续/取消/重试
- **批量操作**：全部开始/暂停/取消、重试失败、清空已完成
- **任务日志**：每个任务独立详细日志

### 🧰 工具箱
- **文件处理**：哈希校验、批量重命名、编码转换、文件检索
- **图片工具**：图片压缩、格式转换、二维码生成、截图工具
- **文本工具**：JSON 格式化、文本对比、正则测试
- **编码转换**：Base64、URL 编解码、Unicode 转换
- **开发工具**：颜色取色器、时间戳转换、UUID 生成、IP 查询

### ⚙️ 系统设置
- **外观设置**：浅色/深色/跟随系统主题、主色调自定义、磨砂效果
- **通用设置**：默认输出目录、开机自启、语言
- **托盘设置**：最小化到托盘、托盘气泡提示
- **快捷键**：全局热键配置
- **文件关联**：常见格式关联设置

---

## 🎨 界面特色

- **简约商务风**：主色调 #1677ff，清爽专业
- **亚克力磨砂**：标题栏磨砂玻璃效果
- **8px 圆角规范**：统一圆角，柔和视觉
- **分层阴影**：自然层次感
- **深浅主题**：完整适配深色/浅色模式
- **流畅动效**：按钮 hover、页面切换、进度动画
- **自定义滚动条**：美观的窄边滚动条
- **响应式布局**：自适应窗口大小

---

## 🏗 技术架构

```
┌─────────────────────────────────────────────────┐
│                   前端 (Web)                      │
│  Vue 3 + Vite + TypeScript + NaiveUI + Tailwind │
├─────────────────────────────────────────────────┤
│                   通信层 (IPC)                    │
│              @tauri-apps/api v2                   │
├─────────────────────────────────────────────────┤
│                   后端 (Rust)                    │
│     文件处理 · 系统集成 · Windows API · 打印      │
├─────────────────────────────────────────────────┤
│                   WebView2                       │
│              (Windows Edge 渲染引擎)              │
└─────────────────────────────────────────────────┘
```

### 核心技术栈

| 模块 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Tauri 2.0 | Rust 编写的轻量级桌面应用框架 |
| 前端框架 | Vue 3 + Vite | 组合式 API + 极速构建工具 |
| 类型系统 | TypeScript 5 | 完整类型安全 |
| UI 组件库 | NaiveUI | Vue 3 生态组件库 |
| 样式方案 | TailwindCSS | 原子化 CSS |
| 状态管理 | Pinia | Vue 3 官方推荐状态管理 |
| 路由 | Vue Router 4 | SPA 路由管理 |
| Excel 处理 | SheetJS (xlsx) | 前端 Excel 解析与生成 |
| Word 处理 | mammoth.js | DOCX 转 HTML/纯文本 |
| PDF 处理 | pdf-lib | 前端 PDF 创建与编辑 |
| OCR 引擎 | Tesseract.js | WASM 版离线 OCR |
| 系统集成 | winapi-rs / windows-rs | Windows 原生 API 调用 |
| 异步运行时 | tokio | Rust 异步运行时 |

### 权限控制（最小权限原则）

| 权限 | 用途 |
|------|------|
| 文件系统 | 读写用户指定的文件/目录 |
| 网络 | 仅 OCR 模型下载（可配置下载源） |
| 对话框 | 文件选择/保存对话框 |
| 窗口 | 自定义无边框窗口控制 |
| 托盘 | 系统托盘图标与菜单 |
| 打印 | Windows 打印机 API |

---

## 📁 项目结构

```
office-tools/
├── src/                              # 前端源码
│   ├── components/                   # 公共组件
│   │   ├── layout/                   # 布局组件
│   │   │   ├── MainLayout.vue        # 主布局
│   │   │   ├── Sidebar.vue           # 侧边栏导航
│   │   │   └── PreviewPanel.vue      # 预览面板
│   │   ├── FileUploader.vue          # 统一文件上传组件
│   │   └── OCRModelManager.vue       # OCR 模型管理弹窗
│   ├── composables/                  # 组合式函数
│   │   └── useDragDrop.ts            # 拖拽上传逻辑
│   ├── router/                       # 路由配置
│   ├── stores/                       # Pinia 状态管理
│   │   ├── ocrModel.ts               # OCR 模型状态
│   │   ├── print.ts                  # 打印任务状态
│   │   ├── setting.ts                # 用户设置
│   │   └── task.ts                   # 任务队列状态
│   ├── styles/                       # 全局样式
│   │   └── index.css                 # 样式入口 + CSS 变量
│   ├── utils/                        # 工具函数
│   │   ├── tauriUtils.ts             # Tauri 工具封装
│   │   ├── excelUtils.ts             # Excel 处理
│   │   ├── wordUtils.ts              # Word 处理
│   │   ├── pdfUtils.ts               # PDF 处理
│   │   └── ocrUtils.ts               # OCR 调用封装
│   ├── views/                        # 页面组件
│   │   ├── Home.vue                  # 首页
│   │   ├── Excel.vue                 # Excel 工具
│   │   ├── WordTools.vue             # Word 工具
│   │   ├── PdfTools.vue              # PDF 工具
│   │   ├── OCR.vue                   # OCR 识别
│   │   ├── Print.vue                 # 打印中心
│   │   ├── BatchRename.vue           # 批量重命名
│   │   ├── EncodingConvert.vue       # 编码转换
│   │   ├── TaskQueue.vue             # 任务队列
│   │   ├── Toolbox.vue               # 工具箱
│   │   └── Settings.vue              # 设置页
│   ├── App.vue                       # 根组件
│   └── main.ts                       # 入口文件
├── src-tauri/                        # Rust 后端
│   ├── src/
│   │   ├── main.rs                   # 程序入口
│   │   ├── lib.rs                    # 命令注册总入口
│   │   └── ocr_model.rs              # OCR 模型下载管理
│   ├── capabilities/
│   │   └── default.json              # Tauri 权限配置
│   ├── icons/                        # 应用图标
│   ├── tauri.conf.json               # Tauri 配置
│   └── Cargo.toml                    # Rust 依赖
├── package.json                      # Node 依赖
├── vite.config.ts                    # Vite 配置
├── tsconfig.json                     # TypeScript 配置
├── tailwind.config.js                # Tailwind 配置
└── README.md                         # 项目说明
```

---

## 🔨 编译说明

### 环境要求

| 工具 | 最低版本 | 推荐安装方式 |
|------|----------|--------------|
| Node.js | >= 18.0 | [官网下载](https://nodejs.org/) 或 `winget install OpenJS.NodeJS.LTS` |
| Rust | >= 1.70 | [rustup.rs](https://rustup.rs/) 或 `winget install Rustlang.Rustup` |
| Visual Studio Build Tools | 2022 | [官网下载](https://visualstudio.microsoft.com/downloads/)，勾选「C++ 构建工具」 |
| WebView2 Runtime | - | Windows 11 自带，Win10 需 [安装](https://developer.microsoft.com/microsoft-edge/webview2/) |
| Windows | 10/11 | - |

### 快速开始

```powershell
# 1. 克隆项目
git clone <repository-url>
cd office-tools

# 2. 安装前端依赖
npm install

# 3. 设置 Rust 稳定工具链
rustup default stable

# 4. 启动开发模式
npm run tauri dev
```

> 💡 首次启动需要编译 Rust 代码，可能需要几分钟。后续启动会快很多。

### 生产打包

```powershell
# 构建生产版本（自动打包前端 + Rust 编译 + 生成安装包）
npm run tauri build
```

打包完成后，产物位置：

| 产物类型 | 路径 | 说明 |
|----------|------|------|
| **NSIS 安装版** | `src-tauri/target/release/bundle/nsis/*.exe` | 一键安装，带开始菜单快捷方式 |
| **绿色版 ZIP** | `src-tauri/target/release/bundle/*.zip` | 解压即用，无需安装 |
| **MSI 安装包** | `src-tauri/target/release/bundle/msi/*.msi` | Windows Installer 格式 |

> 打包目标可在 `src-tauri/tauri.conf.json` 的 `bundle.targets` 中配置。

### 自定义图标

1. 准备一张 PNG 图片（建议 1024x1024 或更大，正方形）
2. 保存为 `src-tauri/icons/source-icon.png`
3. 运行图标生成命令：
   ```powershell
   npx tauri icon src-tauri/icons/source-icon.png
   ```
4. 重新打包：`npm run tauri build`

### 配置国内镜像（可选）

**Rust crates 镜像**：编辑 `~/.cargo/config.toml`

```toml
[source.crates-io]
replace-with = 'tuna'

[source.tuna]
registry = "https://mirrors.tuna.tsinghua.edu.cn/git/crates.io-index.git"
```

**npm 镜像**：
```powershell
npm config set registry https://registry.npmmirror.com
```

---

## 📋 自测清单

### ✅ 已修复的致命 Bug

| 编号 | Bug 描述 | 修复方案 | 状态 |
|------|----------|----------|------|
| 1 | 文件上传全失效（点击/拖拽均无效） | 重构全局 FileUploader 组件，兼容 WebView2 拖拽事件 + Tauri file-drop IPC | ✅ 已修复 |
| 2 | OCR 模型逻辑错误（必须双模型、无下载源配置） | 彻底重写模型管理，单语言包独立可用，自定义下载源，MD5/大小校验 | ✅ 已修复 |
| 3 | OCR store 属性不匹配（allModelsReady 等不存在） | 新增兼容属性，修正页面引用 | ✅ 已修复 |
| 4 | 预览页面效果差、交互卡顿 | 重构 PreviewPanel，分栏拖拽、完整工具栏、缩放翻页、加载动画 | ✅ 已修复 |
| 5 | 各功能页面代码断层、流程不通 | 逐页面重写 Excel/Word/PDF/OCR/打印/重命名/编码转换等 | ✅ 已修复 |
| 6 | 任务队列暂停/继续失效 | 重构 task store，单任务独立控制，状态机完善 | ✅ 已修复 |
| 7 | Rust IPC 命令缺失 | 完整实现 30+ 个 IPC 命令，未实现功能返回明确错误 | ✅ 已修复 |
| 8 | Windows 拖拽上传失效 | 双重方案：HTML5 drag-drop + Tauri file-drop 事件 | ✅ 已修复 |

### 🔄 重构模块

| 模块 | 说明 |
|------|------|
| FileUploader.vue | 全局统一上传组件，拖拽+点击，Tauri/浏览器双兼容 |
| OCRModelManager.vue | 模型下载管理弹窗，自定义源，进度展示，四状态可视化 |
| PreviewPanel.vue | 预览面板，分栏拖拽，工具栏，多格式预览 |
| ocrModel.ts | OCR 模型 store，单语言包，状态管理 |
| task.ts | 任务队列 store，单任务控制，批量操作，独立日志 |
| ocr_model.rs | Rust 端模型下载，异步流式，取消机制，进度回调 |
| lib.rs | Rust 命令总入口，30+ IPC 命令完整注册 |

### 🎨 UI 美化内容

| 项目 | 说明 |
|------|------|
| 主色调 | 统一 #1677ff 商务蓝 |
| 圆角规范 | 全局 8px 圆角 |
| 亚克力标题栏 | 磨砂玻璃效果 |
| 深浅主题 | 完整 CSS 变量，两套主题完整适配 |
| 自定义滚动条 | 细窄滚动条，hover 加粗 |
| 分层阴影 | sm/md/lg/xl 四级柔和阴影 |
| 动效 | 按钮 hover 过渡、页面 fade 淡入淡出、进度动画 |
| 侧边栏 | 可折叠，选中高亮，底部"power by 小罗" |
| 空状态 | NaiveUI Empty 组件，精美占位 |
| 加载状态 | Spin 旋转 + 文字提示 |

### 📦 功能页面清单

- [x] 首页 (Home)
- [x] Excel 批量处理 (Excel)
- [x] Word 工具 (WordTools)
- [x] PDF 工具 (PdfTools)
- [x] OCR 文字识别 (OCR)
- [x] 打印中心 (Print)
- [x] 批量重命名 (BatchRename)
- [x] 编码转换 (EncodingConvert)
- [x] 任务队列 (TaskQueue)
- [x] 工具箱 (Toolbox) - 18 个小工具
- [x] 设置页 (Settings)

### ✅ 构建验证

- [x] 前端构建：`npm run build` 通过
- [x] Rust 编译：`cargo check` 通过，零错误零警告
- [x] TypeScript 类型检查：通过
- [x] 所有路由正常注册

---

## 🔒 隐私声明

- ✅ **纯本地运行**：所有文件处理均在本地完成，不上传任何服务器
- ✅ **最小网络权限**：仅 OCR 模型下载时联网，下载源可自定义
- ✅ **无遥测数据**：不收集任何使用日志或用户数据
- ✅ **配置本地化**：配置文件存储在用户本地 AppData 目录
- ✅ **开源透明**：代码完全可审计

---

## 📝 更新日志

### v1.0.0 (2025-xx-xx)
- 首个正式版本发布
- 支持 Excel/Word/PDF 批量处理
- 支持 OCR 离线文字识别（中文/英文）
- 支持全格式批量打印
- 支持批量重命名、编码转换
- 完整任务队列管理
- 工具箱 18 个实用小工具
- 全新 UI 设计，深浅主题适配

---

## 📄 License

MIT License
