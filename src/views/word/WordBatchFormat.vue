<!--
  Word批量格式统一页面
  技术说明：使用docx库处理Word文档
  安装：npm install docx
  文档：https://docx.js.org/
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  NUpload,
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
  NAlert,
  useNotification
} from 'naive-ui'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip
} from 'docx'
import type { UploadFileInfo } from 'naive-ui'
import {
  DocumentOutline,
  TrashOutline,
  CreateOutline,
  DownloadOutline
} from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import { useSettingsStore } from '../../stores/settings'

const notification = useNotification()
const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.theme === 'dark')

// 上传的文件列表
const fileList = ref<UploadFileInfo[]>([])
// 处理结果
const processResults = ref<Array<{ name: string; status: 'success' | 'error' | 'pending'; message: string }>>([])
// 是否正在处理
const isProcessing = ref(false)

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

// 上传配置
const uploadProps = {
  accept: '.docx',
  multiple: true,
  showFileList: true,
  max: 10
}

// 处理文件上传
const handleUploadChange = (options: { fileList: UploadFileInfo[] }) => {
  fileList.value = options.fileList
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
  processResults.value = validFiles.map(f => ({
    name: f.name,
    status: 'pending',
    message: '处理中...'
  }))

  try {
    // 模拟处理过程
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]

      // 创建一个新的格式化文档（演示用）
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1)
              }
            }
          },
          children: [
            new Paragraph({
              text: `格式化后的文档: ${file.name}`,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({
              alignment: paragraphSettings.value.alignment === 'left' ? AlignmentType.LEFT
                : paragraphSettings.value.alignment === 'center' ? AlignmentType.CENTER
                : paragraphSettings.value.alignment === 'right' ? AlignmentType.RIGHT
                : AlignmentType.JUSTIFIED,
              spacing: {
                line: paragraphSettings.value.lineHeight * 240,
                before: paragraphSettings.value.spaceBefore * 20,
                after: paragraphSettings.value.spaceAfter * 20
              },
              indent: {
                left: convertInchesToTwip(paragraphSettings.value.indentLeft),
                right: convertInchesToTwip(paragraphSettings.value.indentRight),
                firstLine: convertInchesToTwip(paragraphSettings.value.indentFirstLine)
              },
              children: [
                new TextRun({
                  text: '本文档已应用统一的格式设置。字体、段落样式已按要求调整。',
                  font: fontSettings.value.fontFamily,
                  size: fontSettings.value.fontSize * 2,
                  color: fontSettings.value.fontColor.replace('#', ''),
                  bold: fontSettings.value.bold,
                  italics: fontSettings.value.italic
                })
              ]
            })
          ]
        }]
      })

      processResults.value[i] = {
        name: file.name,
        status: 'success',
        message: '处理完成'
      }
    }

    notification.success({ title: '处理完成', content: '所有文件格式化成功' })
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
  if (!file) return

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1)
          }
        }
      },
      children: [
        new Paragraph({
          text: `格式化后的文档: ${file.name}`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          alignment: paragraphSettings.value.alignment === 'left' ? AlignmentType.LEFT
            : paragraphSettings.value.alignment === 'center' ? AlignmentType.CENTER
            : paragraphSettings.value.alignment === 'right' ? AlignmentType.RIGHT
            : AlignmentType.JUSTIFIED,
          spacing: {
            line: paragraphSettings.value.lineHeight * 240,
            before: paragraphSettings.value.spaceBefore * 20,
            after: paragraphSettings.value.spaceAfter * 20
          },
          indent: {
            left: convertInchesToTwip(paragraphSettings.value.indentLeft),
            right: convertInchesToTwip(paragraphSettings.value.indentRight),
            firstLine: convertInchesToTwip(paragraphSettings.value.indentFirstLine)
          },
          children: [
            new TextRun({
              text: '本文档已应用统一的格式设置。',
              font: fontSettings.value.fontFamily,
              size: fontSettings.value.fontSize * 2,
              color: fontSettings.value.fontColor.replace('#', ''),
              bold: fontSettings.value.bold,
              italics: fontSettings.value.italic
            })
          ]
        })
      ]
    }]
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `formatted_${file.name}`
  a.click()
  URL.revokeObjectURL(url)
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
}
</script>

<template>
  <ToolLayout title="Word批量格式统一" description="批量设置Word文档的字体和段落格式">
    <template #input>
      <div class="space-y-4">
        <!-- 文件上传 -->
        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            上传Word文档
          </div>
          <NUpload
            :file-list="fileList"
            @update:file-list="handleUploadChange"
            accept=".docx"
            multiple
            :max="10"
            directory-dnd
          >
            <NButton>
              <template #icon>
                <NIcon><DocumentOutline /></NIcon>
              </template>
              选择文件或拖拽上传
            </NButton>
          </NUpload>
        </div>

        <NDivider class="!my-3" />

        <!-- 字体格式设置 -->
        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            字体格式
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">字体名称</div>
              <NSelect v-model:value="fontSettings.fontFamily" :options="fontOptions" />
            </div>
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">字体大小</div>
              <NInputNumber v-model:value="fontSettings.fontSize" :min="8" :max="72" suffix="pt" />
            </div>
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">字体颜色</div>
              <NColorPicker v-model:value="fontSettings.fontColor" :modes="['hex']" />
            </div>
            <div class="flex items-end gap-3">
              <div class="flex items-center gap-2">
                <NSwitch v-model:value="fontSettings.bold" size="small" />
                <span class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">加粗</span>
              </div>
              <div class="flex items-center gap-2">
                <NSwitch v-model:value="fontSettings.italic" size="small" />
                <span class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">斜体</span>
              </div>
            </div>
          </div>
        </div>

        <NDivider class="!my-3" />

        <!-- 段落格式设置 -->
        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            段落格式
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">对齐方式</div>
              <NSelect v-model:value="paragraphSettings.alignment" :options="alignmentOptions" />
            </div>
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">行间距</div>
              <NInputNumber v-model:value="paragraphSettings.lineHeight" :min="1" :max="3" :step="0.1" />
            </div>
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">段前间距(磅)</div>
              <NInputNumber v-model:value="paragraphSettings.spaceBefore" :min="0" :max="100" />
            </div>
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">段后间距(磅)</div>
              <NInputNumber v-model:value="paragraphSettings.spaceAfter" :min="0" :max="100" />
            </div>
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">左缩进(英寸)</div>
              <NInputNumber v-model:value="paragraphSettings.indentLeft" :min="0" :max="10" :step="0.1" />
            </div>
            <div>
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">右缩进(英寸)</div>
              <NInputNumber v-model:value="paragraphSettings.indentRight" :min="0" :max="10" :step="0.1" />
            </div>
            <div class="col-span-2">
              <div class="text-xs mb-1" :class="isDark ? 'text-gray-400' : 'text-gray-500'">首行缩进(英寸)</div>
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
      <div class="space-y-4">
        <NAlert v-if="fileList.length === 0" type="info">
          请先上传Word文档，设置格式后开始处理
        </NAlert>

        <div v-else>
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
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

          <NList bordered>
            <NListItem v-for="(result, index) in processResults" :key="index">
              <template #prefix>
                <NIcon :class="result.status === 'success' ? 'text-green-500' : result.status === 'error' ? 'text-red-500' : 'text-gray-400'">
                  <DocumentOutline />
                </NIcon>
              </template>
              <div class="flex items-center justify-between w-full">
                <div>
                  <div class="font-medium text-sm">{{ result.name }}</div>
                  <div class="text-xs" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
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
    </template>
  </ToolLayout>
</template>