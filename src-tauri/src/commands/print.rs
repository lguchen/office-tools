// 打印相关命令
// 原生打印实现：Excel 使用 calamine 解析 + GDI 自绘打印，不依赖 LibreOffice
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::collections::HashMap;
use std::io::Cursor;
use std::time::{SystemTime, UNIX_EPOCH};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
use winapi::shared::windef::{HDC, HWND, RECT, HBITMAP};
#[cfg(target_os = "windows")]
use winapi::um::winspool::{
    OpenPrinterW, ClosePrinter, StartDocPrinterW, EndDocPrinter,
    StartPagePrinter, EndPagePrinter, WritePrinter,
    DOC_INFO_1W,
};
#[cfg(target_os = "windows")]
use winapi::um::wingdi::{
    CreateCompatibleDC, DeleteDC, CreateCompatibleBitmap,
    SelectObject, DeleteObject, BitBlt,
    SRCCOPY, TEXTMETRICW, GetTextMetricsW,
    Rectangle, MoveToEx, LineTo, TextOutW, SetBkMode,
    SetTextColor, SetTextAlign,
    TA_LEFT, TA_TOP, CreateDCW,
    CreateFontW,
};
#[cfg(target_os = "windows")]
use winapi::um::winuser::{GetDC, ReleaseDC};
#[cfg(target_os = "windows")]
use winapi::um::winbase::GlobalFree;
#[cfg(target_os = "windows")]
use winapi::shared::minwindef::{BOOL, DWORD, UINT, FALSE, TRUE, LPVOID};
#[cfg(target_os = "windows")]
use winapi::shared::ntdef::{LPCWSTR, LPWSTR, HANDLE};

#[cfg(target_os = "windows")]
#[repr(C)]
struct DocInfoW {
    cb_size: i32,
    lpsz_doc_name: LPCWSTR,
    lpsz_output: LPCWSTR,
    lpsz_datatype: LPCWSTR,
    fw_type: u32,
}

#[cfg(target_os = "windows")]
#[link(name = "gdi32")]
extern "system" {
    fn StartDocW(hdc: HDC, lpdi: *const DocInfoW) -> i32;
    fn Escape(
        hdc: HDC,
        n_escape: i32,
        cb_input: i32,
        lp_in_data: *const u8,
        lp_out_data: *mut u8,
    ) -> i32;
}

use calamine::{Reader, open_workbook_from_rs, Xlsx, Xls, Data};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};

static PRINT_CANCELLED: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkPrinter {
    pub id: String,
    pub name: String,
    pub address: String,
    pub location: Option<String>,
    pub online: bool,
    pub saved: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrinterInfo {
    pub name: String,
    pub is_network: bool,
    pub is_default: bool,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PrinterCache {
    printers: Vec<String>,
    printer_details: Vec<PrinterInfo>,
    network_printers: Vec<NetworkPrinter>,
    timestamp: u64,
}

fn get_config_dir() -> PathBuf {
    let mut path = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    path.push("config");
    let _ = fs::create_dir_all(&path);
    path
}

fn get_printer_cache_path() -> PathBuf {
    let mut path = get_config_dir();
    path.push("printer_cache.json");
    path
}

fn get_network_printers_path() -> PathBuf {
    let mut path = get_config_dir();
    path.push("network_printers.json");
    path
}

fn load_printer_cache() -> Option<PrinterCache> {
    let path = get_printer_cache_path();
    if let Ok(content) = fs::read_to_string(&path) {
        serde_json::from_str(&content).ok()
    } else {
        None
    }
}

fn save_printer_cache(cache: &PrinterCache) -> Result<(), String> {
    let path = get_printer_cache_path();
    let content = serde_json::to_string_pretty(cache).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

fn load_saved_printers() -> Vec<NetworkPrinter> {
    let path = get_network_printers_path();
    if let Ok(content) = fs::read_to_string(&path) {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    }
}

fn save_printers_to_file(printers: &[NetworkPrinter]) -> Result<(), String> {
    let path = get_network_printers_path();
    let content = serde_json::to_string_pretty(printers).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

fn timestamp_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

#[cfg(target_os = "windows")]
fn get_printers_wmic() -> Result<Vec<String>, String> {
    let output = Command::new("wmic")
        .args(&["printer", "get", "name"])
        .creation_flags(0x08000000)
        .output()
        .map_err(|e| format!("Failed to get printers: {}", e))?;

    let text = String::from_utf8_lossy(&output.stdout);
    let printers: Vec<String> = text
        .lines()
        .skip(1)
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();

    Ok(printers)
}

#[cfg(target_os = "windows")]
fn get_printer_details_wmic() -> Result<Vec<PrinterInfo>, String> {
    let output = Command::new("wmic")
        .args(&["printer", "get", "name,default,network,status", "/format:csv"])
        .creation_flags(0x08000000)
        .output()
        .map_err(|e| format!("Failed to get printer details: {}", e))?;

    let text = String::from_utf8_lossy(&output.stdout);
    let mut printers: Vec<PrinterInfo> = Vec::new();
    
    for (i, line) in text.lines().enumerate() {
        if i == 0 || line.trim().is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() >= 5 {
            let name = parts[1].trim().to_string();
            let is_network = parts[2].trim().eq_ignore_ascii_case("true");
            let is_default = parts[3].trim().eq_ignore_ascii_case("true");
            let status = parts[4].trim().to_string();
            printers.push(PrinterInfo {
                name,
                is_network,
                is_default,
                status,
            });
        }
    }

    Ok(printers)
}

#[cfg(target_os = "windows")]
fn fetch_network_printers() -> Result<Vec<NetworkPrinter>, String> {
    let details = get_printer_details_wmic()?;
    let saved = load_saved_printers();
    let saved_map: HashMap<String, NetworkPrinter> = saved
        .iter()
        .map(|p| (p.address.clone(), p.clone()))
        .collect();
    
    let mut printers: Vec<NetworkPrinter> = Vec::new();
    
    for printer in &details {
        if printer.is_network {
            let id = format!("net_{}", printer.name.replace("\\", "_").replace(" ", "_"));
            let address = printer.name.clone();
            
            let saved_printer = saved_map.get(&address);
            printers.push(NetworkPrinter {
                id,
                name: printer.name.clone(),
                address,
                location: None,
                online: true,
                saved: saved_printer.is_some(),
            });
        }
    }
    
    for saved_printer in saved {
        if !printers.iter().any(|p| p.address == saved_printer.address) {
            let mut p = saved_printer.clone();
            p.online = false;
            p.saved = true;
            printers.push(p);
        }
    }
    
    Ok(printers)
}

// ========== Windows GDI 打印引擎 ==========

#[cfg(target_os = "windows")]
fn to_wide_string(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

#[cfg(target_os = "windows")]
struct PrinterDC {
    hdc: HDC,
    font: HANDLE,
}

#[cfg(target_os = "windows")]
impl PrinterDC {
    fn new(printer_name: &str) -> Result<Self, String> {
        let name_wide = to_wide_string(printer_name);
        let driver_wide = to_wide_string("WINSPOOL");
        
        let hdc = unsafe {
            CreateDCW(
                driver_wide.as_ptr(),
                name_wide.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
            )
        };

        if hdc.is_null() {
            return Err(format!("Failed to create printer DC: {}", printer_name));
        }

        let font_name = to_wide_string("SimSun");
        let font_handle = unsafe {
            CreateFontW(
                16, 0, 0, 0, 400, 0, 0, 0, 1, 0, 0, 0, 0,
                font_name.as_ptr(),
            )
        };

        if font_handle.is_null() {
            unsafe { DeleteDC(hdc) };
            return Err("Failed to create font".to_string());
        }

        unsafe { SelectObject(hdc, font_handle as *mut _) };

        Ok(PrinterDC { hdc, font: font_handle as HANDLE })
    }

    fn start_doc(&self, doc_name: &str) -> Result<i32, String> {
        let doc_name_wide = to_wide_string(doc_name);
        let doc_info = DocInfoW {
            cb_size: std::mem::size_of::<DocInfoW>() as i32,
            lpsz_doc_name: doc_name_wide.as_ptr(),
            lpsz_output: std::ptr::null(),
            lpsz_datatype: std::ptr::null(),
            fw_type: 0,
        };

        let result = unsafe { StartDocW(self.hdc, &doc_info) };
        if result <= 0 {
            return Err("Failed to start print document".to_string());
        }

        Ok(result)
    }

    fn end_doc(&self) -> Result<(), String> {
        // ENDDOC = 11
        let result = unsafe { Escape(self.hdc, 11, 0, std::ptr::null(), std::ptr::null_mut()) };
        if result <= 0 {
            return Err("Failed to end print document".to_string());
        }
        Ok(())
    }

    fn start_page(&self) -> Result<(), String> {
        Ok(())
    }

    fn end_page(&self) -> Result<(), String> {
        // NEWFRAME = 1, ends current page and starts a new one
        let result = unsafe { Escape(self.hdc, 1, 0, std::ptr::null(), std::ptr::null_mut()) };
        if result <= 0 {
            return Err("Failed to end print page".to_string());
        }
        Ok(())
    }

    fn hdc(&self) -> HDC {
        self.hdc
    }
}

#[cfg(target_os = "windows")]
impl Drop for PrinterDC {
    fn drop(&mut self) {
        if !self.font.is_null() {
            unsafe { DeleteObject(self.font as *mut _) };
        }
        if !self.hdc.is_null() {
            unsafe { DeleteDC(self.hdc) };
        }
    }
}

// ========== Excel 解析与打印 ==========

fn parse_excel_sheets_from_data(data: &[u8], file_name: &str) -> Result<Vec<String>, String> {
    let ext = file_name.rsplit('.').next().unwrap_or("").to_lowercase();
    let cursor = Cursor::new(data);

    let sheet_names = match ext.as_str() {
        "xlsx" => {
            let mut workbook: Xlsx<_> = open_workbook_from_rs(cursor)
                .map_err(|e| format!("Failed to open Excel file: {}", e))?;
            workbook.sheet_names().to_vec()
        }
        "xls" => {
            let mut workbook: Xls<_> = open_workbook_from_rs(cursor)
                .map_err(|e| format!("Failed to open Excel file: {}", e))?;
            workbook.sheet_names().to_vec()
        }
        _ => return Err(format!("Unsupported Excel format: {}", ext)),
    };

    Ok(sheet_names)
}

struct SheetData {
    name: String,
    rows: Vec<Vec<String>>,
    col_widths: Vec<f64>,
}

fn read_excel_sheet_data(
    data: &[u8],
    file_name: &str,
    sheet_name: &str,
) -> Result<SheetData, String> {
    let ext = file_name.rsplit('.').next().unwrap_or("").to_lowercase();
    let cursor = Cursor::new(data);

    let (rows, max_cols) = match ext.as_str() {
        "xlsx" => {
            let mut workbook: Xlsx<_> = open_workbook_from_rs(cursor)
                .map_err(|e| format!("Failed to open Excel file: {}", e))?;
            let range = workbook.worksheet_range(sheet_name)
                .map_err(|e| format!("Failed to read sheet {}: {}", sheet_name, e))?;
            
            let mut rows: Vec<Vec<String>> = Vec::new();
            let mut max_cols = 0;
            
            for row in range.rows() {
                let row_data: Vec<String> = row.iter().map(|cell| {
                    match cell {
                        Data::String(s) => s.clone(),
                        Data::Float(f) => {
                            if f.fract() == 0.0 {
                                (*f as i64).to_string()
                            } else {
                                f.to_string()
                            }
                        }
                        Data::Int(i) => i.to_string(),
                        Data::Bool(b) => if *b { "TRUE".to_string() } else { "FALSE".to_string() },
                        _ => String::new(),
                    }
                }).collect();
                max_cols = max_cols.max(row_data.len());
                rows.push(row_data);
            }
            
            (rows, max_cols)
        }
        "xls" => {
            let mut workbook: Xls<_> = open_workbook_from_rs(cursor)
                .map_err(|e| format!("Failed to open Excel file: {}", e))?;
            let range = workbook.worksheet_range(sheet_name)
                .map_err(|e| format!("Failed to read sheet {}: {}", sheet_name, e))?;
            
            let mut rows: Vec<Vec<String>> = Vec::new();
            let mut max_cols = 0;
            
            for row in range.rows() {
                let row_data: Vec<String> = row.iter().map(|cell| {
                    match cell {
                        Data::String(s) => s.clone(),
                        Data::Float(f) => {
                            if f.fract() == 0.0 {
                                (*f as i64).to_string()
                            } else {
                                f.to_string()
                            }
                        }
                        Data::Int(i) => i.to_string(),
                        Data::Bool(b) => if *b { "TRUE".to_string() } else { "FALSE".to_string() },
                        _ => String::new(),
                    }
                }).collect();
                max_cols = max_cols.max(row_data.len());
                rows.push(row_data);
            }
            
            (rows, max_cols)
        }
        _ => return Err(format!("Unsupported Excel format: {}", ext)),
    };

    // 计算列宽（基于内容长度，估算）
    let mut col_widths = vec![80.0f64; max_cols];
    for row in &rows {
        for (i, cell) in row.iter().enumerate() {
            if i < max_cols {
                let len = cell.chars().count() as f64 * 7.0 + 10.0;
                if len > col_widths[i] {
                    col_widths[i] = len.min(300.0);
                }
            }
        }
    }

    Ok(SheetData {
        name: sheet_name.to_string(),
        rows,
        col_widths,
    })
}

#[cfg(target_os = "windows")]
fn print_excel_gdi(
    data: &[u8],
    file_name: &str,
    printer: Option<&str>,
    copies: i32,
    sheet_names: Option<&[String]>,
    print_area: Option<&PrintArea>,
) -> Result<bool, String> {
    let printer_name = match printer {
        Some(p) => p.to_string(),
        None => {
            let printers = get_printers_wmic()?;
            if printers.is_empty() {
                return Err("No printers found".to_string());
            }
            printers[0].clone()
        }
    };

    let all_sheets = parse_excel_sheets_from_data(data, file_name)?;
    let sheets_to_print: Vec<String> = match sheet_names {
        Some(names) if !names.is_empty() => {
            names.iter()
                .filter(|n| all_sheets.contains(n))
                .cloned()
                .collect()
        }
        _ => all_sheets.clone(),
    };

    if sheets_to_print.is_empty() {
        return Err("No sheets to print".to_string());
    }

    PRINT_CANCELLED.store(false, Ordering::SeqCst);

    for _copy in 0..copies {
        if PRINT_CANCELLED.load(Ordering::SeqCst) {
            break;
        }

        let printer_dc = PrinterDC::new(&printer_name)?;
        printer_dc.start_doc(file_name)?;

        let mut y_pos: i32 = 50;
        let page_height = 1050;
        let row_height = 25;
        let margin_left = 50;
        let mut is_first_page = true;
        let mut current_sheet_idx = 0;

        for sheet_name in &sheets_to_print {
            if PRINT_CANCELLED.load(Ordering::SeqCst) {
                break;
            }

            let sheet_data = match read_excel_sheet_data(data, file_name, sheet_name) {
                Ok(d) => d,
                Err(e) => {
                    eprintln!("Failed to read sheet {}: {}", sheet_name, e);
                    continue;
                }
            };

            if current_sheet_idx > 0 || !is_first_page {
                printer_dc.end_page()?;
                y_pos = 50;
            }
            is_first_page = false;
            current_sheet_idx += 1;

            let hdc = printer_dc.hdc();
            unsafe { SetBkMode(hdc, 1) };

            let title = format!("工作表：{}", sheet_data.name);
            let title_wide = to_wide_string(&title);
            unsafe {
                TextOutW(hdc, margin_left, y_pos, title_wide.as_ptr(), title.len() as i32);
            }
            y_pos += 35;

            let (start_row, end_row, start_col, end_col) = if let Some(area) = print_area {
                (area.start_row, area.end_row, area.start_col, area.end_col)
            } else {
                (0, sheet_data.rows.len() - 1, 0, sheet_data.col_widths.len() - 1)
            };

            let rows_to_print: Vec<&Vec<String>> = sheet_data.rows
                .iter()
                .enumerate()
                .filter(|(idx, _)| *idx >= start_row && *idx <= end_row)
                .map(|(_, row)| row)
                .collect();

            let cols_to_print: Vec<(usize, f64)> = sheet_data.col_widths
                .iter()
                .enumerate()
                .filter(|(idx, _)| *idx >= start_col && *idx <= end_col)
                .map(|(idx, &w)| (idx, w))
                .collect();

            if rows_to_print.is_empty() || cols_to_print.is_empty() {
                continue;
            }

            let total_width: f64 = cols_to_print.iter().map(|(_, w)| w).sum();
            let scale = if total_width > 750.0 { 750.0 / total_width } else { 1.0 };

            let mut x_pos = margin_left as f64;
            let header_row = rows_to_print[0];
            
            for (col_idx, col_width) in &cols_to_print {
                let w = col_width * scale;
                let cell_text = if *col_idx < header_row.len() {
                    &header_row[*col_idx]
                } else {
                    ""
                };
                
                unsafe {
                    let left = x_pos as i32;
                    let top = y_pos;
                    let right = (x_pos + w) as i32;
                    let bottom = y_pos + row_height;
                    
                    Rectangle(hdc, left, top, right, bottom);
                    
                    let text_wide = to_wide_string(cell_text);
                    TextOutW(
                        hdc,
                        left + 3,
                        top + 4,
                        text_wide.as_ptr(),
                        cell_text.len() as i32,
                    );
                }
                
                x_pos += w;
            }
            y_pos += row_height;

            for row in rows_to_print.iter().skip(1) {
                if PRINT_CANCELLED.load(Ordering::SeqCst) {
                    break;
                }

                if y_pos + row_height > page_height {
                    printer_dc.end_page()?;
                    y_pos = 50;
                }

                let mut x_pos = margin_left as f64;
                
                for (col_idx, col_width) in &cols_to_print {
                    let w = col_width * scale;
                    let cell_text = if *col_idx < row.len() {
                        &row[*col_idx]
                    } else {
                        ""
                    };
                    
                    unsafe {
                        let left = x_pos as i32;
                        let top = y_pos;
                        let right = (x_pos + w) as i32;
                        let bottom = y_pos + row_height;
                        
                        Rectangle(hdc, left, top, right, bottom);
                        
                        let text_wide = to_wide_string(cell_text);
                        TextOutW(
                            hdc,
                            left + 3,
                            top + 4,
                            text_wide.as_ptr(),
                            cell_text.len() as i32,
                        );
                    }
                    
                    x_pos += w;
                }
                y_pos += row_height;
            }
        }

        printer_dc.end_page()?;
        printer_dc.end_doc()?;
    }

    Ok(true)
}

#[cfg(not(target_os = "windows"))]
fn print_excel_gdi(
    _data: &[u8],
    _file_name: &str,
    _printer: Option<&str>,
    _copies: i32,
    _sheet_names: Option<&[String]>,
    _print_area: Option<&PrintArea>,
) -> Result<bool, String> {
    Err("Excel GDI printing is only supported on Windows".to_string())
}

// ========== 文本打印 ==========

#[cfg(target_os = "windows")]
fn print_text_gdi(
    data: &[u8],
    printer: Option<&str>,
    copies: i32,
    doc_name: &str,
) -> Result<bool, String> {
    let text = String::from_utf8_lossy(data).to_string();
    let lines: Vec<&str> = text.lines().collect();

    let printer_name = match printer {
        Some(p) => p.to_string(),
        None => {
            let printers = get_printers_wmic()?;
            if printers.is_empty() {
                return Err("No printers found".to_string());
            }
            printers[0].clone()
        }
    };

    PRINT_CANCELLED.store(false, Ordering::SeqCst);

    for _ in 0..copies {
        if PRINT_CANCELLED.load(Ordering::SeqCst) {
            break;
        }

        let printer_dc = PrinterDC::new(&printer_name)?;
        printer_dc.start_doc(doc_name)?;
        
        let hdc = printer_dc.hdc();
        unsafe { SetBkMode(hdc, 1) };

        let mut y_pos = 50;
        let line_height = 20;
        let lines_per_page = 50;

        for (i, line) in lines.iter().enumerate() {
            if PRINT_CANCELLED.load(Ordering::SeqCst) {
                break;
            }

            if i > 0 && i % lines_per_page == 0 {
                printer_dc.end_page()?;
                y_pos = 50;
            }

            let line_wide = to_wide_string(line);
            unsafe {
                TextOutW(hdc, 50, y_pos, line_wide.as_ptr(), line.len() as i32);
            }
            y_pos += line_height;
        }

        printer_dc.end_page()?;
        printer_dc.end_doc()?;
    }

    Ok(true)
}

#[cfg(not(target_os = "windows"))]
fn print_text_gdi(
    _data: &[u8],
    _printer: Option<&str>,
    _copies: i32,
    _doc_name: &str,
) -> Result<bool, String> {
    Err("Text GDI printing is only supported on Windows".to_string())
}

fn get_libreoffice_path() -> Result<PathBuf, String> {
    let app_path = std::env::current_exe().map_err(|e| format!("Failed to get executable path: {}", e))?;
    let app_dir = app_path.parent().unwrap_or(std::path::Path::new(".")).to_path_buf();

    let paths_to_try = [
        app_dir.join("libreoffice").join("App").join("libreoffice").join("program").join("soffice.exe"),
        app_dir.join("..").join("libreoffice").join("App").join("libreoffice").join("program").join("soffice.exe"),
        app_dir.join("resources").join("libreoffice").join("App").join("libreoffice").join("program").join("soffice.exe"),
        PathBuf::from(std::env::var("PROGRAMFILES").unwrap_or_default()).join("LibreOffice").join("program").join("soffice.exe"),
        PathBuf::from(std::env::var("PROGRAMFILES(X86)").unwrap_or_default()).join("LibreOffice").join("program").join("soffice.exe"),
    ];

    for path in paths_to_try {
        if path.exists() {
            return Ok(path);
        }
    }

    match Command::new("where")
        .arg("soffice.exe")
        .creation_flags(0x08000000)
        .output()
    {
        Ok(output) => {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                let path = PathBuf::from(line.trim());
                if path.exists() {
                    return Ok(path);
                }
            }
        }
        Err(_) => {}
    }

    Err("LibreOffice not found. Please install LibreOffice or place it in the resources/libreoffice directory.".to_string())
}

fn convert_to_pdf(
    input_path: &PathBuf,
    output_dir: &PathBuf,
    sheet_names: Option<&[String]>,
) -> Result<PathBuf, String> {
    let soffice_path = get_libreoffice_path()?;

    let file_stem = input_path
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or_else(|| "Invalid file name".to_string())?;

    let pdf_name = if let Some(sheets) = sheet_names {
        format!("{}_sheets_{}", file_stem, sheets.join("_"))
    } else {
        file_stem.to_string()
    };
    let pdf_path = output_dir.join(format!("{}.pdf", pdf_name));

    let mut cmd = Command::new(&soffice_path);
    cmd.arg("--headless");
    cmd.arg("--norestore");
    cmd.arg("--nolockcheck");
    cmd.arg("--convert-to");
    cmd.arg("pdf");
    cmd.arg("--outdir");
    cmd.arg(output_dir);

    if let Some(sheets) = sheet_names {
        let first_sheet = sheets.first().ok_or_else(|| "No sheet selected".to_string())?;
        cmd.arg("--convert-from-start");
        cmd.arg(first_sheet);
        if sheets.len() > 1 {
            let last_sheet = sheets.last().unwrap();
            cmd.arg("--convert-from-end");
            cmd.arg(last_sheet);
        }
    }

    cmd.arg(input_path);
    cmd.creation_flags(0x08000000);

    let output = cmd.output().map_err(|e| format!("Failed to execute LibreOffice: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("LibreOffice conversion failed: {}", stderr));
    }

    if !pdf_path.exists() {
        return Err("PDF conversion produced no output".to_string());
    }

    Ok(pdf_path)
}

fn print_pdf_with_libreoffice(
    pdf_path: &PathBuf,
    printer: Option<&str>,
    copies: i32,
) -> Result<bool, String> {
    let soffice_path = get_libreoffice_path()?;

    let mut cmd = Command::new(&soffice_path);
    cmd.arg("--headless");
    cmd.arg("--norestore");
    cmd.arg("--nolockcheck");
    cmd.arg("--print-to-file");
    cmd.arg("--outdir");
    cmd.arg(pdf_path.parent().unwrap_or(std::path::Path::new(".")).to_str().unwrap_or("."));

    if let Some(p) = printer {
        cmd.arg("--printer-name");
        cmd.arg(p);
    }

    cmd.arg(pdf_path);
    cmd.creation_flags(0x08000000);

    let output = cmd.output().map_err(|e| format!("Failed to execute print command: {}", e))?;

    if output.status.success() {
        Ok(true)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Print command failed: {}", stderr))
    }
}

fn print_pdf_with_shell(file_path: &PathBuf, printer: Option<&str>, copies: i32) -> Result<bool, String> {
    let file_str = file_path.to_string_lossy();
    let verb = if printer.is_some() { "printto" } else { "print" };

    let mut cmd = Command::new("rundll32.exe");
    cmd.arg("shell32.dll,ShellExec_RunDLL");
    cmd.arg(file_str.as_ref());
    cmd.arg(verb);
    if let Some(p) = printer {
        cmd.arg(format!("\"{}\"", p));
    }
    cmd.creation_flags(0x08000000);

    let output = cmd.output().map_err(|e| format!("Failed to execute print command: {}", e))?;
    Ok(output.status.success())
}

fn print_with_shell(
    file_path: &PathBuf,
    printer: Option<&str>,
    copies: i32,
) -> Result<bool, String> {
    let file_str = file_path.to_string_lossy();

    #[cfg(target_os = "windows")]
    {
        let extension = file_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        match extension.as_str() {
            "pdf" => {
                if let Err(e) = print_pdf_with_shell(file_path, printer, copies) {
                    return Err(e);
                }
                Ok(true)
            }
            "jpg" | "jpeg" | "png" | "bmp" | "gif" | "tiff" => {
                if let Err(e) = print_image_windows(&file_str, printer) {
                    return Err(e);
                }
                Ok(true)
            }
            "txt" => {
                if let Err(e) = print_text_windows(&file_str, printer) {
                    return Err(e);
                }
                Ok(true)
            }
            _ => {
                let verb = if printer.is_some() {
                    "printto"
                } else {
                    "print"
                };
                let mut cmd = Command::new("rundll32.exe");
                cmd.arg("shell32.dll,ShellExec_RunDLL");
                cmd.arg(file_str.as_ref());
                cmd.arg(verb);
                if let Some(p) = printer {
                    cmd.arg(p);
                }
                cmd.creation_flags(0x08000000);

                let output = cmd
                    .output()
                    .map_err(|e| format!("Failed to execute print command: {}", e))?;
                Ok(output.status.success())
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = printer;
        let _ = copies;
        Err("Printing is only supported on Windows in this version".to_string())
    }
}

#[cfg(target_os = "windows")]
fn print_image_windows(file_path: &str, printer: Option<&str>) -> Result<(), String> {
    let verb = if printer.is_some() {
        "printto"
    } else {
        "print"
    };
    let mut cmd = Command::new("rundll32.exe");
    cmd.arg("shell32.dll,ShellExec_RunDLL");
    cmd.arg(file_path);
    cmd.arg(verb);
    if let Some(p) = printer {
        cmd.arg(p);
    }
    cmd.creation_flags(0x08000000);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to print image: {}", e))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(format!(
            "Print command failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ))
    }
}

#[cfg(target_os = "windows")]
fn print_text_windows(file_path: &str, printer: Option<&str>) -> Result<(), String> {
    let verb = if printer.is_some() {
        "printto"
    } else {
        "print"
    };
    let mut cmd = Command::new("rundll32.exe");
    cmd.arg("shell32.dll,ShellExec_RunDLL");
    cmd.arg(file_path);
    cmd.arg(verb);
    if let Some(p) = printer {
        cmd.arg(p);
    }
    cmd.creation_flags(0x08000000);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to print text: {}", e))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(format!(
            "Print command failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ))
    }
}

#[tauri::command]
pub fn has_libreoffice() -> Result<bool, String> {
    match get_libreoffice_path() {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[tauri::command]
pub fn get_libreoffice_version() -> Result<String, String> {
    let soffice_path = get_libreoffice_path()?;
    
    let output = Command::new(&soffice_path)
        .arg("--version")
        .creation_flags(0x08000000)
        .output()
        .map_err(|e| format!("Failed to get LibreOffice version: {}", e))?;

    let text = String::from_utf8_lossy(&output.stdout);
    Ok(text.trim().to_string())
}

#[tauri::command]
pub fn get_excel_sheets(
    data: Vec<u8>,
    file_name: String,
) -> Result<Vec<String>, String> {
    parse_excel_sheets_from_data(&data, &file_name)
}

#[tauri::command]
pub fn cancel_print() -> Result<bool, String> {
    PRINT_CANCELLED.store(true, Ordering::SeqCst);
    Ok(true)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrintArea {
    pub start_row: usize,
    pub start_col: usize,
    pub end_row: usize,
    pub end_col: usize,
}

#[tauri::command]
pub fn print_file(
    data: Vec<u8>,
    file_name: String,
    printer: Option<String>,
    copies: i32,
    sheet_names: Option<Vec<String>>,
    page_range: Option<String>,
    print_area: Option<PrintArea>,
) -> Result<bool, String> {
    let extension = file_name
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_lowercase();

    let _ = page_range;

    match extension.as_str() {
        // Excel: 原生 GDI 打印（不打开 WPS，不依赖 LibreOffice）
        "xlsx" | "xls" => {
            print_excel_gdi(
                &data,
                &file_name,
                printer.as_deref(),
                copies,
                sheet_names.as_deref(),
                print_area.as_ref(),
            )
        }

        // 文本: 原生 GDI 打印
        "txt" | "csv" | "log" | "md" => {
            print_text_gdi(&data, printer.as_deref(), copies, &file_name)
        }

        // 其他格式（Word、PDF、图片等）：回退到 ShellExecute 打印
        // 后续可逐步用前端渲染 + GDI 打印替代
        _ => {
            let temp_dir = std::env::temp_dir();
            let input_path = temp_dir.join(format!("print_{}_{}", timestamp_millis(), file_name));
            fs::write(&input_path, &data).map_err(|e| format!("Failed to write temp file: {}", e))?;
            
            let result = print_with_shell(&input_path, printer.as_deref(), copies);
            
            std::thread::sleep(std::time::Duration::from_millis(500));
            let _ = fs::remove_file(&input_path);
            
            result
        }
    }
}

#[tauri::command]
pub fn get_printers() -> Result<Vec<String>, String> {
    #[cfg(target_os = "windows")]
    {
        get_printers_wmic()
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Printer listing is only supported on Windows".to_string())
    }
}

#[tauri::command]
pub fn get_cached_printers() -> Result<Vec<String>, String> {
    #[cfg(target_os = "windows")]
    {
        if let Some(cache) = load_printer_cache() {
            let now = timestamp_millis();
            if now - cache.timestamp < 300000 {
                return Ok(cache.printers);
            }
        }
        
        let printers = get_printers_wmic()?;
        let details = get_printer_details_wmic().unwrap_or_default();
        let network = fetch_network_printers().unwrap_or_default();
        
        let cache = PrinterCache {
            printers: printers.clone(),
            printer_details: details,
            network_printers: network,
            timestamp: timestamp_millis(),
        };
        let _ = save_printer_cache(&cache);
        
        Ok(printers)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Printer listing is only supported on Windows".to_string())
    }
}

#[tauri::command]
pub fn refresh_printers() -> Result<Vec<String>, String> {
    #[cfg(target_os = "windows")]
    {
        let printers = get_printers_wmic()?;
        let details = get_printer_details_wmic().unwrap_or_default();
        let network = fetch_network_printers().unwrap_or_default();
        
        let cache = PrinterCache {
            printers: printers.clone(),
            printer_details: details,
            network_printers: network,
            timestamp: timestamp_millis(),
        };
        let _ = save_printer_cache(&cache);
        
        Ok(printers)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Printer listing is only supported on Windows".to_string())
    }
}

#[tauri::command]
pub fn get_printer_details() -> Result<Vec<PrinterInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        get_printer_details_wmic()
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Printer details are only supported on Windows".to_string())
    }
}

#[tauri::command]
pub fn get_cached_printer_details() -> Result<Vec<PrinterInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        if let Some(cache) = load_printer_cache() {
            let now = timestamp_millis();
            if now - cache.timestamp < 300000 {
                return Ok(cache.printer_details);
            }
        }
        
        let printers = get_printers_wmic().unwrap_or_default();
        let details = get_printer_details_wmic()?;
        let network = fetch_network_printers().unwrap_or_default();
        
        let cache = PrinterCache {
            printers,
            printer_details: details.clone(),
            network_printers: network,
            timestamp: timestamp_millis(),
        };
        let _ = save_printer_cache(&cache);
        
        Ok(details)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Printer details are only supported on Windows".to_string())
    }
}

#[tauri::command]
pub fn scan_network_printers() -> Result<Vec<NetworkPrinter>, String> {
    #[cfg(target_os = "windows")]
    {
        fetch_network_printers()
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Network printer scanning is only supported on Windows".to_string())
    }
}

#[tauri::command]
pub fn get_cached_network_printers() -> Result<Vec<NetworkPrinter>, String> {
    #[cfg(target_os = "windows")]
    {
        if let Some(cache) = load_printer_cache() {
            let now = timestamp_millis();
            if now - cache.timestamp < 300000 {
                return Ok(cache.network_printers);
            }
        }
        
        let network = fetch_network_printers()?;
        let printers = get_printers_wmic().unwrap_or_default();
        let details = get_printer_details_wmic().unwrap_or_default();
        
        let cache = PrinterCache {
            printers,
            printer_details: details,
            network_printers: network.clone(),
            timestamp: timestamp_millis(),
        };
        let _ = save_printer_cache(&cache);
        
        Ok(network)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Network printer scanning is only supported on Windows".to_string())
    }
}

#[tauri::command]
pub fn add_network_printer(unc_path: String) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        let path = unc_path.trim();
        if !path.starts_with("\\\\") {
            return Err("打印机路径必须以 \\\\ 开头，例如 \\\\server\\printer".to_string());
        }

        let output = Command::new("rundll32.exe")
            .args(&[
                "printui.dll,PrintUIEntry",
                "/in",
                "/n",
                path,
            ])
            .creation_flags(0x08000000)
            .output()
            .map_err(|e| format!("Failed to add network printer: {}", e))?;

        if output.status.success() {
            let mut saved = load_saved_printers();
            if !saved.iter().any(|p| p.address == path) {
                let id = format!("net_{}", path.replace("\\", "_").replace(" ", "_"));
                saved.push(NetworkPrinter {
                    id,
                    name: path.to_string(),
                    address: path.to_string(),
                    location: None,
                    online: true,
                    saved: true,
                });
                let _ = save_printers_to_file(&saved);
            }
            let _ = refresh_printers();
            Ok(true)
        } else {
            Err(format!(
                "添加打印机失败: {}",
                String::from_utf8_lossy(&output.stderr)
            ))
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = unc_path;
        Err("Adding network printers is only supported on Windows".to_string())
    }
}

#[tauri::command]
pub fn save_network_printer(printer: NetworkPrinter) -> Result<bool, String> {
    let mut saved = load_saved_printers();
    if let Some(existing) = saved.iter_mut().find(|p| p.id == printer.id || p.address == printer.address) {
        existing.name = printer.name;
        existing.location = printer.location;
        existing.saved = true;
    } else {
        let mut p = printer;
        p.saved = true;
        saved.push(p);
    }
    save_printers_to_file(&saved)?;
    Ok(true)
}

#[tauri::command]
pub fn remove_saved_printer(printer_id: String) -> Result<bool, String> {
    let mut saved = load_saved_printers();
    saved.retain(|p| p.id != printer_id);
    save_printers_to_file(&saved)?;
    Ok(true)
}

#[tauri::command]
pub fn get_saved_network_printers() -> Result<Vec<NetworkPrinter>, String> {
    Ok(load_saved_printers())
}

#[tauri::command]
pub fn test_printer_connection(printer_name: String) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("wmic")
            .args(&[
                "printer",
                "where",
                &format!("name='{}'", printer_name.replace("'", "''")),
                "get",
                "status",
            ])
            .creation_flags(0x08000000)
            .output()
            .map_err(|e| format!("Failed to check printer status: {}", e))?;

        let text = String::from_utf8_lossy(&output.stdout);
        Ok(text.lines().any(|l| {
            let l = l.trim().to_lowercase();
            l == "ok" || l == "idle" || l == "printing"
        }))
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = printer_name;
        Err("Printer connection testing is only supported on Windows".to_string())
    }
}
