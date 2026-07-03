<!--
  Word批量格式统一页面
  技术说明：使用docx库处理Word文档
  安装：npm install docx
  文档：https://docx.js.org/
-->
<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import {
  NButton,
  NInput,
  NInputGroup,
  NInputGroupLabel,
  NSelect,
  NCard,
  NList,
  NListItem,
  NIcon,
  NSpace,
  NDivider,
  NSwitch,
  NInputNumber,
  NColorPicker,
  NAlert
} from 'naive-ui'
import { notifySuccess, notifyError, notifyWarning } from '../../composables/useNotification'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip
} from 'docx'
import {
  loadDocx,
  getDocumentXml,
  saveDocx,
  modifyTextStyles,
  modifyDefaultStyles,
  extractText
} from '../../composables/useDocxEdit'
import {
  DocumentOutline,
  TrashOutline,
  CreateOutline,
  DownloadOutline
} from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import FileDropZone from '../../components/common/FileDropZone.vue'
import WordPreview from '../../components/common/WordPreview.vue'
import DetachablePreview from '../../components/common/DetachablePreview.vue'

// 上传的文件列表
const fileList = ref<{ name: string; path: string; size?: number; file?: File }[]>([])
// 处理结果
const processResults = ref<Array<{ name: string; status: 'success' | 'error' | 'pending'; message: string }>>([])
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

// 字体格式设置
const fontSettings = ref({
  fontFamily: 'Microsoft YaHei',
  fontSize: 12,
  fontColor: '#000000',
  bold: false,
  italic: false
})

// 段落格式设置
const paragraphSettings = ref({
  alignment: 'left' as 'left' | 'center' | 'right' | 'justify',
  lineHeight: 1.5,
  spaceBefore: 0,
  spaceAfter: 0,
  indentLeft: 0,
  indentRight: 0,
  indentFirstLine: 0
})

// 字体选项
const fontOptions = [
  { label: '微软雅黑', value: 'Microsoft YaHei' },
  { label: '宋体', value: 'SimSun' },
  { label: '黑体', value: 'SimHei' },
  { label: '楷体', value: 'KaiTi' },
  { label: '仿宋', value: 'FangSong' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Courier New', value: 'Courier New' }
]

// 对齐方式选项
const alignmentOptions = [
  { label: '左对齐', value: 'left' },
  { label: '居中', value: 'center' },
  { label: '右对齐', value: 'right' },
  { label: '两端对齐', value: 'justify' }
]

// 处理文件上传
const handleFilesSelected = async (files: { name: string; path: string; size?: number; file?: File }[]) => {
  fileList.value = files
  if (files.length > 0 && files[0].file) {
    originalBuffer.value = await files[0].file.arrayBuffer()
    processedBuffer.value = null
    if (realtimePreview.value) {
      debounceProcess()
    }
  } else {
    originalBuffer.value = null
    processedBuffer.value = null
  }
}

// 执行批量处理
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
        const arrayBuffer = await file.file!.arrayBuffer()
        const result = await processDocxStyles(arrayBuffer)

        if (i === 0) {
          processedBuffer.value = result
        }

        processResults.value[i] = {
          name: file.name,
          status: 'success',
          message: '处理完成'
        }
      } catch (err) {
        processResults.value[i] = {
          name: file.name,
          status: 'error',
          message: (err as Error).message
        }
      }
    }

    notifySuccess('处理完成', '所有文件格式化成功')

    await nextTick()
    if (isDetached.value && detachableRef.value) {
      detachableRef.value.syncContent()
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

// 使用 JSZip 修改原始 docx 的样式，保留原文内容
const processDocxStyles = async (arrayBuffer: ArrayBuffer): Promise<ArrayBuffer> => {
  const zip = await loadDocx(arrayBuffer)
  let documentXml = await getDocumentXml(zip)

  // 修改文档中所有 run 的字体和字号
  documentXml = modifyTextStyles(documentXml, {
    fontName: fontSettings.value.fontFamily,
    fontSize: fontSettings.value.fontSize * 2 // docx 中字号是半磅
  })

  // 修改默认样式
  await modifyDefaultStyles(zip, {
    fontName: fontSettings.value.fontFamily,
    fontSize: fontSettings.value.fontSize * 2
  })

  return await saveDocx(zip, documentXml)
}

// 下载处理后的文档
const handleDownload = async (index: number) => {
  const file = fileList.value[index]
  if (!file || !file.file) return

  try {
    const arrayBuffer = await file.file.arrayBuffer()
    const result = await processDocxStyles(arrayBuffer)
    const blob = new Blob([result], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `formatted_${file.name}`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    notifyError('下载失败', (err as Error).message)
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

// 防抖处理
const debounceProcess = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    if (realtimePreview.value && originalBuffer.value && fileList.value.length > 0) {
      doProcessForPreview()
    }
  }, 300)
}

// 为预览生成处理结果（只处理第一个文件）
const doProcessForPreview = async () => {
  if (!originalBuffer.value || fileList.value.length === 0) return

  try {
    processedBuffer.value = await processDocxStyles(originalBuffer.value)

    await nextTick()
    if (isDetached.value && detachableRef.value) {
      detachableRef.value.syncContent()
    }
  } catch (e) {
    console.error('Preview process error:', e)
  }
}

// 计算当前显示的 Buffer
const displayBuffer = computed(() => {
  if (previewMode.value === 'processed' && processedBuffer.value) {
    return processedBuffer.value
  }
  return originalBuffer.value
})

// 监听格式设置变化，实时预览
watch([fontSettings, paragraphSettings], () => {
  if (realtimePreview.value) {
    debounceProcess()
  }
}, { deep: true })

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <ToolLayout title="Word批量格式统一" description="批量设置Word文档的字体和段落格式">
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

        <!-- 字体格式设置 -->
        <div>
          <div class="mb-2 text-sm font-medium text-gray-700">
            字体格式
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-xs mb-1 text-gray-500">字体名称</div>
              <NSelect v-model:value="fontSettings.fontFamily" :options="fontOptions" />
            </div>
            <div>
              <div class="text-xs mb-1 text-gray-500">字体大小</div>
              <NInputNumber v-model:value="fontSettings.fontSize" :min="8" :max="72" suffix="pt" />
            </div>
            <div>
              <div class="text-xs mb-1 text-gray-500">字体颜色</div>
              <NColorPicker v-model:value="fontSettings.fontColor" :modes="['hex']" />
            </div>
            <div class="flex items-end gap-3">
              <div class="flex items-center gap-2">
                <NSwitch v-model:value="fontSettings.bold" size="small" />
                <span class="text-xs text-gray-500">加粗</span>
              </div>
              <div class="flex items-center gap-2">
                <NSwitch v-model:value="fontSettings.italic" size="small" />
                <span class="text-xs text-gray-500">斜体</span>
              </div>
            </div>
          </div>
        </div>

        <NDivider class="!my-3" />

        <!-- 段落格式设置 -->
        <div>
          <div class="mb-2 text-sm font-medium text-gray-700">
            段落格式
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-xs mb-1 text-gray-500">对齐方式</div>
              <NSelect v-model:value="paragraphSettings.alignment" :options="alignmentOptions" />
            </div>
            <div>
              <div class="text-xs mb-1 text-gray-500">行间距</div>
              <NInputNumber v-model:value="paragraphSettings.lineHeight" :min="1" :max="3" :step="0.1" />
            </div>
            <div>
              <div class="text-xs mb-1 text-gray-500">段前间距(磅)</div>
              <NInputNumber v-model:value="paragraphSettings.spaceBefore" :min="0" :max="100" />
            </div>
            <div>
              <div class="text-xs mb-1 text-gray-500">段后间距(磅)</div>
              <NInputNumber v-model:value="paragraphSettings.spaceAfter" :min="0" :max="100" />
            </div>
            <div>
              <div class="text-xs mb-1 text-gray-500">左缩进(英寸)</div>
              <NInputNumber v-model:value="paragraphSettings.indentLeft" :min="0" :max="10" :step="0.1" />
            </div>
            <div>
              <div class="text-xs mb-1 text-gray-500">右缩进(英寸)</div>
              <NInputNumber v-model:value="paragraphSettings.indentRight" :min="0" :max="10" :step="0.1" />
            </div>
            <div class="col-span-2">
              <div class="text-xs mb-1 text-gray-500">首行缩进(英寸)</div>
              <NInputNumber v-model:value="paragraphSettings.indentFirstLine" :min="0" :max="10" :step="0.1" />
            </div>
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
              :disabled="!originalBuffer"
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
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500">实时预览</span>
              <NSwitch v-model:value="realtimePreview" size="small" />
            </div>
          </div>

          <div class="flex-1 min-h-0 flex flex-col">
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

            <div v-if="fileList.length > 0" class="border-t flex-shrink-0 border-gray-200">
              <div class="flex items-center justify-between px-3 py-2">
                <div class="text-sm font-medium text-gray-700">
                  处理结果
                </div>
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
              <div class="px-3 pb-3 max-h-48 overflow-auto">
                <NList bordered size="small">
                  <NListItem v-for="(result, index) in processResults" :key="index">
                    <template #prefix>
                      <NIcon :class="result.status === 'success' ? 'text-green-500' : result.status === 'error' ? 'text-red-500' : 'text-gray-400'">
                        <DocumentOutline />
                      </NIcon>
                    </template>
                    <div class="flex items-center justify-between w-full">
                      <div>
                        <div class="font-medium text-sm text-gray-700">{{ result.name }}</div>
                        <div class="text-xs text-gray-500">
                          {{ result.message }}
                        </div>
                      </div>
                      <NButton
                        v-if="result.status === 'success'"
                        size="small"
                        @click="handleDownload(index)"
                      >
                        下载
                      </NButton>
                    </div>
                  </NListItem>
                </NList>
              </div>
            </div>

            <NAlert v-if="fileList.length === 0" type="info" class="m-3">
              请先上传Word文档，设置格式后开始处理
            </NAlert>
          </div>
        </div>
      </DetachablePreview>
    </template>
  </ToolLayout>
</template>