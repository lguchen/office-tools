<!--
  Word页面布局批量设置页面
  技术说明：使用docx库处理Word文档
  安装：npm install docx
  文档：https://docx.js.org/
-->
<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import {
  NButton,
  NCard,
  NIcon,
  NSpace,
  NDivider,
  NAlert,
  NInputNumber,
  NSelect,
  NRadioGroup,
  NRadio,
  NList,
  NListItem,
  NSwitch
} from 'naive-ui'
import { notifySuccess, notifyError, notifyWarning } from '../../composables/useNotification'
import {
  loadDocx,
  getDocumentXml,
  saveDocx,
  modifySectionProperties
} from '../../composables/useDocxEdit'
import {
  DocumentOutline,
  CreateOutline,
  DownloadOutline
} from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import FileDropZone from '../../components/common/FileDropZone.vue'
import WordPreview from '../../components/common/WordPreview.vue'
import DetachablePreview from '../../components/common/DetachablePreview.vue'

const displayBuffer = computed(() => {
  if (previewMode.value === 'processed' && processedBuffer.value) {
    return processedBuffer.value
  }
  return originalBuffer.value
})

// 上传的文件列表
const fileList = ref<{ name: string; path: string; size?: number; file?: File }[]>([])
// 处理结果
const processResults = ref<Array<{ name: string; status: string; message: string }>>([])
// 是否正在处理
const isProcessing = ref(false)
// 预览相关状态
const originalBuffer = ref<ArrayBuffer | null>(null)
const processedBuffer = ref<ArrayBuffer | null>(null)
const realtimePreview = ref(true)
const isDetached = ref(false)
const previewMode = ref<'original' | 'processed'>('processed')
const detachableRef = ref<InstanceType<typeof DetachablePreview> | null>(null)
let debounceTimer: number | null = null

// 页面布局设置
const pageSettings = ref({
  // 页边距（英寸）
  marginTop: 1,
  marginBottom: 1,
  marginLeft: 1,
  marginRight: 1,
  // 纸张大小
  paperSize: 'A4',
  // 纸张方向
  orientation: 'portrait',
  // 页眉页脚
  headerText: '',
  footerText: '',
  headerMargin: 0.5,
  footerMargin: 0.5
})

// 纸张大小选项
const paperSizeOptions = [
  { label: 'A4 (210mm × 297mm)', value: 'A4' },
  { label: 'A5 (148mm × 210mm)', value: 'A5' },
  { label: 'Letter (8.5" × 11")', value: 'Letter' },
  { label: 'Legal (8.5" × 14")', value: 'Legal' },
  { label: 'B5 (176mm × 250mm)', value: 'B5' }
]

// 获取纸张尺寸（twips为单位，1 inch = 1440 twips）
const getPaperSize = (size: string) => {
  switch (size) {
    case 'A4':
      return { width: 11906, height: 16838 }
    case 'A3':
      return { width: 16838, height: 23811 }
    case 'A5':
      return { width: 8391, height: 11906 }
    case 'Letter':
      return { width: 12240, height: 15840 }
    case 'Legal':
      return { width: 12240, height: 20160 }
    case 'B5':
      return { width: 10319, height: 14570 }
    default:
      return { width: 11906, height: 16838 }
  }
}

// 处理文件上传
const handleFilesSelected = async (files: { name: string; path: string; size?: number; file?: File }[]) => {
  fileList.value = files
  processedBuffer.value = null
  if (files.length > 0 && files[0].file) {
    originalBuffer.value = await files[0].file.arrayBuffer()
    if (realtimePreview.value) {
      debounceProcess()
    }
  } else {
    originalBuffer.value = null
  }
}

// 防抖处理
const debounceProcess = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    if (realtimePreview.value && originalBuffer.value) {
      doProcessPreview()
    }
  }, 300)
}

// 处理 docx：基于原始文件修改 sectPr（纸张大小、方向、页边距），保留原文档内容
const processDocxLayout = async (arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> => {
  const zip = await loadDocx(arrayBuffer)
  const documentXml = await getDocumentXml(zip)

  const paperSize = getPaperSize(pageSettings.value.paperSize)
  const isLandscape = pageSettings.value.orientation === 'landscape'

  const newXml = modifySectionProperties(documentXml, {
    pageSize: {
      width: isLandscape ? paperSize.height : paperSize.width,
      height: isLandscape ? paperSize.width : paperSize.height,
      orientation: isLandscape ? 'landscape' : 'portrait'
    },
    margins: {
      top: Math.round(pageSettings.value.marginTop * 1440),
      right: Math.round(pageSettings.value.marginRight * 1440),
      bottom: Math.round(pageSettings.value.marginBottom * 1440),
      left: Math.round(pageSettings.value.marginLeft * 1440),
      header: Math.round(pageSettings.value.headerMargin * 1440),
      footer: Math.round(pageSettings.value.footerMargin * 1440)
    }
  })

  return await saveDocx(zip, newXml)
}

// 生成预览用的处理结果（仅处理第一个文件）
const doProcessPreview = async () => {
  if (!originalBuffer.value) return

  try {
    processedBuffer.value = await processDocxLayout(originalBuffer.value)

    await nextTick()
    if (isDetached.value && detachableRef.value) {
      detachableRef.value.syncContent()
    }
  } catch (e) {
    console.error('Preview process error:', e)
  }
}

// 执行处理
const handleProcess = async () => {
  if (fileList.value.length === 0) {
    notifyWarning('提示', '请先上传Word文档')
    return
  }

  const validFiles = fileList.value.filter(f => f.file)
  if (validFiles.length === 0) {
    notifyWarning('提示', '没有有效的文件')
    return
  }

  isProcessing.value = true
  processResults.value = validFiles.map(f => ({
    name: f.name,
    status: 'pending',
    message: '处理中...'
  }))

  try {
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      try {
        if (!file.file) {
          processResults.value[i] = {
            name: file.name,
            status: 'error',
            message: '文件无效'
          }
          continue
        }
        const arrayBuffer = await file.file.arrayBuffer()
        await processDocxLayout(arrayBuffer)
        processResults.value[i] = {
          name: file.name,
          status: 'success',
          message: '页面布局设置完成'
        }
      } catch (e) {
        processResults.value[i] = {
          name: file.name,
          status: 'error',
          message: '处理失败: ' + (e as Error).message
        }
      }
    }

    notifySuccess('处理完成', '所有文件页面布局设置成功')
    if (validFiles.length > 0) {
      doProcessPreview()
    }
  } catch (error) {
    notifyError('处理失败', (error as Error).message)
    processResults.value.forEach((r, i) => {
      if (r.status === 'pending') {
        processResults.value[i] = { ...r, status: 'error', message: '处理失败' }
      }
    })
  } finally {
    isProcessing.value = false
  }
}

// 下载处理后的文档
const handleDownload = async (index: number) => {
  const file = fileList.value[index]
  if (!file?.file) return

  try {
    const arrayBuffer = await file.file.arrayBuffer()
    const processed = await processDocxLayout(arrayBuffer)
    const blob = new Blob([processed], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `layout_${file.name}`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    notifyError('下载失败', (e as Error).message)
  }
}

// 批量下载
const handleDownloadAll = async () => {
  for (let i = 0; i < fileList.value.length; i++) {
    if (processResults.value[i]?.status === 'success') {
      await handleDownload(i)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
}

// 清空
const handleClear = () => {
  fileList.value = []
  processResults.value = []
  originalBuffer.value = null
  processedBuffer.value = null
}

watch(pageSettings, () => {
  if (realtimePreview.value && originalBuffer.value) {
    debounceProcess()
  }
}, { deep: true })

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <ToolLayout title="Word页面布局批量设置" description="批量设置页边距、纸张大小、纸张方向等">
    <template #input>
      <div class="space-y-4">
        <!-- 文件上传 -->
        <div>
          <div class="mb-2 text-sm font-medium text-gray-700">
            上传Word文档
          </div>
          <FileDropZone
            accept=".docx"
            :multiple="true"
            @files-selected="handleFilesSelected"
          />
        </div>

        <NDivider class="!my-3" />

        <!-- 页边距设置 -->
        <div>
          <div class="mb-2 text-sm font-medium text-gray-700">
            页边距（英寸）
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-xs mb-1 text-gray-500">上边距</div>
              <NInputNumber v-model:value="pageSettings.marginTop" :min="0" :max="5" :step="0.1" />
            </div>
            <div>
              <div class="text-xs mb-1 text-gray-500">下边距</div>
              <NInputNumber v-model:value="pageSettings.marginBottom" :min="0" :max="5" :step="0.1" />
            </div>
            <div>
              <div class="text-xs mb-1 text-gray-500">左边距</div>
              <NInputNumber v-model:value="pageSettings.marginLeft" :min="0" :max="5" :step="0.1" />
            </div>
            <div>
              <div class="text-xs mb-1 text-gray-500">右边距</div>
              <NInputNumber v-model:value="pageSettings.marginRight" :min="0" :max="5" :step="0.1" />
            </div>
          </div>
        </div>

        <NDivider class="!my-3" />

        <!-- 纸张设置 -->
        <div>
          <div class="mb-2 text-sm font-medium text-gray-700">
            纸张设置
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-xs mb-1 text-gray-500">纸张大小</div>
              <NSelect v-model:value="pageSettings.paperSize" :options="paperSizeOptions" />
            </div>
            <div>
              <div class="text-xs mb-1 text-gray-500">纸张方向</div>
              <NRadioGroup v-model:value="pageSettings.orientation">
                <NSpace>
                  <NRadio value="portrait">纵向</NRadio>
                  <NRadio value="landscape">横向</NRadio>
                </NSpace>
              </NRadioGroup>
            </div>
          </div>
        </div>

        <NDivider class="!my-3" />

        <!-- 页眉页脚设置 -->
        <div>
          <div class="mb-2 text-sm font-medium text-gray-700">
            页眉页脚（可选）
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-xs mb-1 text-gray-500">页眉内容</div>
              <input
                v-model="pageSettings.headerText"
                placeholder="输入页眉文本"
                class="w-full px-3 py-2 rounded-lg border text-sm bg-white border-gray-200 text-gray-800"
              />
            </div>
            <div>
              <div class="text-xs mb-1 text-gray-500">页脚内容</div>
              <input
                v-model="pageSettings.footerText"
                placeholder="输入页脚文本"
                class="w-full px-3 py-2 rounded-lg border text-sm bg-white border-gray-200 text-gray-800"
              />
            </div>
          </div>
        </div>

        <NDivider class="!my-3" />

        <!-- 实时预览开关 -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">实时预览</span>
            <NSwitch v-model:value="realtimePreview" size="small" />
          </div>
        </div>

        <NDivider class="!my-3" />

        <!-- 操作按钮 -->
        <div class="flex gap-2">
          <NButton type="primary" @click="handleProcess" :loading="isProcessing">
            <template #icon>
              <NIcon><CreateOutline /></NIcon>
            </template>
            开始处理
          </NButton>
          <NButton @click="handleClear">
            清空
          </NButton>
        </div>
      </div>
    </template>

    <template #output>
      <DetachablePreview
        ref="detachableRef"
        v-model:detached="isDetached"
        title="Word文档预览"
        class="h-full"
      >
        <div class="h-full flex flex-col">
          <div class="flex items-center gap-2 px-3 py-1.5 border-b flex-shrink-0 border-gray-200 bg-gray-50">
            <NButton
              size="small"
              :type="previewMode === 'original' ? 'primary' : 'default'"
              @click="previewMode = 'original'"
            >
              原始文档
            </NButton>
            <NButton
              size="small"
              :type="previewMode === 'processed' ? 'primary' : 'default'"
              @click="previewMode = 'processed'"
              :disabled="!processedBuffer"
            >
              处理结果
            </NButton>
            <div class="flex-1"></div>
            <NButton
              v-if="processResults.some(r => r.status === 'success')"
              size="small"
              @click="handleDownloadAll"
            >
              <template #icon>
                <NIcon><DownloadOutline /></NIcon>
              </template>
              批量下载
            </NButton>
          </div>

          <div v-if="fileList.length > 0" class="px-3 py-2 border-b flex-shrink-0 border-gray-200">
            <div class="text-xs font-medium mb-2 text-gray-700">
              处理结果
            </div>
            <NList bordered size="small">
              <NListItem v-for="(result, index) in processResults" :key="index">
                <template #prefix>
                  <NIcon
                    :size="16"
                    :class="result.status === 'success' ? 'text-green-500'
                      : result.status === 'error' ? 'text-red-500' : 'text-gray-400'"
                  >
                    <DocumentOutline />
                  </NIcon>
                </template>
                <div class="flex items-center justify-between w-full">
                  <div>
                    <div class="font-medium text-xs text-gray-700">{{ result.name }}</div>
                    <div class="text-xs opacity-70 text-gray-500">
                      {{ result.message }}
                    </div>
                  </div>
                  <NButton
                    v-if="result.status === 'success'"
                    size="tiny"
                    @click="handleDownload(index)"
                  >
                    下载
                  </NButton>
                </div>
              </NListItem>
            </NList>
          </div>

          <div class="flex-1 min-h-0">
            <WordPreview
              v-if="displayBuffer"
              :array-buffer="displayBuffer"
              class="h-full"
            />
            <div v-else class="h-full flex items-center justify-center text-gray-400">
              <div class="text-center text-sm">上传.docx文件后可在此预览</div>
            </div>
          </div>
        </div>
      </DetachablePreview>
    </template>
  </ToolLayout>
</template>
