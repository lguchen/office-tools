<script setup lang="ts">
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { NButton, NIcon, NInput, useMessage } from 'naive-ui'
import { CloudUploadOutline, CloudDownloadOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useFileOperation } from '../../composables/useFileOperation'

const message = useMessage()
const { openFile, saveFile } = useFileOperation()

const inputFile = ref('')
const pageRanges = ref('')
const outputDir = ref('')
const isProcessing = ref(false)
const outputFiles = ref<string[]>([])

const handleSelectFile = async () => {
  const file = await openFile([{ name: 'PDF文件', extensions: ['pdf'] }])
  if (file) {
    inputFile.value = file
    // Set default output dir
    const lastSep = file.lastIndexOf(/[\\/]/.test(file) ? (file.includes('\\') ? '\\' : '/') : '/')
    outputDir.value = file.substring(0, lastSep + 1) + 'split_output'
  }
}

const handleSplit = async () => {
  if (!inputFile.value) {
    message.warning('请选择PDF文件')
    return
  }
  if (!pageRanges.value.trim()) {
    message.warning('请输入页码范围')
    return
  }
  if (!outputDir.value.trim()) {
    message.warning('请输入输出目录')
    return
  }

  isProcessing.value = true
  try {
    const ranges = pageRanges.value.split(',').map(r => r.trim()).filter(r => r)
    const result = await invoke<string[]>('pdf_split', {
      inputPath: inputFile.value,
      pageRanges: ranges,
      outputDir: outputDir.value
    })
    outputFiles.value = result
    message.success('PDF拆分成功')
  } catch (e) {
    message.error('拆分失败: ' + (e as Error).message)
  } finally {
    isProcessing.value = false
  }
}

const handleDownload = () => {
  if (outputFiles.value.length > 0) {
    message.info('文件已保存到: ' + outputDir.value)
  }
}
</script>

<template>
  <ToolLayout title="PDF拆分" description="按页码范围拆分PDF文件">
    <template #input>
      <div class="space-y-4">
        <div class="flex gap-2">
          <NButton type="primary" @click="handleSelectFile">
            <template #icon>
              <NIcon><uploadOutline /></NIcon>
            </template>
            选择文件
          </NButton>
        </div>

        <div v-if="inputFile" class="text-gray-300">
          已选择: {{ inputFile.split(/[\\/]/).pop() }}
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1">页码范围 (用逗号分隔)</label>
          <NInput
            v-model:value="pageRanges"
            placeholder="例如: 1-3, 5, 7-10"
          />
          <div class="text-xs text-gray-500 mt-1">
            支持单页 (5)、连续页 (1-3)、逗号分隔 (1-3, 5, 7-10)
          </div>
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1">输出目录</label>
          <NInput v-model:value="outputDir" placeholder="输出目录路径" />
        </div>

        <NButton
          type="success"
          :disabled="!inputFile || !pageRanges.trim()"
          :loading="isProcessing"
          @click="handleSplit"
        >
          <template #icon>
            <NIcon><downloadOutline /></NIcon>
          </template>
          拆分PDF
        </NButton>
      </div>
    </template>

    <template #output>
      <div v-if="outputFiles.length > 0" class="space-y-4">
        <div class="text-green-400 mb-2">拆分完成!</div>
        <div v-for="file in outputFiles" :key="file" class="text-sm text-gray-300 py-1">
          {{ file.split(/[\\/]/).pop() }}
        </div>
        <ActionBar showDownload @download="handleDownload" />
      </div>
      <div v-else class="text-center text-gray-500 py-8">
        选择文件后输入页码范围进行拆分
      </div>
    </template>
  </ToolLayout>
</template>
