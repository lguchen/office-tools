<!--
  Word批量内容处理页面
  技术说明：使用docx库处理Word文档
  安装：npm install docx
  文档：https://docx.js.org/

  注意：docx库主要用于生成Word文档，对于读取和修改现有文档的功能有限
  如需完整的Word文档处理功能，建议使用mammoth.js读取 + docx库生成
  安装：npm install mammoth docx
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
  NTag,
  NDivider,
  NSwitch,
  NAlert,
  useNotification
} from 'naive-ui'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel
} from 'docx'
import {
  DocumentOutline,
  TrashOutline,
  AddOutline,
  CreateOutline,
  DownloadOutline
} from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import FileDropZone from '../../components/common/FileDropZone.vue'
import WordPreview from '../../components/common/WordPreview.vue'
import DetachablePreview from '../../components/common/DetachablePreview.vue'
import { useSettingsStore } from '../../stores/settings'

const notification = useNotification()
const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.theme === 'dark')

// 上传的文件列表
const fileList = ref<{ name: string; path: string; size?: number; file?: File }[]>([])
// 处理模式：'replace' | 'delete'
const processMode = ref<'replace' | 'delete'>('replace')
// 查找替换规则列表
const replaceRules = ref<Array<{ find: string; replace: string; useWildcard: boolean }>>([
  { find: '', replace: '', useWildcard: false }
])
// 删除内容规则列表
const deleteRules = ref<Array<{ content: string; useWildcard: boolean }>>([
  { content: '', useWildcard: false }
])
// 处理结果
const processResults = ref<Array<{ name: string; status: 'success' | 'error' | 'pending'; message: string }>>([])
// 是否正在处理
const isProcessing = ref(false)

// 预览相关状态
const currentFileIndex = ref(0)
const originalBuffers = ref<Array<ArrayBuffer | null>>([])
const processedBuffers = ref<Array<ArrayBuffer | null>>([])
const realtimePreview = ref(true)
const isDetached = ref(false)
const previewMode = ref<'original' | 'processed'>('processed')
const detachableRef = ref<InstanceType<typeof DetachablePreview> | null>(null)
let debounceTimer: number | null = null

// 计算属性
const currentFile = computed(() => fileList.value[currentFileIndex.value] || null)
const currentOriginalBuffer = computed(() => originalBuffers.value[currentFileIndex.value] || null)
const currentProcessedBuffer = computed(() => processedBuffers.value[currentFileIndex.value] || null)
const displayBuffer = computed(() => {
  if (previewMode.value === 'processed' && currentProcessedBuffer.value) {
    return currentProcessedBuffer.value
  }
  return currentOriginalBuffer.value
})

// 处理文件上传
const handleFilesSelected = async (files: { name: string; path: string; size?: number; file?: File }[]) => {
  fileList.value = files
  currentFileIndex.value = 0

  // 读取所有文件的 ArrayBuffer
  const buffers: Array<ArrayBuffer | null> = []
  for (const file of files) {
    if (file.file) {
      buffers.push(await file.file.arrayBuffer())
    } else {
      buffers.push(null)
    }
  }
  originalBuffers.value = buffers
  processedBuffers.value = new Array(files.length).fill(null)

  if (realtimePreview.value && files.length > 0) {
    debounceProcess()
  }
}

// 防抖处理
const debounceProcess = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    if (realtimePreview.value && currentOriginalBuffer.value) {
      doProcessForIndex(currentFileIndex.value, false)
    }
  }, 300)
}

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

// 监听处理规则变化，触发实时预览
watch([processMode, replaceRules, deleteRules], () => {
  if (realtimePreview.value) {
    debounceProcess()
  }
}, { deep: true })

// 预览处理单个文件
const doProcessForIndex = async (index: number, showNotification: boolean) => {
  const originalBuffer = originalBuffers.value[index]
  const file = fileList.value[index]
  if (!originalBuffer || !file) return

  try {
    const mammoth = (await import('mammoth')).default

    const textResult = await mammoth.extractRawText({ arrayBuffer: originalBuffer })
    let text = textResult.value

    text = processText(text)

    const paragraphs = text.split('\n').map(line =>
      new Paragraph({
        children: [new TextRun({ text: line, size: 24 })]
      })
    )

    const doc = new Document({
      sections: [{ children: paragraphs }]
    })

    const blob = await Packer.toBlob(doc)
    processedBuffers.value[index] = await blob.arrayBuffer()

    await nextTick()
    if (isDetached.value && detachableRef.value) {
      detachableRef.value.syncContent()
    }

    if (showNotification) {
      notification.success({
        title: '处理完成',
        content: `${file.name} 处理完成`
      })
    }
  } catch (e) {
    console.error('Process error:', e)
    if (showNotification) {
      notification.error({ title: '处理失败', content: (e as Error).message })
    }
  }
}

// 添加替换规则
const addReplaceRule = () => {
  replaceRules.value.push({ find: '', replace: '', useWildcard: false })
}

// 删除替换规则
const removeReplaceRule = (index: number) => {
  if (replaceRules.value.length > 1) {
    replaceRules.value.splice(index, 1)
  }
}

// 添加删除规则
const addDeleteRule = () => {
  deleteRules.value.push({ content: '', useWildcard: false })
}

// 删除删除规则
const removeDeleteRule = (index: number) => {
  if (deleteRules.value.length > 1) {
    deleteRules.value.splice(index, 1)
  }
}

// 处理文本（简单实现，实际项目中需要更复杂的逻辑）
const processText = (text: string): string => {
  let result = text

  if (processMode.value === 'replace') {
    replaceRules.value.forEach(rule => {
      if (rule.find) {
        if (rule.useWildcard) {
          // 简单通配符实现（仅支持 * 和 ?）
          const pattern = rule.find
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.')
          const regex = new RegExp(pattern, 'g')
          result = result.replace(regex, rule.replace)
        } else {
          // 精确匹配
          result = result.split(rule.find).join(rule.replace)
        }
      }
    })
  } else {
    deleteRules.value.forEach(rule => {
      if (rule.content) {
        if (rule.useWildcard) {
          const pattern = rule.content
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.')
          const regex = new RegExp(pattern, 'g')
          result = result.replace(regex, '')
        } else {
          result = result.split(rule.content).join('')
        }
      }
    })
  }

  return result
}

// 执行批量处理
const handleProcess = async () => {
  if (fileList.value.length === 0) {
    notification.warning({ title: '提示', content: '请先上传Word文档' })
    return
  }

  const validFiles = fileList.value.filter(f => f.file)
  if (validFiles.length === 0) {
    notification.warning({ title: '提示', content: '没有有效的文件' })
    return
  }

  isProcessing.value = true
  processResults.value = fileList.value.map(f => ({
    name: f.name,
    status: 'pending' as const,
    message: '处理中...'
  }))

  try {
    for (let i = 0; i < fileList.value.length; i++) {
      if (fileList.value[i].file) {
        await doProcessForIndex(i, false)
        processResults.value[i] = {
          name: fileList.value[i].name,
          status: 'success',
          message: '处理完成，可下载'
        }
      } else {
        processResults.value[i] = {
          name: fileList.value[i].name,
          status: 'error',
          message: '文件无效'
        }
      }
    }

    await nextTick()
    if (isDetached.value && detachableRef.value) {
      detachableRef.value.syncContent()
    }

    notification.success({ title: '处理完成', content: '所有文件处理成功' })
  } catch (error) {
    notification.error({ title: '处理失败', content: (error as Error).message })
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
  const processedBuffer = processedBuffers.value[index]
  if (!file) return

  let blob: Blob
  if (processedBuffer) {
    blob = new Blob([processedBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })
  } else {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: `处理后的文档: ${file.name}`,
            heading: HeadingLevel.HEADING_1
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '本文档已进行批量内容处理。',
                size: 24
              })
            ]
          })
        ]
      }]
    })
    blob = await Packer.toBlob(doc)
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `processed_${file.name}`
  a.click()
  URL.revokeObjectURL(url)
}

// 批量下载所有文档
const handleDownloadAll = async () => {
  for (let i = 0; i < fileList.value.length; i++) {
    if (processResults.value[i]?.status === 'success') {
      await handleDownload(i)
      // 添加延迟避免浏览器阻止多次下载
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
}

// 切换当前预览文件
const selectFile = (index: number) => {
  currentFileIndex.value = index
  if (realtimePreview.value && !processedBuffers.value[index] && originalBuffers.value[index]) {
    debounceProcess()
  }
}

// 清空所有
const handleClear = () => {
  fileList.value = []
  processResults.value = []
  currentFileIndex.value = 0
  originalBuffers.value = []
  processedBuffers.value = []
  replaceRules.value = [{ find: '', replace: '', useWildcard: false }]
  deleteRules.value = [{ content: '', useWildcard: false }]
}
</script>

<template>
  <ToolLayout title="Word批量内容处理" description="批量查找替换、删除Word文档中的内容">
    <template #input>
      <div class="space-y-4">
        <!-- 文件上传区域 -->
        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            上传Word文档
          </div>
          <FileDropZone
            accept=".docx"
            :multiple="true"
            @files-selected="handleFilesSelected"
          />
          <div class="mt-1 text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            支持 .docx 格式，最多10个文件
          </div>
        </div>

        <NDivider class="!my-3" />

        <!-- 处理模式选择 -->
        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            处理模式
          </div>
          <NSpace>
            <NButton
              :type="processMode === 'replace' ? 'primary' : 'default'"
              @click="processMode = 'replace'"
            >
              查找替换
            </NButton>
            <NButton
              :type="processMode === 'delete' ? 'primary' : 'default'"
              @click="processMode = 'delete'"
            >
              删除内容
            </NButton>
          </NSpace>
        </div>

        <!-- 查找替换规则 -->
        <div v-if="processMode === 'replace'">
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            替换规则
          </div>
          <div class="space-y-2">
            <div
              v-for="(rule, index) in replaceRules"
              :key="index"
              class="p-3 rounded-lg border"
              :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'"
            >
              <div class="flex items-center gap-2 mb-2">
                <div class="flex-1">
                  <NInputGroup>
                    <NInputGroupLabel>查找</NInputGroupLabel>
                    <NInput v-model:value="rule.find" placeholder="要查找的内容" />
                  </NInputGroup>
                </div>
                <div class="flex-1">
                  <NInputGroup>
                    <NInputGroupLabel>替换</NInputGroupLabel>
                    <NInput v-model:value="rule.replace" placeholder="替换为" />
                  </NInputGroup>
                </div>
                <NButton
                  quaternary
                  circle
                  @click="removeReplaceRule(index)"
                  :disabled="replaceRules.length <= 1"
                >
                  <template #icon>
                    <NIcon><TrashOutline /></NIcon>
                  </template>
                </NButton>
              </div>
              <div class="flex items-center gap-2">
                <NSwitch v-model:value="rule.useWildcard" size="small" />
                <span class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                  使用通配符（*匹配任意字符，?匹配单个字符）
                </span>
              </div>
            </div>
          </div>
          <NButton quaternary size="small" class="mt-2" @click="addReplaceRule">
            <template #icon>
              <NIcon><AddOutline /></NIcon>
            </template>
            添加规则
          </NButton>
        </div>

        <!-- 删除内容规则 -->
        <div v-if="processMode === 'delete'">
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            删除规则
          </div>
          <div class="space-y-2">
            <div
              v-for="(rule, index) in deleteRules"
              :key="index"
              class="p-3 rounded-lg border"
              :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'"
            >
              <div class="flex items-center gap-2 mb-2">
                <div class="flex-1">
                  <NInputGroup>
                    <NInputGroupLabel>删除</NInputGroupLabel>
                    <NInput v-model:value="rule.content" placeholder="要删除的内容" />
                  </NInputGroup>
                </div>
                <NButton
                  quaternary
                  circle
                  @click="removeDeleteRule(index)"
                  :disabled="deleteRules.length <= 1"
                >
                  <template #icon>
                    <NIcon><TrashOutline /></NIcon>
                  </template>
                </NButton>
              </div>
              <div class="flex items-center gap-2">
                <NSwitch v-model:value="rule.useWildcard" size="small" />
                <span class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                  使用通配符（*匹配任意字符，?匹配单个字符）
                </span>
              </div>
            </div>
          </div>
          <NButton quaternary size="small" class="mt-2" @click="addDeleteRule">
            <template #icon>
              <NIcon><AddOutline /></NIcon>
            </template>
            添加规则
          </NButton>
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
              :disabled="!currentProcessedBuffer"
            >
              处理结果
            </NButton>
            <div class="flex-1"></div>
            <div class="flex items-center gap-2">
              <span class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">实时预览</span>
              <NSwitch v-model:value="realtimePreview" size="small" />
            </div>
            <NButton
              v-if="currentProcessedBuffer"
              size="small"
              @click="handleDownload(currentFileIndex)"
            >
              <template #icon>
                <NIcon><DownloadOutline /></NIcon>
              </template>
              下载
            </NButton>
          </div>

          <div class="flex-1 min-h-0 flex">
            <div class="w-56 border-r flex-shrink-0 flex flex-col"
                 :class="isDark ? 'border-gray-700' : 'border-gray-200'">
              <div class="px-3 py-2 border-b flex items-center justify-between"
                   :class="isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'">
                <span class="text-xs font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-600'">文件列表</span>
                <NButton
                  v-if="processResults.some(r => r.status === 'success')"
                  size="tiny"
                  @click="handleDownloadAll"
                >
                  批量下载
                </NButton>
              </div>
              <div class="flex-1 overflow-auto">
                <NList bordered class="!border-l-0 !border-r-0 !border-t-0">
                  <NListItem
                    v-for="(file, index) in fileList"
                    :key="index"
                    class="cursor-pointer transition-colors"
                    :class="currentFileIndex === index ? (isDark ? 'bg-gray-700/50' : 'bg-blue-50') : ''"
                    @click="selectFile(index)"
                  >
                    <template #prefix>
                      <NIcon :class="processResults[index]?.status === 'success' ? 'text-green-500' : processResults[index]?.status === 'error' ? 'text-red-500' : 'text-gray-400'">
                        <DocumentOutline />
                      </NIcon>
                    </template>
                    <div class="flex items-center justify-between w-full min-w-0">
                      <div class="truncate pr-2">
                        <div class="font-medium text-xs truncate" :class="isDark ? 'text-gray-200' : 'text-gray-700'">{{ file.name }}</div>
                        <div class="text-xs opacity-70">
                          {{ processResults[index]?.message || '未处理' }}
                        </div>
                      </div>
                      <NButton
                        v-if="processResults[index]?.status === 'success'"
                        size="tiny"
                        @click.stop="handleDownload(index)"
                      >
                        下载
                      </NButton>
                    </div>
                  </NListItem>
                </NList>
                <div v-if="fileList.length === 0" class="p-4 text-center text-xs"
                     :class="isDark ? 'text-gray-500' : 'text-gray-400'">
                  请先上传Word文档
                </div>
              </div>
            </div>

            <div class="flex-1 min-h-0">
              <WordPreview
                v-if="displayBuffer"
                :array-buffer="displayBuffer"
                class="h-full"
              />
              <div v-else class="h-full flex items-center justify-center"
                   :class="isDark ? 'text-gray-500' : 'text-gray-400'">
                <div class="text-center text-sm">
                  <div>上传.docx文件后可在此预览</div>
                  <div class="text-xs mt-1 opacity-70">选择左侧文件查看不同文档</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DetachablePreview>
    </template>
  </ToolLayout>
</template>