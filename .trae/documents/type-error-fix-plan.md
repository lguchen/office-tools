# Office Tools 类型错误修复计划

## 概述
修复 `office-tools` 项目中所有 Vue/TypeScript 类型错误，共涉及约 30+ 个文件，主要包括图标名称错误、Upload 类型错误、NInput 类型错误、save filters 类型错误等。

## 错误分类与修复方案

### 1. 图标名称错误 (@vicons/ionicons5)

**问题**: 导入的图标名称在 `@vicons/ionicons5` 中不存在。

**修复映射表**:

| 错误图标名 | 替换为 | 说明 |
|-----------|--------|------|
| DownloadOutline | CloudDownloadOutline | 下载图标 |
| MoonOutline | 移除，只用 SunnyOutline | 主题切换用同一个图标 |
| CalendarOutline | TimeOutline | 时间/日历图标 |
| ImagesOutline | ImageOutline | 图片图标 |
| ColorPaletteOutline | ColorFillOutline | 调色板/颜色图标 |
| GridOutline | GridOutline → 如不存在用 TableCellsOutline | 网格图标 |
| QrCodeOutline | BarcodeOutline | 二维码图标 |
| SwapVerticalOutline | SwapHorizontalOutline | 交换图标 |
| TimeOutline | TextOutline | 时间图标 |
| CalculatorOutline | CreateOutline | 计算器图标 |
| CodeDownloadOutline | CloudDownloadOutline | 代码下载图标 |
| ColorFillOutline | ColorFillOutline → 如不存在用 ColorPaletteOutline | 填充图标 |
| CompressOutline | CopyOutline | 压缩图标 |
| RepeatOutline | RefreshOutline | 重复/刷新图标 |
| ResizeOutline | CropOutline | 调整尺寸图标 |
| ColorFilterOutline | FilterOutline | 颜色过滤图标 |
| CheckmarkCircleOutline | CheckmarkOutline | 勾选图标 |
| CloseCircleOutline | CloseOutline | 关闭图标 |
| ScanOutline | SearchOutline | 扫描图标 |
| AddCircleOutline | AddOutline | 添加图标 |
| ListOutline | ListCircleOutline | 列表图标 |
| ArrowUpOutline | ChevronUpOutline | 向上箭头 |
| ArrowDownOutline | ChevronDownOutline | 向下箭头 |
| SwapOutline | SwapHorizontalOutline | 交换图标 |
| StatsOutline | BarChartOutline | 统计图标 |

### 2. Upload customRequest 类型错误

**问题**: `handleFileUpload` 函数参数类型 `{ file: File }` 与 naive-ui 的 `UploadCustomRequestOptions` 不兼容。

**修复方案**: 
- 将参数类型改为 `(options: any)`
- 从 `options.file.file` 获取原生 File 对象（naive-ui 的 UploadFileInfo 结构）
- 或者使用类型断言

**涉及文件**:
- src/views/codec/Base64Codec.vue
- src/views/codec/HashCalc.vue
- src/views/convert/EncodingConvert.vue
- src/views/convert/ExcelConvert.vue
- src/views/image/ColorPicker.vue
- src/views/image/ImageCompress.vue
- src/views/image/ImageConvert.vue
- src/views/image/ImageResize.vue
- src/views/print/BatchPrint.vue
- src/views/print/SinglePrint.vue
- src/views/system/QrCodeScanner.vue

### 3. NInput type="number" / "date" / "time" 错误

**问题**: NInput 的 type 属性只支持 "text" | "textarea" | "password"。

**修复方案**:
- 数字输入: 改用 `NInputNumber` 组件
- 日期/时间输入: 改用 `NDatePicker` 或保持文本输入

**涉及文件**:
- src/views/calculate/TimestampConvert.vue (date, time)
- src/views/calculate/UuidGenerator.vue (number)
- src/views/image/ImageResize.vue (number, 多处)

### 4. NInput v-model:value 类型错误

**问题**: NInput 的 value 必须是 string 类型，但代码中用了 number。

**修复方案**: 改用 NInputNumber 组件（与第 3 点一起修复）

### 5. save() filters 类型错误

**问题**: `useFileOperation` 中的 `saveFile` 函数调用方式有误，`PdfCompress.vue` 等文件中传入的参数格式不对。

**分析**: 
- `saveFile(defaultPath?: string, filters?: ...[])` 接受两个参数
- 但调用时 `saveFile('compressed.pdf', { name: 'PDF文件', extensions: ['pdf'] })` 第二个参数不是数组

**修复方案**: 
- 修正调用方式，将 filters 包装为数组
- 检查 PdfCompress.vue, PdfMerge.vue, PdfSplit.vue, PdfToImages.vue

### 6. 其他小问题

#### HashCalc.vue - Cannot assign to 'value' because it is a read-only property
- 问题: `outputText.value = ''` 但 outputText 是 computed
- 修复: 移除该行，outputText 不需要手动清空

#### ImageCompress.vue - Operator '>' cannot be applied to types 'string | number' and 'number'
- 问题: `compressionRatio > 0` 但 compressionRatio 的类型是 string | number（因为 toFixed 返回 string）
- 修复: 将 comparison 改为数值比较，或调整 computed 返回类型

## 修复文件列表

### 公共组件
1. src/components/common/ActionBar.vue
2. src/components/layout/AppHeader.vue
3. src/components/layout/AppSidebar.vue

### 计算转换
3. src/views/calculate/BaseConvert.vue
4. src/views/calculate/TimestampConvert.vue
5. src/views/calculate/UuidGenerator.vue

### 编码解码
6. src/views/codec/Base64Codec.vue
7. src/views/codec/HashCalc.vue

### 文档转换
8. src/views/convert/EncodingConvert.vue
9. src/views/convert/ExcelConvert.vue

### 首页
10. src/views/HomeView.vue

### 图片处理
11. src/views/image/ColorPicker.vue
12. src/views/image/ImageCompress.vue
13. src/views/image/ImageConvert.vue
14. src/views/image/ImageResize.vue

### JSON工具
15. src/views/json/JsonFormat.vue
16. src/views/json/JsonValidate.vue

### PDF工具箱
17. src/views/pdf/PdfCompress.vue
18. src/views/pdf/PdfMerge.vue
19. src/views/pdf/PdfSplit.vue
20. src/views/pdf/PdfToImages.vue

### 打印中心
21. src/views/print/BatchPrint.vue
22. src/views/print/PrintManager.vue
23. src/views/print/PrintQueue.vue
24. src/views/print/SinglePrint.vue

### 系统辅助
25. src/views/system/QrCodeGenerator.vue
26. src/views/system/QrCodeScanner.vue

### 文本处理
27. src/views/text/TextCase.vue
28. src/views/text/TextReplace.vue
29. src/views/text/TextSort.vue
30. src/views/text/TextStats.vue

### Composables
31. src/composables/useFileOperation.ts (如有需要)

## 执行步骤

1. **修复图标错误** - 批量替换所有不存在的图标名称
2. **修复 Upload customRequest** - 统一修改 handleFileUpload 参数类型
3. **修复 NInput 类型错误** - 将数字输入改为 NInputNumber
4. **修复 save filters 错误** - 修正 PDF 相关文件的调用方式
5. **修复其他小问题** - HashCalc 和 ImageCompress 的特定问题
6. **运行类型检查验证** - 执行 vue-tsc 确认所有错误已修复

## 验证标准

- `npx vue-tsc --noEmit` 执行成功，无错误输出
- 项目可以正常构建
