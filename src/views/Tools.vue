<script setup lang="ts">
import { ref } from 'vue'
import { useTaskStore } from '@/stores/task'

const taskStore = useTaskStore()
const currentTab = ref('rename')

const tabs = [
  { key: 'rename', name: '批量重命名', icon: '📝' },
  { key: 'encoding', name: '编码转换', icon: '🔤' },
  { key: 'search', name: '文件检索', icon: '🔍' }
]

// 批量重命名
interface RenameItem {
  oldName: string
  newName: string
  path: string
}

const renameItems = ref<RenameItem[]>([])
const renameConfig = ref({
  mode: 'number' as 'number' | 'prefix' | 'suffix' | 'replace',
  prefix: '',
  suffix: '',
  startNum: 1,
  numLength: 3,
  search: '',
  replace: ''
})

const updateRenamePreview = () => {
  // ponytail: 预览功能需要实际文件，这里简化
}

const handleRenameFiles = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  renameItems.value = Array.from(input.files).map((f) => ({
    oldName: f.name,
    newName: f.name,
    path: f.name
  }))
  generateNewNames()
  input.value = ''
}

const generateNewNames = () => {
  const cfg = renameConfig.value
  renameItems.value = renameItems.value.map((item, idx) => {
    const extIndex = item.oldName.lastIndexOf('.')
    const name = extIndex > 0 ? item.oldName.slice(0, extIndex) : item.oldName
    const ext = extIndex > 0 ? item.oldName.slice(extIndex) : ''

    let newName = name
    switch (cfg.mode) {
      case 'number':
        const num = (cfg.startNum + idx).toString().padStart(cfg.numLength, '0')
        newName = `${cfg.prefix}${num}${cfg.suffix}`
        break
      case 'prefix':
        newName = `${cfg.prefix}${name}`
        break
      case 'suffix':
        newName = `${name}${cfg.suffix}`
        break
      case 'replace':
        newName = name.split(cfg.search).join(cfg.replace)
        break
    }

    return { ...item, newName: newName + ext }
  })
}

const doRename = async () => {
  if (renameItems.value.length === 0) return
  // ponytail: 纯前端环境无法重命名本地文件，Tauri环境通过Rust调用
  if (window.__TAURI_INTERNALS__) {
    taskStore.addLog('info', '开始批量重命名...')
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const results = await invoke('batch_rename', {
        files: renameItems.value.map((item) => [item.path, item.newName])
      })
      taskStore.addLog('success', '重命名完成')
    } catch (e: any) {
      taskStore.addLog('error', '重命名失败：' + e.message)
    }
  } else {
    taskStore.addLog('warning', '浏览器环境下无法修改本地文件，请在Tauri中运行')
  }
}

// 编码转换
const encodingFiles = ref<File[]>([])
const encodingConfig = ref({
  from: 'auto' as string,
  to: 'utf8' as string
})

const handleEncodingFiles = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  encodingFiles.value = Array.from(input.files)
  input.value = ''
}

const doEncodingConvert = async () => {
  if (encodingFiles.value.length === 0) return
  taskStore.addLog('info', '开始编码转换...')
  // ponytail: 前端通过Blob下载实现转换，真实文件转换走Tauri
  for (const file of encodingFiles.value) {
    const text = await file.text()
    let blob: Blob
    if (encodingConfig.value.to === 'utf8-bom') {
      blob = new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' })
    } else {
      blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  }
  taskStore.addLog('success', `转换完成，共 ${encodingFiles.value.length} 个文件`)
}

// 文件检索
const searchConfig = ref({
  extensions: 'xlsx,xls,csv,docx,pdf',
  keyword: ''
})
const searchResults = ref<{ name: string; path: string; size: number; ext: string }[]>([])
const isSearching = ref(false)

const selectFolder = async () => {
  // ponytail: Tauri环境调用Rust扫描，浏览器环境下提示
  if (window.__TAURI_INTERNALS__) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({ directory: true, multiple: false })
      if (selected) {
        isSearching.value = true
        const { invoke } = await import('@tauri-apps/api/core')
        const exts = searchConfig.value.extensions.split(',').map((e) => e.trim().toLowerCase())
        const results = await invoke('scan_files', { dir: selected, extensions: exts }) as any[]
        if (searchConfig.value.keyword) {
          searchResults.value = results.filter((r) =>
            r.name.toLowerCase().includes(searchConfig.value.keyword.toLowerCase())
          )
        } else {
          searchResults.value = results
        }
        isSearching.value = false
        taskStore.addLog('success', `找到 ${searchResults.value.length} 个文件`)
      }
    } catch (e: any) {
      isSearching.value = false
      taskStore.addLog('error', '检索失败：' + e.message)
    }
  } else {
    taskStore.addLog('warning', '浏览器环境下无法扫描本地文件夹，请在Tauri中运行')
  }
}
</script>

<template>
  <div>
    <div style="margin-bottom: 16px;">
      <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">🛠 通用工具</h2>
      <p style="color: var(--text-secondary); font-size: 13px;">批量重命名、编码转换、文件检索</p>
    </div>

    <div style="display: flex; gap: 4px; margin-bottom: 16px;">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        :style="{
          padding: '8px 14px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          background: currentTab === tab.key ? 'var(--primary-color)' : 'var(--bg-secondary)',
          color: currentTab === tab.key ? 'white' : 'var(--text-secondary)',
          transition: 'all 0.15s'
        }"
        @click="currentTab = tab.key"
      >
        {{ tab.icon }} {{ tab.name }}
      </div>
    </div>

    <!-- 批量重命名 -->
    <template v-if="currentTab === 'rename'">
      <div style="display: flex; gap: 16px;">
        <div style="flex: 1;">
          <div class="card" style="padding: 16px; margin-bottom: 12px;">
            <div style="font-weight: 500; margin-bottom: 12px; font-size: 14px;">⚙ 重命名配置</div>
            <div class="form-row">
              <label class="form-label">命名方式</label>
              <select v-model="renameConfig.mode" @change="generateNewNames" class="form-input" style="flex:1;">
                <option value="number">序号命名</option>
                <option value="prefix">追加前缀</option>
                <option value="suffix">追加后缀</option>
                <option value="replace">替换文件名</option>
              </select>
            </div>
            <template v-if="renameConfig.mode === 'number'">
              <div class="form-row">
                <label class="form-label">前缀</label>
                <input type="text" v-model="renameConfig.prefix" @input="generateNewNames" class="form-input" style="flex:1;" placeholder="例：文件_" />
              </div>
              <div class="form-row">
                <label class="form-label">起始序号</label>
                <input type="number" v-model.number="renameConfig.startNum" @input="generateNewNames" class="form-input" style="flex:1;" min="1" />
              </div>
              <div class="form-row">
                <label class="form-label">序号位数</label>
                <input type="number" v-model.number="renameConfig.numLength" @input="generateNewNames" class="form-input" style="flex:1;" min="1" max="10" />
              </div>
            </template>
            <template v-if="renameConfig.mode === 'prefix'">
              <div class="form-row">
                <label class="form-label">前缀内容</label>
                <input type="text" v-model="renameConfig.prefix" @input="generateNewNames" class="form-input" style="flex:1;" />
              </div>
            </template>
            <template v-if="renameConfig.mode === 'suffix'">
              <div class="form-row">
                <label class="form-label">后缀内容</label>
                <input type="text" v-model="renameConfig.suffix" @input="generateNewNames" class="form-input" style="flex:1;" />
              </div>
            </template>
            <template v-if="renameConfig.mode === 'replace'">
              <div class="form-row">
                <label class="form-label">查找</label>
                <input type="text" v-model="renameConfig.search" @input="generateNewNames" class="form-input" style="flex:1;" />
              </div>
              <div class="form-row">
                <label class="form-label">替换为</label>
                <input type="text" v-model="renameConfig.replace" @input="generateNewNames" class="form-input" style="flex:1;" />
              </div>
            </template>
          </div>

          <div class="card" style="padding: 12px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-weight: 500; font-size: 14px;">📁 文件列表 ({{ renameItems.length }})</span>
              <button class="btn" style="font-size: 12px; padding: 4px 10px;" @click="($refs.renameInput as HTMLInputElement)?.click()">
                添加文件
              </button>
              <input ref="renameInput" type="file" multiple style="display:none;" @change="handleRenameFiles" />
            </div>
            <div v-if="renameItems.length === 0" style="text-align:center; color:var(--text-tertiary); padding:20px 0; font-size:13px;">
              点击添加文件
            </div>
            <div v-else style="max-height: 280px; overflow-y: auto;">
              <div v-for="(item, idx) in renameItems" :key="idx" class="file-item">
                <span style="font-size: 12px; color: var(--text-tertiary); width: 30px;">{{ idx + 1 }}</span>
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ item.oldName }}</span>
                <span style="color: var(--text-tertiary); margin: 0 8px;">→</span>
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--primary-color);">{{ item.newName }}</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 16px;">
            <button class="btn btn-primary" @click="doRename" :disabled="renameItems.length === 0">
              开始重命名
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- 编码转换 -->
    <template v-if="currentTab === 'encoding'">
      <div style="display: flex; gap: 16px;">
        <div style="flex: 1;">
          <div class="card" style="padding: 16px; margin-bottom: 12px;">
            <div style="font-weight: 500; margin-bottom: 12px; font-size: 14px;">⚙ 转换配置</div>
            <div class="form-row">
              <label class="form-label">源编码</label>
              <select v-model="encodingConfig.from" class="form-input" style="flex:1;">
                <option value="auto">自动检测</option>
                <option value="utf8">UTF-8</option>
                <option value="gbk">GBK/GB2312</option>
                <option value="utf8-bom">UTF-8 BOM</option>
              </select>
            </div>
            <div class="form-row">
              <label class="form-label">目标编码</label>
              <select v-model="encodingConfig.to" class="form-input" style="flex:1;">
                <option value="utf8">UTF-8</option>
                <option value="utf8-bom">UTF-8 BOM</option>
                <option value="gbk">GBK</option>
              </select>
            </div>
            <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 8px;">
              支持 TXT、CSV 等文本文件的编码转换，解决乱码问题
            </div>
          </div>

          <div class="card" style="padding: 12px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-weight: 500; font-size: 14px;">📄 文件列表 ({{ encodingFiles.length }})</span>
              <button class="btn" style="font-size: 12px; padding: 4px 10px;" @click="($refs.encInput as HTMLInputElement)?.click()">
                添加文件
              </button>
              <input ref="encInput" type="file" multiple accept=".txt,.csv" style="display:none;" @change="handleEncodingFiles" />
            </div>
            <div v-if="encodingFiles.length === 0" style="text-align:center; color:var(--text-tertiary); padding:20px 0; font-size:13px;">
              点击添加文件
            </div>
            <div v-else style="max-height: 280px; overflow-y: auto;">
              <div v-for="(file, idx) in encodingFiles" :key="idx" class="file-item">
                <span>📄</span>
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ file.name }}</span>
                <span style="font-size: 12px; color: var(--text-tertiary);">{{ (file.size / 1024).toFixed(1) }} KB</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 16px;">
            <button class="btn btn-primary" @click="doEncodingConvert" :disabled="encodingFiles.length === 0">
              开始转换
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- 文件检索 -->
    <template v-if="currentTab === 'search'">
      <div class="card" style="padding: 16px; margin-bottom: 12px;">
        <div style="font-weight: 500; margin-bottom: 12px; font-size: 14px;">⚙ 检索配置</div>
        <div class="form-row">
          <label class="form-label">文件类型</label>
          <input type="text" v-model="searchConfig.extensions" class="form-input" style="flex:1;" placeholder="用逗号分隔，如：xlsx,docx,pdf" />
        </div>
        <div class="form-row">
          <label class="form-label">关键词</label>
          <input type="text" v-model="searchConfig.keyword" class="form-input" style="flex:1;" placeholder="文件名包含关键词，留空则全部" />
        </div>
        <button class="btn btn-primary" @click="selectFolder">
          选择文件夹开始检索
        </button>
      </div>

      <div class="card" style="padding: 12px 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-weight: 500; font-size: 14px;">🔍 检索结果 ({{ searchResults.length }})</span>
        </div>
        <div v-if="isSearching" style="text-align:center; color:var(--text-tertiary); padding:20px 0; font-size:13px;">
          正在检索...
        </div>
        <div v-else-if="searchResults.length === 0" style="text-align:center; color:var(--text-tertiary); padding:20px 0; font-size:13px;">
          暂无结果
        </div>
        <div v-else style="max-height: 400px; overflow-y: auto;">
          <div v-for="(file, idx) in searchResults" :key="idx" class="file-item">
            <span>📁</span>
            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ file.name }}</span>
            <span style="font-size: 12px; color: var(--text-tertiary);">{{ (file.size / 1024).toFixed(1) }} KB</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
