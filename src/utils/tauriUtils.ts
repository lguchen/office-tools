// 全局Tauri环境检测 & 工具函数
import { invoke } from '@tauri-apps/api/core'

let tauriAvailable: boolean | null = null

export function isTauri(): boolean {
  if (tauriAvailable !== null) return tauriAvailable
  try {
    tauriAvailable = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__
  } catch {
    tauriAvailable = false
  }
  return tauriAvailable
}

export interface FileInfo {
  name: string
  path: string
  size: number
  file?: File
}

export async function openFileDialog(options: {
  multiple?: boolean
  directory?: boolean
  filters?: { name: string; extensions: string[] }[]
  defaultPath?: string
} = {}): Promise<FileInfo[]> {
  if (!isTauri()) {
    // 浏览器环境回退
    return []
  }

  const { open } = await import('@tauri-apps/plugin-dialog')
  const result = await open({
    multiple: options.multiple ?? true,
    directory: options.directory ?? false,
    filters: options.filters,
    defaultPath: options.defaultPath
  })

  if (!result) return []

  const paths: string[] = Array.isArray(result) ? result : [result]
  const files: FileInfo[] = []

  for (const p of paths) {
    try {
      const { readBinaryFile, metadata } = await import('@tauri-apps/plugin-fs')
      const data = await readBinaryFile(p)
      const meta = await metadata(p)
      const name = p.split(/[\\/]/).pop() || p

      const blob = new Blob([data])
      const file = new File([blob], name, { type: getMimeType(name) })
      ;(file as any).path = p

      files.push({
        name,
        path: p,
        size: meta.size,
        file
      })
    } catch (e) {
      console.error('读取文件失败:', p, e)
    }
  }

  return files
}

export async function saveFileDialog(options: {
  defaultPath?: string
  filters?: { name: string; extensions: string[] }[]
} = {}): Promise<string | null> {
  if (!isTauri()) return null
  const { save } = await import('@tauri-apps/plugin-dialog')
  const result = await save({
    defaultPath: options.defaultPath,
    filters: options.filters
  })
  return result || null
}

export async function writeFile(path: string, data: Uint8Array | string): Promise<void> {
  if (!isTauri()) throw new Error('非Tauri环境')
  const { writeBinaryFile, writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs')
  if (typeof data === 'string') {
    await writeTextFile(path, data)
  } else {
    await writeBinaryFile(path, data)
  }
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    csv: 'text/csv',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    webp: 'image/webp',
    txt: 'text/plain'
  }
  return map[ext] || 'application/octet-stream'
}
