<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePrintStore } from '@/stores/print'
import { useSettingStore } from '@/stores/setting'
import {
  NSelect,
  NInputNumber,
  NInput,
  NButton,
  NIcon,
  NSlider,
  NSwitch,
  NRadioGroup,
  NRadio,
  NTabPane,
  NTabs,
  NSpin,
  NEmpty,
  NTooltip,
  NDivider,
  NProgress,
  NList,
  NListItem,
  NTag
} from 'naive-ui'

const printStore = usePrintStore()
const settingStore = useSettingStore()

// === 新增：打印面板拖拽调整宽度 ===
const isResizing = ref(false)
let startX = 0
let startWidth = 0

const startResize = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isResizing.value = true
  startX = e.clientX
  startWidth = printStore.panelWidth
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const onResize = (e: MouseEvent) => {
  if (!isResizing.value) return
  const diff = startX - e.clientX
  const newWidth = startWidth + diff
  printStore.setPanelWidth(newWidth)
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// === 纸张尺寸选项 ===
const paperSizes = [
  { label: 'A4 (210×297mm)', value: 'A4' },
  { label: 'A3 (297×420mm)', value: 'A3' },
  { label: 'A5 (148×210mm)', value: 'A5' },
  { label: 'B5 (176×250mm)', value: 'B5' },
  { label: 'Letter (8.5×11英寸)', value: 'Letter' },
  { label: 'Legal (8.5×14英寸)', value: 'Legal' },
  { label: '自定义', value: 'custom' }
]

// === 打印机选项格式化 ===
const printerOptions = computed(() => {
  return printStore.printers.map(p => ({
    label: `${p.name}${p.is_default ? ' (默认)' : ''}${p.is_offline ? ' [离线]' : ''}`,
    value: p.name,
    disabled: p.is_offline
  }))
})

// === 当前选中打印机信息 ===
const currentPrinter = computed(() => {
  return printStore.printers.find(p => p.name === printStore.selectedPrinter)
})

// === 执行打印 ===
const emit = defineEmits<{
  (e: 'print'): void
  (e: 'close'): void
}>()

const handlePrint = async () => {
  if (!printStore.selectedPrinter) {
    alert('请先选择打印机')
    return
  }
  try {
    await printStore.doPrint()
    alert('打印任务已发送到打印机')
  } catch (e: any) {
    alert('打印失败：' + e.message)
  }
}

// === 预览翻页 ===
const prevPage = () => {
  if (printStore.previewPage > 1) {
    printStore.previewPage--
  }
}

const nextPage = () => {
  if (printStore.previewPage < printStore.totalPages) {
    printStore.previewPage++
  }
}

// === 批量打印统计 ===
const completedTasks = computed(() => printStore.printTasks.filter(t => t.status === 'completed').length)
const failedTasks = computed(() => printStore.printTasks.filter(t => t.status === 'failed').length)

onMounted(() => {
  printStore.loadPrinters()
  printStore.setupProgressListener()
})

onUnmounted(() => {
  stopResize()
})
</script>

<template>
  <div class="print-panel" :style="{ width: printStore.panelWidth + 'px' }">
    <!-- 拖拽条 -->
    <div
      class="panel-resizer"
      :class="{ resizing: isResizing }"
      @mousedown="startResize"
    >
      <div class="resizer-handle"></div>
    </div>

    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="panel-title">
        <span style="margin-right: 6px;">🖨</span>
        打印设置
      </div>
      <button class="close-btn" @click="emit('close')">×</button>
    </div>

    <div class="panel-body">
      <!-- 打印机选择 -->
      <div class="section">
        <div class="section-title">打印机</div>
        <div class="printer-selector">
          <n-select
            v-model:value="printStore.selectedPrinter"
            :options="printerOptions"
            placeholder="选择打印机"
            :loading="printStore.isLoading"
            size="small"
            filterable
            @update:value="printStore.selectPrinter($event)"
          />
          <n-tooltip content="刷新打印机列表">
            <n-button text size="small" @click="printStore.refreshPrinters()">
              <template #icon>🔄</template>
            </n-button>
          </n-tooltip>
        </div>
        <div v-if="currentPrinter" class="printer-info">
          <span class="status-dot" :class="{ offline: currentPrinter.is_offline }"></span>
          <span class="status-text" :class="{ offline: currentPrinter.is_offline }">
            {{ currentPrinter.status }}
          </span>
          <span class="printer-port">端口: {{ currentPrinter.port }}</span>
        </div>
      </div>

      <n-divider style="margin: 8px 0;" />

      <!-- 参数配置 Tabs -->
      <n-tabs type="line" size="small" class="param-tabs">
        <!-- 基础设置 -->
        <n-tab-pane name="basic" tab="基础">
          <div class="form-grid">
            <div class="form-row">
              <label class="form-label">打印份数</label>
              <n-input-number
                v-model:value="printStore.params.copies"
                :min="1"
                :max="999"
                size="small"
                style="width: 100%"
              />
            </div>
            <div class="form-row">
              <label class="form-label">打印范围</label>
              <n-radio-group v-model:value="printStore.params.page_range" size="small">
                <n-radio value="all">全部</n-radio>
                <n-radio value="custom">自定义</n-radio>
              </n-radio-group>
            </div>
            <div v-if="printStore.params.page_range === 'custom'" class="form-row">
              <label class="form-label">页码范围</label>
              <n-input
                v-model:value="printStore.params.page_range"
                placeholder="如: 1-5,10,12-15"
                size="small"
              />
            </div>
          </div>
        </n-tab-pane>

        <!-- 纸张设置 -->
        <n-tab-pane name="paper" tab="纸张">
          <div class="form-grid">
            <div class="form-row">
              <label class="form-label">纸张尺寸</label>
              <n-select
                v-model:value="printStore.params.paper_size"
                :options="paperSizes"
                size="small"
              />
            </div>
            <div class="form-row">
              <label class="form-label">方向</label>
              <n-radio-group v-model:value="printStore.params.orientation" size="small">
                <n-radio value="portrait">纵向</n-radio>
                <n-radio value="landscape">横向</n-radio>
              </n-radio-group>
            </div>
          </div>
        </n-tab-pane>

        <!-- 版式设置 -->
        <n-tab-pane name="layout" tab="版式">
          <div class="form-grid">
            <div class="form-row">
              <label class="form-label">每版页数</label>
              <n-radio-group v-model:value="printStore.params.pages_per_sheet" size="small">
                <n-radio :value="1">1页</n-radio>
                <n-radio :value="2">2合1</n-radio>
                <n-radio :value="4">4合1</n-radio>
              </n-radio-group>
            </div>
            <div class="form-row">
              <label class="form-label">缩放比例</label>
              <n-slider
                v-model:value="printStore.params.scale"
                :min="25"
                :max="200"
                :step="5"
                size="small"
              />
              <span class="scale-value">{{ printStore.params.scale }}%</span>
            </div>
            <div class="form-row">
              <label class="form-label">适应页面</label>
              <n-switch v-model:value="printStore.params.fit_to_page" size="small" />
            </div>
            <div class="form-row margin-row">
              <label class="form-label">页边距(mm)</label>
              <div class="margin-inputs">
                <div class="margin-item">
                  <span>上</span>
                  <n-input-number v-model:value="printStore.params.margin_top" :min="0" size="small" style="width: 60px" />
                </div>
                <div class="margin-item">
                  <span>下</span>
                  <n-input-number v-model:value="printStore.params.margin_bottom" :min="0" size="small" style="width: 60px" />
                </div>
                <div class="margin-item">
                  <span>左</span>
                  <n-input-number v-model:value="printStore.params.margin_left" :min="0" size="small" style="width: 60px" />
                </div>
                <div class="margin-item">
                  <span>右</span>
                  <n-input-number v-model:value="printStore.params.margin_right" :min="0" size="small" style="width: 60px" />
                </div>
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- 高级设置 -->
        <n-tab-pane name="advanced" tab="高级">
          <div class="form-grid">
            <div class="form-row">
              <label class="form-label">色彩模式</label>
              <n-radio-group v-model:value="printStore.params.color_mode" size="small">
                <n-radio value="color">彩色</n-radio>
                <n-radio value="grayscale">黑白灰度</n-radio>
              </n-radio-group>
            </div>
            <div class="form-row">
              <label class="form-label">双面打印</label>
              <n-switch v-model:value="printStore.params.duplex" size="small" />
            </div>
            <div class="form-row">
              <label class="form-label">页眉页脚</label>
              <n-switch v-model:value="printStore.params.print_header_footer" size="small" />
            </div>
            <div class="form-row">
              <label class="form-label">水印文字</label>
              <n-input
                v-model:value="printStore.params.watermark_text"
                placeholder="输入水印文字（留空无水印）"
                size="small"
              />
            </div>
          </div>
        </n-tab-pane>

        <!-- 批量打印队列 -->
        <n-tab-pane v-if="printStore.batchMode" name="batch" tab="队列">
          <div class="batch-summary">
            <span>共 {{ printStore.printTasks.length }} 个任务</span>
            <n-tag type="success" size="small">完成 {{ completedTasks }}</n-tag>
            <n-tag type="error" size="small">失败 {{ failedTasks }}</n-tag>
          </div>
          <div class="batch-list">
            <n-list size="small">
              <n-list-item v-for="task in printStore.printTasks" :key="task.id">
                <div class="task-item">
                  <span class="task-name" :title="task.file">{{ task.file }}</span>
                  <div class="task-status">
                    <n-tag v-if="task.status === 'pending'" size="small" type="default">等待中</n-tag>
                    <n-tag v-else-if="task.status === 'printing'" size="small" type="info">打印中</n-tag>
                    <n-tag v-else-if="task.status === 'completed'" size="small" type="success">已完成</n-tag>
                    <n-tag v-else-if="task.status === 'failed'" size="small" type="error">失败</n-tag>
                  </div>
                </div>
                <n-progress v-if="task.status === 'printing'" :percentage="task.progress" size="tiny" />
                <div v-if="task.error" class="task-error">{{ task.error }}</div>
              </n-list-item>
            </n-list>
          </div>
        </n-tab-pane>
      </n-tabs>

      <n-divider style="margin: 8px 0;" />

      <!-- 预览区域 -->
      <div class="preview-section">
        <div class="preview-header">
          <span class="section-title">打印预览</span>
          <div class="preview-controls">
            <n-button text size="tiny" @click="printStore.zoomOut()">－</n-button>
            <span class="zoom-value">{{ printStore.previewZoom }}%</span>
            <n-button text size="tiny" @click="printStore.zoomIn()">＋</n-button>
            <n-button text size="tiny" @click="printStore.zoomFit()">适应</n-button>
          </div>
        </div>
        <div class="preview-area">
          <n-spin v-if="printStore.isLoading" />
          <n-empty v-else-if="!printStore.previewContent" description="暂无预览内容" size="small" />
          <div v-else class="preview-content" :style="{ transform: `scale(${printStore.previewZoom / 100})` }">
            <img v-if="printStore.previewType === 'image'" :src="printStore.previewContent" alt="预览" />
            <div v-else-if="printStore.previewType === 'html'" class="html-preview" v-html="printStore.previewContent"></div>
            <div v-else class="pdf-placeholder">
              <div style="font-size: 48px; margin-bottom: 12px;">📄</div>
              <div>PDF 预览</div>
            </div>
          </div>
        </div>
        <div v-if="printStore.totalPages > 1" class="preview-pager">
          <n-button text size="tiny" :disabled="printStore.previewPage <= 1" @click="prevPage">上一页</n-button>
          <span>{{ printStore.previewPage }} / {{ printStore.totalPages }}</span>
          <n-button text size="tiny" :disabled="printStore.previewPage >= printStore.totalPages" @click="nextPage">下一页</n-button>
        </div>
      </div>
    </div>

    <!-- 底部操作按钮 -->
    <div class="panel-footer">
      <n-button size="small" @click="printStore.resetParams()">重置</n-button>
      <n-button
        type="primary"
        size="small"
        :loading="printStore.isPrinting"
        :disabled="!printStore.selectedPrinter"
        @click="handlePrint"
      >
        {{ printStore.isPrinting ? '打印中...' : '打印' }}
      </n-button>
    </div>
  </div>
</template>

<style scoped>
.print-panel {
  height: 100%;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: relative;
  flex-shrink: 0;
}

.panel-resizer {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  cursor: col-resize;
  background: transparent;
  z-index: 10;
  transition: background 0.15s;
}

.panel-resizer:hover,
.panel-resizer.resizing {
  background: var(--primary-color);
}

.resizer-handle {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 40px;
  background: var(--border-color);
  border-radius: 1px;
}

.panel-resizer:hover .resizer-handle,
.panel-resizer.resizing .resizer-handle {
  background: var(--primary-color);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.panel-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 18px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.section {
  margin-bottom: 8px;
}

.section-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.printer-selector {
  display: flex;
  gap: 6px;
  align-items: center;
}

.printer-selector :deep(.n-select) {
  flex: 1;
}

.printer-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #52c41a;
  display: inline-block;
}

.status-dot.offline {
  background: #ff4d4f;
}

.status-text {
  color: var(--text-secondary);
}

.status-text.offline {
  color: #ff4d4f;
}

.printer-port {
  margin-left: auto;
  opacity: 0.7;
}

.param-tabs {
  margin-top: 4px;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-label {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 70px;
  flex-shrink: 0;
}

.form-row > :deep(.n-input-number),
.form-row > :deep(.n-input),
.form-row > :deep(.n-select) {
  flex: 1;
}

.scale-value {
  font-size: 11px;
  color: var(--text-tertiary);
  min-width: 40px;
  text-align: right;
}

.margin-row {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.margin-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  width: 100%;
}

.margin-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.preview-section {
  margin-top: 4px;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.preview-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.zoom-value {
  font-size: 11px;
  color: var(--text-tertiary);
  min-width: 42px;
  text-align: center;
}

.preview-area {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 12px;
}

.preview-content {
  max-width: 100%;
  max-height: 100%;
  transform-origin: center center;
  transition: transform 0.15s;
}

.preview-content img {
  max-width: 100%;
  max-height: 240px;
  object-fit: contain;
}

.html-preview {
  background: white;
  padding: 16px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 200px;
  color: #333;
  font-size: 12px;
  line-height: 1.6;
}

.html-preview table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}

.html-preview td,
.html-preview th {
  border: 1px solid #ddd;
  padding: 4px 6px;
}

.pdf-placeholder {
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12px;
}

.preview-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-tertiary);
}

.batch-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.batch-list {
  max-height: 200px;
  overflow-y: auto;
}

.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.task-name {
  flex: 1;
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-error {
  font-size: 11px;
  color: #ff4d4f;
  margin-top: 4px;
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
  gap: 8px;
}

.panel-footer button {
  flex: 1;
}
</style>
