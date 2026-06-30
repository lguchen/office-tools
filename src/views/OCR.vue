<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { invoke } from '@tauri-apps/api/core'
import FileUploader from '@/components/FileUploader.vue'
import OCRModelManager from '@/components/OCRModelManager.vue'
import { useOcrModelStore } from '@/stores/ocrModel'
import { isTauri } from '@/utils/tauriUtils'
import {
  NCard,
  NButton,
  NSelect,
  NRadioGroup,
  NRadio,
  NInput,
  NSpin,
  NEmpty,
  NTooltip,
  NProgress,
  NTag,
  NSpace,
  NScrollbar,
  NIcon,
  NModal,
  NAlert
} from 'naive-ui'

// ============== 类型定义 ==============
interface OCRImageItem {
  id: string
  fileName: string
  imageUrl: string
  filePath: string
  file?: File
  text: string
  confidence: number
  status: 'pending' | 'processing' | 'done' | 'error'
  progress: number
  error?: string
}

type RecognitionLang = 'chi_sim' | 'eng' | 'chi_sim+eng'

// ============== 基础状态 ==============
const message = useMessage()
const ocrModelStore = useOcrModelStore()

// 图片列表
const imageList = ref<OCRImageItem[]>([])

// 当前选中的图片索引
const selectedIndex = ref(0)

// 识别语言
const recognitionLang = ref<RecognitionLang>('chi_sim+eng')

// 语言选项
const langOptions = [
  { label: '中文', value: 'chi_sim' },
  { label: '英文', value: 'eng' },
  { label: '中英混合', value: 'chi_sim+eng' }
]

// 模型管理弹窗显示状态
const showModelManager = ref(false)

// 批量识别中状态
const isBatchProcessing = ref(false)

// 进度监听函数
let progressUnlisten: (() => void) | null = null

// ============== 计算属性 ==============
// 当前选中的图片
const currentImage = computed(() => {
  if (imageList.value.length === 0) return null
  return imageList.value[selectedIndex.value] || null
})

// 已完成识别的数量
const doneCount = computed(() => {
  return imageList.value.filter((item) => item.status === 'done').length
})

// 支持的图片格式
const supportedFormats = ['png', 'jpg', 'jpeg', 'bmp', 'tiff', 'webp']

// ============== 文件上传处理 ==============
// 处理文件选择
const handleFilesSelected = async (files: File[]) => {
  try {
    let addedCount = 0
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      if (!supportedFormats.includes(ext)) {
        continue
      }

      const imageUrl = URL.createObjectURL(file)
      const filePath = (file as any).path || ''

      const imageItem: OCRImageItem = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
        fileName: file.name,
        imageUrl,
        filePath,
        file,
        text: '',
        confidence: 0,
        status: 'pending',
        progress: 0
      }

      imageList.value.push(imageItem)
      addedCount++
    }

    if (addedCount > 0) {
      message.success(`已添加 ${addedCount} 张图片`)
      // 自动选中第一张新添加的图片
      if (imageList.value.length === addedCount) {
        selectedIndex.value = 0
      }
    } else {
      message.warning('没有支持的图片格式')
    }
  } catch (e: any) {
    console.error('处理文件失败', e)
    message.error('添加图片失败：' + (e.message || '未知错误'))
  }
}

// 选择图片
const selectImage = (index: number) => {
  selectedIndex.value = index
}

// 删除单张图片
const removeImage = (index: number) => {
  try {
    const item = imageList.value[index]
    if (item?.imageUrl) {
      URL.revokeObjectURL(item.imageUrl)
    }
    imageList.value.splice(index, 1)

    if (selectedIndex.value >= imageList.value.length) {
      selectedIndex.value = Math.max(0, imageList.value.length - 1)
    }
  } catch (e: any) {
    console.error('删除图片失败', e)
    message.error('删除图片失败：' + (e.message || '未知错误'))
  }
}

// 清空所有图片
const clearAllImages = () => {
  try {
    if (imageList.value.length === 0) return
    if (isBatchProcessing.value) {
      message.warning('识别进行中，无法清空')
      return
    }

    imageList.value.forEach((item) => {
      if (item.imageUrl) {
        URL.revokeObjectURL(item.imageUrl)
      }
    })
    imageList.value = []
    selectedIndex.value = 0
    message.info('已清空所有图片')
  } catch (e: any) {
    console.error('清空图片失败', e)
    message.error('清空图片失败：' + (e.message || '未知错误'))
  }
}

// ============== OCR识别功能 ==============
// 检查模型是否支持当前语言
const checkModelSupport = (): boolean => {
  if (!isTauri()) {
    // 浏览器环境使用tesseract.js，不检查模型
    return true
  }

  if (!ocrModelStore.canRecognize) {
    message.warning('请先下载OCR模型再使用')
    showModelManager.value = true
    return false
  }

  const lang = recognitionLang.value
  const readyLangs = ocrModelStore.readyLangs

  if (lang === 'chi_sim' && !readyLangs.includes('chi_sim')) {
    message.warning('请先下载中文简体模型')
    showModelManager.value = true
    return false
  }

  if (lang === 'eng' && !readyLangs.includes('eng')) {
    message.warning('请先下载英文模型')
    showModelManager.value = true
    return false
  }

  if (lang === 'chi_sim+eng') {
    if (!readyLangs.includes('chi_sim') && !readyLangs.includes('eng')) {
      message.warning('请先下载至少一个语言模型')
      showModelManager.value = true
      return false
    }
  }

  return true
}

// 单张图片识别
const recognizeSingle = async (index: number) => {
  const item = imageList.value[index]
  if (!item) return
  if (item.status === 'processing') return

  if (!checkModelSupport()) return

  item.status = 'processing'
  item.progress = 0
  item.error = undefined

  try {
    if (isTauri() && item.filePath) {
      // Tauri环境：调用Rust端OCR
      const result = await invoke('recognize_image', {
        imagePath: item.filePath,
        lang: recognitionLang.value
      }) as { text: string; confidence: number }

      item.text = result.text || ''
      item.confidence = result.confidence || 0
    } else {
      // 浏览器环境或无文件路径：使用tesseract.js
      const { recognizeImage, preprocessImage } = await import('@/utils/ocrUtils')
      const processed = await preprocessImage(item.file!)
      const result = await recognizeImage(processed, (p) => {
        item.progress = p
      })

      item.text = result.text
      item.confidence = result.confidence
    }

    item.status = 'done'
    item.progress = 100
    message.success(`${item.fileName} 识别完成`)
  } catch (e: any) {
    console.error('识别失败', e)
    item.status = 'error'
    item.error = e.message || '识别失败'
    message.error(`${item.fileName} 识别失败：${e.message || '未知错误'}`)
  }
}

// 批量识别
const recognizeAll = async () => {
  if (imageList.value.length === 0) {
    message.warning('请先添加图片')
    return
  }

  if (isBatchProcessing.value) {
    return
  }

  if (!checkModelSupport()) return

  isBatchProcessing.value = true

  try {
    message.info(`开始批量识别 ${imageList.value.length} 张图片...`)

    for (let i = 0; i < imageList.value.length; i++) {
      const item = imageList.value[i]
      if (item.status === 'pending' || item.status === 'error') {
        await recognizeSingle(i)
      }
    }

    message.success(`批量识别完成，成功 ${doneCount.value}/${imageList.value.length}`)
  } catch (e: any) {
    console.error('批量识别失败', e)
    message.error('批量识别失败：' + (e.message || '未知错误'))
  } finally {
    isBatchProcessing.value = false
  }
}

// ============== 结果操作 ==============
// 复制识别结果
const copyResult = async () => {
  if (!currentImage.value?.text) {
    message.warning('没有可复制的识别结果')
    return
  }

  try {
    await navigator.clipboard.writeText(currentImage.value.text)
    message.success('已复制到剪贴板')
  } catch (e: any) {
    console.error('复制失败', e)
    message.error('复制失败：' + (e.message || '未知错误'))
  }
}

// 导出为TXT文件
const exportToTxt = () => {
  const doneItems = imageList.value.filter((item) => item.status === 'done')
  if (doneItems.length === 0) {
    message.warning('没有可导出的识别结果')
    return
  }

  try {
    let content = ''
    doneItems.forEach((item, index) => {
      if (index > 0) {
        content += '\n\n---\n\n'
      }
      content += `【${item.fileName}】\n${item.text}`
    })

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'OCR识别结果.txt'
    a.click()
    URL.revokeObjectURL(url)

    message.success('已导出TXT文件')
  } catch (e: any) {
    console.error('导出失败', e)
    message.error('导出失败：' + (e.message || '未知错误'))
  }
}

// ============== 状态辅助函数 ==============
// 获取状态标签类型
const getStatusType = (status: string): 'default' | 'info' | 'success' | 'error' | 'warning' => {
  const typeMap: Record<string, 'default' | 'info' | 'success' | 'error' | 'warning'> = {
    pending: 'default',
    processing: 'info',
    done: 'success',
    error: 'error'
  }
  return typeMap[status] || 'default'
}

// 获取状态文本
const getStatusText = (status: string): string => {
  const textMap: Record<string, string> = {
    pending: '待识别',
    processing: '识别中',
    done: '已完成',
    error: '失败'
  }
  return textMap[status] || status
}

// ============== 生命周期 ==============
// 页面挂载时初始化模型检测
onMounted(async () => {
  if (isTauri()) {
    try {
      await ocrModelStore.initModels()
      await ocrModelStore.setupProgressListener()
      await ocrModelStore.checkAllModels()
    } catch (e) {
      console.warn('初始化OCR模型失败', e)
    }
  }
})

// 页面卸载时清理
onUnmounted(() => {
  // 释放图片URL
  imageList.value.forEach((item) => {
    if (item.imageUrl) {
      URL.revokeObjectURL(item.imageUrl)
    }
  })

  // 清理模型监听
  ocrModelStore.cleanup()

  // 释放OCR资源
  if (progressUnlisten) {
    progressUnlisten()
    progressUnlisten = null
  }
})

// 监听模型就绪状态，自动关闭弹窗
watch(
  () => ocrModelStore.canRecognize,
  (newVal) => {
    if (newVal && showModelManager.value) {
      // 模型就绪后不自动关闭，让用户手动关闭
    }
  }
)
</script>

<template>
  <div class="ocr-page">
    <!-- 页面标题和模型状态 -->
    <div class="page-header">
      <div>
        <h2 class="page-title">🔍 OCR文字识别</h2>
        <p class="page-desc">本地离线识别，支持中英文混合，图片转文字</p>
      </div>

      <!-- 模型状态指示器 -->
      <div
        v-if="isTauri()"
        class="model-status-bar"
        :class="{
          ready: ocrModelStore.canRecognize,
          error: ocrModelStore.downloadStatus === 'error'
        }"
        @click="showModelManager = true"
      >
        <span class="status-dot"></span>
        <span class="status-text">
          {{
            ocrModelStore.canRecognize
              ? '模型已就绪'
              : ocrModelStore.downloadStatus === 'checking'
              ? '检测中...'
              : '模型未下载'
          }}
        </span>
        <span class="status-count">{{ ocrModelStore.readyCount }}/{{ ocrModelStore.totalCount }}</span>
      </div>
    </div>

    <!-- 主内容区：左右分栏 -->
    <div class="main-content">
      <!-- 左侧：图片列表和配置 -->
      <div class="left-panel">
        <!-- 文件上传区 -->
        <NCard class="upload-card" size="small">
          <FileUploader
            :accept="supportedFormats"
            :multiple="true"
            icon="🖼"
            hint-text="拖拽图片到此处，或点击选择"
            @files-selected="handleFilesSelected"
          />
        </NCard>

        <!-- 识别配置 -->
        <NCard class="config-card" size="small" title="识别设置">
          <div class="config-item">
            <div class="config-label">识别语言</div>
            <NSelect
              v-model:value="recognitionLang"
              :options="langOptions"
              size="small"
              :disabled="isBatchProcessing"
            />
          </div>
        </NCard>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <NButton
            type="primary"
            :disabled="imageList.length === 0 || isBatchProcessing"
            :loading="isBatchProcessing"
            @click="recognizeAll"
            block
          >
            {{ isBatchProcessing ? '识别中...' : '批量识别' }}
          </NButton>
          <NButton
            :disabled="imageList.length === 0 || isBatchProcessing"
            @click="clearAllImages"
            block
          >
            清空列表
          </NButton>
        </div>

        <!-- 图片列表 -->
        <NCard class="image-list-card" size="small">
          <template #header>
            <div class="list-header">
              <span>图片列表</span>
              <NTag size="small" type="info">{{ doneCount }}/{{ imageList.length }}</NTag>
            </div>
          </template>

          <div v-if="imageList.length === 0" class="empty-list">
            <NEmpty description="暂无图片" size="small" />
          </div>

          <NScrollbar v-else class="image-scrollbar">
            <div class="image-list">
              <div
                v-for="(item, index) in imageList"
                :key="item.id"
                class="image-item"
                :class="{ active: selectedIndex === index }"
                @click="selectImage(index)"
              >
                <div class="item-thumb">
                  <img :src="item.imageUrl" :alt="item.fileName" />
                  <div v-if="item.status === 'processing'" class="item-overlay">
                    <NSpin size="small" />
                  </div>
                </div>

                <div class="item-info">
                  <div class="item-name" :title="item.fileName">{{ item.fileName }}</div>
                  <div class="item-status">
                    <NTag :type="getStatusType(item.status)" size="tiny" round>
                      {{ getStatusText(item.status) }}
                    </NTag>
                    <span v-if="item.status === 'done'" class="confidence">
                      {{ item.confidence.toFixed(0) }}%
                    </span>
                  </div>
                </div>

                <NTooltip content="删除">
                  <NButton
                    class="delete-btn"
                    size="tiny"
                    type="error"
                    text
                    @click.stop="removeImage(index)"
                  >
                    <template #icon>✕</template>
                  </NButton>
                </NTooltip>
              </div>
            </div>
          </NScrollbar>
        </NCard>
      </div>

      <!-- 右侧：图片预览和识别结果 -->
      <div class="right-panel">
        <!-- 模型未就绪提示 -->
        <NAlert
          v-if="isTauri() && !ocrModelStore.canRecognize && ocrModelStore.hasChecked"
          type="warning"
          :show-icon="true"
          style="margin-bottom: 16px"
        >
          <template #icon>💡</template>
          OCR模型未下载，点击
          <a class="alert-link" @click="showModelManager = true">这里</a>
          下载模型后即可使用离线识别功能
        </NAlert>

        <div class="right-content">
          <!-- 图片预览 -->
          <NCard class="preview-card" size="small" title="图片预览">
            <div v-if="!currentImage" class="empty-preview">
              <NEmpty description="选择图片预览" size="small" />
            </div>
            <div v-else class="preview-container">
              <NScrollbar>
                <div class="preview-image-wrapper">
                  <img :src="currentImage.imageUrl" :alt="currentImage.fileName" />
                </div>
              </NScrollbar>

              <!-- 识别进度条 -->
              <div v-if="currentImage.status === 'processing'" class="progress-bar-wrapper">
                <NProgress
                  :percentage="currentImage.progress"
                  :show-indicator="false"
                  :height="4"
                  color="#1677ff"
                />
              </div>
            </div>
          </NCard>

          <!-- 识别结果 -->
          <NCard class="result-card" size="small">
            <template #header>
              <div class="result-header">
                <span>识别结果</span>
                <div class="result-actions">
                  <NTooltip content="复制结果">
                    <NButton
                      size="small"
                      :disabled="!currentImage?.text"
                      @click="copyResult"
                    >
                      <template #icon>📋</template>
                      复制
                    </NButton>
                  </NTooltip>
                  <NTooltip content="导出TXT">
                    <NButton
                      size="small"
                      :disabled="doneCount === 0"
                      @click="exportToTxt"
                    >
                      <template #icon>📄</template>
                      导出
                    </NButton>
                  </NTooltip>
                </div>
              </div>
            </template>

            <div class="result-content">
              <div
                v-if="!currentImage"
                class="empty-result"
              >
                <NEmpty description="选择图片查看结果" size="small" />
              </div>

              <div
                v-else-if="currentImage.status === 'processing'"
                class="processing-result"
              >
                <NSpin size="large" />
                <div class="processing-text">正在识别中...</div>
                <div class="processing-progress">
                  {{ currentImage.progress.toFixed(0) }}%
                </div>
              </div>

              <div
                v-else-if="currentImage.status === 'error'"
                class="error-result"
              >
                <NEmpty description="识别失败" size="small" />
                <div v-if="currentImage.error" class="error-text">
                  {{ currentImage.error }}
                </div>
              </div>

              <div
                v-else-if="!currentImage.text"
                class="empty-result"
              >
                <NEmpty description="暂无识别结果" size="small" />
              </div>

              <div v-else class="result-text-wrapper">
                <NScrollbar class="result-scrollbar">
                  <pre class="result-text">{{ currentImage.text }}</pre>
                </NScrollbar>
                <div v-if="currentImage.status === 'done'" class="confidence-info">
                  置信度：{{ currentImage.confidence.toFixed(1) }}%
                </div>
              </div>
            </div>
          </NCard>
        </div>
      </div>
    </div>

    <!-- 模型管理弹窗 -->
    <OCRModelManager v-model:visible="showModelManager" />
  </div>
</template>

<style scoped>
.ocr-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
  box-sizing: border-box;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--text-primary, #262626);
}

.page-desc {
  font-size: 13px;
  color: var(--text-secondary, #666);
  margin: 0;
}

/* 模型状态栏 */
.model-status-bar {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-tertiary, #fafafa);
  border: 1px solid var(--border-color, #d9d9d9);
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.model-status-bar:hover {
  border-color: #1677ff;
}

.model-status-bar.ready {
  border-color: rgba(82, 196, 26, 0.3);
  background: rgba(82, 196, 26, 0.05);
}

.model-status-bar.error {
  border-color: rgba(255, 77, 79, 0.3);
  background: rgba(255, 77, 79, 0.05);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #faad14;
  display: inline-block;
}

.ready .status-dot {
  background: #52c41a;
}

.error .status-dot {
  background: #ff4d4f;
}

.status-text {
  color: var(--text-secondary, #666);
}

.status-count {
  color: var(--text-tertiary, #8c8c8c);
  font-size: 11px;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}

/* 左侧面板 */
.left-panel {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.upload-card {
  border-radius: 8px;
}

.config-card {
  border-radius: 8px;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.config-label {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.image-list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  min-height: 0;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #262626);
}

.empty-list {
  padding: 20px 0;
}

.image-scrollbar {
  max-height: 100%;
  flex: 1;
}

:deep(.image-list-card .n-card__content) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

:deep(.image-list-card .n-scrollbar) {
  flex: 1;
  max-height: none !important;
}

/* 图片列表项 */
.image-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.image-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.image-item:hover {
  background: var(--bg-tertiary, #f5f5f5);
}

.image-item.active {
  background: rgba(22, 119, 255, 0.08);
}

.item-thumb {
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background: var(--bg-tertiary, #f5f5f5);
}

.item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 12px;
  color: var(--text-primary, #262626);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.item-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.confidence {
  font-size: 11px;
  color: var(--text-tertiary, #8c8c8c);
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.15s;
}

.image-item:hover .delete-btn {
  opacity: 1;
}

/* 右侧面板 */
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.alert-link {
  color: #1677ff;
  cursor: pointer;
  text-decoration: underline;
}

.right-content {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}

/* 预览卡片 */
.preview-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  min-height: 0;
}

:deep(.preview-card .n-card__content) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.empty-preview {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.preview-container :deep(.n-scrollbar) {
  flex: 1;
}

.preview-image-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  min-height: 100%;
  background: var(--bg-tertiary, #fafafa);
  border-radius: 6px;
}

.preview-image-wrapper img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.progress-bar-wrapper {
  margin-top: 8px;
}

/* 结果卡片 */
.result-card {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  min-height: 0;
}

:deep(.result-card .n-card__content) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #262626);
}

.result-actions {
  display: flex;
  gap: 6px;
}

.result-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.empty-result,
.processing-result,
.error-result {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.processing-text {
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.processing-progress {
  font-size: 24px;
  font-weight: 600;
  color: #1677ff;
}

.error-text {
  font-size: 12px;
  color: #ff4d4f;
  text-align: center;
  padding: 0 16px;
}

.result-text-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.result-scrollbar {
  flex: 1;
}

.result-text {
  margin: 0;
  padding: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #262626);
  white-space: pre-wrap;
  word-wrap: break-word;
  background: var(--bg-tertiary, #fafafa);
  border-radius: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.confidence-info {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary, #8c8c8c);
  text-align: right;
}

/* 深浅主题适配 */
:deep(.n-card) {
  border-radius: 8px;
}

:deep(.n-button) {
  border-radius: 6px;
}

:deep(.n-input__border) {
  border-radius: 6px;
}

:deep(.n-select .n-base-selection) {
  border-radius: 6px;
}

:deep(.n-scrollbar-vertical .n-scrollbar-rail__scrollbar) {
  border-radius: 3px;
}
</style>
