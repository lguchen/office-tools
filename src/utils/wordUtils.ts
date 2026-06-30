import mammoth from 'mammoth'

export interface WordFile {
  name: string
  path: string
  html: string
  text: string
}

export interface MergeOptions {
  pageBreak: boolean
}

export interface FormatOptions {
  fontFamily: string
  fontSize: number
  lineHeight: number
  paragraphSpacing: number
}

// 读取Word文档
export const readWord = async (file: File): Promise<WordFile> => {
  const buffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
  const textResult = await mammoth.extractRawText({ arrayBuffer: buffer })
  return {
    name: file.name,
    path: file.name,
    html: result.value,
    text: textResult.value
  }
}

// 提取纯文本
export const extractText = (file: WordFile): string => {
  return file.text
}

// 提取图片（从HTML中解析img标签）
export const extractImages = (file: WordFile): { src: string; index: number }[] => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(file.html, 'text/html')
  const imgs = doc.querySelectorAll('img')
  const result: { src: string; index: number }[] = []
  imgs.forEach((img, idx) => {
    const src = img.getAttribute('src')
    if (src) {
      result.push({ src, index: idx + 1 })
    }
  })
  return result
}

// 提取表格（从HTML中解析table标签）
export const extractTables = (file: WordFile): string[][][] => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(file.html, 'text/html')
  const tables = doc.querySelectorAll('table')
  const result: string[][][] = []

  tables.forEach((table) => {
    const rows: string[][] = []
    const trs = table.querySelectorAll('tr')
    trs.forEach((tr) => {
      const cells: string[] = []
      const tds = tr.querySelectorAll('td, th')
      tds.forEach((td) => {
        cells.push(td.textContent?.trim() || '')
      })
      if (cells.length > 0) rows.push(cells)
    })
    if (rows.length > 0) result.push(rows)
  })

  return result
}

// 批量替换文字
export const replaceText = (file: WordFile, search: string, replace: string, useRegex: boolean): string => {
  if (useRegex) {
    const regex = new RegExp(search, 'g')
    return file.text.replace(regex, replace)
  }
  return file.text.split(search).join(replace)
}

// 删除空段落、清除多余空格
export const cleanText = (file: WordFile): string => {
  let text = file.text
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.replace(/[ \t]+/g, ' ')
  text = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0).join('\n\n')
  return text
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

// 下载图片
export const downloadImage = (dataUrl: string, filename: string) => {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

// 合并多个Word文档为纯文本（ponytail: 纯文本合并简单可靠，保留完整docx格式需要更复杂的库）
export const mergeWordFiles = (files: WordFile[], options: MergeOptions): string => {
  return files.map((f) => f.text).join(options.pageBreak ? '\n\n--- 分页 ---\n\n' : '\n\n')
}

// 按分页符拆分
export const splitByPageBreak = (file: WordFile): string[] => {
  const parts = file.text.split(/\n\s*\n/)
  return parts.filter((p) => p.trim().length > 0)
}

// 模拟docx转pdf（ponytail: 前端通过打印实现，真实转换需要后端或额外库）
export const wordToPdf = (file: WordFile) => {
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head><title>${file.name}</title></head>
        <body style="font-family: 'Microsoft YaHei', sans-serif; padding: 40px; line-height: 1.8;">
          <pre style="white-space: pre-wrap; font-family: inherit;">${file.text}</pre>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }
}
