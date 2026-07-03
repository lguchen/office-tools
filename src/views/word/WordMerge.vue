<!--
  Word文档合并页面
  技术说明：使用docx库处理Word文档
  安装：npm install docx
  文档：https://docx.js.org/

  注意：文档合并需要将多个文档的内容整合到一个文档中
-->
<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import {
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
  NListItem
} from 'naive-ui'
import { notifySuccess, notifyError, notifyWarning } from '../../composables/useNotification'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
  SectionType
} from 'docx'
import { extractText } from '../../composables/useDocxEdit'
import {
  DocumentOutline,
  CreateOutline,
  DownloadOutline,
  GitMergeOutline
} from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import FileDropZone from '../../components/common/FileDropZone.vue'
import WordPreview from '../../components/common/WordPreview.vue'
import DetachablePreview from '../../components/common/DetachablePreview.vue'

// 上传的文件列表
const fileList = ref<{ name: string; path: string; size?: number; file?: File }[]>([])
// 处理结果
const processResult = ref<{ status: string; message: string } | null>(null)
// 是否正在处理
const isProcessing = ref(false)
// 预览缓冲区
const previewBuffer = ref<ArrayBuffer | null>(null)
// 是否分离窗口
const isDetached = ref(false)
// DetachablePreview 引用
const detachableRef = ref<InstanceType<typeof DetachablePreview> | null>(null)

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
const handleFilesSelected = (files: { name: string; path: string; size?: number; file?: File }[]) => {
  fileList.value = files
  processResult.value = null
}

// 执行合并
const handleMerge = async () => {
  if (fileList.value.length < 2) {
    notifyWarning('提示', '请上传至少2个Word文档进行合并')
    return
  }

  const validFiles = fileList.value.filter(f => f.file)
  if (validFiles.length < 2) {
    notifyWarning('提示', '需要至少2个有效文件')
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

      // 读取真实文档内容
      const arrayBuffer = await file.file!.arrayBuffer()
      const textContent = await extractText(arrayBuffer)
      const lines = textContent.split('\n').filter(line => line.trim())

      if (lines.length === 0) {
        allParagraphs.push(new Paragraph({ children: [new TextRun({ text: '', size: 24 })] }))
      } else {
        for (const line of lines) {
          allParagraphs.push(
            new Paragraph({
              children: [new TextRun({ text: line, size: 24 })]
            })
          )
        }
      }

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

    const blob = await Packer.toBlob(doc)
    previewBuffer.value = await blob.arrayBuffer()

    processResult.value = {
      status: 'success',
      message: `成功合并 ${validFiles.length} 个文档`
    }

    await nextTick()
    if (isDetached.value && detachableRef.value) {
      detachableRef.value.syncContent()
    }

    notifySuccess('合并完成', '文档合并成功，可以下载')
  } catch (error) {
    processResult.value = {
      status: 'error',
      message: (error as Error).message
    }
    notifyError('合并失败', (error as Error).message)
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
  previewBuffer.value = null
}
</script>

<template>
  <ToolLayout title="Word文档合并" description="将多个Word文档合并为一个文档">
    <template #input>
      <div class="space-y-4">
        <!-- 文件上传 -->
        <div>
          <div class="mb-2 text-sm font-medium text-gray-700">
            上传Word文档（至少2个）
          </div>
          <FileDropZone
            accept=".docx"
            :multiple="true"
            @files-selected="handleFilesSelected"
          />
          <div class="mt-1 text-xs text-gray-400">
            支持 .docx 格式，最多20个文件，按上传顺序合并
          </div>
        </div>

        <NDivider class="!my-3" />

        <!-- 合并方式 -->
        <div>
          <div class="mb-2 text-sm font-medium text-gray-700">
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
          <div class="mb-2 text-sm font-medium text-gray-700">
            文档分隔方式
          </div>
          <NSelect
            v-model:value="mergeSettings.separator"
            :options="separatorOptions"
          />
          <div class="mt-1 text-xs text-gray-500">
            分页符：每个文档在新页面开始<br/>
            分节符：每个文档作为新的节（可设置不同页面格式）<br/>
            无分隔：文档内容连续排列
          </div>
        </div>

        <NDivider class="!my-3" />

        <!-- 章节标题设置（仅章节模式） -->
        <div v-if="mergeSettings.mergeMode === 'chapter'">
          <div class="mb-2 text-sm font-medium text-gray-700">
            章节标题设置
          </div>
          <div class="p-3 rounded-lg border border-gray-200 bg-gray-50"
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
              <div class="text-xs mb-1 text-gray-500">
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
      <DetachablePreview
        ref="detachableRef"
        v-model:detached="isDetached"
        title="Word文档预览"
        class="h-full"
      >
        <div class="h-full flex flex-col">
          <div class="flex items-center gap-2 px-3 py-1.5 border-b flex-shrink-0 border-gray-200 bg-gray-50">
            <div class="flex-1 flex items-center gap-2">
              <span class="text-xs text-gray-500">
                {{ previewBuffer ? '合并结果预览' : '待合并' }}
              </span>
              <span v-if="processResult?.status === 'success'" class="text-xs text-green-500">
                {{ processResult.message }}
              </span>
              <span v-else-if="processResult?.status === 'error'" class="text-xs text-red-500">
                {{ processResult.message }}
              </span>
            </div>
            <NButton
              v-if="previewBuffer"
              size="small"
              @click="handleDownload"
            >
              <template #icon>
                <NIcon><DownloadOutline /></NIcon>
              </template>
              下载
            </NButton>
          </div>

          <div class="flex-1 min-h-0 flex flex-col">
            <div v-if="fileList.length > 0" class="px-3 py-2 border-b flex-shrink-0 border-gray-200 bg-gray-50/50">
              <div class="text-xs font-medium mb-1 text-gray-500">
                待合并文档（{{ fileList.length }}个）
              </div>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="(file, index) in fileList"
                  :key="index"
                  class="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600"
                >
                  {{ index + 1 }}. {{ file.name }}
                </span>
              </div>
            </div>

            <div class="flex-1 min-h-0">
              <WordPreview
                v-if="previewBuffer"
                :array-buffer="previewBuffer"
                class="h-full"
              />
              <div v-else class="h-full flex items-center justify-center text-gray-400">
                <div class="text-center text-sm space-y-2">
                  <div v-if="fileList.length < 2">
                    请上传至少2个Word文档进行合并
                  </div>
                  <div v-else>
                    <div>点击「合并文档」按钮生成预览</div>
                    <div class="text-xs opacity-70 mt-2">
                      合并说明：文档按上传顺序依次合并，可选择是否添加章节标题
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DetachablePreview>
    </template>
  </ToolLayout>
</template>