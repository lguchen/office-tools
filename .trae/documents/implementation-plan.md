# 轻量化办公文档工具箱 - 实施计划

## 摘要

根据用户需求，初始化 Tauri 2.0 + Vue3 项目并实现模块1至模块5功能。

---

## 现状分析

**当前状态**：项目仅有配置文件(package.json, vite.config.ts等)，无源代码
**目标**：创建完整的项目结构，实现PDF工具箱、文档格式转换、文本处理、编码解码、JSON/YAML工具五大模块

---

## 项目初始化

### 1.1 创建 Tauri 后端结构 (src-tauri/)

**文件结构**：
```
src-tauri/
├── Cargo.toml              # Rust 依赖配置
├── tauri.conf.json         # Tauri 配置
├── build.rs
├── capabilities/
│   └── default.json        # 权限声明
└── src/
    ├── main.rs             # 应用入口
    ├── lib.rs              # 库入口，导出命令
    └── commands/           # IPC 命令
        ├── mod.rs
        ├── pdf.rs          # PDF 处理命令
        ├── file.rs         # 文件操作命令
        └── image.rs        # 图片处理命令
```

**关键 Rust 依赖 (Cargo.toml)**：
- `lopdf` - PDF 处理
- `image` - 图片处理
- `sha2` / `md-5` - 哈希计算
- `encoding_rs` - 编码转换
- `base64` - Base64 编解码
- `serde` / `serde_json` - 序列化
- `tokio` - 异步运行时

**关键权限 (capabilities/default.json)**：
- 全部权限放开（`"*"`），包括：
  - `core:default`
  - `fs:allow-read-file`, `fs:allow-write-file`, `fs:allow-read-dir`, `fs:allow-remove`, `fs:allow-rename`, `fs:allow-copy-file`
  - `dialog:allow-open`, `dialog:allow-save`, `dialog:allow-message`, `dialog:allow-ask`
  - `clipboard-manager:allow-read-text`, `clipboard-manager:allow-write-text`, `clipboard-manager:allow-read-image`, `clipboard-manager:allow-write-image`
  - `shell:allow-open`, `shell:allow-execute`
  - `window:allow-*`
  - `process:allow-*`

### 1.2 创建 Vue3 前端结构 (src/)

**目录结构**：
```
src/
├── main.ts
├── App.vue
├── router/
│   └── index.ts
├── stores/
│   ├── app.ts
│   └── settings.ts
├── components/
│   ├── common/
│   │   ├── ToolLayout.vue
│   │   ├── FileDropZone.vue
│   │   ├── ActionBar.vue
│   │   └── PreviewPanel.vue
│   └── layout/
│       ├── AppSidebar.vue
│       ├── AppHeader.vue
│       └── AppFooter.vue
├── views/
│   ├── HomeView.vue
│   ├── pdf/
│   │   ├── PdfMerge.vue
│   │   ├── PdfSplit.vue
│   │   ├── PdfCompress.vue
│   │   └── PdfToImages.vue
│   ├── convert/
│   │   ├── ExcelConvert.vue
│   │   └── MarkdownConvert.vue
│   ├── text/
│   │   ├── TextReplace.vue
│   │   ├── TextDedup.vue
│   │   ├── TextSort.vue
│   │   └── TextStats.vue
│   ├── codec/
│   │   ├── Base64Codec.vue
│   │   ├── UrlCodec.vue
│   │   └── HashCalc.vue
│   └── json/
│       ├── JsonFormat.vue
│       └── JsonValidate.vue
├── composables/
│   ├── useFileOperation.ts
│   └── useNotification.ts
└── assets/
    └── styles/
        └── main.css
```

### 1.3 路由配置 (src/router/index.ts)

懒加载路由，9大模块导航：
- `/` - 首页
- `/pdf/*` - PDF工具箱
- `/convert/*` - 文档转换
- `/text/*` - 文本处理
- `/codec/*` - 编码解码
- `/json/*` - JSON工具

---

## 模块1：PDF工具箱

### 实现功能（P0优先级）：

| 功能 | 前端实现 | 后端实现 |
|------|---------|---------|
| PDF合并 | 拖拽排序 + pdf-lib | lopdf 合并页面对象 |
| PDF拆分 | 按页码范围拆分 | lopdf 按范围提取 |
| PDF压缩 | 前端压缩选项 | - |
| PDF转图片 | - | image crate 渲染 |

### 关键文件：
- `src/views/pdf/PdfMerge.vue`
- `src/views/pdf/PdfSplit.vue`
- `src/views/pdf/PdfCompress.vue`
- `src/views/pdf/PdfToImages.vue`
- `src-tauri/src/commands/pdf.rs`

---

## 模块2：文档格式转换

### 实现功能：

| 功能 | 前端实现 |
|------|---------|
| Excel/CSV互转 | xlsx + papaparse |
| Markdown转HTML | marked |
| HTML转Markdown | turndown |

### 关键文件：
- `src/views/convert/ExcelConvert.vue`
- `src/views/convert/MarkdownConvert.vue`

---

## 模块3：文本处理工具

### 实现功能（P0优先级）：

| 功能 | 前端实现 |
|------|---------|
| 文本替换 | 正则/多规则替换 |
| 文本去重 | 行级去重 |
| 文本排序 | 字母/数字/长度排序 |
| 文本统计 | 字符/字数/行数统计 |

### 关键文件：
- `src/views/text/TextReplace.vue`
- `src/views/text/TextDedup.vue`
- `src/views/text/TextSort.vue`
- `src/views/text/TextStats.vue`

---

## 模块4：编码解码与加密

### 实现功能（P0优先级）：

| 功能 | 前端实现 | 后端实现 |
|------|---------|---------|
| Base64编码/解码 | ✅ | - |
| URL编码/解码 | ✅ | - |
| MD5/SHA计算 | - | Rust ring/sha2 |
| Hex编解码 | - | Rust |

### 关键文件：
- `src/views/codec/Base64Codec.vue`
- `src/views/codec/UrlCodec.vue`
- `src/views/codec/HashCalc.vue`
- `src-tauri/src/commands/codec.rs`

---

## 模块5：JSON/YAML工具

### 实现功能（P0优先级）：

| 功能 | 前端实现 |
|------|---------|
| JSON格式化/压缩 | ✅ (shiki语法高亮) |
| JSON校验 | ✅ (定位错误) |
| JSON转TypeScript | ✅ |

### 关键文件：
- `src/views/json/JsonFormat.vue`
- `src/views/json/JsonToTypescript.vue`

---

## 技术要点

### 1. NaiveUI + TailwindCSS 整合
- `tailwind.config.js` 禁用 preflight
- 样式分工：NaiveUI 组件 + Tailwind 布局

### 2. 组件复用
- `ToolLayout.vue` - 统一工具页面布局
- `FileDropZone.vue` - 文件拖拽上传
- `ActionBar.vue` - 操作按钮栏

### 3. 状态管理
- Pinia stores: app.ts, settings.ts
- 路由懒加载优化首屏速度

---

## 实施步骤

1. **初始化 Tauri 后端**
   - 创建 src-tauri/ 目录结构
   - 配置 Cargo.toml 和 tauri.conf.json
   - 实现 PDF 处理基础命令

2. **初始化 Vue3 前端**
   - 创建 src/ 目录结构
   - 配置路由和 Pinia stores
   - 实现通用组件 (ToolLayout, FileDropZone)

3. **实现模块1：PDF工具箱**
   - PDF合并、拆分、压缩、转图片

4. **实现模块2-5**
   - 文档转换、文本处理、编码解码、JSON工具

---

## 验证步骤

1. `npm run tauri dev` 能正常启动
2. 侧边栏导航正确显示所有模块
3. 首页正常加载
4. PDF合并工具能正常工作
5. 文本处理工具实时响应
6. JSON格式化高亮显示
