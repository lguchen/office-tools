<script setup lang="ts">
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { NButton, NSelect, NIcon, NInput, NSpin } from 'naive-ui'
import { NCard, useMessage } from 'naive-ui'
import { CloudUploadOutline, CloudDownloadOutline, AddOutline, RemoveOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useFileOperation } from '../../composables/useFileOperation'

const message = useMessage()
const { openFiles, saveFile, readBinaryFile, writeBinaryFile } = useFileOperation()

const pdfFiles = ref<Array<{ path: string; name: string; checked: boolean }>>([])
const isProcessing = ref(false)
const outputPath = ref('')

const handleSelectFiles = async () => {
  const files = await openFiles([{ name: 'PDF文件', extensions: ['pdf'] }])
  if (files) {
    for (const file of files) {
      const name = file.split(/[\\/]/).pop() || file
      if (!pdfFiles.value.find(f => f.path === file)) {
        pdfFiles.value.push({ path: file, name, checked: true })
      }
    }
  }
}

const removeFile = (index: number) => {
  pdfFiles.value.splice(index, 1)
}

const moveUp = (index: number) => {
  if (index > 0) {
    const temp = pdfFiles.value[index]
    pdfFiles.value[index] = pdfFiles.value[index - 1]
    pdfFiles.value[index - 1] = temp
  }
}

const moveDown = (index: number) => {
  if (index < pdfFiles.value.length - 1) {
    const temp = pdfFiles.value[index]
    pdfFiles.value[index] = pdfFiles.value[index + 1]
    pdfFiles.value[index + 1] = temp
  }
}

const handleMerge = async () => {
  if (pdfFiles.value.length < 2) {
    message.warning('请至少选择2个PDF文件')
    return
  }

  const checkedFiles = pdfFiles.value.filter(f => f.checked)
  if (checkedFiles.length < 2) {
    message.warning('请至少选择2个PDF文件进行合并')
    return
  }

  const output = await saveFile('merged.pdf', [{ name: 'PDF文件', extensions: ['pdf'] }])
  if (!output) return

  isProcessing.value = true
  try {
    const paths = checkedFiles.map(f => f.path)
    const result = await invoke<string>('pdf_merge', { pdfPaths: paths, outputPath: output })
    outputPath.value = result
    message.success('PDF合并成功')
  } catch (e) {
    message.error('合并失败: ' + (e as Error).message)
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
  <ToolLayout title="PDF合并" description="将多个PDF文件合并为一个">
    <template #input>
      <div class="space-y-4">
        <div class="flex gap-2">
          <NButton type="primary" @click="handleSelectFiles">
            <template #icon>
              <NIcon><CloudUploadOutline /></NIcon>
            </template>
            选择文件
          </NButton>
          <NButton
            type="success"
            :disabled="pdfFiles.length < 2"
            :loading="isProcessing"
            @click="handleMerge"
          >
            <template #icon>
              <NIcon><CloudDownloadOutline /></NIcon>
            </template>
            合并PDF
          </NButton>
        </div>

        <div v-if="pdfFiles.length === 0" class="text-center text-gray-500 py-8">
          请选择要合并的PDF文件
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="(file, index) in pdfFiles"
            :key="file.path"
            class="flex items-center gap-3 p-3 bg-gray-700 rounded-lg"
          >
            <input
              type="checkbox"
              v-model="file.checked"
              class="w-4 h-4"
            />
            <span class="flex-1 truncate">{{ file.name }}</span>
            <NButton size="tiny" quaternary @click="moveUp(index)" :disabled="index === 0">
              <NIcon><RemoveOutline /></NIcon>
            </NButton>
            <NButton size="tiny" quaternary @click="moveDown(index)" :disabled="index === pdfFiles.length - 1">
              <NIcon><AddOutline /></NIcon>
            </NButton>
            <NButton size="tiny" quaternary type="error" @click="removeFile(index)">
              <NIcon><RemoveOutline /></NIcon>
            </NButton>
          </div>
        </div>
      </div>
    </template>

    <template #output>
      <div v-if="outputPath" class="text-center py-8">
        <div class="text-green-400 text-lg mb-4">合并完成!</div>
        <div class="text-gray-400 text-sm mb-4">输出文件: {{ outputPath }}</div>
        <ActionBar
          showCopy
          showDownload
          @download="handleDownload"
        />
      </div>
      <div v-else class="text-center text-gray-500 py-8">
        选择文件后点击合并按钮
      </div>
    </template>
  </ToolLayout>
</template>
