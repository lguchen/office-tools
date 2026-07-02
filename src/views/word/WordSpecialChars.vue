<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { useTheme } from '../../composables/useTheme'
import {
  NButton,
  NIcon,
  NDivider,
  NSwitch,
  NSelect,
  useNotification
} from 'naive-ui'
import {
  CreateOutline,
  DownloadOutline,
  TrashOutline
} from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import FileDropZone from '../../components/common/FileDropZone.vue'
import WordPreview from '../../components/common/WordPreview.vue'
import DetachablePreview from '../../components/common/DetachablePreview.vue'
import * as XLSX from 'xlsx'

const notification = useNotification()
const { isDark } = useTheme()

const uploadedFiles = ref<{ name: string; path: string; size?: number; file?: File }[]>([])
const currentFileIndex = ref(0)
const originalBuffer = ref<ArrayBuffer | null>(null)
const processedBuffer = ref<ArrayBuffer | null>(null)
const isProcessing = ref(false)
const realtimePreview = ref(true)
const isDetached = ref(false)
const previewMode = ref<'original' | 'processed'>('processed')
const detachableRef = ref<InstanceType<typeof DetachablePreview> | null>(null)

const processOptions = ref({
  convertLineBreak: false,
  lineBreakDirection: 'softToHard',
  removeExtraSpaces: false,
  removeTabs: false,
  removeControlChars: false
})

let debounceTimer: number | null = null

const lineBreakOptions = [
  { label: '软回车 → 硬回车', value: 'softToHard' },
  { label: '硬回车 → 软回车', value: 'hardToSoft' }
]

const currentFile = computed(() => uploadedFiles.value[currentFileIndex.value] || null)

const debounceProcess = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    if (realtimePreview.value && originalBuffer.value) {
      doProcess(false)
    }
  }, 300)
}

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

watch(processOptions, () => {
  if (realtimePreview.value) {
    debounceProcess()
  }
}, { deep: true })

const handleFilesSelected = async (files: { name: string; path: string; size?: number; file?: File }[]) => {
  uploadedFiles.value = files
  currentFileIndex.value = 0
  if (files.length > 0 && files[0].file) {
    originalBuffer.value = await files[0].file.arrayBuffer()
    processedBuffer.value = null
    if (realtimePreview.value) {
      debounceProcess()
    }
  }
}

const doProcess = async (showNotification: boolean) => {
  if (!originalBuffer.value || !currentFile.value?.file) return

  try {
    isProcessing.value = true

    const mammoth = (await import('mammoth')).default
    const { Document, Packer, Paragraph, TextRun } = await import('docx')

    const textResult = await mammoth.extractRawText({ arrayBuffer: originalBuffer.value })
    let text = textResult.value
    let changesCount = 0

    if (processOptions.value.removeControlChars) {
      const before = text.length
      text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
      changesCount += before - text.length
    }

    if (processOptions.value.removeTabs) {
      const before = text.length
      text = text.replace(/\t/g, '')
      changesCount += before - text.length
    }

    if (processOptions.value.removeExtraSpaces) {
      const before = text.length
      text = text.replace(/ +/g, ' ')
      text = text.replace(/^ +| +$/gm, '')
      changesCount += before - text.length
    }

    if (processOptions.value.convertLineBreak) {
      if (processOptions.value.lineBreakDirection === 'softToHard') {
        const before = (text.match(/\u2028/g) || []).length
        text = text.replace(/\u2028/g, '\n')
        changesCount += before
      } else {
        const before = (text.match(/\n/g) || []).length
        text = text.replace(/\n/g, '\u2028')
        changesCount += before
      }
    }

    const paragraphs = text.split('\n').map(line =>
      new Paragraph({
        children: [new TextRun({ text: line, size: 24 })]
      })
    )

    const doc = new Document({
      sections: [{ children: paragraphs }]
    })

    const blob = await Packer.toBlob(doc)
    processedBuffer.value = await blob.arrayBuffer()

    await nextTick()
    if (isDetached.value && detachableRef.value) {
      detachableRef.value.syncContent()
    }

    if (showNotification) {
      notification.success({
        title: '处理完成',
        content: `共修改 ${changesCount} 处`
      })
    }
  } catch (e) {
    console.error('Process error:', e)
    if (showNotification) {
      notification.error({ title: '处理失败', content: (e as Error).message })
    }
  } finally {
    isProcessing.value = false
  }
}

const handleProcess = () => {
  if (uploadedFiles.value.length === 0) {
    notification.warning({ title: '提示', content: '请先上传Word文档' })
    return
  }
  const hasOption = processOptions.value.convertLineBreak
    || processOptions.value.removeExtraSpaces
    || processOptions.value.removeTabs
    || processOptions.value.removeControlChars
  if (!hasOption) {
    notification.warning({ title: '提示', content: '请至少选择一项处理选项' })
    return
  }
  doProcess(true)
}

const handleDownload = async () => {
  if (!processedBuffer.value || !currentFile.value) return

  const blob = new Blob([processedBuffer.value], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `processed_${currentFile.value.name}`
  a.click()
  URL.revokeObjectURL(url)
}

const handleClear = () => {
  uploadedFiles.value = []
  currentFileIndex.value = 0
  originalBuffer.value = null
  processedBuffer.value = null
}

const displayBuffer = computed(() => {
  if (previewMode.value === 'processed' && processedBuffer.value) {
    return processedBuffer.value
  }
  return originalBuffer.value
})
</script>

<template>
  <ToolLayout title="Word特殊字符处理" description="处理换行符、空格、制表符等特殊字符">
    <template #input>
      <div class="space-y-4">
        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            上传Word文档
          </div>
          <FileDropZone
            accept=".docx"
            :multiple="false"
            tips="选择文件或拖拽上传"
            @files-selected="handleFilesSelected"
          />
        </div>

        <NDivider class="!my-2" />

        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            处理选项
          </div>

          <div
            class="p-3 mb-2 rounded-lg border"
            :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <NSwitch v-model:value="processOptions.convertLineBreak" size="small" />
                <span class="text-sm" :class="isDark ? 'text-gray-200' : 'text-gray-700'">转换换行符类型</span>
              </div>
            </div>
            <div v-if="processOptions.convertLineBreak" class="mt-2 pl-6">
              <NSelect
                v-model:value="processOptions.lineBreakDirection"
                :options="lineBreakOptions"
                size="small"
              />
              <div class="mt-1 text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                软回车（Shift+Enter）：不分段，仅换行<br/>
                硬回车（Enter）：分段并换行
              </div>
            </div>
          </div>

          <div
            class="p-3 mb-2 rounded-lg border"
            :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'"
          >
            <div class="flex items-center gap-2">
              <NSwitch v-model:value="processOptions.removeExtraSpaces" size="small" />
              <span class="text-sm" :class="isDark ? 'text-gray-200' : 'text-gray-700'">删除多余空格</span>
            </div>
            <div class="mt-1 text-xs pl-6" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              删除连续多个空格，只保留一个
            </div>
          </div>

          <div
            class="p-3 mb-2 rounded-lg border"
            :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'"
          >
            <div class="flex items-center gap-2">
              <NSwitch v-model:value="processOptions.removeTabs" size="small" />
              <span class="text-sm" :class="isDark ? 'text-gray-200' : 'text-gray-700'">删除制表符</span>
            </div>
            <div class="mt-1 text-xs pl-6" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              删除文档中的所有制表符（Tab）
            </div>
          </div>

          <div
            class="p-3 rounded-lg border"
            :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'"
          >
            <div class="flex items-center gap-2">
              <NSwitch v-model:value="processOptions.removeControlChars" size="small" />
              <span class="text-sm" :class="isDark ? 'text-gray-200' : 'text-gray-700'">删除控制字符</span>
            </div>
            <div class="mt-1 text-xs pl-6" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              删除不可见的控制字符，如零宽字符等
            </div>
          </div>
        </div>

        <NDivider class="!my-2" />

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">实时预览</span>
            <NSwitch v-model:value="realtimePreview" size="small" />
          </div>
        </div>

        <div class="flex gap-2">
          <NButton type="primary" @click="handleProcess" :loading="isProcessing">
            <template #icon>
              <NIcon><CreateOutline /></NIcon>
            </template>
            开始处理
          </NButton>
          <NButton @click="handleClear">
            <template #icon>
              <NIcon><TrashOutline /></NIcon>
            </template>
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
          <div class="flex items-center gap-2 px-3 py-1.5 border-b flex-shrink-0"
               :class="isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'">
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
              v-if="processedBuffer"
              size="small"
              @click="handleDownload"
            >
              <template #icon>
                <NIcon><DownloadOutline /></NIcon>
              </template>
              下载
            </NButton>
          </div>

          <div class="flex-1 min-h-0">
            <WordPreview
              v-if="displayBuffer"
              :array-buffer="displayBuffer"
              class="h-full"
            />
            <div v-else class="h-full flex items-center justify-center"
                 :class="isDark ? 'text-gray-500' : 'text-gray-400'">
              <div class="text-center text-sm">上传.docx文件后可在此预览</div>
            </div>
          </div>
        </div>
      </DetachablePreview>
    </template>
  </ToolLayout>
</template>

<style scoped>
</style>
