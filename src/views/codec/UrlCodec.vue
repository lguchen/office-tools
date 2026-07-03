<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NButton, NIcon, NSwitch, NFormItem, NForm } from 'naive-ui'
import { SwapHorizontalOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { notifySuccess, notifyError } from '../../composables/useNotification'

const inputText = ref('')
const outputText = ref('')
const encodeAll = ref(false)

const canEncode = computed(() => inputText.value.length > 0)
const canDecode = computed(() => inputText.value.length > 0)

const handleEncode = () => {
  if (!canEncode.value) return
  try {
    if (encodeAll.value) {
      let result = ''
      for (let i = 0; i < inputText.value.length; i++) {
        result += '%' + inputText.value.charCodeAt(i).toString(16).padStart(2, '0').toUpperCase()
      }
      outputText.value = result
    } else {
      outputText.value = encodeURIComponent(inputText.value)
    }
    notifySuccess('编码成功', 'URL编码完成')
  } catch (e) {
    notifyError('编码失败', (e as Error).message)
  }
}

const handleDecode = () => {
  if (!canDecode.value) return
  try {
    outputText.value = decodeURIComponent(inputText.value)
    notifySuccess('解码成功', 'URL解码完成')
  } catch (e) {
    notifyError('解码失败', '输入的URL编码格式不正确')
  }
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
  <ToolLayout title="URL编解码" description="对URL进行编码和解码操作">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NForm label-placement="left" label-width="100px">
          <NFormItem label="选项">
            <div class="flex items-center gap-2">
              <NSwitch v-model:value="encodeAll" />
              <span class="text-sm">全部编码</span>
            </div>
          </NFormItem>
        </NForm>
        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canEncode" @click="handleEncode">
            编码
          </NButton>
          <NButton type="success" :disabled="!canDecode" @click="handleDecode">
            解码
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
            placeholder="在此输入URL或文本进行编解码..."
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
            placeholder="结果将显示在这里..."
            readonly
            class="flex-1"
            style="min-height: 200px;"
          />
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
