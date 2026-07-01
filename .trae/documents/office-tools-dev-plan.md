# 轻量化办公文档工具箱 - 开发实施计划

## 一、项目现状分析

### 1.1 已有基础

**前端骨架（已完成）：**
- 全局布局：App.vue + AppHeader + AppSidebar + AppFooter
- 路由系统：Vue Router懒加载，已定义PDF/转换/文本/编解码/JSON五大模块
- 状态管理：Pinia stores（app、settings）
- 主题系统：暗色模式已实现，亮色模式待完善
- 通用组件：ToolLayout、FileDropZone、ActionBar
- 首页：HomeView 工具分类卡片展示
- 全局搜索：顶部搜索框，支持工具名称模糊匹配

**PDF工具箱（已完成）：**
- PDF合并：前端UI + Rust后端lopdf实现
- PDF拆分：前端UI + Rust后端实现
- PDF压缩：前端UI + Rust后端基础压缩
- PDF转图片：前端UI + Rust占位实现（需外部工具）

**Rust后端（部分完成）：**
- commands: pdf.rs、file.rs、image.rs、hash.rs
- 依赖：lopdf、image、sha2、md-5、base64、encoding_rs、tokio

### 1.2 缺失模块

根据 `tools-dev.md` 需求文档，以下模块需要开发：

| 模块 | 功能点 | 优先级 |
|------|--------|--------|
| 文档转换 | Excel/CSV互转、Markdown/HTML互转、文本编码转换 | P1 |
| 文本处理 | 文本替换、去重、排序、统计、大小写转换、空白处理 | P0/P1 |
| 编码解码 | Base64、URL编码、Hex编码、Unicode转换、哈希计算 | P0/P1 |
| JSON工具 | 格式化、校验、压缩、TypeScript接口生成 | P0/P1 |
| 图片处理 | 压缩、格式转换、尺寸调整、Base64互转、取色器 | P1 |
| 计算转换 | 时间戳转换、进制转换、UUID生成 | P1 |
| 系统辅助 | 二维码生成/识别、剪贴板历史 | P2 |
| 打印中心 | 打印机管理、单文件打印、批量打印、打印预览 | P0/P1 |

---

## 二、开发范围与目标

### 2.1 开发范围

基于项目现状和需求文档，本次开发涵盖 **Phase 2 高频工具** 全部功能，以及 **Phase 2.5 打印中心 MVP**。

### 2.2 技术约束

- **前端**：Vue3 Composition API + `<script setup>` + TypeScript 严格模式
- **UI框架**：NaiveUI（复杂组件）+ TailwindCSS（布局/原子样式）
- **构建**：Vite + 路由懒加载
- **后端**：Tauri 2.0 Rust
- **设计原则**：完全离线、秒开即用、统一交互

---

## 三、详细开发计划

### Phase 2-1：文本处理模块（P0）

**文件结构：**
```
src/views/text/
  ├── TextReplace.vue      # 文本替换
  ├── TextDedup.vue        # 文本去重
  ├── TextSort.vue         # 文本排序
  ├── TextStats.vue        # 文本统计
  └── TextCase.vue         # 大小写转换（新增）
```

**功能点：**
1. **文本替换** - 普通替换/正则替换，支持替换全部/单个
2. **文本去重** - 行级去重，保留首行/末行选项
3. **文本排序** - 升序/降序、字典序/数值序、忽略大小写
4. **文本统计** - 字符数/单词数/行数/中文字符数/空白字符数
5. **大小写转换** - 全大写/全小写/首字母大写/反转大小写

**实现方式：** 纯前端实现（文本量小，无需Rust后端）

**Rust命令：** 无需新增（纯前端）

---

### Phase 2-2：编码解码模块（P0）

**文件结构：**
```
src/views/codec/
  ├── Base64Codec.vue      # Base64编解码
  ├── UrlCodec.vue         # URL编解码
  ├── HashCalc.vue         # 哈希计算
  └── UnicodeCodec.vue     # Unicode转换（新增）
```

**功能点：**
1. **Base64编解码** - 文本模式 + 文件模式（图片Base64互转）
2. **URL编解码** - 自动识别编码状态，支持多次编解码
3. **哈希计算** - MD5/SHA1/SHA256/SHA512，文本+文件两种模式
4. **Unicode转换** - 中文转Unicode/Unicode转中文

**Rust命令新增：**
- `hash_file(path: String, algorithm: String) -> String` - 文件哈希计算
- `base64_encode_file(path: String) -> String` - 文件转Base64
- `base64_decode_file(data: String, output_path: String) -> String` - Base64转文件

---

### Phase 2-3：JSON工具模块（P0）

**文件结构：**
```
src/views/json/
  ├── JsonFormat.vue       # JSON格式化
  ├── JsonValidate.vue     # JSON校验
  └── JsonCompress.vue     # JSON压缩（新增）
```

**功能点：**
1. **JSON格式化** - 美化/压缩切换，自定义缩进（2/4空格），语法高亮
2. **JSON校验** - 实时校验，错误行号定位，错误信息展示
3. **JSON压缩** - 去除空白/注释，最小化输出

**实现方式：** 纯前端实现（使用JSON.parse + 自定义格式化）

---

### Phase 2-4：文档转换模块（P1）

**文件结构：**
```
src/views/convert/
  ├── ExcelConvert.vue     # Excel/CSV转换
  ├── MarkdownConvert.vue  # Markdown/HTML转换
  └── EncodingConvert.vue  # 文本编码转换（新增）
```

**功能点：**
1. **Excel/CSV互转** - xlsx转csv、csv转xlsx，支持编码选择
2. **Markdown/HTML互转** - Markdown转HTML、HTML转Markdown
3. **编码转换** - GBK/UTF-8/UTF-16等编码互转，支持预览

**前端依赖新增：**
- `marked` - Markdown解析
- `xlsx` - Excel处理（项目package.json中已有）

**Rust命令新增：**
- `convert_encoding(input_path: String, output_path: String, from_enc: String, to_enc: String) -> String`
- 使用 `encoding_rs` crate 实现

---

### Phase 2-5：图片处理模块（P1）

**文件结构：**
```
src/views/image/
  ├── ImageCompress.vue    # 图片压缩
  ├── ImageConvert.vue     # 格式转换
  ├── ImageResize.vue      # 尺寸调整
  └── ColorPicker.vue      # 取色器
```

**功能点：**
1. **图片压缩** - 质量调节，尺寸限制，批量压缩，前后对比
2. **格式转换** - PNG/JPG/WebP/GIF互转，批量转换
3. **尺寸调整** - 固定尺寸/百分比缩放/按宽高等比，保持比例选项
4. **取色器** - 上传图片取色，HEX/RGB/HSL格式复制

**Rust命令新增（使用image crate）：**
- `compress_image(input_path: String, output_path: String, quality: u8) -> String`
- `convert_image_format(input_path: String, output_path: String, format: String) -> String`
- `resize_image(input_path: String, output_path: String, width: u32, height: u32, keep_aspect: bool) -> String`
- `get_image_info(path: String) -> { width, height, size, format }`

---

### Phase 2-6：计算转换模块（P1）

**文件结构：**
```
src/views/calculate/
  ├── TimestampConvert.vue # 时间戳转换
  ├── BaseConvert.vue      # 进制转换
  └── UuidGenerator.vue    # UUID生成
```

**功能点：**
1. **时间戳转换** - Unix时间戳↔日期时间，支持毫秒/秒，多时区
2. **进制转换** - 2/8/10/16进制互转，支持小数
3. **UUID生成** - 批量生成UUID v4，支持大小写、带不带连字符

**实现方式：** 纯前端实现

---

### Phase 2.5-1：打印中心 MVP（P0）

**文件结构：**
```
src/views/print/
  ├── PrintManager.vue     # 打印机管理
  ├── SinglePrint.vue      # 单文件打印
  ├── BatchPrint.vue       # 批量打印
  ├── PrintQueue.vue       # 打印队列
  └── PrintPreview.vue     # 打印预览组件
```

**功能点：**
1. **打印机管理** - 枚举打印机、显示状态、设为默认、刷新列表
2. **单文件打印** - PDF/图片打印，打印参数设置
3. **批量打印** - 多文件队列，进度反馈，顺序执行
4. **打印参数** - 纸张大小、方向、份数、页码范围、双面、色彩模式、DPI

**Rust后端实现策略：**

由于 `tauri-plugin-printer` 可能不兼容 Tauri 2.0，采用 **Windows原生API** 实现（优先Windows平台）：

**新增Rust文件：**
```
src-tauri/src/commands/print.rs
src-tauri/src/services/print_service.rs
src-tauri/src/utils/print_win.rs
```

**Rust命令：**
- `list_printers() -> Vec<PrinterInfo>` - 枚举打印机
- `get_default_printer() -> String` - 获取默认打印机
- `print_pdf(printer: String, file_path: String, settings: PrintSettings) -> String` - 打印PDF
- `get_print_jobs(printer: String) -> Vec<PrintJob>` - 获取打印任务
- `control_print_job(printer: String, job_id: u32, action: String) -> bool` - 控制任务（暂停/恢复/取消/重启）

**Windows API使用（winapi crate）：**
- `EnumPrintersW` - 枚举打印机
- `OpenPrinterW` / `ClosePrinter` - 打开/关闭打印机
- `DocumentPropertiesW` - 获取/设置DEVMODE（打印参数）
- `ShellExecuteW` - 调用系统打印PDF
- `SetPrinter` - 设置打印机默认值
- `EnumJobsW` - 枚举打印任务
- `SetJobW` - 控制打印任务

**Cargo.toml新增依赖：**
```toml
winapi = { version = "0.3", features = ["winbase", "wingdi", "winspool", "shellapi"] }
```

---

### Phase 2.5-2：系统辅助模块（P2）

**文件结构：**
```
src/views/system/
  ├── QrCodeGenerator.vue  # 二维码生成
  └── QrCodeScanner.vue    # 二维码识别
```

**功能点：**
1. **二维码生成** - 文本转二维码，自定义大小、容错级别、颜色
2. **二维码识别** - 上传图片识别二维码内容

**实现方式：** 前端 `qrcode` 库生成，`jsQR` 库识别

---

## 四、路由与导航更新

### 4.1 路由新增

```typescript
// 图片处理
{
  path: '/image',
  name: 'image',
  redirect: '/image/compress',
  children: [
    { path: 'compress', name: 'image-compress', component: () => import('../views/image/ImageCompress.vue') },
    { path: 'convert', name: 'image-convert', component: () => import('../views/image/ImageConvert.vue') },
    { path: 'resize', name: 'image-resize', component: () => import('../views/image/ImageResize.vue') },
    { path: 'color-picker', name: 'image-color-picker', component: () => import('../views/image/ColorPicker.vue') },
  ]
},
// 计算转换
{
  path: '/calculate',
  name: 'calculate',
  redirect: '/calculate/timestamp',
  children: [
    { path: 'timestamp', name: 'calc-timestamp', component: () => import('../views/calculate/TimestampConvert.vue') },
    { path: 'base-convert', name: 'calc-base-convert', component: () => import('../views/calculate/BaseConvert.vue') },
    { path: 'uuid', name: 'calc-uuid', component: () => import('../views/calculate/UuidGenerator.vue') },
  ]
},
// 系统辅助
{
  path: '/system',
  name: 'system',
  redirect: '/system/qrcode',
  children: [
    { path: 'qrcode', name: 'system-qrcode', component: () => import('../views/system/QrCodeGenerator.vue') },
    { path: 'qrcode-scanner', name: 'system-qrcode-scanner', component: () => import('../views/system/QrCodeScanner.vue') },
  ]
},
// 打印中心
{
  path: '/print',
  name: 'print',
  redirect: '/print/single',
  children: [
    { path: 'single', name: 'print-single', component: () => import('../views/print/SinglePrint.vue') },
    { path: 'batch', name: 'print-batch', component: () => import('../views/print/BatchPrint.vue') },
    { path: 'queue', name: 'print-queue', component: () => import('../views/print/PrintQueue.vue') },
    { path: 'manage', name: 'print-manage', component: () => import('../views/print/PrintManager.vue') },
  ]
},
```

### 4.2 侧边栏菜单更新

新增：图片处理、计算转换、系统辅助、打印中心

### 4.3 首页分类更新

新增对应分类卡片

### 4.4 全局搜索更新

新增所有工具项

---

## 五、Rust后端命令清单

### 新增 commands 文件
- `print.rs` - 打印相关命令
- `text.rs` - 文本处理（如需要）

### 新增 services 文件
- `print_service.rs` - 打印业务逻辑
- `image_service.rs` - 图片处理业务逻辑

### 新增 utils 文件
- `print_win.rs` - Windows打印API封装

---

## 六、前端依赖新增

| 包名 | 用途 | 优先级 |
|------|------|--------|
| `marked` | Markdown解析 | P1 |
| `qrcode` | 二维码生成 | P2 |
| `jsqr` | 二维码识别 | P2 |

---

## 七、开发步骤顺序

按依赖关系和优先级，建议开发顺序：

1. **文本处理模块** - 纯前端，快速验证ToolLayout模式
2. **编码解码模块** - 前后端配合，验证hash/base64 Rust命令
3. **JSON工具模块** - 纯前端，语法高亮
4. **图片处理模块** - 验证image crate图片处理能力
5. **计算转换模块** - 纯前端，工具类功能
6. **文档转换模块** - 验证encoding_rs + xlsx + marked
7. **系统辅助模块** - 二维码生成/识别
8. **打印中心 MVP** - 最复杂，Windows API集成

---

## 八、风险与注意事项

### 8.1 技术风险

1. **打印中心Windows API复杂度高**
   - 缓解：先实现基础打印（ShellExecute调用系统打印），再逐步添加高级参数
   - 备选方案：如winapi绑定复杂，可先调用系统命令行打印

2. **图片处理性能**
   - 缓解：大文件使用 `spawn_blocking` 避免阻塞UI
   - 限制：单文件大小建议 < 50MB

3. **PDF转图片功能不完善**
   - 现状：当前仅生成占位图片
   - 方案：后续集成Ghostscript或poppler（需用户安装）

### 8.2 兼容性风险

1. **打印功能仅支持Windows**
   - 缓解：UI层面检测平台，非Windows显示提示
   - 后续：逐步添加macOS/Linux支持

2. **Tauri 2.0 API变化**
   - 缓解：使用官方推荐的API，参考文档

### 8.3 质量保证

1. 每个模块完成后手动测试核心功能
2. 暗色/亮色模式双模式验证
3. 响应式布局测试
4. 错误处理完善（用户友好的错误提示）

---

## 九、验证标准

每个模块完成后需验证：

1. **功能完整性** - 所有列出的功能点均已实现
2. **UI一致性** - 与现有PDF工具页面风格一致
3. **错误处理** - 异常情况有友好提示
4. **响应式** - 窗口缩放时布局正常
5. **主题切换** - 暗色/亮色模式均正常显示
6. **性能** - 常规操作无明显卡顿

---

## 十、文件变更总览

### 新增文件（约30+个）

**前端视图（24个）：**
- src/views/text/TextReplace.vue
- src/views/text/TextDedup.vue
- src/views/text/TextSort.vue
- src/views/text/TextStats.vue
- src/views/text/TextCase.vue
- src/views/codec/Base64Codec.vue
- src/views/codec/UrlCodec.vue
- src/views/codec/HashCalc.vue
- src/views/codec/UnicodeCodec.vue
- src/views/json/JsonFormat.vue
- src/views/json/JsonValidate.vue
- src/views/json/JsonCompress.vue
- src/views/convert/ExcelConvert.vue
- src/views/convert/MarkdownConvert.vue
- src/views/convert/EncodingConvert.vue
- src/views/image/ImageCompress.vue
- src/views/image/ImageConvert.vue
- src/views/image/ImageResize.vue
- src/views/image/ColorPicker.vue
- src/views/calculate/TimestampConvert.vue
- src/views/calculate/BaseConvert.vue
- src/views/calculate/UuidGenerator.vue
- src/views/system/QrCodeGenerator.vue
- src/views/system/QrCodeScanner.vue
- src/views/print/PrintManager.vue
- src/views/print/SinglePrint.vue
- src/views/print/BatchPrint.vue
- src/views/print/PrintQueue.vue

**Rust后端（4个）：**
- src-tauri/src/commands/print.rs
- src-tauri/src/services/print_service.rs
- src-tauri/src/services/image_service.rs
- src-tauri/src/utils/print_win.rs

### 修改文件（8个）

- src/router/index.ts - 新增路由
- src/components/layout/AppSidebar.vue - 新增菜单项
- src/components/layout/AppHeader.vue - 更新搜索列表
- src/views/HomeView.vue - 新增分类卡片
- src-tauri/src/commands/mod.rs - 注册新命令
- src-tauri/src/lib.rs - 注册命令
- src-tauri/Cargo.toml - 新增依赖
- package.json - 新增前端依赖
