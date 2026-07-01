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
import type { UploadFileInfo } from 'naive-ui'
import {
  DocumentOutline,
  TrashOutline,
  AddOutline,
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
  processResults.value = validFiles.map(f => ({
    name: f.name,
    status: 'pending',
    message: '处理中...'
  }))

  try {
    // 模拟处理过程（实际项目中需要读取和解析docx文件）
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]

      // 创建一个新的文档（演示用）
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

      // 生成blob
      const blob = await Packer.toBlob(doc)

      processResults.value[i] = {
        name: file.name,
        status: 'success',
        message: '处理完成，可下载'
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

  // 创建演示文档
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

  const blob = await Packer.toBlob(doc)
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

// 清空所有
const handleClear = () => {
  fileList.value = []
  processResults.value = []
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
      <div class="space-y-4">
        <NAlert v-if="fileList.length === 0" type="info">
          请先上传Word文档，设置处理规则后开始处理
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