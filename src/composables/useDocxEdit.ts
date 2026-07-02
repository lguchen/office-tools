import JSZip from 'jszip'
import mammoth from 'mammoth'

/**
 * 加载 docx 文件为 JSZip 实例
 */
export async function loadDocx(arrayBuffer: ArrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer)
  return zip
}

/**
 * 读取 word/document.xml 内容
 */
export async function getDocumentXml(zip: JSZip): Promise<string> {
  const file = zip.file('word/document.xml')
  if (!file) throw new Error('word/document.xml not found in docx')
  return await file.async('string')
}

/**
 * 将修改后的 XML 写回 zip 并生成新的 ArrayBuffer
 */
export async function saveDocx(zip: JSZip, documentXml: string): Promise<ArrayBuffer> {
  zip.file('word/document.xml', documentXml)
  const result = await zip.generateAsync({ type: 'arraybuffer' })
  return result
}

/**
 * 用 mammoth 提取 docx 纯文本
 */
export async function extractText(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

/**
 * 用 mammoth 提取 docx 为 HTML
 */
export async function extractHtml(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.convertToHtml({ arrayBuffer })
  return result.value
}

/**
 * 修改 sectPr 中的页面大小和页边距
 */
export function modifySectionProperties(
  documentXml: string,
  options: {
    pageSize?: { width: number; height: number; orientation?: 'portrait' | 'landscape' }
    margins?: { top: number; right: number; bottom: number; left: number; header?: number; footer?: number }
  }
): string {
  let xml = documentXml

  // 页面大小
  if (options.pageSize) {
    const orient = options.pageSize.orientation === 'landscape' ? ' w:orient="landscape"' : ''
    const pgSzRegex = /<w:pgSz[^>]*\/?>/
    const newPgSz = `<w:pgSz w:w="${options.pageSize.width}" w:h="${options.pageSize.height}"${orient}/>`
    if (pgSzRegex.test(xml)) {
      xml = xml.replace(pgSzRegex, newPgSz)
    } else {
      // 在 sectPr 开头插入
      xml = xml.replace(/<w:sectPr[^>]*>/, (match) => match + newPgSz)
    }
  }

  // 页边距
  if (options.margins) {
    const m = options.margins
    const pgMarRegex = /<w:pgMar[^>]*\/?>/
    const headerVal = m.header ?? 850
    const footerVal = m.footer ?? 850
    const newPgMar = `<w:pgMar w:top="${m.top}" w:right="${m.right}" w:bottom="${m.bottom}" w:left="${m.left}" w:header="${headerVal}" w:footer="${footerVal}" w:gutter="0"/>`
    if (pgMarRegex.test(xml)) {
      xml = xml.replace(pgMarRegex, newPgMar)
    } else {
      xml = xml.replace(/<w:sectPr[^>]*>/, (match) => match + newPgMar)
    }
  }

  return xml
}

/**
 * 解析文档中的所有书签
 */
export function parseBookmarks(documentXml: string): { name: string; id: string }[] {
  const bookmarks: { name: string; id: string }[] = []
  const regex = /<w:bookmarkStart\s+w:id="(\d+)"\s+w:name="([^"]*)"[^>]*\/?>/g
  let match
  while ((match = regex.exec(documentXml)) !== null) {
    bookmarks.push({ id: match[1], name: match[2] })
  }
  return bookmarks
}

/**
 * 删除指定书签
 */
export function removeBookmark(documentXml: string, bookmarkName: string): string {
  // 删除 bookmarkStart
  const startRegex = new RegExp(
    `<w:bookmarkStart\\s+w:id="(\\d+)"\\s+w:name="${bookmarkName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*/?>`,
    'g'
  )
  const startMatch = startRegex.exec(documentXml)
  if (!startMatch) return documentXml

  const bookmarkId = startMatch[1]
  let xml = documentXml.replace(startRegex, '')

  // 删除对应的 bookmarkEnd
  const endRegex = new RegExp(`<w:bookmarkEnd\\s+w:id="${bookmarkId}"[^>]*/?>`, 'g')
  xml = xml.replace(endRegex, '')

  return xml
}

/**
 * 重命名书签
 */
export function renameBookmark(documentXml: string, oldName: string, newName: string): string {
  const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(
    `(<w:bookmarkStart\\s+w:id="\\d+"\\s+w:name=")${escaped}(")`,
    'g'
  )
  return documentXml.replace(regex, `$1${newName}$2`)
}

/**
 * 批量修改文档中所有 run 的字体和字号
 */
export function modifyTextStyles(
  documentXml: string,
  options: {
    fontName?: string
    fontSize?: number // 半磅为单位，如 24 = 12pt
  }
): string {
  let xml = documentXml

  if (options.fontName) {
    // 修改已有 rFonts
    const rFontsRegex = /<w:rFonts\s+[^>]*\/?>/g
    const newRFonts = `<w:rFonts w:ascii="${options.fontName}" w:hAnsi="${options.fontName}" w:cs="${options.fontName}" w:eastAsia="${options.fontName}"/>`
    xml = xml.replace(rFontsRegex, newRFonts)

    // 在没有 rFonts 的 rPr 中添加
    xml = xml.replace(/<w:rPr>(?!.*w:rFonts)/g, (match) => {
      return match + newRFonts
    })
  }

  if (options.fontSize) {
    // 修改已有 sz
    const szRegex = /<w:sz\s+w:val="\d+"[^>]*\/?>/g
    const szCsRegex = /<w:szCs\s+w:val="\d+"[^>]*\/?>/g
    const newSz = `<w:sz w:val="${options.fontSize}"/>`
    const newSzCs = `<w:szCs w:val="${options.fontSize}"/>`
    xml = xml.replace(szRegex, newSz)
    xml = xml.replace(szCsRegex, newSzCs)
  }

  return xml
}

/**
 * 修改文档默认样式（styles.xml 中的默认字体和字号）
 */
export async function modifyDefaultStyles(
  zip: JSZip,
  options: { fontName?: string; fontSize?: number }
): Promise<void> {
  const stylesFile = zip.file('word/styles.xml')
  if (!stylesFile) return

  let stylesXml = await stylesFile.async('string')

  if (options.fontName) {
    // 修改 docDefaults 中的默认字体
    const rFontsRegex = /<w:rFonts\s+[^>]*\/?>/g
    const newRFonts = `<w:rFonts w:ascii="${options.fontName}" w:hAnsi="${options.fontName}" w:cs="${options.fontName}" w:eastAsia="${options.fontName}"/>`
    // 只替换 docDefaults 中的 rFonts
    const docDefaultsRegex = /(<w:docDefaults>[\s\S]*?<w:rPr>)([\s\S]*?)(<\/w:rPr>)/
    const match = docDefaultsRegex.exec(stylesXml)
    if (match) {
      let rprContent = match[2]
      if (rFontsRegex.test(rprContent)) {
        rprContent = rprContent.replace(rFontsRegex, newRFonts)
      } else {
        rprContent = newRFonts + rprContent
      }
      stylesXml = stylesXml.replace(docDefaultsRegex, `$1${rprContent}$3`)
    }
  }

  if (options.fontSize) {
    const szRegex = /<w:sz\s+w:val="\d+"[^>]*\/?>/g
    const szCsRegex = /<w:szCs\s+w:val="\d+"[^>]*\/?>/g
    const newSz = `<w:sz w:val="${options.fontSize}"/>`
    const newSzCs = `<w:szCs w:val="${options.fontSize}"/>`
    stylesXml = stylesXml.replace(szRegex, newSz)
    stylesXml = stylesXml.replace(szCsRegex, newSzCs)
  }

  zip.file('word/styles.xml', stylesXml)
}
