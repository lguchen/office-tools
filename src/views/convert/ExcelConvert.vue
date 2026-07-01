<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton, NIcon, NUpload, NUploadDragger, NFormItem, NForm, NSelect, NSpace, NTag } from 'naive-ui'
import { CreateOutline } from '@vicons/ionicons5'
import ToolLayout from '../../components/common/ToolLayout.vue'
import ActionBar from '../../components/common/ActionBar.vue'
import { useNotification } from 'naive-ui'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import * as XLSX from 'xlsx'

const notification = useNotification()

const inputFile = ref<File | null>(null)
const fileName = ref('')
const convertDirection = ref<'xlsx_to_csv' | 'csv_to_xlsx'>('xlsx_to_csv')
const outputText = ref('')
const outputData = ref<any[]>([])
const isProcessing = ref(false)
const sheetName = ref('')

const canConvert = computed(() => inputFile.value !== null)

const handleFileUpload = async (options: any) => {
  const file = options.file.file as File
  inputFile.value = file
  fileName.value = file.name
  outputText.value = ''
  outputData.value = []

  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    convertDirection.value = 'xlsx_to_csv'
  } else if (name.endsWith('.csv')) {
    convertDirection.value = 'csv_to_xlsx'
  }
}

const handleConvert = async () => {
  if (!canConvert.value || !inputFile.value) return
  isProcessing.value = true
  try {
    const buffer = await inputFile.value.arrayBuffer()
    const data = new Uint8Array(buffer)

    if (convertDirection.value === 'xlsx_to_csv') {
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.SheetNames[0]
      sheetName.value = firstSheet
      const worksheet = workbook.Sheets[firstSheet]
      const csv = XLSX.utils.sheet_to_csv(worksheet)
      outputText.value = csv
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      outputData.value = jsonData.slice(0, 20)
      notification.success({ title: '转换成功', content: 'Excel已转换为CSV' })
    } else {
      const text = await inputFile.value.text()
      const worksheet = XLSX.utils.aoa_to_sheet(
        text.split('\n').map(row => row.split(','))
      )
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      outputText.value = `转换成功，共 ${worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']).e.r + 1 : 0} 行`
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      outputData.value = jsonData.slice(0, 20)
      notification.success({ title: '转换成功', content: 'CSV已转换为Excel' })
    }
  } catch (e) {
    notification.error({ title: '转换失败', content: (e as Error).message })
  } finally {
    isProcessing.value = false
  }
}

const handleDownload = async () => {
  if (!outputText.value && outputData.value.length === 0) return
  try {
    if (convertDirection.value === 'xlsx_to_csv') {
      const defaultName = fileName.value.replace(/\.[^.]+$/, '') + '.csv'
      const savePath = await save({
        defaultPath: defaultName,
        filters: [{ name: 'CSV', extensions: ['csv'] }]
      })
      if (savePath) {
        const encoder = new TextEncoder()
        await writeFile(savePath, encoder.encode('\uFEFF' + outputText.value))
        notification.success({ title: '保存成功', content: 'CSV文件已保存' })
      }
    } else {
      if (!inputFile.value) return
      const buffer = await inputFile.value.arrayBuffer()
      const data = new Uint8Array(buffer)
      const text = new TextDecoder().decode(data)
      const worksheet = XLSX.utils.aoa_to_sheet(
        text.split('\n').map(row => row.split(','))
      )
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })

      const defaultName = fileName.value.replace(/\.[^.]+$/, '') + '.xlsx'
      const savePath = await save({
        defaultPath: defaultName,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }]
      })
      if (savePath) {
        await writeFile(savePath, new Uint8Array(excelBuffer))
        notification.success({ title: '保存成功', content: 'Excel文件已保存' })
      }
    }
  } catch (e) {
    notification.error({ title: '保存失败', content: (e as Error).message })
  }
}

const handleCopy = async () => {
  if (!outputText.value) return
  try {
    await navigator.clipboard.writeText(outputText.value)
    notification.success({ title: '复制成功', content: 'CSV内容已复制' })
  } catch (e) {
    notification.error({ title: '复制失败', content: (e as Error).message })
  }
}

const handleClear = () => {
  inputFile.value = null
  fileName.value = ''
  outputText.value = ''
  outputData.value = []
  sheetName.value = ''
}
</script>

<template>
  <ToolLayout title="Excel转换" description="Excel与CSV格式互转">
    <template #input>
      <div class="space-y-4 h-full flex flex-col">
        <NForm label-placement="left" label-width="100px">
          <NFormItem label="转换方向">
            <NSelect
              v-model:value="convertDirection"
              :options="[
                { label: 'Excel → CSV', value: 'xlsx_to_csv' },
                { label: 'CSV → Excel', value: 'csv_to_xlsx' }
              ]"
              style="width: 180px;"
            />
          </NFormItem>
        </NForm>

        <div class="flex gap-2">
          <NButton type="primary" :disabled="!canConvert" :loading="isProcessing" @click="handleConvert">
            <template #icon>
              <NIcon><GridOutline /></NIcon>
            </template>
            开始转换
          </NButton>
          <NButton @click="handleClear">清空</NButton>
        </div>

        <NUpload
          :show-file-list="false"
          :custom-request="handleFileUpload"
          accept=".xlsx,.xls,.csv"
        >
          <NUploadDragger>
            <div class="py-6">
              <div class="text-3xl mb-2">📊</div>
              <div v-if="fileName" class="text-blue-400">{{ fileName }}</div>
              <div v-else class="text-gray-400">点击或拖拽文件到此处</div>
              <div class="text-sm text-gray-500 mt-2">支持 .xlsx .xls .csv</div>
            </div>
          </NUploadDragger>
        </NUpload>

        <div v-if="outputData.length > 0" class="flex-1 min-h-0 flex flex-col">
          <div class="text-sm text-gray-400 mb-2">数据预览（前20行）</div>
          <div class="flex-1 overflow-auto bg-gray-800 rounded-lg p-2">
            <table class="w-full text-xs">
              <thead class="text-left text-gray-400">
                <tr>
                  <th v-for="(_, key) in outputData[0]" :key="key" class="px-2 py-1 border-b border-gray-700">
                    {{ key }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in outputData" :key="idx" class="border-b border-gray-700/50">
                  <td v-for="(val, key) in row" :key="key" class="px-2 py-1 truncate max-w-32">
                    {{ String(val) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <template #output>
      <div class="h-full flex flex-col">
        <ActionBar
          :showCopy="convertDirection === 'xlsx_to_csv'"
          :showDownload="true"
          :showClear="true"
          :copyDisabled="!outputText"
          :downloadDisabled="!outputText && outputData.length === 0"
          @copy="handleCopy"
          @download="handleDownload"
          @clear="outputText = ''; outputData = []"
        />
        <div v-if="outputText && convertDirection === 'xlsx_to_csv'" class="mt-4 flex-1 flex flex-col min-h-0">
          <div class="text-sm text-gray-400 mb-2">
            CSV内容
            <NTag v-if="sheetName" size="small" type="info" class="ml-2">Sheet: {{ sheetName }}</NTag>
          </div>
          <textarea
            :value="outputText"
            readonly
            class="flex-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm font-mono resize-none"
            style="min-height: 200px;"
          />
        </div>
        <div v-else class="mt-4 flex-1 flex items-center justify-center text-gray-500">
          转换结果将显示在这里
        </div>
      </div>
    </template>
  </ToolLayout>
</template>
