<script setup lang="ts">
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { NButton, NIcon, NSelect, useMessage } from 'naive-ui'
import { CloudUploadOutline, CloudDownloadOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useFileOperation } from '../../composables/useFileOperation'

const message = useMessage()
const { openFile, saveFile } = useFileOperation()

const inputFile = ref('')
const quality = ref<'low' | 'medium' | 'high'>('medium')
const isProcessing = ref(false)
const outputPath = ref('')
const originalSize = ref(0)
const compressedSize = ref(0)

const qualityOptions = [
  { label: '低压缩', value: 'low' },
  { label: '标准压缩', value: 'medium' },
  { label: '高压缩', value: 'high' }
]

const handleSelectFile = async () => {
  const file = await openFile([{ name: 'PDF文件', extensions: ['pdf'] }])
  if (file) {
    inputFile.value = file
  }
}

const handleCompress = async () => {
  if (!inputFile.value) {
    message.warning('请选择PDF文件')
    return
  }

  const output = await saveFile('compressed.pdf', [{ name: 'PDF文件', extensions: ['pdf'] }])
  if (!output) return

  isProcessing.value = true
  try {
    const result = await invoke<string>('pdf_compress', {
      inputPath: inputFile.value,
      outputPath: output,
      quality: quality.value
    })
    outputPath.value = result
    message.success('PDF压缩成功')
  } catch (e) {
    message.error('压缩失败: ' + (e as Error).message)
  } finally {
    isProcessing.value = false
  }
}

const handleDownload = () => {
  if (outputPath.value) {
    message.info('文件已保存到: ' + outputPath.value)
  }
}
</script>

<template>
  <ToolLayout title="PDF压缩" description="减小PDF文件大小">
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
          <label class="block text-sm text-gray-400 mb-1">压缩质量</label>
          <NSelect v-model:value="quality" :options="qualityOptions" />
        </div>

        <NButton
          type="success"
          :disabled="!inputFile"
          :loading="isProcessing"
          @click="handleCompress"
        >
          <template #icon>
            <NIcon><downloadOutline /></NIcon>
          </template>
          压缩PDF
        </NButton>
      </div>
    </template>

    <template #output>
      <div v-if="outputPath" class="text-center py-8">
        <div class="text-green-400 text-lg mb-4">压缩完成!</div>
        <div class="text-gray-400 text-sm mb-4">输出文件: {{ outputPath }}</div>
        <ActionBar showDownload @download="handleDownload" />
      </div>
      <div v-else class="text-center text-gray-500 py-8">
        选择文件后点击压缩按钮
      </div>
    </template>
  </ToolLayout>
</template>
