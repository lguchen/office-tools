import * as XLSX from 'xlsx'

export interface ExcelFile {
  name: string
  path: string
  data: XLSX.WorkBook
  sheetNames: string[]
}

export interface MergeOptions {
  skipEmpty: boolean
  removeDuplicate: boolean
}

export interface SplitOptions {
  mode: 'sheet' | 'column'
  columnIndex?: number
  sheetIndex?: number
}

export interface CleanOptions {
  removeEmptyRows: boolean
  removeEmptyCols: boolean
  removeDuplicateRows: boolean
  trimCells: boolean
}

// 读取Excel文件
export const readExcel = async (file: File): Promise<ExcelFile> => {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  return {
    name: file.name,
    path: file.name,
    data: workbook,
    sheetNames: workbook.SheetNames
  }
}

// 多个Excel合并
export const mergeExcelFiles = (files: ExcelFile[], options: MergeOptions): XLSX.WorkBook => {
  const result = XLSX.utils.book_new()
  const allRows: any[][] = []
  let headerWritten = false

  for (const file of files) {
    for (const sheetName of file.sheetNames) {
      const sheet = file.data.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })

      if (rows.length === 0) continue

      if (!headerWritten) {
        allRows.push(rows[0])
        headerWritten = true
      }

      const startIdx = options.removeDuplicate ? 1 : 1
      for (let i = startIdx; i < rows.length; i++) {
        const row = rows[i]
        if (options.skipEmpty && row.every((cell) => cell === undefined || cell === null || cell === '')) {
          continue
        }
        allRows.push(row)
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(allRows)
  XLSX.utils.book_append_sheet(result, ws, '合并结果')
  return result
}

// 按工作表拆分
export const splitBySheet = (file: ExcelFile): { name: string; data: XLSX.WorkBook }[] => {
  const result: { name: string; data: XLSX.WorkBook }[] = []
  for (const sheetName of file.sheetNames) {
    const wb = XLSX.utils.book_new()
    const ws = file.data.Sheets[sheetName]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 })), sheetName)
    result.push({ name: sheetName, data: wb })
  }
  return result
}

// 按列内容拆分
export const splitByColumn = (file: ExcelFile, sheetIndex: number, colIndex: number): Map<string, XLSX.WorkBook> => {
  const sheetName = file.sheetNames[sheetIndex]
  const sheet = file.data.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })

  const groups = new Map<string, any[][]>()
  const header = rows[0] || []

  for (let i = 1; i < rows.length; i++) {
    const key = String(rows[i][colIndex] ?? '未分类')
    if (!groups.has(key)) {
      groups.set(key, [header])
    }
    groups.get(key)!.push(rows[i])
  }

  const result = new Map<string, XLSX.WorkBook>()
  groups.forEach((data, key) => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    result.set(key, wb)
  })

  return result
}

// 数据清洗
export const cleanExcelData = (file: ExcelFile, options: CleanOptions): XLSX.WorkBook => {
  const result = XLSX.utils.book_new()

  for (const sheetName of file.sheetNames) {
    const sheet = file.data.Sheets[sheetName]
    let rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })

    if (options.trimCells) {
      rows = rows.map((row) =>
        row.map((cell) => (typeof cell === 'string' ? cell.trim() : cell))
      )
    }

    if (options.removeEmptyRows) {
      rows = rows.filter((row) => !row.every((cell) => cell === undefined || cell === null || cell === ''))
    }

    if (options.removeEmptyCols) {
      const maxCols = Math.max(...rows.map((r) => r.length), 0)
      const keepCols: number[] = []
      for (let c = 0; c < maxCols; c++) {
        const hasData = rows.some((row) => row[c] !== undefined && row[c] !== null && row[c] !== '')
        if (hasData) keepCols.push(c)
      }
      rows = rows.map((row) => keepCols.map((c) => row[c]))
    }

    if (options.removeDuplicateRows) {
      const seen = new Set<string>()
      rows = rows.filter((row) => {
        const key = JSON.stringify(row)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(result, ws, sheetName)
  }

  return result
}

// 内容替换
export const replaceContent = (
  file: ExcelFile,
  search: string,
  replace: string,
  useRegex: boolean
): XLSX.WorkBook => {
  const result = XLSX.utils.book_new()
  const regex = useRegex ? new RegExp(search, 'g') : null

  for (const sheetName of file.sheetNames) {
    const sheet = file.data.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })

    const newRows = rows.map((row) =>
      row.map((cell) => {
        if (typeof cell !== 'string') return cell
        if (useRegex && regex) {
          return cell.replace(regex, replace)
        }
        return cell.split(search).join(replace)
      })
    )

    const ws = XLSX.utils.aoa_to_sheet(newRows)
    XLSX.utils.book_append_sheet(result, ws, sheetName)
  }

  return result
}

// xlsx转csv
export const excelToCsv = (file: ExcelFile, sheetIndex: number = 0): string => {
  const sheetName = file.sheetNames[sheetIndex]
  const sheet = file.data.Sheets[sheetName]
  return XLSX.utils.sheet_to_csv(sheet)
}

// csv转xlsx
export const csvToExcel = (csvContent: string, fileName: string): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(
    csvContent.split('\n').map((line) => line.split(','))
  )
  XLSX.utils.book_append_sheet(wb, ws, fileName.replace(/\.[^.]+$/, ''))
  return wb
}

// 导出为文件（前端Blob方式）
export const workbookToBlob = (wb: XLSX.WorkBook, format: 'xlsx' | 'csv' = 'xlsx'): Blob => {
  const wbout = XLSX.write(wb, { bookType: format, type: 'array' })
  return new Blob([wbout], { type: 'application/octet-stream' })
}

// 下载文件
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// 获取工作表预览数据
export const getSheetPreview = (file: ExcelFile, sheetIndex: number, maxRows: number = 50): any[][] => {
  const sheetName = file.sheetNames[sheetIndex]
  const sheet = file.data.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })
  return rows.slice(0, maxRows)
}
