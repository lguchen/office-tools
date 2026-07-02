<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NButton, NIcon, NFormItem, NForm, NSelect, NSpace, NSlider } from 'naive-ui'
import { CreateOutline, CloudDownloadOutline, QrCodeOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useNotification } from 'naive-ui'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'

const notification = useNotification()

const inputText = ref('https://example.com')
const qrCodeSize = ref(256)
const errorLevel = ref<'L' | 'M' | 'Q' | 'H'>('M')
const outputDataUrl = ref('')
const isProcessing = ref(false)

const canGenerate = computed(() => inputText.value.trim().length > 0)

const handleGenerate = async () => {
  if (!canGenerate.value) return
  isProcessing.value = true
  try {
    const result = await invoke<number[]>('generate_qrcode', {
      content: inputText.value,
      size: qrCodeSize.value,
      errorLevel: errorLevel.value
    })
    const bytes = new Uint8Array(result)
    const blob = new Blob([bytes], { type: 'image/png' })
    outputDataUrl.value = URL.createObjectURL(blob)
    notification.success({ title: '生成成功', content: '二维码已生成' })
  } catch (e) {
    notification.error({ title: '生成失败', content: (e as Error).message })
  } finally {
    isProcessing.value = false
  }
}

const handleDownload = async () => {
  if (!outputDataUrl.value) return
  try {
    const savePath = await save({
      defaultPath: 'qrcode.png',
      filters: [{ name: 'PNG Image', extensions: ['png'] }]
    })
    if (savePath) {
      const response = await fetch(outputDataUrl.value)
      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()
      await writeFile(savePath, new Uint8Array(arrayBuffer))
      notification.success({ title: '保存成功', content: '二维码已保存' })
    }
  } catch (e) {
    notification.error({ title: '保存失败', content: (e as Error).message })
  }
}

const handleCopy = async () => {
  if (!outputDataUrl.value) return
  try {
    const response = await fetch(outputDataUrl.value)
    const blob = await response.blob()
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ])
    notification.success({ title: '复制成功', content: '二维码已复制到剪贴板' })
  } catch (e) {
    notification.error({ title: '复制失败', content: (e as Error).message })
  }
}

const handleClear = () => {
  inputText.value = ''
  outputDataUrl.value = ''
}
</script>

<template>
  <ToolLayout title="二维码生成" description="生成二维码图片，支持自定义尺寸和容错级别">
    <template #input>
      <div class="space-y-4">
        <NForm label-placement="left" label-width="100px">
          <NFormItem label="内容">
            <NInput
              v-model:value="inputText"
              type="textarea"
              placeholder="输入要生成二维码的文本或URL..."
              style="min-height: 100px;"
            />
          </NFormItem>
          <NFormItem label="尺寸">
            <div class="flex items-center gap-4 w-full" style="max-width: 300px;">
              <NSlider
                v-model:value="qrCodeSize"
                :min="128"
                :max="512"
                :step="32"
                style="flex: 1;"
              />
              <span class="text-sm text-gray-400 w-16 text-right">{{ qrCodeSize }}px</span>
            </div>
          </NFormItem>
          <NFormItem label="容错级别">
            <NSelect
              v-model:value="errorLevel"
              :options="[
                { label: 'L - 低 (7%)', value: 'L' },
                { label: 'M - 中 (15%)', value: 'M' },
                { label: 'Q - 较高 (25%)', value: 'Q' },
                { label: 'H - 高 (30%)', value: 'H' }
              ]"
              style="width: 200px;"
            />
          </NFormItem>
        </NForm>

        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canGenerate" :loading="isProcessing" @click="handleGenerate">
            <template #icon>
              <NIcon><QrCodeOutline /></NIcon>
            </template>
            生成二维码
          </NButton>
          <NButton @click="handleClear">清空</NButton>
        </div>

        <div class="mt-4">
          <div class="text-sm text-gray-400 mb-2">快速输入</div>
          <div class="flex gap-2 flex-wrap">
            <NButton size="tiny" @click="inputText = 'https://'">网址</NButton>
            <NButton size="tiny" @click="inputText = 'mailto:'">邮箱</NButton>
            <NButton size="tiny" @click="inputText = 'tel:'">电话</NButton>
            <NButton size="tiny" @click="inputText = 'WIFI:T:WPA;S:;P:;;'">WiFi</NButton>
          </div>
        </div>
      </div>
    </template>

    <template #output>
      <div class="h-full flex flex-col">
        <ActionBar
          :showCopy="true"
          :showDownload="true"
          :showClear="true"
          :copyDisabled="!outputDataUrl"
          :downloadDisabled="!outputDataUrl"
          @copy="handleCopy"
          @download="handleDownload"
          @clear="outputDataUrl = ''"
        />
        <div v-if="outputDataUrl" class="mt-4 flex-1 flex flex-col items-center justify-center">
          <div class="bg-white p-4 rounded-lg shadow-lg">
            <img :src="outputDataUrl" class="w-64 h-64" />
          </div>
          <div class="mt-4 text-sm text-gray-400">
            {{ qrCodeSize }} × {{ qrCodeSize }} px
          </div>
        </div>
        <div v-else class="mt-4 flex-1 flex items-center justify-center text-gray-500">
          二维码将显示在这里
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
