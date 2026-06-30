import Tesseract from 'tesseract.js'

export interface OCRResult {
  id: string
  fileName: string
  imageUrl: string
  text: string
  confidence: number
  status: 'pending' | 'processing' | 'done' | 'error'
  error?: string
  file?: File
}

let worker: Tesseract.Worker | null = null

// 初始化OCR Worker（中英双语）
export const initOCR = async (onProgress?: (progress: number) => void): Promise<Tesseract.Worker> => {
  if (worker) return worker

  worker = await Tesseract.createWorker(['chi_sim', 'eng'], 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(m.progress * 100)
      }
    }
  })

  return worker
}

// 识别单张图片
export const recognizeImage = async (
  image: File | string,
  onProgress?: (progress: number) => void
): Promise<{ text: string; confidence: number }> => {
  const w = await initOCR(onProgress)
  const { data } = await w.recognize(image)
  return {
    text: data.text || '',
    confidence: data.confidence || 0
  }
}

// 批量识别
export const recognizeBatch = async (
  files: File[],
  onItemProgress?: (index: number, progress: number) => void,
  onItemComplete?: (index: number, text: string, confidence: number) => void
): Promise<{ text: string; confidence: number }[]> => {
  const results: { text: string; confidence: number }[] = []

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await recognizeImage(files[i], (p) => {
        onItemProgress?.(i, p)
      })
      results.push(result)
      onItemComplete?.(i, result.text, result.confidence)
    } catch (e: any) {
      results.push({ text: '', confidence: 0 })
    }
  }

  return results
}

// 导出为TXT
export const exportToTxt = (results: OCRResult[], separator: string = '\n\n---\n\n'): string => {
  return results
    .filter((r) => r.status === 'done')
    .map((r) => `【${r.fileName}】\n${r.text}`)
    .join(separator)
}

// 导出为Excel（按行解析为表格）
export const exportToExcel = async (results: OCRResult[]): Promise<void> => {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  const allData: string[][] = []
  allData.push(['文件名', '识别内容', '置信度'])

  for (const r of results) {
    if (r.status === 'done') {
      const lines = r.text.split('\n').filter((l) => l.trim())
      if (lines.length === 0) {
        allData.push([r.fileName, '', r.confidence.toFixed(1) + '%'])
      } else {
        lines.forEach((line, idx) => {
          allData.push([idx === 0 ? r.fileName : '', line, idx === 0 ? r.confidence.toFixed(1) + '%' : ''])
        })
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(allData)
  XLSX.utils.book_append_sheet(wb, ws, 'OCR结果')

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'OCR识别结果.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

// 下载文本文件
export const downloadText = (text: string, filename: string) => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// 图片压缩预处理（ponytail: 简单缩放，提高识别速度）
export const preprocessImage = async (file: File, maxWidth: number = 2000): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let width = img.width
      let height = img.height
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(URL.createObjectURL(file))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// 释放资源
export const releaseOCR = async () => {
  if (worker) {
    await worker.terminate()
    worker = null
  }
}
