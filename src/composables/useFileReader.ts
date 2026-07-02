import { notifyError } from './useNotification'

export interface FileItem {
  name: string
  path: string
  size?: number
  file?: File
}

export function useFileReader() {

  const readFileFromPath = async (path: string): Promise<FileItem> => {
    const name = path.split(/[\\/]/).pop() || path
    let file: File | undefined
    let size: number | undefined

    try {
      const { readFile } = await import('@tauri-apps/plugin-fs')
      const data = await readFile(path)
      size = data.byteLength
      const ext = name.split('.').pop()?.toLowerCase() || ''
      const mimeMap: Record<string, string> = {
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'csv': 'text/csv',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'pdf': 'application/pdf',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'txt': 'text/plain',
        'md': 'text/markdown'
      }
      file = new File([data], name, { type: mimeMap[ext] || 'application/octet-stream' })
    } catch (e) {
      console.error('Failed to read file via Tauri:', e)
      notifyError('文件读取失败', `无法读取文件: ${name}`)
    }

    return { name, path, size, file }
  }

  const validateFile = (file: File, acceptTypes: string[]): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!acceptTypes.includes(ext)) {
      notifyError('文件类型错误', `不支持的文件类型: ${ext}`)
      return false
    }
    return true
  }

  return {
    readFileFromPath,
    validateFile
  }
}
