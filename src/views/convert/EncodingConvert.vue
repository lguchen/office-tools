<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NIcon, NUpload, NUploadDragger, NFormItem, NForm, NSelect, NSpace } from 'naive-ui'
import { CloudDownloadOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useNotification } from 'naive-ui'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile, readFile } from '@tauri-apps/plugin-fs'

const notification = useNotification()

const inputFile = ref<File | null>(null)
const fileName = ref('')
const inputText = ref('')
const outputText = ref('')
const fromEncoding = ref('GBK')
const toEncoding = ref('UTF-8')
const mode = ref<'text' | 'file'>('text')
const isProcessing = ref(false)

const encodings = ['UTF-8', 'GBK', 'GB2312', 'BIG5', 'UTF-16', 'Shift_JIS', 'EUC-KR', 'ISO-8859-1']

const canConvert = computed(() => {
  if (mode.value === 'text') return inputText.value.length > 0
  return inputFile.value !== null
})

const handleConvert = async () => {
  if (!canConvert.value) return
  isProcessing.value = true
  try {
    if (mode.value === 'text') {
      const result = await invoke<string>('convert_encoding_text', {
        text: inputText.value,
        fromEnc: fromEncoding.value,
        toEnc: toEncoding.value
      })
      outputText.value = result
      notification.success({ title: '转换成功', content: `已从 ${fromEncoding.value} 转换为 ${toEncoding.value}` })
    } else {
      if (!inputFile.value) return
      const arrayBuffer = await inputFile.value.arrayBuffer()
      const data = Array.from(new Uint8Array(arrayBuffer))
      const result = await invoke<number[]>('convert_encoding_data', {
        data,
        fromEnc: fromEncoding.value,
        toEnc: toEncoding.value
      })
      const bytes = new Uint8Array(result)
      const decoder = new TextDecoder(toEncoding.value === 'GBK' ? 'gbk' : toEncoding.value.toLowerCase())
      outputText.value = decoder.decode(bytes)
      notification.success({ title: '转换成功', content: `文件编码已从 ${fromEncoding.value} 转换为 ${toEncoding.value}` })
    }
  } catch (e) {
    notification.error({ title: '转换失败', content: (e as Error).message })
  } finally {
    isProcessing.value = false
  }
}

const handleFileUpload = (options: any) => {
  const file = options.file.file as File
  inputFile.value = file
  fileName.value = file.name
  outputText.value = ''
}

const handleCopy = async () => {
  if (!outputText.value) return
  try {
    await navigator.clipboard.writeText(outputText.value)
    notification.success({ title: '复制成功', content: '结果已复制到剪贴板' })
  } catch (e) {
    notification.error({ title: '复制失败', content: (e as Error).message })
  }
}

const handleDownload = async () => {
  if (!outputText.value && mode.value === 'text') return
  try {
    if (mode.value === 'text') {
      const defaultName = 'converted.txt'
      const savePath = await save({
        defaultPath: defaultName,
        filters: [{ name: 'Text', extensions: ['txt'] }]
      })
      if (savePath) {
        const result = await invoke<number[]>('convert_encoding_data', {
          data: Array.from(new TextEncoder().encode(outputText.value)),
          fromEnc: 'UTF-8',
          toEnc: toEncoding.value
        })
        await writeFile(savePath, new Uint8Array(result))
        notification.success({ title: '保存成功', content: '文件已保存' })
      }
    } else {
      if (!inputFile.value) return
      const arrayBuffer = await inputFile.value.arrayBuffer()
      const data = Array.from(new Uint8Array(arrayBuffer))
      const result = await invoke<number[]>('convert_encoding_data', {
        data,
        fromEnc: fromEncoding.value,
        toEnc: toEncoding.value
      })
      const defaultName = fileName.value.replace(/\.[^.]+$/, '') + `_${toEncoding.value}.txt`
      const savePath = await save({
        defaultPath: defaultName,
        filters: [{ name: 'Text', extensions: ['txt'] }]
      })
      if (savePath) {
        await writeFile(savePath, new Uint8Array(result))
        notification.success({ title: '保存成功', content: '文件已保存' })
      }
    }
  } catch (e) {
    notification.error({ title: '保存失败', content: (e as Error).message })
  }
}

const handleClear = () => {
  inputFile.value = null
  fileName.value = ''
  inputText.value = ''
  outputText.value = ''
}

const swapEncodings = () => {
  const temp = fromEncoding.value
  fromEncoding.value = toEncoding.value
  toEncoding.value = temp
}
</script>

<template>
  <ToolLayout title="编码转换" description="文本文件编码互转，支持GBK/UTF-8等">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NForm label-placement="left" label-width="100px" inline>
          <NFormItem label="模式">
            <div class="flex gap-2">
              <NButton
                size="small"
                :type="mode === 'text' ? 'primary' : 'default'"
                @click="mode = 'text'; handleClear()"
              >
                文本
              </NButton>
              <NButton
                size="small"
                :type="mode === 'file' ? 'primary' : 'default'"
                @click="mode = 'file'; handleClear()"
              >
                文件
              </NButton>
            </div>
          </NFormItem>
        </NForm>

        <NForm label-placement="left" label-width="100px">
          <NFormItem label="源编码">
            <NSelect
              v-model:value="fromEncoding"
              :options="encodings.map(e => ({ label: e, value: e }))"
              style="width: 150px;"
            />
          </NFormItem>
          <NFormItem label="目标编码">
            <div class="flex items-center gap-2">
              <NSelect
                v-model:value="toEncoding"
                :options="encodings.map(e => ({ label: e, value: e }))"
                style="width: 150px;"
              />
              <NButton quaternary size="small" @click="swapEncodings">
                <NIcon><CodeDownloadOutline /></NIcon>
              </NButton>
            </div>
          </NFormItem>
        </NForm>

        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canConvert" :loading="isProcessing" @click="handleConvert">
            开始转换
          </NButton>
          <NButton @click="handleClear">清空</NButton>
        </div>

        <div v-if="mode === 'text'" class="flex-1 flex flex-col min-h-0">
          <div class="text-sm text-gray-400 mb-2">输入文本</div>
          <NInput
            v-model:value="inputText"
            type="textarea"
            placeholder="在此输入文本..."
            class="flex-1 font-mono text-sm"
            style="min-height: 150px;"
          />
        </div>

        <NUpload
          v-else
          :show-file-list="false"
          :custom-request="handleFileUpload"
          accept=".txt,.csv,.md,.html,.json,.xml"
        >
          <NUploadDragger>
            <div class="py-6">
              <div class="text-3xl mb-2">📄</div>
              <div v-if="fileName" class="text-blue-400">{{ fileName }}</div>
              <div v-else class="text-gray-400">点击或拖拽文本文件到此处</div>
              <div class="text-sm text-gray-500 mt-2">支持 .txt .csv .md .html 等</div>
            </div>
          </NUploadDragger>
        </NUpload>
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
          <div class="text-sm text-gray-400 mb-2">转换结果 ({{ toEncoding }})</div>
          <NInput
            :value="outputText"
            type="textarea"
            placeholder="转换结果将显示在这里..."
            readonly
            class="flex-1 font-mono text-sm"
            style="min-height: 200px;"
          />
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
