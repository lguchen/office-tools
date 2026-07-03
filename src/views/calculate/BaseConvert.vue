<script setup lang="ts">
import { ref, watch } from 'vue'
import { NInput, NButton, NIcon, NFormItem, NForm, NGrid, NGi } from 'naive-ui'
import { SwapHorizontalOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import { notifySuccess, notifyError } from '../../composables/useNotification'

const inputValue = ref('')
const fromBase = ref(10)
const results = ref<Record<number, string>>({})

const bases = [2, 8, 10, 16]

const convert = () => {
  if (!inputValue.value.trim()) {
    results.value = {}
    return
  }

  try {
    let decimal: number

    if (fromBase.value === 10) {
      decimal = parseFloat(inputValue.value.trim())
      if (isNaN(decimal)) throw new Error('无效的十进制数字')
    } else {
      const clean = inputValue.value.trim().replace(/^0[xob]/i, '')
      decimal = parseInt(clean, fromBase.value)
      if (isNaN(decimal)) throw new Error(`无效的${fromBase.value}进制数字`)
    }

    const newResults: Record<number, string> = {}
    for (const base of bases) {
      if (base === 10) {
        newResults[base] = String(decimal)
      } else {
        newResults[base] = decimal.toString(base).toUpperCase()
      }
    }
    results.value = newResults
  } catch (e) {
    notifyError('转换失败', (e as Error).message)
  }
}

const handleInput = () => {
  convert()
}

const copyResult = async (base: number) => {
  const value = results.value[base]
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    notifySuccess('复制成功', `${base}进制结果已复制`)
  } catch (e) {
    notifyError('复制失败', (e as Error).message)
  }
}

const baseLabels: Record<number, string> = {
  2: '二进制 (Binary)',
  8: '八进制 (Octal)',
  10: '十进制 (Decimal)',
  16: '十六进制 (Hex)'
}
</script>

<template>
  <ToolLayout title="进制转换" description="2/8/10/16进制互相转换">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NForm label-placement="left" label-width="100px">
          <NFormItem label="输入进制">
            <div class="flex gap-2 flex-wrap">
              <NButton
                v-for="base in bases"
                :key="base"
                :type="fromBase === base ? 'primary' : 'default'"
                @click="fromBase = base"
              >
                {{ base }}进制
              </NButton>
            </div>
          </NFormItem>
        </NForm>

        <div class="text-sm text-gray-400">输入数字</div>
        <NInput
          v-model:value="inputValue"
          :placeholder="`输入${fromBase}进制数字...`"
          size="large"
          @input="handleInput"
          clearable
        />

        <div class="text-xs text-gray-500 mt-2">
          提示: 输入后自动转换，支持小数（仅十进制）
        </div>

        <div class="flex-1"></div>
      </div>
    </template>

    <template #output>
      <div class="space-y-4">
        <div class="text-lg font-semibold text-blue-400">转换结果</div>

        <NGrid :cols="1" :y-gap="12">
          <NGi v-for="base in bases" :key="base">
            <div
              class="p-4 bg-gray-800 rounded-lg border"
              :class="base === fromBase ? 'border-blue-500' : 'border-gray-700'"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-blue-400">
                  {{ baseLabels[base] }}
                </span>
                <NButton
                  size="tiny"
                  quaternary
                  :disabled="!results[base]"
                  @click="copyResult(base)"
                >
                  复制
                </NButton>
              </div>
              <div class="text-xl font-mono text-white break-all">
                {{ results[base] || '—' }}
              </div>
            </div>
          </NGi>
        </NGrid>
      </div>
    </template>
  </ToolLayout>
</template>
