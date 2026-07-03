<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NButton, NIcon, NFormItem, NForm, NSelect } from 'naive-ui'
import { SwapHorizontalOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { notifySuccess, notifyError } from '../../composables/useNotification'

const inputText = ref('')
const outputText = ref('')
const convertMode = ref<'toUnicode' | 'fromUnicode'>('toUnicode')
const format = ref<'\\u' | '&#x' | 'U+'>('\\u')

const canConvert = computed(() => inputText.value.length > 0)

const handleConvert = () => {
  if (!canConvert.value) return
  try {
    if (convertMode.value === 'toUnicode') {
      outputText.value = textToUnicode(inputText.value, format.value)
    } else {
      outputText.value = unicodeToText(inputText.value)
    }
    notifySuccess('转换成功', 'Unicode转换完成')
  } catch (e) {
    notifyError('转换失败', (e as Error).message)
  }
}

const textToUnicode = (text: string, fmt: string): string => {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    const hex = code.toString(16).toUpperCase().padStart(4, '0')
    switch (fmt) {
      case '\\u':
        result += '\\u' + hex
        break
      case '&#x':
        result += '&#x' + hex + ';'
        break
      case 'U+':
        result += 'U+' + hex + ' '
        break
    }
  }
  return result
}

const unicodeToText = (text: string): string => {
  let result = text
  result = result.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  result = result.replace(/&#x([0-9a-fA-F]+);?/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  result = result.replace(/U\+([0-9a-fA-F]+)/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  return result
}

const handleSwap = () => {
  const temp = inputText.value
  inputText.value = outputText.value
  outputText.value = temp
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
</script>

<template>
  <ToolLayout title="Unicode转换" description="中文与Unicode编码互相转换">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NForm label-placement="left" label-width="100px">
          <NFormItem label="转换方向">
            <NSelect
              v-model:value="convertMode"
              :options="[
                { label: '文本 → Unicode', value: 'toUnicode' },
                { label: 'Unicode → 文本', value: 'fromUnicode' }
              ]"
              style="width: 200px;"
            />
          </NFormItem>
          <NFormItem v-if="convertMode === 'toUnicode'" label="输出格式">
            <NSelect
              v-model:value="format"
              :options="[
                { label: '\\\\uXXXX (JS风格)', value: '\\\\u' },
                { label: '&#xXXXX; (HTML实体)', value: '&#x' },
                { label: 'U+XXXX (标准格式)', value: 'U+' }
              ]"
              style="width: 220px;"
            />
          </NFormItem>
        </NForm>
        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canConvert" @click="handleConvert">
            转换
          </NButton>
          <NButton quaternary @click="handleSwap">
            <NIcon><SwapHorizontalOutline /></NIcon>
          </NButton>
          <NButton @click="handleClear">清空</NButton>
        </div>
        <div class="flex-1 flex flex-col min-h-0">
          <div class="text-sm text-gray-400 mb-2">输入文本</div>
          <NInput
            v-model:value="inputText"
            type="textarea"
            placeholder="在此输入文本或Unicode编码..."
            class="flex-1"
            style="min-height: 200px;"
          />
        </div>
      </div>
    </template>

    <template #output>
      <div class="h-full flex flex-col">
        <ActionBar
          :showCopy="true"
          :showDownload="false"
          :showClear="true"
          :copyDisabled="!outputText"
          @copy="handleCopy"
          @clear="outputText = ''"
        />
        <div class="mt-4 flex-1 flex flex-col min-h-0">
          <div class="text-sm text-gray-400 mb-2">输出结果</div>
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
