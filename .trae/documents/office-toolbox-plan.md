# 轻量化办公文档工具箱 - 实施计划

## 摘要

本项目旨在从零构建一款基于 **Tauri 2.0 + Vue3 + Vite + TypeScript + NaiveUI + TailwindCSS** 的桌面端办公文档工具箱。通过对 uTools、PowerToys、Quicker、Raycast、He3、DevUtils 等主流效率工具的深入研究，规划出覆盖 **PDF 处理、文档格式转换、文本处理、编码解码、JSON/YAML 工具、图片处理、计算转换、系统辅助、打印中心** 九大模块的完整功能矩阵。项目遵循"完全离线、秒开即用、统一交互"的设计原则，利用 Rust 后端实现高性能文件处理，前端提供现代化的搜索驱动型 UI。

---

## 现状分析

**当前状态**：全新项目，无现有代码库。
**目标平台**：Windows / macOS / Linux（Tauri 2.0 跨平台）。
**核心定位**：轻量化、离线优先、聚焦办公文档场景。
**技术约束**：
- 前端：Vue3 Composition API + `<script setup>` + TypeScript 严格模式
- 构建工具：Vite（路由懒加载、路径别名）
- UI 框架：NaiveUI（复杂组件）+ TailwindCSS（布局/原子样式）
- 后端：Tauri 2.0 Rust（PDF/图片/文件系统/系统级操作）
- 暂不集成 AI/OCR 等重量级能力

**关键设计挑战**：
1. NaiveUI 与 TailwindCSS 的样式冲突需通过禁用 Tailwind Preflight 解决
2. Tauri 2.0 的 Capabilities 权限模型要求显式声明每项系统权限
3. PDF 转 Word 等复杂场景需设定合理的功能边界
4. 大文件处理需在 Rust 端避免阻塞主线程

---

## 功能规划（Proposed Changes）

### 模块一：PDF 工具箱（核心模块）

利用 Rust `lopdf` + 前端 `pdf-lib.js` 实现互补处理。

| 功能 | 实现方式 | 优先级 |
|------|----------|--------|
| PDF 合并 | Rust `lopdf` 合并页面对象，前端拖拽排序 | P0 |
| PDF 拆分 | 按页码范围/固定页数拆分 | P0 |
| PDF 压缩 | 多档位压缩（轻度/标准/强力） | P0 |
| PDF 转图片 | Rust `image` crate 渲染页面，支持 PNG/JPG 和 DPI 设置 | P0 |
| 图片转 PDF | 多图合并为 PDF，支持页面尺寸设置 | P0 |
| PDF 提取文字 | `pdf-extract` 纯文本提取，保留段落格式 | P1 |
| PDF 提取图片 | 导出内嵌图片资源 | P1 |
| PDF 旋转/删除页面 | 页面级基础编辑 | P2 |
| PDF 添加水印 | 文字/图片水印，支持位置/透明度/角度 | P2 |
| PDF 转 Word | 前端基于文本流重建，仅限简单文档 | P1 |
| Word 转 PDF | 保留排版格式 | P1 |

### 模块二：文档格式转换

| 功能 | 实现方式 | 优先级 |
|------|----------|--------|
| Excel/CSV 互转 | 前端 `papaparse` + 表格解析 | P1 |
| Markdown 转 HTML | 前端 `marked` + 样式导出 | P1 |
| HTML 转 Markdown | `turndown` 清理标签提取正文 | P1 |
| 文本文件编码转换 | Rust `encoding_rs` 批量读写 | P1 |
| JSON 转 CSV/Excel | 结构化数据扁平化 | P2 |
| YAML/JSON/TOML 互转 | 前端 `js-yaml` + `@iarna/toml` | P2 |

### 模块三：文本处理工具

纯前端实现，输入即输出，无需 IPC 往返。

| 功能 | 实现方式 | 优先级 |
|------|----------|--------|
| 文本替换 | 普通替换/正则替换，多规则批量 | P0 |
| 文本去重 | 行级去重，保留/删除空行选项 | P0 |
| 文本排序 | 按字母/数字/长度/随机排序 | P0 |
| 文本统计 | 字符数/字数/行数/字节数/中英文分别统计 | P0 |
| 行号添加/删除 | 批量添加行号前缀 | P1 |
| 大小写转换 | 大写/小写/驼峰/下划线/中划线转换 | P1 |
| 空格清理 | 去除行首行尾/合并连续/去除所有空格 | P1 |
| 文本对比 | 左右双栏差异对比（diff 视图） | P1 |
| 批量文本处理 | 对多个文本文件执行上述操作 | P2 |

### 模块四：编码解码与加密

| 功能 | 实现方式 | 优先级 |
|------|----------|--------|
| Base64 编码/解码 | 文本与图片双模式 | P0 |
| URL 编码/解码 | 自动识别编码状态 | P0 |
| HTML 实体编码/解码 | 防 XSS 处理 | P1 |
| Hex 编解码 | 二进制数据可视化 | P1 |
| Unicode 转换 | 中文转 Unicode/ASCII | P1 |
| MD5/SHA1/SHA256 计算 | Rust `ring`/`sha2`/`md-5` 高性能计算 | P1 |
| JWT 解析 | Header/Payload/Signature 拆分查看 | P1 |
| 密码生成器 | 自定义长度、字符集、生成强度 | P1 |

### 模块五：JSON/YAML 工具

| 功能 | 实现方式 | 优先级 |
|------|----------|--------|
| JSON 格式化/压缩 | 语法高亮（`shiki`/`highlight.js`）和折叠 | P0 |
| JSON 校验 | 定位语法错误位置 | P0 |
| JSON 转 TypeScript/Go/Python 实体 | 生成类型定义 | P2 |
| JSON 对比 | 两个 JSON 对象的差异树 | P2 |
| JSON 路径查询 | JSONPath 表达式测试 | P2 |
| YAML 转 JSON/TOML | 配置文件格式互转 | P2 |
| YAML 格式化/压缩 | | P2 |

### 模块六：图片工具

Rust `image` crate + `oxipng` 实现高性能处理，大文件使用 `tokio::task::spawn_blocking`。

| 功能 | 实现方式 | 优先级 |
|------|----------|--------|
| 图片压缩 | 有损/无损压缩，预览对比 | P0 |
| 图片格式转换 | PNG/JPG/WEBP/GIF/SVG 互转 | P0 |
| 图片尺寸调整 | 固定宽高/按比例缩放/批量处理 | P0 |
| 图片批量重命名 | 序列号/日期/自定义模板 | P2 |
| 图片 Base64 互转 | DataURL 生成与还原 | P1 |
| 图片水印 | 文字/图片水印，批量应用 | P2 |
| 图片拼接 | 横向/纵向拼接、网格拼图 | P2 |
| 图片裁剪 | 固定比例/自由裁剪 | P2 |
| 取色器 | 屏幕取色，支持 HEX/RGB/HSL/CMYK | P0 |

### 模块七：计算与转换

| 功能 | 实现方式 | 优先级 |
|------|----------|--------|
| 时间戳转换 | Unix 时间戳与各类日期格式互转，支持时区 | P0 |
| 进制转换 | 2/8/10/16 进制互转，支持小数 | P1 |
| 单位换算 | 长度/重量/面积/体积/温度/数据存储 | P2 |
| Cron 表达式解析 | 生成人类可读的中文描述和最近执行时间 | P2 |
| UUID/GUID 生成 | 批量生成，支持版本 4 | P2 |

### 模块八：系统辅助

| 功能 | 实现方式 | 优先级 |
|------|----------|--------|
| 剪贴板历史 | Rust 监听变化，存储在 SQLite/JSON，前端搜索收藏 | P2 |
| 批量重命名 | 正则替换/序号插入/扩展名修改，实时预览 | P1 |
| 二维码生成/识别 | `qrcode` 生成 + `jsQR` 识别截图 | P1 |
| 窗口置顶 | Tauri `window` API 实现 | P2 |
| 快捷短语 | 预定义文本片段，一键输入 | P2 |

### 模块九：打印中心（新增核心模块）

基于 `tauri-plugin-printer` 构建跨平台打印能力，Rust 端补充平台原生 API 实现高级打印设置，打造专业级打印体验。

#### 9.1 打印机管理

| 功能 | 实现方式 | 优先级 |
|------|----------|--------|
| 识别本机所有打印机 | `tauri-plugin-printer` `printers()` API 枚举本地/网络/虚拟打印机 | P0 |
| 显示打印机状态 | 解析打印机状态码（在线/离线/忙碌/缺纸/缺墨/门打开/错误） | P0 |
| 设置默认打印机 | 前端选择后持久化到设置，打印时自动选用 | P0 |
| 刷新打印机列表 | 手动刷新 + 定时轮询检测打印机变化 | P1 |
| 打印机详情查看 | 驱动名称、端口、作业计数、支持纸张类型等 | P1 |

#### 9.2 单文件打印

| 功能 | 实现方式 | 优先级 |
|------|----------|--------|
| PDF 文件打印 | `tauri-plugin-printer` `print_file()` 直接打印 | P0 |
| 图片文件打印 | 前端 canvas 渲染后转 PDF 再打印，或 Rust `image` crate 直接处理 | P0 |
| Word/Excel/文本打印 | 先转换为 PDF（调用本工具箱的转换模块），再执行打印 | P1 |
| 打印预览 | 前端渲染页面缩略图/PDF 预览，模拟实际打印效果 | P0 |
| 快速打印 | 使用默认打印机和上次设置一键打印 | P1 |

#### 9.3 批量打印

| 功能 | 实现方式 | 优先级 |
|------|----------|--------|
| 多文件拖拽导入 | 复用 `FileDropZone.vue` 组件，支持混合文件类型 | P0 |
| 批量设置打印参数 | 统一设置后应用到所有文件，也支持单个文件独立设置 | P0 |
| 批量执行打印 | 前端队列管理 + Rust 端顺序提交打印任务 | P0 |
| 逐份打印 | 完整打印第1份后再打印第2份，避免页面混乱 | P1 |
| 打印进度监控 | 实时显示当前打印第N个/共M个文件，剩余时间估算 | P1 |
| 打印失败重试/跳过 | 单文件失败后提示，支持重试或跳过继续后续任务 | P1 |

#### 9.4 打印任务管理

| 功能 | 实现方式 | 优先级 |
|------|----------|--------|
| 查看当前打印队列 | `tauri-plugin-printer` `jobs()` API 获取所有打印任务 | P1 |
| 暂停/恢复打印任务 | `pause_job()` / `resume_job()` | P1 |
| 取消/删除打印任务 | `remove_job()` | P1 |
| 重启打印任务 | `restart_job()` | P1 |
| 打印历史记录 | 本地 SQLite 记录每次打印的文件、打印机、参数、时间、状态 | P2 |

#### 9.5 完整打印设置参数

| 设置项 | 可选值/范围 | 实现方式 | 优先级 |
|--------|-------------|----------|--------|
| **打印机选择** | 本机所有可用打印机 | `printers()` API | P0 |
| **纸张大小** | A4, A3, A5, A6, Letter, Legal, B4, B5, Executive, Tabloid,  Statement, Folio, Quarto, 自定义宽x高(mm) | `tauri-plugin-printer` pageSize + Rust 平台 API 扩展 | P0 |
| **打印方向** | 纵向(Portrait) / 横向(Landscape) | Rust 平台原生 API 设置 DEVMODE (Win) / PMPageFormat (Mac) / CUPS options (Linux) | P0 |
| **打印份数** | 1-999 份 | `tauri-plugin-printer` copies | P0 |
| **页码范围** | 全部 / 当前页 / 指定页码（如 1,3,5-10） | 前端解析范围，Rust 调用平台 API 设置 | P0 |
| **双面打印** | 单面 / 长边翻转(书籍式) / 短边翻转(便签式) | Rust 平台原生 API 设置 DUPLEX 标志 | P0 |
| **色彩模式** | 彩色(Color) / 灰度(Grayscale) / 黑白(Monochrome) | Rust 平台原生 API 设置 Color 标志 | P0 |
| **打印质量/DPI** | 草稿(150dpi) / 标准(300dpi) / 高质量(600dpi) / 最佳(1200dpi+) | Rust 平台原生 API 设置 PrintQuality/YResolution | P1 |
| **纸张来源/纸盒** | 自动选择 / 纸盒1 / 纸盒2 / 纸盒3 / 手动进纸 / 信封 feeder | Rust 平台原生 API 设置 DefaultSource | P1 |
| **页面缩放** | 实际大小 / 适合页面 / 自定义百分比(10%-400%) | 前端计算 + Rust 输出时缩放 | P1 |
| **每页版数(N-up)** | 1合1 / 2合1 / 4合1 / 6合1 / 8合1 / 9合1 / 16合1 | 前端 canvas 排版后转 PDF / Rust 端页面布局 | P1 |
| **页面排序** | 逐份打印(1,2,3... 1,2,3...) / 逐页打印(1,1... 2,2...) | 前端队列控制打印顺序 | P1 |
| **装订方式** | 无 / 左侧 / 顶部 / 右侧 / 双钉 / 骑马钉 | 前端提示 + Rust 设置（部分打印机支持） | P2 |
| **页眉页脚** | 自定义内容（日期、文件名、页码、总页数等变量） | 前端预览叠加，Rust 输出时嵌入 | P2 |
| **打印水印** | 文字水印/图片水印，支持透明度、角度、位置 | 复用工具箱水印模块，叠加后打印 | P2 |
| **边距设置** | 默认 / 窄边距 / 无边距 / 自定义上下左右(mm) | Rust 平台 API 设置 ImageableArea / 前端裁剪 | P1 |
| **打印后处理** | 无 / 装订 / 打孔 / 折叠 / 裁剪 / 分类输出 | Rust 设置 JCL/PJL 命令（高端打印机） | P2 |
| **逆序打印** | 从最后一页开始打印 | 前端页码反转后提交 | P1 |

#### 9.6 智能打印

| 功能 | 实现方式 | 优先级 |
|------|----------|--------|
| 自动选择最近使用的打印机 | 从本地设置读取上次使用的打印机 | P1 |
| 根据文件类型推荐打印设置 | PDF 推荐A4标准质量，图片推荐实际大小高质量 | P2 |
| 打印模板保存与快速应用 | 用户保存常用参数组合，一键切换 | P2 |
| 打印成本估算 | 根据页数、彩色/黑白、纸张类型估算墨水/纸张消耗 | P2 |

---

## 项目结构

```
/workspace/office-toolbox/
├── src/                              # Vue3 前端源码
│   ├── main.ts
│   ├── App.vue                       # 根组件（全局布局：搜索栏+侧边栏+内容区）
│   ├── router/
│   │   └── index.ts                  # 路由懒加载配置
│   ├── stores/
│   │   ├── app.ts                    # 全局状态（主题、窗口状态）
│   │   ├── history.ts                # 最近使用/收藏
│   │   └── settings.ts               # 用户偏好设置
│   ├── components/
│   │   ├── common/
│   │   │   ├── ToolLayout.vue        # 统一工具页面布局（输入/配置/输出）
│   │   │   ├── FileDropZone.vue      # 文件拖拽上传组件
│   │   │   ├── TextEditor.vue        # 轻量文本编辑器封装
│   │   │   ├── PreviewPanel.vue      # 预览面板（图片/PDF/代码高亮）
│   │   │   └── ActionBar.vue         # 操作按钮栏（复制/下载/清空）
│   │   └── layout/
│   │       ├── AppSidebar.vue        # 左侧分类导航（支持收藏置顶）
│   │       ├── AppHeader.vue         # 顶部搜索栏（支持拼音/缩写匹配）
│   │       └── AppFooter.vue         # 底部状态栏
│   ├── composables/
│   │   ├── useTool.ts                # 工具页面通用逻辑
│   │   ├── useFileOperation.ts       # 文件读写/拖拽逻辑
│   │   ├── useClipboard.ts           # 剪贴板操作封装
│   │   └── useNotification.ts        # 消息通知统一封装
│   ├── views/
│   │   ├── HomeView.vue              # 首页（最近使用/收藏/搜索）
│   │   ├── pdf/                      # PDF 工具箱
│   │   ├── convert/                  # 格式转换
│   │   ├── text/                     # 文本处理
│   │   ├── codec/                    # 编码解码
│   │   ├── json/                     # JSON/YAML 工具
│   │   ├── image/                    # 图片工具
│   │   ├── calculate/                # 计算与转换
│   │   ├── system/                   # 系统辅助
│   │   └── print/                    # 打印中心
│   │       ├── PrintManager.vue      # 打印机管理
│   │       ├── SinglePrint.vue       # 单文件打印
│   │       ├── BatchPrint.vue        # 批量打印
│   │       ├── PrintQueue.vue        # 打印队列管理
│   │       ├── PrintSettings.vue     # 打印设置面板
│   │       └── PrintPreview.vue      # 打印预览
│   ├── utils/
│   │   ├── pdf/
│   │   ├── text/
│   │   ├── codec/
│   │   ├── format/
│   │   └── helpers.ts
│   ├── types/
│   │   ├── tool.ts                   # 工具元数据类型定义
│   │   └── common.ts
│   ├── assets/
│   │   ├── styles/
│   │   │   ├── main.css              # 全局样式（Tailwind 指令）
│   │   │   └── naive-ui-overrides.css
│   │   └── icons/                    # 工具分类图标
│   └── plugins/
│       └── naive-ui.ts               # NaiveUI 按需引入配置
├── src-tauri/                        # Tauri 2.0 Rust 后端
│   ├── Cargo.toml
│   ├── build.rs
│   ├── capabilities/
│   │   └── default.json              # 显式声明权限（fs/dialog/clipboard等）
│   ├── icons/
│   └── src/
│       ├── main.rs                   # 应用入口
│       ├── lib.rs
│       ├── commands/                 # IPC 命令处理器
│       │   ├── mod.rs
│       │   ├── pdf.rs
│       │   ├── file.rs
│       │   ├── image.rs
│       │   ├── system.rs
│       │   ├── clipboard.rs
│       │   └── print.rs              # 打印相关 IPC 命令
│       ├── services/                 # 业务逻辑服务层
│       │   ├── mod.rs
│       │   ├── pdf_service.rs        # 封装 lopdf/poppler
│       │   ├── image_service.rs      # 封装 image crate
│       │   ├── file_service.rs
│       │   └── print_service.rs      # 打印业务逻辑（平台 API 封装）
│       ├── plugins/
│       │   └── ...
│       └── utils/
│           ├── error.rs              # 全局错误类型
│           ├── path.rs
│           ├── print_win.rs          # Windows 打印 API 封装 (DEVMODE/DocumentProperties)
│           ├── print_mac.rs          # macOS 打印 API 封装 (PMPageFormat)
│           └── print_linux.rs        # Linux CUPS API 封装
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js                # 禁用 preflight
├── tsconfig.json
├── package.json
└── README.md
```

---

## 技术实现要点

### 1. Tauri 2.0 IPC 与权限

所有前后端通信通过 `invoke` 实现。在 `src-tauri/capabilities/default.json` 中显式声明最小权限集：
- `core:default`
- `fs:allow-read-file`, `fs:allow-write-file`, `fs:allow-read-dir`
- `dialog:allow-open`, `dialog:allow-save`
- `clipboard-manager:allow-read-text`, `clipboard-manager:allow-write-text`
- `shell:allow-open`
- `window:allow-set-always-on-top`

Rust 命令层只负责参数校验和调用转发，业务逻辑封装在 `services/` 层。

### 2. NaiveUI + TailwindCSS 整合

在 `tailwind.config.js` 中禁用 Preflight：
```js
module.exports = {
  corePlugins: { preflight: false },
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
}
```

样式分工：
- **NaiveUI**：Button、Input、Select、Modal、Menu、Tabs、DataTable、Message/Notification
- **TailwindCSS**：flex/grid 布局、padding/margin/gap、自定义视觉元素

### 3. 前端设计方向（基于 frontend-design skill）

采用**"专业极简 + 精致细节"**的设计方向，区别于市面上工具箱的通用感：
- **字体**：中文正文使用系统栈（PingFang SC / Microsoft YaHei），代码展示使用 JetBrains Mono / Cascadia Code 等宽字体
- **色彩**：主色采用中性灰蓝（`#2563eb`），各模块使用分类色标识（PDF-红、文本-绿、编码-紫、图片-橙）
- **动效**：文件拖拽高亮边框动画、页面加载 staggered reveal、操作成功轻量 toast
- **空间**：紧凑舒适的密度， generous negative space 与关键信息区域的高密度形成对比
- **暗色模式**：通过 NaiveUI `n-config-provider` + Tailwind `dark:` 前缀实现，支持跟随系统自动切换

### 4. 交互范式：搜索优先

- 全局快捷键 `Alt+Space` 唤起/隐藏窗口
- 顶部搜索栏支持中文拼音/缩写匹配（如 "pdfhb" 匹配 "PDF合并"）
- 左侧侧边栏树形分类，支持收藏夹置顶
- 每个工具采用"输入区 + 配置区 + 输出区"统一布局
- 文本类工具"输入即输出"实时响应；文件类工具显示进度条

### 5. Rust 后端关键 Crate

| 功能 | Crate |
|------|-------|
| PDF 处理 | `lopdf`, `pdf-extract` |
| 图片处理 | `image`, `oxipng`, `webp` |
| 哈希计算 | `ring`, `sha2`, `md-5` |
| 编码转换 | `encoding_rs` |
| 文件系统 | `tokio::fs`（异步非阻塞） |
| 剪贴板 | Tauri 内置 `clipboard-manager` |
| 数据库 | `rusqlite`（剪贴板历史/打印历史） |
| **打印基础** | **`tauri-plugin-printer`** |
| **Windows 打印 API** | **`winapi` (EnumPrintersW, OpenPrinterW, DocumentProperties, SetPrinter, DEVMODE)** |
| **macOS 打印 API** | **`cocoa` / `objc` (PMPageFormat, PMPrintSettings)** |
| **Linux 打印 API** | **`libcups2` / HTTP CUPS API** |

大文件处理使用 `tokio::task::spawn_blocking` 避免阻塞异步运行时。

### 6. 打印中心技术实现方案

#### 6.1 跨平台打印架构

采用**分层架构**：基础打印能力由 `tauri-plugin-printer` 提供，高级打印设置通过 Rust 端调用各平台原生 API 实现。

```
前端 Vue3
    ├── 打印设置 UI (PrintSettings.vue)
    ├── 打印预览 (PrintPreview.vue - PDF.js / canvas)
    ├── 批量打印队列 (BatchPrint.vue)
    └── 打印任务监控 (PrintQueue.vue)
         │
         ▼ invoke 调用
Rust 后端
    ├── commands/print.rs          # IPC 入口，参数校验
    ├── services/print_service.rs  # 业务编排
    │       ├── 基础打印: tauri-plugin-printer (printers/print/print_file/jobs)
    │       └── 高级设置: 平台原生 API
    ├── utils/print_win.rs         # Windows DEVMODE/DocumentProperties
    ├── utils/print_mac.rs         # macOS PMPrintSettings
    └── utils/print_linux.rs       # Linux CUPS options
```

#### 6.2 基础打印能力（tauri-plugin-printer）

集成 `tauri-plugin-printer` (felipeejunges 版本) 提供跨平台基础能力：
- **打印机枚举**：`printers(id?)` 返回 Printer[]（name, driver_name, job_count, printer_status）
- **文件打印**：`print_file(options)` 支持 PDF 文件路径或 Buffer 输入
- **结构化打印**：`print(data, options)` 支持 text/image/table/qrCode/barCode 动态生成 PDF 后打印
- **任务管理**：`jobs() / job() / pause_job() / resume_job() / restart_job() / remove_job()`

前端通过 `tauri-plugin-printer-api` npm 包直接调用，无需额外 Rust 命令封装。

#### 6.3 高级打印设置（平台原生 API）

`tauri-plugin-printer` 的 `PrintOptions` 仅支持 `pageSize`, `tray`, `jobName`, `copies` 等基础参数。对于双面打印、色彩模式、DPI、页面方向、N-up 等高级设置，必须通过 Rust 调用平台原生 API：

**Windows 实现**：
- 使用 `winapi` crate 调用 `EnumPrintersW` 枚举打印机，`OpenPrinterW` 打开打印机句柄
- 使用 `DocumentPropertiesW` 获取/设置 `DEVMODE` 结构体，修改以下字段：
  - `dmOrientation`: DMORIENT_PORTRAIT / DMORIENT_LANDSCAPE
  - `dmColor`: DMCOLOR_COLOR / DMCOLOR_MONOCHROME
  - `dmDuplex`: DMDUP_SIMPLEX / DMDUP_VERTICAL / DMDUP_HORIZONTAL
  - `dmPrintQuality` / `dmYResolution`: 打印质量/DPI
  - `dmDefaultSource`: 纸张来源（纸盒/手动进纸）
  - `dmPaperSize` / `dmPaperWidth` / `dmPaperLength`: 纸张大小或自定义尺寸
- 使用 `SetPrinterW` 应用修改后的设置

**macOS 实现**：
- 使用 `cocoa` / `objc` crate 调用 Core Printing API：
  - `PMCreatePageFormat` / `PMCreatePrintSettings` 创建打印配置
  - `PMSetOrientation` 设置页面方向
  - `PMSetCopies` 设置份数
  - `PMSetPageRange` 设置页码范围
  - 通过 `PMSessionBeginDocumentNoDialog` 执行无界面打印

**Linux 实现**：
- 使用 CUPS HTTP API 发送 IPP 请求：
  - `CUPS_GET_PRINTERS` 枚举打印机
  - `IPP_OP_PRINT_JOB` / `IPP_OP_CREATE_JOB` 提交打印任务
  - 通过 `media` / `sides` / `print-color-mode` / `print-quality` / `number-up` 等 CUPS 选项控制高级设置

#### 6.4 批量打印实现

1. **前端队列管理**：用户拖拽导入多文件后，前端维护打印任务队列（文件路径、目标打印机、打印参数）
2. **文件预处理**：非 PDF 文件（Word/Excel/图片）先调用工具箱内部转换模块转为 PDF
3. **顺序提交**：Rust 端按队列顺序调用 `print_file()`，每次提交后等待任务进入队列再提交下一项
4. **进度反馈**：通过 Tauri `emit` 事件向前端推送进度（当前第N个/共M个，状态变化）
5. **错误处理**：单文件打印失败后 emit 错误事件，前端弹出提示让用户选择"重试/跳过/取消全部"

#### 6.5 打印预览实现

- **PDF 文件**：前端使用 `pdf-lib.js` 或 `PDF.js` 渲染页面缩略图
- **图片文件**：原生 `<img>` 标签展示，支持缩放和旋转
- **其他文件**：先转换为 PDF 后按 PDF 方式预览
- **设置实时反馈**：用户调整纸张大小、方向、边距等参数时，预览区域实时重绘（通过 canvas 模拟页面布局）
- **N-up 预览**：前端 canvas 按 N-up 规则排版后展示缩略图

#### 6.6 打印历史与模板

- **打印历史**：使用 `rusqlite` 在本地存储打印记录（时间、文件路径、打印机、参数、页数、状态）
- **打印模板**：用户保存常用参数组合（如"A4双面灰度"、"A3横向彩色高质量"）为命名模板，存储在本地 JSON，打印时一键选用

---

## 假设与决策

1. **PDF 转 Word 定位为简单文档转换**：复杂排版文档不保证效果，避免引入重量级依赖（如 LibreOffice 头文件）。
2. **OCR 暂不实现**：由于明确不集成 AI，OCR 需要平台原生 API 绑定，复杂度较高，留作后续扩展。
3. **图片处理上限**：单文件大小限制在合理范围（如 50MB），超大文件给出提示。
4. **完全离线**：所有数据处理在本地完成，不涉及云端 API，保障隐私。
5. **Vue3 严格使用 Composition API**：所有组件采用 `<script setup>` + TypeScript，不使用 Options API。
6. **工具页面独立 chunk**：Vite 路由懒加载确保每个工具页面独立打包，秒开即用。
7. **剪贴板历史存储在本地**：使用 SQLite 或 JSON 文件存储，不加密（工具箱定位不涉及敏感密码管理）。
8. **打印中心采用分层实现策略**：基础打印（打印机发现、PDF打印、任务管理）使用成熟的 `tauri-plugin-printer` 插件；高级打印设置（双面、色彩模式、DPI、页面方向等）通过 Rust 调用各平台原生 API 实现。这种分层避免了从零开发跨平台打印的复杂度，同时保证了高级功能的完整性。
9. **Word/Excel 打印走"先转PDF再打印"路径**：由于直接打印 Word/Excel 需要依赖平台原生应用（如 Microsoft Office 或 LibreOffice），复杂度极高，因此统一先调用工具箱内部的格式转换模块转为 PDF，再利用 PDF 打印能力输出。此路径稳定可靠且跨平台一致。
10. **高级打印设置存在平台差异**：Windows DEVMODE、macOS PMPrintSettings、Linux CUPS options 的能力不尽相同。核心参数（纸张大小、方向、份数、双面、色彩模式）在三平台均实现；部分高级参数（装订方式、打印后处理）仅在支持的平台/打印机上可用，前端 UI 根据当前平台和打印机能力动态显示/隐藏选项。
11. **批量打印采用顺序提交而非并发**：为避免多个大文件同时提交导致打印机内存溢出或队列混乱，批量打印采用顺序逐一提交策略，前端显示进度条，用户可随时暂停/取消队列。

---

## 验证步骤

1. **项目初始化验证**：`npm run tauri dev` 能正常启动，显示基础窗口布局（侧边栏 + 搜索栏 + 内容区）。
2. **前后端通信验证**：实现一个最简单的"文本反转"工具，验证 `invoke` 调用 Rust 函数并返回结果到前端。
3. **NaiveUI + TailwindCSS 整合验证**：页面同时包含 NaiveUI 组件（如 `n-button`、`n-input`）和 Tailwind 工具类（如 `flex gap-4`），检查无样式冲突。
4. **文件拖拽验证**：实现 PDF 合并工具的前端拖拽区，验证多文件拖拽、排序、Rust 端接收路径并合并输出。
5. **暗色模式验证**：切换系统主题或手动切换，验证所有页面正确响应暗色模式。
6. **打包验证**：`npm run tauri build` 能在目标平台生成可执行文件。
7. **打印机识别验证**：进入打印中心，能正确列出本机所有打印机（包括本地USB、网络共享、虚拟PDF打印机），状态显示正确。
8. **单文件打印验证**：选择一份 PDF 文件，设置纸张A4、双面长边翻转、灰度模式、2份，点击打印后能在目标打印机正确输出。
9. **批量打印验证**：拖拽导入5个不同文件（PDF+图片+Word），统一设置打印参数后执行批量打印，验证队列顺序执行、进度反馈、中途取消功能正常。
10. **打印预览验证**：调整纸张大小、方向、N-up 设置时，预览区域实时重绘，与实际打印结果一致。
11. **打印任务管理验证**：提交打印任务后，能在打印队列中查看任务状态，并执行暂停/恢复/取消操作。

---

## MVP 迭代路径

| 阶段 | 目标 | 包含功能 |
|------|------|----------|
| **Phase 1** | 核心骨架 | 工程初始化、全局搜索、左侧导航、暗色模式、ToolLayout 统一布局组件 |
| **Phase 2** | 高频工具 | PDF合并/拆分/压缩/转图片、文本替换/去重/排序/统计、Base64/URL编解码、JSON格式化/校验、图片压缩/格式转换/尺寸调整、时间戳转换、二维码生成、取色器 |
| **Phase 2.5** | 打印中心 MVP | 打印机识别与管理、PDF/图片单文件打印、完整打印设置参数（纸张/方向/份数/页码范围/双面/色彩模式/DPI/纸盒/边距）、打印预览、批量打印（含进度与队列管理） |
| **Phase 3** | 完整覆盖 | 补齐所有 P1/P2 功能（含打印中心的打印历史、打印模板、打印成本估算、N-up/装订/页眉页脚/水印打印等高级功能），增加批量处理、剪贴板历史等增强功能 |
