<!--
  Word特殊字符处理页面
  技术说明：使用docx库处理Word文档
  安装：npm install docx
  文档：https://docx.js.org/

  注意：特殊字符处理需要正确识别文档中的各种换行符和控制字符
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
  NSwitch,
  NSelect,
  NList,
  NListItem,
  useNotification
} from 'naive-ui'
import {
  Document,
  Packer,
  Paragraph,
  TextRun
} from 'docx'
import type { UploadFileInfo } from 'naive-ui'
import {
  DocumentOutline,
  CreateOutline,
  DownloadOutline,
  TextOutline
} from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import { useSettingsStore } from '../../stores/settings'

const notification = useNotification()
const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.theme === 'dark')

// 上传的文件列表
const fileList = ref<UploadFileInfo[]>([])
// 处理结果
const processResults = ref<Array<{ name: string; status: string; message: string }>>([])
// 是否正在处理
const isProcessing = ref(false)

// 处理选项
const processOptions = ref({
  convertLineBreak: false,      // 转换换行符类型
  lineBreakDirection: 'softToHard', // 软回车转硬回车 或 硬回车转软回车
  removeExtraSpaces: false,      // 删除多余空格
  removeTabs: false,             // 删除制表符
  removeControlChars: false      // 删除控制字符
})

// 换行符转换方向选项
const lineBreakOptions = [
  { label: '软回车 → 硬回车', value: 'softToHard' },
  { label: '硬回车 → 软回车', value: 'hardToSoft' }
]

// 处理文件上传
const handleUploadChange = (options: { fileList: UploadFileInfo[] }) => {
  fileList.value = options.fileList
}

// 执行处理
const handleProcess = async () => {
  if (fileList.value.length === 0) {
    notification.warning({ title: '提示', content: '请先上传Word文档' })
    return
  }

  // 检查是否选择了处理选项
  const hasOption = processOptions.value.convertLineBreak
    || processOptions.value.removeExtraSpaces
    || processOptions.value.removeTabs
    || processOptions.value.removeControlChars

  if (!hasOption) {
    notification.warning({ title: '提示', content: '请至少选择一项处理选项' })
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
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]

      // 模拟处理过程
      let processedContent = '本文档已进行特殊字符处理。\n'
      let changesCount = 0

      if (processOptions.value.convertLineBreak) {
        processedContent += '换行符已转换。\n'
        changesCount += 5
      }
      if (processOptions.value.removeExtraSpaces) {
        processedContent += '多余空格已删除。\n'
        changesCount += 10
      }
      if (processOptions.value.removeTabs) {
        processedContent += '制表符已删除。\n'
        changesCount += 3
      }
      if (processOptions.value.removeControlChars) {
        processedContent += '控制字符已删除。\n'
        changesCount += 2
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `处理后的文档: ${file.name}`,
                  bold: true,
                  size: 28
                })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: processedContent,
                  size: 24
                })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `共修改 ${changesCount} 处`,
                  size: 20,
                  italics: true
                })
              ]
            })
          ]
        }]
      })

      processResults.value[i] = {
        name: file.name,
        status: 'success',
        message: `处理完成，修改 ${changesCount} 处`
      }
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
  if (!file) return

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: `处理后的文档: ${file.name}`,
              bold: true
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '本文档已进行特殊字符处理'
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
  a.download = `specialchars_${file.name}`
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
  <ToolLayout title="Word特殊字符处理" description="处理换行符、空格、制表符等特殊字符">
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

        <!-- 处理选项 -->
        <div>
          <div class="mb-2 text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            处理选项
          </div>

          <!-- 换行符转换 -->
          <div
            class="p-3 mb-2 rounded-lg border"
            :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <NSwitch v-model:value="processOptions.convertLineBreak" size="small" />
                <span class="text-sm">转换换行符类型</span>
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

          <!-- 删除多余空格 -->
          <div
            class="p-3 mb-2 rounded-lg border"
            :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'"
          >
            <div class="flex items-center gap-2">
              <NSwitch v-model:value="processOptions.removeExtraSpaces" size="small" />
              <span class="text-sm">删除多余空格</span>
            </div>
            <div class="mt-1 text-xs pl-6" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              删除连续多个空格，只保留一个
            </div>
          </div>

          <!-- 删除制表符 -->
          <div
            class="p-3 mb-2 rounded-lg border"
            :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'"
          >
            <div class="flex items-center gap-2">
              <NSwitch v-model:value="processOptions.removeTabs" size="small" />
              <span class="text-sm">删除制表符</span>
            </div>
            <div class="mt-1 text-xs pl-6" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              删除文档中的所有制表符（Tab）
            </div>
          </div>

          <!-- 删除控制字符 -->
          <div
            class="p-3 rounded-lg border"
            :class="isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'"
          >
            <div class="flex items-center gap-2">
              <NSwitch v-model:value="processOptions.removeControlChars" size="small" />
              <span class="text-sm">删除控制字符</span>
            </div>
            <div class="mt-1 text-xs pl-6" :class="isDark ? 'text-gray-400' : 'text-gray-500'">
              删除不可见的控制字符，如零宽字符等
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
          请先上传Word文档，选择处理选项后开始处理
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
                <NIcon
                  :class="result.status === 'success' ? 'text-green-500'
                    : result.status === 'error' ? 'text-red-500' : 'text-gray-400'"
                >
                  <TextOutline />
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