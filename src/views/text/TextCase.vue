<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NButton, NIcon, NSpace } from 'naive-ui'
import { AddOutline, RemoveOutline, TextOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { notifySuccess, notifyError } from '../../composables/useNotification'

const inputText = ref('')
const outputText = ref('')

const canConvert = computed(() => inputText.value.length > 0)

const toUpperCase = () => {
  if (!canConvert.value) return
  outputText.value = inputText.value.toUpperCase()
  notifySuccess('转换完成', '已转换为全大写')
}

const toLowerCase = () => {
  if (!canConvert.value) return
  outputText.value = inputText.value.toLowerCase()
  notifySuccess('转换完成', '已转换为全小写')
}

const capitalizeFirst = () => {
  if (!canConvert.value) return
  outputText.value = inputText.value.replace(/\b\w/g, char => char.toUpperCase())
  notifySuccess('转换完成', '已转换为首字母大写')
}

const toggleCase = () => {
  if (!canConvert.value) return
  let result = ''
  for (const char of inputText.value) {
    if (char === char.toUpperCase()) {
      result += char.toLowerCase()
    } else {
      result += char.toUpperCase()
    }
  }
  outputText.value = result
  notifySuccess('转换完成', '已反转大小写')
}

const handleCopy = async () => {
  if (!outputText.value) return
  try {
    await navigator.clipboard.writeText(outputText.value)
    notifySuccess('复制成功', '结果已复制到剪贴板')
  } catch (e) {
    notifyError('复制失败', (e as Error).message)
  }
}

const handleClear = () => {
  inputText.value = ''
  outputText.value = ''
}

const handleDownload = async () => {
  if (!outputText.value) return
  try {
    const blob = new Blob([outputText.value], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'converted.txt'
    a.click()
    URL.revokeObjectURL(url)
    notifySuccess('下载成功', '文件已保存')
  } catch (e) {
    notifyError('下载失败', (e as Error).message)
  }
}
</script>

<template>
  <ToolLayout title="大小写转换" description="对文本进行大小写转换操作">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <div class="flex flex-wrap gap-2">
          <NButton type="primary" size="small" :disabled="!canConvert" @click="toUpperCase">
            <template #icon>
              <NIcon><AddOutline /></NIcon>
            </template>
            全大写
          </NButton>
          <NButton type="primary" size="small" :disabled="!canConvert" @click="toLowerCase">
            <template #icon>
              <NIcon><RemoveOutline /></NIcon>
            </template>
            全小写
          </NButton>
          <NButton size="small" :disabled="!canConvert" @click="capitalizeFirst">
            <template #icon>
              <NIcon><TextOutline /></NIcon>
            </template>
            首字母大写
          </NButton>
          <NButton size="small" :disabled="!canConvert" @click="toggleCase">
            反转大小写
          </NButton>
        </div>
        <div class="flex justify-between items-center">
          <div class="text-sm text-gray-400">输入文本</div>
          <NButton size="small" @click="handleClear">清空</NButton>
        </div>
        <NInput
          v-model:value="inputText"
          type="textarea"
          placeholder="在此输入或粘贴文本..."
          class="flex-1"
          style="min-height: 200px;"
        />
      </div>
    </template>

    <template #output>
      <div class="h-full flex flex-col">
        <ActionBar
          :showCopy="true"
          :showDownload="true"
          :showClear="true"
          :copyDisabled="!outputText"
          :downloadDisabled="!outputText"
          @copy="handleCopy"
          @download="handleDownload"
          @clear="outputText = ''"
        />
        <div class="mt-4 flex-1 flex flex-col min-h-0">
          <div class="text-sm text-gray-400 mb-2">转换结果</div>
          <NInput
            :value="outputText"
            type="textarea"
            placeholder="转换结果将显示在这里..."
            readonly
            class="flex-1"
            style="min-height: 200px;"
          />
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
