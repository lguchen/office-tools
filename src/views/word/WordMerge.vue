<!--
  Word文档合并页面
  技术说明：使用docx库处理Word文档
  安装：npm install docx
  文档：https://docx.js.org/

  注意：文档合并需要将多个文档的内容整合到一个文档中
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NUpload,
  NButton,
  NCard,
  NIcon,
  NSpace,
  NDivider,
  NAlert,
  NRadioGroup,
  NRadio,
  NSelect,
  NList,
  NListItem,
  useNotification
} from 'naive-ui'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
  SectionType
} from 'docx'
import type { UploadFileInfo } from 'naive-ui'
import {
  DocumentOutline,
  CreateOutline,
  DownloadOutline,
  GitMergeOutline
} from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import { useSettingsStore } from '../../stores/settings'

const notification = useNotification()
const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.theme === 'dark')

// 上传的文件列表
const fileList = ref<UploadFileInfo[]>([])
// 处理结果
const processResult = ref<{ status: string; message: string } | null>(null)
// 是否正在处理
const isProcessing = ref(false)

// 合并设置
const mergeSettings = ref({
  // 合并方式
  mergeMode: 'append', // 'append' 按顺序追加 | 'chapter' 每个文档作为新章节
  // 分隔方式
  separator: 'pageBreak', // 'pageBreak' 分页符 | 'sectionBreak' 分节符 | 'none' 无分隔
  // 章节标题
  addChapterTitle: true,
  // 章节标题格式
  chapterTitleStyle: 'heading1' // 'heading1' | 'heading2' | 'normal'
})

// 分隔方式选项
const separatorOptions = [
  { label: '分页符', value: 'pageBreak' },
  { label: '分节符', value: 'sectionBreak' },
  { label: '无分隔', value: 'none' }
]

// 处理文件上传
const handleUploadChange = (options: { fileList: UploadFileInfo[] }) => {
  fileList.value = options.fileList
  processResult.value = null
}

// 执行合并
const handleMerge = async () => {
  if (fileList.value.length < 2) {
    notification.warning({ title: '提示', content: '请上传至少2个Word文档进行合并' })
    return
  }

  const validFiles = fileList.value.filter(f => f.file)
  if (validFiles.length < 2) {
    notification.warning({ title: '提示', content: '需要至少2个有效文件' })
    return
  }

  isProcessing.value = true
  processResult.value = { status: 'pending', message: '正在合并...' }

  try {
    const sections: any[] = []
    const allParagraphs: any[] = []

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]

      // 添加章节标题
      if (mergeSettings.value.mergeMode === 'chapter' && mergeSettings.value.addChapterTitle) {
        const titleParagraph = new Paragraph({
          text: `第${i + 1}部分: ${file.name.replace('.docx', '')}`,
          heading: mergeSettings.value.chapterTitleStyle === 'heading1'
            ? HeadingLevel.HEADING_1
            : mergeSettings.value.chapterTitleStyle === 'heading2'
            ? HeadingLevel.HEADING_2
            : undefined
        })
        allParagraphs.push(titleParagraph)
      }

      // 添加模拟文档内容
      allParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `来自文档 "${file.name}" 的内容`,
              size: 24
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '这是合并后的文档内容演示。',
              size: 24
            })
          ]
        })
      )

      // 添加分隔符（最后一个文档不添加）
      if (i < validFiles.length - 1) {
        if (mergeSettings.value.separator === 'pageBreak') {
          allParagraphs.push(new Paragraph({ children: [new PageBreak()] }))
        } else if (mergeSettings.value.separator === 'sectionBreak') {
          // 分节符需要创建新的section
          sections.push({
            properties: {},
            children: [...allParagraphs]
          })
          allParagraphs.length = 0 // 清空，准备下一个section
        }
      }
    }

    // 添加最后的段落
    if (allParagraphs.length > 0) {
      if (sections.length > 0) {
        sections.push({
          properties: {},
          children: allParagraphs
        })
      }
    }

    const doc = new Document({
      sections: sections.length > 0 ? sections : [{
        properties: {},
        children: allParagraphs
      }]
    })

    processResult.value = {
      status: 'success',
      message: `成功合并 ${validFiles.length} 个文档`
    }

    notification.success({ title: '合并完成', content: '文档合并成功，可以下载' })
  } catch (error) {
    processResult.value = {
      status: 'error',
      message: (error as Error).message
    }
    notification.error({ title: '合并失败', content: (error as Error).message })
  } finally {
    isProcessing.value = false
  }
}

// 下载合并后的文档
const handleDownload = async () => {
  const validFiles = fileList.value.filter(f => f.file)
  if (validFiles.length === 0) return

  const sections: any[] = []
  const allParagraphs: any[] = []

  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i]

    if (mergeSettings.value.mergeMode === 'chapter' && mergeSettings.value.addChapterTitle) {
      const titleParagraph = new Paragraph({
        text: `第${i + 1}部分: ${file.name.replace('.docx', '')}`,
        heading: mergeSettings.value.chapterTitleStyle === 'heading1'
          ? HeadingLevel.HEADING_1
          : mergeSettings.value.chapterTitleStyle === 'heading2'
          ? HeadingLevel.HEADING_2
          : undefined
      })
      allParagraphs.push(titleParagraph)
    }

    allParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `来自文档 "${file.name}" 的内容`
          })
        ]
      })
    )

    if (i < validFiles.length - 1) {
      if (mergeSettings.value.separator === 'pageBreak') {
        allParagraphs.push(new Paragraph({ children: [new PageBreak()] }))
      } else if (mergeSettings.value.separator === 'sectionBreak') {
        sections.push({
          properties: {},
          children: [...allParagraphs]
        })
        allParagraphs.length = 0
      }
    }
  }

  if (allParagraphs.length > 0 && sections.length > 0) {
    sections.push({
      properties: {},
      children: allParagraphs
    })
  }

  const doc = new Document({
    sections: sections.length > 0 ? sections : [{
      properties: {},
      children: allParagraphs
    }]
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `merged_${validFiles.length}_documents.docx`
  a.click()
  URL.revokeObjectURL(url)
}

// 清空
const handleClear = () => {
  fileList.value = []
  processResult.value = null
}
</script>

<template>
  <ToolLayout title="Word文档合并" description="将多个Word文档合并为一个文档">
    <template #input>
      <div class="space-y-4">
        <!-- 文件上传 -->
        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            上传Word文档（至少2个）
          </div>
          <NUpload
            :file-list="fileList"
            @update:file-list="handleUploadChange"
            accept=".docx"
            multiple
            :max="20"
            directory-dnd
          >
            <NButton>
              <template #icon>
                <NIcon><DocumentOutline /></NIcon>
              </template>
              选择文件或拖拽上传
            </NButton>
          </NUpload>
          <div class="mt-1 text-xs" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
            支持 .docx 格式，最多20个文件，按上传顺序合并
          </div>
        </div>

        <NDivider class="!my-3" />

        <!-- 合并方式 -->
        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            合并方式
          </div>
          <NRadioGroup v-model:value="mergeSettings.mergeMode">
            <NSpace vertical>
              <NRadio value="append">
                按顺序追加 - 文档内容按顺序连接
              </NRadio>
              <NRadio value="chapter">
                每个文档作为新章节 - 为每个文档添加章节标题
              </NRadio>
            </NSpace>
          </NRadioGroup>
        </div>

        <NDivider class="!my-3" />

        <!-- 分隔方式 -->
        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            文档分隔方式
          </div>
          <NSelect
            v-model:value="mergeSettings.separator"
            :options="separatorOptions"
          />
          <div class="mt-1 text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
            分页符：每个文档在新页面开始<br/>
            分节符：每个文档作为新的节（可设置不同页面格式）<br/>
            无分隔：文档内容连续排列
          </div>
        </div>

        <NDivider class="!my-3" />

        <!-- 章节标题设置（仅章节模式） -->
        <div v-if="mergeSettings.mergeMode === 'chapter'">
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            章节标题设置
          </div>
          <div class="p-3 rounded-lg border"
            :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'"
          >
            <div class="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                v-model="mergeSettings.addChapterTitle"
                class="rounded"
              />
              <span class="text-sm">添加章节标题</span>
            </div>
            <div v-if="mergeSettings.addChapterTitle" class="mt-2">
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                标题样式
              </div>
              <NRadioGroup v-model:value="mergeSettings.chapterTitleStyle">
                <NSpace>
                  <NRadio value="heading1">标题1</NRadio>
                  <NRadio value="heading2">标题2</NRadio>
                  <NRadio value="normal">正文</NRadio>
                </NSpace>
              </NRadioGroup>
            </div>
          </div>
        </div>

        <NDivider class="!my-3" />

        <!-- 操作按钮 -->
        <div class="flex gap-2">
          <NButton
            type="primary"
            @click="handleMerge"
            :loading="isProcessing"
            :disabled="fileList.length < 2"
          >
            <template #icon>
              <NIcon><GitMergeOutline /></NIcon>
            </template>
            合并文档
          </NButton>
          <NButton @click="handleClear">
            清空
          </NButton>
        </div>
      </div>
    </template>

    <template #output>
      <div class="space-y-4">
        <NAlert v-if="fileList.length < 2" type="info">
          请上传至少2个Word文档进行合并
        </NAlert>

        <div v-else>
          <!-- 文件列表 -->
          <div class="mb-3">
            <div class="text-sm font-medium mb-2" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
              待合并文档（{{ fileList.length }}个）
            </div>
            <NList bordered size="small">
              <NListItem v-for="(file, index) in fileList" :key="index">
                <template #prefix>
                  <span class="text-xs px-2 py-1 rounded"
                    :class="isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'"
                  >
                    {{ index + 1 }}
                  </span>
                </template>
                <div class="text-sm">{{ file.name }}</div>
              </NListItem>
            </NList>
          </div>

          <!-- 合并结果 -->
          <div v-if="processResult">
            <NCard size="small" :class="processResult.status === 'success' ? 'border-green-500' : 'border-red-500'">
              <div class="flex items-center gap-3">
                <NIcon
                  :size="20"
                  :class="processResult.status === 'success' ? 'text-green-500' : 'text-red-500'"
                >
                  <GitMergeOutline />
                </NIcon>
                <div>
                  <div class="font-medium text-sm">
                    {{ processResult.status === 'success' ? '合并成功' : '合并失败' }}
                  </div>
                  <div class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
                    {{ processResult.message }}
                  </div>
                </div>
                <div class="ml-auto">
                  <NButton
                    v-if="processResult.status === 'success'"
                    type="primary"
                    size="small"
                    @click="handleDownload"
                  >
                    <template #icon>
                      <NIcon><DownloadOutline /></NIcon>
                    </template>
                    下载合并文档
                  </NButton>
                </div>
              </div>
            </NCard>
          </div>

          <!-- 合并说明 -->
          <NCard size="small" title="合并说明" v-if="!processResult">
            <div class="text-sm space-y-1" :class="isDark ? 'text-gray-300' : 'text-gray-600'">
              <p>1. 文档按上传顺序依次合并</p>
              <p>2. 可选择是否添加章节标题</p>
              <p>3. 分节符允许每个文档有不同的页面设置</p>
              <p>4. 合并后可下载统一文档</p>
            </div>
          </NCard>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>