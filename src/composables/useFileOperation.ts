import { ref } from 'vue'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readFile, writeFile } from '@tauri-apps/plugin-fs'

export function useFileOperation() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const openFile = async (filters?: { name: string; extensions: string[] }[]) => {
    try {
      const selected = await open({
        multiple: false,
        filters: filters || [{ name: 'All Files', extensions: ['*'] }]
      })
      return selected as string | null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    }
  }

  const openFiles = async (filters?: { name: string; extensions: string[] }[]) => {
    try {
      const selected = await open({
        multiple: true,
        filters: filters || [{ name: 'All Files', extensions: ['*'] }]
      })
      return selected as string[] | null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    }
  }

  const saveFile = async (defaultPath?: string, filters?: { name: string; extensions: string[] }[]) => {
    try {
      const selected = await save({
        defaultPath,
        filters: filters || [{ name: 'All Files', extensions: ['*'] }]
      })
      return selected as string | null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    }
  }

  const readTextFile = async (path: string): Promise<string | null> => {
    try {
      isLoading.value = true
      const content = await readFile(path)
      const decoder = new TextDecoder('utf-8')
      return decoder.decode(content)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  const writeTextFile = async (path: string, content: string): Promise<boolean> => {
    try {
      isLoading.value = true
      const encoder = new TextEncoder()
      await writeFile(path, encoder.encode(content))
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  const readBinaryFile = async (path: string): Promise<Uint8Array | null> => {
    try {
      isLoading.value = true
      return await readFile(path)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  const writeBinaryFile = async (path: string, content: Uint8Array): Promise<boolean> => {
    try {
      isLoading.value = true
      await writeFile(path, content)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    openFile,
    openFiles,
    saveFile,
    readTextFile,
    writeTextFile,
    readBinaryFile,
    writeBinaryFile
  }
}
