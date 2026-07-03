<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NButton, NIcon, NRadioGroup, NRadio, NSpace } from 'naive-ui'
import { CreateOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import FileDropZone from '../../components/common/FileDropZone.vue'
import { invoke } from '@tauri-apps/api/core'
import { notifySuccess, notifyError } from '../../composables/useNotification'

const mode = ref<'text' | 'file'>('text')
const inputText = ref('')
const inputFile = ref<File | null>(null)
const fileName = ref('')
const isProcessing = ref(false)

const hashResults = ref<Record<string, string>>({})

const algorithms = ['MD5', 'SHA1', 'SHA256', 'SHA512']

const canCalculate = computed(() => {
  if (mode.value === 'text') return inputText.value.length > 0
  return inputFile.value !== null
})

const handleCalculate = async () => {
  if (!canCalculate.value) return
  isProcessing.value = true
  hashResults.value = {}
  try {
    if (mode.value === 'text') {
      const encoder = new TextEncoder()
      const data = Array.from(encoder.encode(inputText.value))
      const results = await invoke<Record<string, string>>('calculate_hashes', { data })
      hashResults.value = results
      notifySuccess('计算完成', '哈希值计算完成')
    } else {
      if (!inputFile.value) return
      const arrayBuffer = await inputFile.value.arrayBuffer()
      const data = Array.from(new Uint8Array(arrayBuffer))
      const results = await invoke<Record<string, string>>('calculate_hashes', { data })
      hashResults.value = results
      notifySuccess('计算完成', '文件哈希值计算完成')
    }
  } catch (e) {
    notifyError('计算失败', (e as Error).message)
  } finally {
    isProcessing.value = false
  }
}

const handleCopy = async (algo: string) => {
  const value = hashResults.value[algo]
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    notifySuccess('复制成功', `${algo} 已复制到剪贴板`)
  } catch (e) {
    notifyError('复制失败', (e as Error).message)
  }
}

const handleClear = () => {
  inputText.value = ''
  inputFile.value = null
  fileName.value = ''
  hashResults.value = {}
}

const handleFileUpload = (fileList: { name: string; path: string; size?: number; file?: File }[]) => {
  if (fileList.length === 0 || !fileList[0].file) return
  const file = fileList[0].file
  inputFile.value = file
  fileName.value = file.name
  hashResults.value = {}
}

const outputText = computed(() => {
  return Object.entries(hashResults.value)
    .map(([algo, value]) => `${algo}: ${value}`)
    .join('\n')
})
</script>

<template>
  <ToolLayout title="哈希计算" description="计算文本或文件的MD5/SHA1/SHA256/SHA512哈希值">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NRadioGroup v-model:value="mode" @update:value="handleClear">
          <NRadio value="text">文本模式</NRadio>
          <NRadio value="file">文件模式</NRadio>
        </NRadioGroup>

        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canCalculate" :loading="isProcessing" @click="handleCalculate">
            <template #icon>
              <NIcon><CreateOutline /></NIcon>
            </template>
            计算哈希
          </NButton>
          <NButton @click="handleClear">清空</NButton>
        </div>

        <div v-if="mode === 'text'" class="flex-1 flex flex-col min-h-0">
          <div class="text-sm text-gray-400 mb-2">输入文本</div>
          <NInput
            v-model:value="inputText"
            type="textarea"
            placeholder="在此输入文本计算哈希值..."
            class="flex-1"
            style="min-height: 200px;"
          />
        </div>

        <div v-else class="flex-1 flex flex-col">
          <FileDropZone
            :show-file-list="false"
            accept="*"
            tips="点击或拖拽文件到此处"
            @files-selected="handleFileUpload"
          />
        </div>
      </div>
    </template>

    <template #output>
      <div class="h-full flex flex-col">
        <ActionBar
          :showCopy="false"
          :showDownload="false"
          :showClear="true"
          @clear="hashResults = {}"
        />
        <div class="mt-4 space-y-3">
          <div v-for="algo in algorithms" :key="algo" class="p-3 bg-gray-800 rounded-lg">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-semibold text-blue-400">{{ algo }}</span>
              <NButton
                size="tiny"
                type="primary"
                quaternary
                :disabled="!hashResults[algo]"
                @click="handleCopy(algo)"
              >
                复制
              </NButton>
            </div>
            <div class="text-xs text-gray-300 font-mono break-all">
              {{ hashResults[algo] || '—' }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
