<script setup lang="ts">
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { NButton, NIcon, NInput, NSelect, useMessage } from 'naive-ui'
import { CloudUploadOutline, CloudDownloadOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useFileOperation } from '../../composables/useFileOperation'

const message = useMessage()
const { openFile, saveFile } = useFileOperation()

const inputFile = ref('')
const outputDir = ref('')
const dpi = ref(300)
const format = ref('png')
const isProcessing = ref(false)
const outputFiles = ref<string[]>([])

const formatOptions = [
  { label: 'PNG', value: 'png' },
  { label: 'JPG', value: 'jpg' },
  { label: 'JPEG', value: 'jpeg' }
]

const handleSelectFile = async () => {
  const file = await openFile([{ name: 'PDF文件', extensions: ['pdf'] }])
  if (file) {
    inputFile.value = file
    const lastSep = file.lastIndexOf(/[\\/]/.test(file) ? (file.includes('\\') ? '\\' : '/') : '/')
    outputDir.value = file.substring(0, lastSep + 1) + 'pdf_images'
  }
}

const handleConvert = async () => {
  if (!inputFile.value) {
    message.warning('请选择PDF文件')
    return
  }
  if (!outputDir.value.trim()) {
    message.warning('请输入输出目录')
    return
  }

  isProcessing.value = true
  try {
    const result = await invoke<string[]>('pdf_to_images', {
      inputPath: inputFile.value,
      outputDir: outputDir.value,
      dpi: dpi.value,
      format: format.value
    })
    outputFiles.value = result
    message.success('PDF转图片成功')
  } catch (e) {
    message.error('转换失败: ' + (e as Error).message)
  } finally {
    isProcessing.value = false
  }
}

const handleDownload = () => {
  if (outputFiles.value.length > 0) {
    message.info('图片已保存到: ' + outputDir.value)
  }
}
</script>

<template>
  <ToolLayout title="PDF转图片" description="将PDF页面转换为图片">
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
          <label class="block text-sm text-gray-400 mb-1">输出目录</label>
          <NInput v-model:value="outputDir" placeholder="输出目录路径" />
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1">DPI (分辨率)</label>
          <NSelect
            v-model:value="dpi"
            :options="[
              { label: '150 DPI (快速)', value: 150 },
              { label: '300 DPI (标准)', value: 300 },
              { label: '600 DPI (高质量)', value: 600 }
            ]"
          />
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1">图片格式</label>
          <NSelect v-model:value="format" :options="formatOptions" />
        </div>

        <NButton
          type="success"
          :disabled="!inputFile || !outputDir.trim()"
          :loading="isProcessing"
          @click="handleConvert"
        >
          <template #icon>
            <NIcon><downloadOutline /></NIcon>
          </template>
          转换为图片
        </NButton>
      </div>
    </template>

    <template #output>
      <div v-if="outputFiles.length > 0" class="space-y-4">
        <div class="text-green-400 mb-2">转换完成!</div>
        <div class="text-sm text-gray-400 mb-2">已生成 {{ outputFiles.length }} 张图片</div>
        <div v-for="file in outputFiles.slice(0, 5)" :key="file" class="text-sm text-gray-300 py-1 truncate">
          {{ file.split(/[\\/]/).pop() }}
        </div>
        <div v-if="outputFiles.length > 5" class="text-sm text-gray-500">
          ... 还有 {{ outputFiles.length - 5 }} 张图片
        </div>
        <ActionBar showDownload @download="handleDownload" />
      </div>
      <div v-else class="text-center text-gray-500 py-8">
        选择文件后点击转换按钮
      </div>
    </template>
  </ToolLayout>
</template>
