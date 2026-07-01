<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NInput, NButton, NIcon, NFormItem, NForm, NSelect, NSpace, NCard, NGrid, NGi } from 'naive-ui'
import { TextOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import { useNotification } from 'naive-ui'

const notification = useNotification()

const timestampInput = ref('')
const timestampUnit = ref<'s' | 'ms'>('s')
const dateInput = ref('')
const timeInput = ref('')

const timestampToDate = () => {
  if (!timestampInput.value) return
  try {
    let ts = parseFloat(timestampInput.value)
    if (isNaN(ts)) throw new Error('无效的时间戳')
    if (timestampUnit.value === 's') ts *= 1000
    const date = new Date(ts)
    if (isNaN(date.getTime())) throw new Error('无效的时间戳')
    dateInput.value = formatDate(date)
    timeInput.value = formatTime(date)
    notification.success({ title: '转换成功', content: '时间戳已转换为日期' })
  } catch (e) {
    notification.error({ title: '转换失败', content: (e as Error).message })
  }
}

const dateToTimestamp = () => {
  if (!dateInput.value) return
  try {
    const dateStr = timeInput.value
      ? `${dateInput.value}T${timeInput.value}`
      : dateInput.value
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) throw new Error('无效的日期')
    const ts = timestampUnit.value === 's'
      ? Math.floor(date.getTime() / 1000)
      : date.getTime()
    timestampInput.value = String(ts)
    notification.success({ title: '转换成功', content: '日期已转换为时间戳' })
  } catch (e) {
    notification.error({ title: '转换失败', content: (e as Error).message })
  }
}

const formatDate = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatTime = (date: Date): string => {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

const currentTimestamp = () => {
  const now = Date.now()
  timestampInput.value = timestampUnit.value === 's'
    ? String(Math.floor(now / 1000))
    : String(now)
  const date = new Date(now)
  dateInput.value = formatDate(date)
  timeInput.value = formatTime(date)
}

const commonTimestamps = computed(() => {
  const now = Date.now()
  const unit = timestampUnit.value
  return [
    { label: '当前时间', value: unit === 's' ? Math.floor(now / 1000) : now },
    { label: '今天开始', value: unit === 's'
        ? Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
        : new Date().setHours(0, 0, 0, 0) },
    { label: '本周开始', value: unit === 's'
        ? Math.floor(new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).setHours(0, 0, 0, 0) / 1000)
        : new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).setHours(0, 0, 0, 0) },
    { label: '本月开始', value: unit === 's'
        ? Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() },
  ]
})

const copyTimestamp = async (value: number) => {
  try {
    await navigator.clipboard.writeText(String(value))
    notification.success({ title: '复制成功', content: '时间戳已复制' })
  } catch (e) {
    notification.error({ title: '复制失败', content: (e as Error).message })
  }
}
</script>

<template>
  <ToolLayout title="时间戳转换" description="Unix时间戳与日期时间互相转换">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NForm label-placement="left" label-width="100px">
          <NFormItem label="时间戳单位">
            <NSelect
              v-model:value="timestampUnit"
              :options="[
                { label: '秒 (s)', value: 's' },
                { label: '毫秒 (ms)', value: 'ms' }
              ]"
              style="width: 150px;"
            />
          </NFormItem>
        </NForm>

        <NCard size="small" title="时间戳 → 日期">
          <div class="space-y-3">
            <div class="flex gap-2">
              <NInput
                v-model:value="timestampInput"
                placeholder="输入时间戳"
                clearable
              />
              <NButton type="primary" @click="timestampToDate">转换</NButton>
            </div>
            <div class="flex gap-2 flex-wrap">
              <NButton size="tiny" @click="currentTimestamp">当前时间</NButton>
            </div>
          </div>
        </NCard>

        <NCard size="small" title="日期 → 时间戳">
          <div class="space-y-3">
            <div class="flex gap-2">
              <NInput
                v-model:value="dateInput"
                placeholder="YYYY-MM-DD"
              />
              <NInput
                v-model:value="timeInput"
                placeholder="HH:mm:ss"
              />
            </div>
            <NButton type="success" @click="dateToTimestamp">转换为时间戳</NButton>
          </div>
        </NCard>

        <div class="flex-1"></div>
      </div>
    </template>

    <template #output>
      <div class="space-y-4">
        <div class="text-lg font-semibold text-blue-400">常用时间戳</div>
        <NGrid :cols="1" :y-gap="8">
          <NGi v-for="item in commonTimestamps" :key="item.label">
            <NCard size="small" class="hover:border-blue-500 transition-colors">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm text-gray-400">{{ item.label }}</div>
                  <div class="text-lg font-mono text-blue-400">{{ item.value }}</div>
                </div>
                <NButton size="tiny" @click="copyTimestamp(item.value)">复制</NButton>
              </div>
            </NCard>
          </NGi>
        </NGrid>

        <NCard size="small" title="转换结果">
          <div v-if="dateInput && timeInput" class="space-y-2">
            <div class="text-2xl font-bold text-green-400">
              {{ dateInput }} {{ timeInput }}
            </div>
            <div v-if="timestampInput" class="text-sm text-gray-400">
              时间戳: {{ timestampInput }} {{ timestampUnit === 's' ? '秒' : '毫秒' }}
            </div>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            输入时间戳或日期进行转换
          </div>
        </NCard>
      </div>
    </template>
  </ToolLayout>
</template>
