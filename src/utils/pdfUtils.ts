import { PDFDocument } from 'pdf-lib'

export interface PDFFile {
  name: string
  path: string
  doc: any
  pageCount: number
}

// 读取PDF文件
export const readPDF = async (file: File): Promise<PDFFile> => {
  const buffer = await file.arrayBuffer()
  const doc = await PDFDocument.load(buffer)
  return {
    name: file.name,
    path: file.name,
    doc,
    pageCount: doc.getPageCount()
  }
}

// 合并多个PDF
export const mergePDFs = async (files: PDFFile[]): Promise<Uint8Array> => {
  const merged = await PDFDocument.create()
  for (const file of files) {
    const pages = await merged.copyPages(file.doc, file.doc.getPageIndices())
    pages.forEach((page) => merged.addPage(page))
  }
  return await merged.save()
}

// 拆分PDF（每页一个文件）
export const splitPDF = async (file: PDFFile): Promise<{ page: number; data: Uint8Array }[]> => {
  const result: { page: number; data: Uint8Array }[] = []
  for (let i = 0; i < file.pageCount; i++) {
    const newDoc = await PDFDocument.create()
    const [page] = await newDoc.copyPages(file.doc, [i])
    newDoc.addPage(page)
    result.push({ page: i + 1, data: await newDoc.save() })
  }
  return result
}

// 提取指定页面
export const extractPages = async (file: PDFFile, pageIndices: number[]): Promise<Uint8Array> => {
  const newDoc = await PDFDocument.create()
  const pages = await newDoc.copyPages(file.doc, pageIndices)
  pages.forEach((page) => newDoc.addPage(page))
  return await newDoc.save()
}

// 图片转PDF
export const imagesToPDF = async (imageFiles: File[]): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create()

  for (const imgFile of imageFiles) {
    const buffer = await imgFile.arrayBuffer()
    let image: any
    if (imgFile.name.toLowerCase().endsWith('.png')) {
      image = await pdfDoc.embedPng(buffer)
    } else {
      image = await pdfDoc.embedJpg(buffer)
    }

    const page = pdfDoc.addPage([image.width, image.height])
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height
    })
  }

  return await pdfDoc.save()
}

// 下载PDF
export const downloadPDF = (data: Uint8Array, filename: string) => {
  const blob = new Blob([data as any], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// PDF压缩（ponytail: 简单版本只重建文档，真正压缩需要更复杂的算法）
export const compressPDF = async (file: PDFFile): Promise<Uint8Array> => {
  return await file.doc.save({ useObjectStreams: true })
}
