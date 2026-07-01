<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NButton, NIcon, NRadioGroup, NRadio, NSwitch, NFormItem, NForm } from 'naive-ui'
import { SwapHorizontalOutline, RefreshOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useNotification } from 'naive-ui'

const notification = useNotification()

const inputText = ref('')
const outputText = ref('')
const searchText = ref('')
const replaceText = ref('')
const useRegex = ref(false)
const ignoreCase = ref(false)

const canReplace = computed(() => inputText.value && searchText.value)

const handleReplace = () => {
  if (!canReplace.value) return

  try {
    if (useRegex.value) {
      const flags = ignoreCase.value ? 'gi' : 'g'
      const regex = new RegExp(searchText.value, flags)
      outputText.value = inputText.value.replace(regex, replaceText.value)
    } else {
      if (ignoreCase.value) {
        let result = inputText.value
        const searchLower = searchText.value.toLowerCase()
        const replaceLower = replaceText.value
        let lastIndex = 0
        let index = result.toLowerCase().indexOf(searchLower, lastIndex)
        while (index !== -1) {
          result = result.substring(0, index) + replaceText.value + result.substring(index + searchText.value.length)
          lastIndex = index + replaceText.value.length
          index = result.toLowerCase().indexOf(searchLower, lastIndex)
        }
        outputText.value = result
      } else {
        outputText.value = inputText.value.split(searchText.value).join(replaceText.value)
      }
    }
    notification.success({ title: '替换成功', content: '文本已完成替换' })
  } catch (e) {
    notification.error({ title: '替换失败', content: (e as Error).message })
  }
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

const handleClear = () => {
  inputText.value = ''
  outputText.value = ''
  searchText.value = ''
  replaceText.value = ''
}

const handleSwap = () => {
  const temp = searchText.value
  searchText.value = replaceText.value
  replaceText.value = temp
}
</script>

<template>
  <ToolLayout title="文本替换" description="支持普通替换和正则表达式替换">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NForm label-placement="left" label-width="100px">
          <NFormItem label="查找内容">
            <div class="flex gap-2">
              <NInput
                v-model:value="searchText"
                placeholder="输入要查找的内容"
                clearable
              />
              <NButton quaternary @click="handleSwap">
                <NIcon><SwapOutline /></NIcon>
              </NButton>
            </div>
          </NFormItem>
          <NFormItem label="替换为">
            <NInput
              v-model:value="replaceText"
              placeholder="输入替换后的内容"
              clearable
            />
          </NFormItem>
          <NFormItem label="选项">
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <NSwitch v-model:value="useRegex" />
                <span class="text-sm">正则表达式</span>
              </div>
              <div class="flex items-center gap-2">
                <NSwitch v-model:value="ignoreCase" />
                <span class="text-sm">忽略大小写</span>
              </div>
            </div>
          </NFormItem>
        </NForm>
        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canReplace" @click="handleReplace">
            全部替换
          </NButton>
          <NButton @click="handleClear">
            <template #icon>
              <NIcon><RefreshOutline /></NIcon>
            </template>
            清空
          </NButton>
        </div>
        <div class="flex-1 flex flex-col min-h-0">
          <div class="text-sm text-gray-400 mb-2">输入文本</div>
          <NInput
            v-model:value="inputText"
            type="textarea"
            placeholder="在此输入或粘贴文本..."
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
            placeholder="替换结果将显示在这里..."
            readonly
            class="flex-1"
            style="min-height: 200px;"
          />
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
