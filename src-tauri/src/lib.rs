use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_dialog::DialogExt;

pub mod ocr_model;

// ============================================================================
// 通用数据结构
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PrinterInfo {
    pub name: String,
    pub status: String,
    pub is_default: bool,
    pub is_offline: bool,
    pub port: String,
    pub driver: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PrintParams {
    pub printer_name: String,
    pub copies: u32,
    pub page_range: String,
    pub paper_size: String,
    pub orientation: String,
    pub color_mode: String,
    pub duplex: bool,
    pub scale: u32,
    pub fit_to_page: bool,
    pub watermark_text: String,
    pub pages_per_sheet: u32,
    pub margin_top: f32,
    pub margin_bottom: f32,
    pub margin_left: f32,
    pub margin_right: f32,
    pub print_header_footer: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PrintTaskProgress {
    pub file: String,
    pub status: String,
    pub current_page: u32,
    pub total_pages: u32,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub ext: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub is_dir: bool,
    pub is_file: bool,
    pub created: Option<i64>,
    pub modified: Option<i64>,
    pub accessed: Option<i64>,
    pub ext: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirectoryEntry {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub is_file: bool,
    pub size: u64,
    pub ext: String,
}

// ============================================================================
// Windows打印机枚举
// ============================================================================

#[cfg(windows)]
fn enumerate_printers_windows() -> Result<Vec<PrinterInfo>, String> {
    use std::ptr;
    use winapi::shared::winerror::ERROR_INSUFFICIENT_BUFFER;
    use winapi::um::winspool::{
        EnumPrintersW, PRINTER_ENUM_LOCAL, PRINTER_ENUM_CONNECTIONS, PRINTER_INFO_2W,
        GetDefaultPrinterW,
    };

    let mut printers: Vec<PrinterInfo> = Vec::new();
    let mut default_printer: String = String::new();

    unsafe {
        let mut buffer_size: u32 = 256;
        let mut buffer: Vec<u16> = vec![0; buffer_size as usize];
        if GetDefaultPrinterW(buffer.as_mut_ptr(), &mut buffer_size) != 0 {
            default_printer = String::from_utf16_lossy(&buffer[..buffer_size as usize])
                .trim_end_matches('\0')
                .to_string();
        }
    }

    unsafe {
        let flags = PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS;
        let mut needed: u32 = 0;
        let mut returned: u32 = 0;

        EnumPrintersW(
            flags as u32,
            ptr::null_mut(),
            2,
            ptr::null_mut(),
            0,
            &mut needed,
            &mut returned,
        );

        if needed == 0 {
            return Ok(printers);
        }

        let mut buffer: Vec<u8> = vec![0; needed as usize];

        let result = EnumPrintersW(
            flags as u32,
            ptr::null_mut(),
            2,
            buffer.as_mut_ptr(),
            needed,
            &mut needed,
            &mut returned,
        );

        if result == 0 {
            let err = winapi::um::errhandlingapi::GetLastError();
            if err != ERROR_INSUFFICIENT_BUFFER {
                return Err(format!("枚举打印机失败，错误码: {}", err));
            }
        }

        let printer_info_ptr = buffer.as_ptr() as *const PRINTER_INFO_2W;

        for i in 0..returned as isize {
            let info = &*printer_info_ptr.offset(i);

            let name = if info.pPrinterName.is_null() {
                continue;
            } else {
                let len = (0..).take_while(|&j| *info.pPrinterName.offset(j) != 0).count();
                let slice = std::slice::from_raw_parts(info.pPrinterName, len);
                String::from_utf16_lossy(slice)
            };

            let driver_name = if info.pDriverName.is_null() {
                String::new()
            } else {
                let len = (0..).take_while(|&j| *info.pDriverName.offset(j) != 0).count();
                let slice = std::slice::from_raw_parts(info.pDriverName, len);
                String::from_utf16_lossy(slice)
            };

            let port_name = if info.pPortName.is_null() {
                String::new()
            } else {
                let len = (0..).take_while(|&j| *info.pPortName.offset(j) != 0).count();
                let slice = std::slice::from_raw_parts(info.pPortName, len);
                String::from_utf16_lossy(slice)
            };

            let status = info.Status;
            let is_offline = (status & 0x00000080) != 0;
            let status_str = if is_offline {
                "离线".to_string()
            } else if (status & 0x00000002) != 0 {
                "忙碌".to_string()
            } else if (status & 0x00000004) != 0 {
                "空闲".to_string()
            } else {
                "就绪".to_string()
            };

            printers.push(PrinterInfo {
                name,
                status: status_str,
                is_default: false,
                is_offline,
                port: port_name,
                driver: driver_name,
            });
        }
    }

    for printer in printers.iter_mut() {
        if printer.name == default_printer {
            printer.is_default = true;
        }
    }

    printers.sort_by(|a, b| b.is_default.cmp(&a.is_default));

    Ok(printers)
}

#[cfg(not(windows))]
fn enumerate_printers_windows() -> Result<Vec<PrinterInfo>, String> {
    Ok(vec![])
}

// ============================================================================
// 配置管理工具函数
// ============================================================================

fn get_config_dir() -> Result<PathBuf, String> {
    let proj_dirs = directories::ProjectDirs::from("com", "light-office", "office-tools")
        .ok_or_else(|| "无法获取配置目录".to_string())?;
    let config_dir = proj_dirs.config_dir().to_path_buf();
    std::fs::create_dir_all(&config_dir).map_err(|e| format!("创建配置目录失败: {}", e))?;
    Ok(config_dir)
}

fn get_config_file_path() -> Result<PathBuf, String> {
    Ok(get_config_dir()?.join("config.json"))
}

// ============================================================================
// 文件操作命令
// ============================================================================

#[tauri::command]
async fn open_file_dialog(
    app: tauri::AppHandle,
    title: Option<String>,
    filters: Option<Vec<(String, Vec<String>)>>,
    directory: Option<String>,
    multiple: Option<bool>,
) -> Result<Vec<String>, String> {
    let mut builder = app.dialog().file();

    if let Some(title) = &title {
        builder = builder.set_title(title);
    }

    if let Some(dir) = &directory {
        builder = builder.set_directory(dir);
    }

    if let Some(filter_list) = &filters {
        for (name, exts) in filter_list {
            let exts_str: Vec<&str> = exts.iter().map(|s| s.as_str()).collect();
            builder = builder.add_filter(name, &exts_str);
        }
    }

    let (tx, rx) = tokio::sync::oneshot::channel();

    if multiple.unwrap_or(false) {
        builder.pick_files(move |paths| {
            let result = paths
                .map(|p| p.iter().map(|path| path.to_string()).collect())
                .unwrap_or_default();
            let _ = tx.send(result);
        });
    } else {
        builder.pick_file(move |path| {
            let result = path
                .map(|p| vec![p.to_string()])
                .unwrap_or_default();
            let _ = tx.send(result);
        });
    }

    rx.await.map_err(|e| format!("对话框等待失败: {}", e))
}

#[tauri::command]
async fn save_file_dialog(
    app: tauri::AppHandle,
    title: Option<String>,
    filters: Option<Vec<(String, Vec<String>)>>,
    directory: Option<String>,
    default_name: Option<String>,
) -> Result<Option<String>, String> {
    let mut builder = app.dialog().file().set_file_name(
        default_name.as_deref().unwrap_or("untitled")
    );

    if let Some(title) = &title {
        builder = builder.set_title(title);
    }

    if let Some(dir) = &directory {
        builder = builder.set_directory(dir);
    }

    if let Some(filter_list) = &filters {
        for (name, exts) in filter_list {
            let exts_str: Vec<&str> = exts.iter().map(|s| s.as_str()).collect();
            builder = builder.add_filter(name, &exts_str);
        }
    }

    let (tx, rx) = tokio::sync::oneshot::channel();

    builder.save_file(move |path| {
        let result = path.map(|p| p.to_string());
        let _ = tx.send(result);
    });

    rx.await.map_err(|e| format!("对话框等待失败: {}", e))
}

#[tauri::command]
fn read_text_file(file_path: String, encoding: Option<String>) -> Result<String, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("文件不存在".to_string());
    }

    let bytes = std::fs::read(path).map_err(|e| format!("读取文件失败: {}", e))?;

    let enc = encoding.as_deref().unwrap_or("utf-8");
    let result = match enc.to_lowercase().as_str() {
        "gbk" | "gb2312" | "gb18030" => {
            let (decoded, _, _) = encoding_rs::GBK.decode(&bytes);
            decoded.to_string()
        }
        "utf-16" | "utf16" => {
            let (decoded, _, _) = encoding_rs::UTF_16LE.decode(&bytes);
            decoded.to_string()
        }
        "utf-16be" => {
            let (decoded, _, _) = encoding_rs::UTF_16BE.decode(&bytes);
            decoded.to_string()
        }
        _ => {
            let (decoded, _, _) = encoding_rs::UTF_8.decode(&bytes);
            decoded.to_string()
        }
    };

    Ok(result)
}

#[tauri::command]
fn write_text_file(file_path: String, content: String, encoding: Option<String>) -> Result<bool, String> {
    let enc = encoding.as_deref().unwrap_or("utf-8");
    let bytes = match enc.to_lowercase().as_str() {
        "gbk" | "gb2312" | "gb18030" => {
            let (encoded, _, _) = encoding_rs::GBK.encode(&content);
            encoded.to_vec()
        }
        "utf-16" | "utf16" => {
            let (encoded, _, _) = encoding_rs::UTF_16LE.encode(&content);
            encoded.to_vec()
        }
        "utf-16be" => {
            let (encoded, _, _) = encoding_rs::UTF_16BE.encode(&content);
            encoded.to_vec()
        }
        "utf8-bom" | "utf-8-bom" => {
            let mut result = vec![0xEF, 0xBB, 0xBF];
            result.extend_from_slice(content.as_bytes());
            result
        }
        _ => content.into_bytes(),
    };

    std::fs::write(&file_path, bytes).map_err(|e| format!("写入文件失败: {}", e))?;
    Ok(true)
}

#[tauri::command]
fn read_binary_file(file_path: String) -> Result<Vec<u8>, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("文件不存在".to_string());
    }
    std::fs::read(path).map_err(|e| format!("读取文件失败: {}", e))
}

#[tauri::command]
fn write_binary_file(file_path: String, data: Vec<u8>) -> Result<bool, String> {
    std::fs::write(&file_path, data).map_err(|e| format!("写入文件失败: {}", e))?;
    Ok(true)
}

#[tauri::command]
fn get_file_metadata(file_path: String) -> Result<FileMetadata, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("文件不存在".to_string());
    }

    let meta = std::fs::metadata(path).map_err(|e| format!("获取元数据失败: {}", e))?;

    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let to_timestamp = |t: std::io::Result<std::time::SystemTime>| -> Option<i64> {
        t.ok().and_then(|time| {
            time.duration_since(std::time::UNIX_EPOCH)
                .ok()
                .map(|d| d.as_secs() as i64)
        })
    };

    Ok(FileMetadata {
        path: file_path,
        name,
        size: meta.len(),
        is_dir: meta.is_dir(),
        is_file: meta.is_file(),
        created: to_timestamp(meta.created()),
        modified: to_timestamp(meta.modified()),
        accessed: to_timestamp(meta.accessed()),
        ext,
    })
}

#[tauri::command]
fn delete_file(file_path: String) -> Result<bool, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("文件不存在".to_string());
    }

    if path.is_dir() {
        std::fs::remove_dir_all(path).map_err(|e| format!("删除目录失败: {}", e))?;
    } else {
        std::fs::remove_file(path).map_err(|e| format!("删除文件失败: {}", e))?;
    }
    Ok(true)
}

#[tauri::command]
fn rename_file(old_path: String, new_path: String) -> Result<bool, String> {
    let old = Path::new(&old_path);
    if !old.exists() {
        return Err("源文件不存在".to_string());
    }

    std::fs::rename(old, &new_path).map_err(|e| format!("重命名失败: {}", e))?;
    Ok(true)
}

#[tauri::command]
fn batch_rename(files: Vec<(String, String)>) -> Result<Vec<(String, bool, String)>, String> {
    let mut results = Vec::new();
    for (old_path, new_name) in &files {
        let old = PathBuf::from(old_path);
        let new = old.parent().map(|p| p.join(new_name));

        match new {
            Some(new_path) => match std::fs::rename(&old, &new_path) {
                Ok(_) => results.push((old_path.clone(), true, String::new())),
                Err(e) => results.push((old_path.clone(), false, e.to_string())),
            },
            None => results.push((old_path.clone(), false, "路径无效".to_string())),
        }
    }
    Ok(results)
}

#[tauri::command]
fn list_directory(dir_path: String, recursive: Option<bool>) -> Result<Vec<DirectoryEntry>, String> {
    let path = Path::new(&dir_path);
    if !path.exists() {
        return Err("目录不存在".to_string());
    }
    if !path.is_dir() {
        return Err("路径不是目录".to_string());
    }

    let mut entries = Vec::new();

    if recursive.unwrap_or(false) {
        for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
            let name = entry.file_name().to_string_lossy().to_string();
            let ext = entry
                .path()
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);

            entries.push(DirectoryEntry {
                path: entry.path().to_string_lossy().to_string(),
                name,
                is_dir: entry.file_type().is_dir(),
                is_file: entry.file_type().is_file(),
                size,
                ext,
            });
        }
    } else {
        for entry in std::fs::read_dir(path).map_err(|e| format!("读取目录失败: {}", e))? {
            let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
            let file_type = entry.file_type().map_err(|e| format!("获取文件类型失败: {}", e))?;
            let name = entry.file_name().to_string_lossy().to_string();
            let ext = entry
                .path()
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);

            entries.push(DirectoryEntry {
                path: entry.path().to_string_lossy().to_string(),
                name,
                is_dir: file_type.is_dir(),
                is_file: file_type.is_file(),
                size,
                ext,
            });
        }
    }

    Ok(entries)
}

#[tauri::command]
fn scan_files(dir: String, extensions: Vec<String>) -> Result<Vec<FileInfo>, String> {
    let path = PathBuf::from(&dir);
    if !path.exists() {
        return Err("目录不存在".to_string());
    }

    let mut files = Vec::new();
    for entry in WalkDir::new(&path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let ext = entry
                .path()
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();

            if extensions.is_empty() || extensions.contains(&ext) {
                if let Ok(meta) = entry.metadata() {
                    files.push(FileInfo {
                        path: entry.path().to_string_lossy().to_string(),
                        name: entry.file_name().to_string_lossy().to_string(),
                        size: meta.len(),
                        ext,
                    });
                }
            }
        }
    }

    Ok(files)
}

// ============================================================================
// Excel处理命令（暂未实现，返回明确错误）
// ============================================================================

#[tauri::command]
fn excel_convert_format(
    input_path: String,
    output_path: String,
    from_format: String,
    to_format: String,
) -> Result<bool, String> {
    Err(format!(
        "Excel格式转换功能暂未实现（输入: {} -> {}, 从 {} 到 {}）。请等待后续版本更新或使用其他工具。",
        input_path, output_path, from_format, to_format
    ))
}

#[tauri::command]
fn excel_clean_data(
    input_path: String,
    output_path: String,
    _options: Option<serde_json::Value>,
) -> Result<bool, String> {
    Err(format!(
        "Excel数据清理功能暂未实现（输入: {}, 输出: {}）。请等待后续版本更新或使用其他工具。",
        input_path, output_path
    ))
}

#[tauri::command]
fn excel_merge_files(
    input_files: Vec<String>,
    output_path: String,
    _options: Option<serde_json::Value>,
) -> Result<bool, String> {
    Err(format!(
        "Excel合并功能暂未实现（{}个文件 -> {}）。请等待后续版本更新或使用其他工具。",
        input_files.len(), output_path
    ))
}

#[tauri::command]
fn excel_split_file(
    input_path: String,
    output_dir: String,
    _options: Option<serde_json::Value>,
) -> Result<bool, String> {
    Err(format!(
        "Excel拆分功能暂未实现（输入: {}, 输出目录: {}）。请等待后续版本更新或使用其他工具。",
        input_path, output_dir
    ))
}

// ============================================================================
// Word处理命令（暂未实现，返回明确错误）
// ============================================================================

#[tauri::command]
fn word_convert_format(
    input_path: String,
    output_path: String,
    from_format: String,
    to_format: String,
) -> Result<bool, String> {
    Err(format!(
        "Word格式转换功能暂未实现（输入: {} -> {}, 从 {} 到 {}）。请等待后续版本更新或使用其他工具。",
        input_path, output_path, from_format, to_format
    ))
}

#[tauri::command]
fn word_replace_text(
    input_path: String,
    output_path: String,
    replacements: Vec<(String, String)>,
) -> Result<bool, String> {
    Err(format!(
        "Word内容替换功能暂未实现（输入: {}, 输出: {}, {}处替换）。请等待后续版本更新或使用其他工具。",
        input_path, output_path, replacements.len()
    ))
}

// ============================================================================
// PDF处理命令（暂未实现，返回明确错误）
// ============================================================================

#[tauri::command]
fn pdf_to_images(
    input_path: String,
    output_dir: String,
    _dpi: Option<u32>,
    _format: Option<String>,
) -> Result<bool, String> {
    Err(format!(
        "PDF转图片功能暂未实现（输入: {}, 输出: {}）。请等待后续版本更新或使用其他工具。",
        input_path, output_dir
    ))
}

#[tauri::command]
fn pdf_to_text(input_path: String, _output_path: Option<String>) -> Result<String, String> {
    Err(format!(
        "PDF转文本功能暂未实现（输入: {}）。请等待后续版本更新或使用其他工具。",
        input_path
    ))
}

#[tauri::command]
fn merge_pdfs(input_files: Vec<String>, output_path: String) -> Result<bool, String> {
    Err(format!(
        "PDF合并功能暂未实现（{}个文件 -> {}）。请等待后续版本更新或使用其他工具。",
        input_files.len(), output_path
    ))
}

#[tauri::command]
fn split_pdf(
    input_path: String,
    output_dir: String,
    _options: Option<serde_json::Value>,
) -> Result<bool, String> {
    Err(format!(
        "PDF拆分功能暂未实现（输入: {}, 输出目录: {}）。请等待后续版本更新或使用其他工具。",
        input_path, output_dir
    ))
}

// ============================================================================
// 打印相关命令
// ============================================================================

#[tauri::command]
fn get_printers() -> Result<Vec<PrinterInfo>, String> {
    enumerate_printers_windows()
}

#[tauri::command]
fn refresh_printers() -> Result<Vec<PrinterInfo>, String> {
    enumerate_printers_windows()
}

#[tauri::command]
fn print_file(file_path: String, printer_name: Option<String>) -> Result<bool, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("文件不存在".to_string());
    }

    let path_str = path.to_string_lossy().to_string();

    #[cfg(windows)]
    {
        use std::ptr;
        use winapi::um::shellapi::ShellExecuteW;
        use winapi::um::winuser::SW_HIDE;

        let file_path_wide: Vec<u16> = path_str.encode_utf16().chain(std::iter::once(0)).collect();
        let operation_wide: Vec<u16> = "print".encode_utf16().chain(std::iter::once(0)).collect();

        let printer_param = if let Some(printer) = printer_name {
            format!("\"{}\"", printer)
        } else {
            String::new()
        };
        let param_wide: Vec<u16> = printer_param.encode_utf16().chain(std::iter::once(0)).collect();

        unsafe {
            let result = ShellExecuteW(
                ptr::null_mut(),
                operation_wide.as_ptr(),
                file_path_wide.as_ptr(),
                param_wide.as_ptr(),
                ptr::null(),
                SW_HIDE,
            );

            if result as i32 <= 32 {
                return Err(format!("打印启动失败，错误码: {}", result as i32));
            }
        }

        Ok(true)
    }

    #[cfg(not(windows))]
    {
        Err("打印功能仅支持Windows平台".to_string())
    }
}

#[tauri::command]
fn print_image(image_path: String, printer_name: Option<String>) -> Result<bool, String> {
    print_file(image_path, printer_name)
}

#[tauri::command]
async fn batch_print_files(
    app: tauri::AppHandle,
    files: Vec<String>,
    printer_name: String,
    _params: PrintParams,
) -> Result<bool, String> {
    for (_index, file_path) in files.iter().enumerate() {
        let file_name = Path::new(file_path)
            .file_name()
            .map(|f| f.to_string_lossy().to_string())
            .unwrap_or(file_path.clone());

        let _ = app.emit(
            "print-progress",
            PrintTaskProgress {
                file: file_name.clone(),
                status: "printing".to_string(),
                current_page: 0,
                total_pages: 0,
                error: None,
            },
        );

        match print_file(file_path.clone(), Some(printer_name.clone())) {
            Ok(_) => {
                let _ = app.emit(
                    "print-progress",
                    PrintTaskProgress {
                        file: file_name,
                        status: "completed".to_string(),
                        current_page: 0,
                        total_pages: 0,
                        error: None,
                    },
                );
            }
            Err(e) => {
                let _ = app.emit(
                    "print-progress",
                    PrintTaskProgress {
                        file: file_name,
                        status: "failed".to_string(),
                        current_page: 0,
                        total_pages: 0,
                        error: Some(e),
                    },
                );
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    }

    Ok(true)
}

// ============================================================================
// OCR相关命令
// ============================================================================

#[tauri::command]
fn recognize_image(image_path: String, lang: Option<String>) -> Result<String, String> {
    Err(format!(
        "OCR图片文字识别功能暂未完全实现（图片: {}, 语言: {}）。\n\
        OCR模型下载管理已就绪，但识别引擎依赖尚未集成。\n\
        请等待后续版本更新，或使用在线OCR服务。",
        image_path,
        lang.unwrap_or_else(|| "chi_sim+eng".to_string())
    ))
}

// ============================================================================
// 编码转换相关命令
// ============================================================================

#[tauri::command]
fn detect_encoding(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("文件不存在".to_string());
    }

    let bytes = std::fs::read(path).map_err(|e| format!("读取文件失败: {}", e))?;

    if bytes.is_empty() {
        return Ok("utf-8".to_string());
    }

    if bytes.len() >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF {
        return Ok("utf-8-bom".to_string());
    }

    if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE {
        return Ok("utf-16le".to_string());
    }
    if bytes.len() >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF {
        return Ok("utf-16be".to_string());
    }

    let (_, _, had_errors) = encoding_rs::UTF_8.decode(&bytes);
    if !had_errors {
        return Ok("utf-8".to_string());
    }

    let (_, _, gbk_errors) = encoding_rs::GBK.decode(&bytes);
    if !gbk_errors {
        return Ok("gbk".to_string());
    }

    Ok("unknown".to_string())
}

#[tauri::command]
fn convert_encoding(file_path: String, from_enc: String, to_enc: String) -> Result<bool, String> {
    let content = std::fs::read(&file_path).map_err(|e| e.to_string())?;

    let decoded = match from_enc.as_str() {
        "gbk" | "gb2312" | "gb18030" => {
            let (decoded, _, _) = encoding_rs::GBK.decode(&content);
            decoded.to_string()
        }
        "utf-16" | "utf16" | "utf-16le" => {
            let (decoded, _, _) = encoding_rs::UTF_16LE.decode(&content);
            decoded.to_string()
        }
        "utf-16be" => {
            let (decoded, _, _) = encoding_rs::UTF_16BE.decode(&content);
            decoded.to_string()
        }
        _ => {
            let (decoded, _, _) = encoding_rs::UTF_8.decode(&content);
            decoded.to_string()
        }
    };

    let encoded = match to_enc.as_str() {
        "gbk" | "gb2312" | "gb18030" => {
            let (encoded, _, _) = encoding_rs::GBK.encode(&decoded);
            encoded.to_vec()
        }
        "utf-16" | "utf16" | "utf-16le" => {
            let (encoded, _, _) = encoding_rs::UTF_16LE.encode(&decoded);
            encoded.to_vec()
        }
        "utf-16be" => {
            let (encoded, _, _) = encoding_rs::UTF_16BE.encode(&decoded);
            encoded.to_vec()
        }
        "utf8-bom" | "utf-8-bom" => {
            let mut result = vec![0xEF, 0xBB, 0xBF];
            result.extend_from_slice(decoded.as_bytes());
            result
        }
        _ => decoded.into_bytes(),
    };

    std::fs::write(&file_path, encoded).map_err(|e| e.to_string())?;
    Ok(true)
}

// ============================================================================
// 系统/配置相关命令
// ============================================================================

#[tauri::command]
fn get_config() -> Result<serde_json::Value, String> {
    let config_path = get_config_file_path()?;

    if !config_path.exists() {
        return Ok(serde_json::json!({}));
    }

    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("读取配置文件失败: {}", e))?;

    let config: serde_json::Value = serde_json::from_str(&content)
        .unwrap_or_else(|_| serde_json::json!({}));

    Ok(config)
}

#[tauri::command]
fn set_config(config: serde_json::Value) -> Result<bool, String> {
    let config_path = get_config_file_path()?;

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;

    std::fs::write(&config_path, content)
        .map_err(|e| format!("写入配置文件失败: {}", e))?;

    Ok(true)
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn toggle_auto_start(enable: bool) -> Result<bool, String> {
    #[cfg(windows)]
    {
        use std::ptr;
        use winapi::shared::minwindef::{HKEY, DWORD};
        use winapi::um::winreg::{
            RegOpenKeyExW, RegSetValueExW, RegDeleteValueW, RegCloseKey,
            HKEY_CURRENT_USER,
        };

        const KEY_SET_VALUE: DWORD = 0x0002;
        const KEY_READ: DWORD = 0x20019;
        const REG_SZ: DWORD = 1;
        const ERROR_SUCCESS: i32 = 0;
        const ERROR_FILE_NOT_FOUND: i32 = 2;

        let app_exe = std::env::current_exe()
            .map_err(|e| format!("获取程序路径失败: {}", e))?;
        let app_path = app_exe.to_string_lossy().to_string();

        let sub_key = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
        let value_name = "LightOfficeTools";

        let sub_key_wide: Vec<u16> = sub_key.encode_utf16().chain(std::iter::once(0)).collect();
        let value_name_wide: Vec<u16> = value_name.encode_utf16().chain(std::iter::once(0)).collect();

        unsafe {
            let mut hkey: HKEY = ptr::null_mut();

            let result = RegOpenKeyExW(
                HKEY_CURRENT_USER,
                sub_key_wide.as_ptr(),
                0,
                KEY_SET_VALUE | KEY_READ,
                &mut hkey,
            );

            if result != ERROR_SUCCESS {
                return Err(format!("打开注册表失败，错误码: {}", result));
            }

            if enable {
                let app_path_wide: Vec<u16> = app_path.encode_utf16().chain(std::iter::once(0)).collect();
                let byte_count = (app_path_wide.len() * 2) as u32;

                let set_result = RegSetValueExW(
                    hkey,
                    value_name_wide.as_ptr(),
                    0,
                    REG_SZ,
                    app_path_wide.as_ptr() as *const u8,
                    byte_count,
                );

                if set_result != ERROR_SUCCESS {
                    RegCloseKey(hkey);
                    return Err(format!("设置注册表值失败，错误码: {}", set_result));
                }
            } else {
                let del_result = RegDeleteValueW(hkey, value_name_wide.as_ptr());
                if del_result != ERROR_SUCCESS && del_result != ERROR_FILE_NOT_FOUND {
                    RegCloseKey(hkey);
                    return Err(format!("删除注册表值失败，错误码: {}", del_result));
                }
            }

            RegCloseKey(hkey);
        }

        Ok(true)
    }

    #[cfg(not(windows))]
    {
        Err("开机自启功能仅支持Windows平台".to_string())
    }
}

#[tauri::command]
fn minimize_to_tray(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
        Ok(true)
    } else {
        Err("未找到主窗口".to_string())
    }
}

// ============================================================================
// Tauri应用入口
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                let show_item = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
                let hide_item = MenuItem::with_id(app, "hide", "最小化到托盘", true, None::<&str>)?;
                let quit_item = MenuItem::with_id(app, "quit", "退出软件", true, None::<&str>)?;

                let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;

                let _tray = TrayIconBuilder::with_id("main-tray")
                    .tooltip("办公工具箱")
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id().as_ref() {
                        "show" => {
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.show();
                                let _ = win.set_focus();
                                let _ = win.unminimize();
                            }
                        }
                        "hide" => {
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.hide();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(win) = app.get_webview_window("main") {
                                if win.is_visible().unwrap_or(false) {
                                    let _ = win.hide();
                                } else {
                                    let _ = win.show();
                                    let _ = win.set_focus();
                                    let _ = win.unminimize();
                                }
                            }
                        }
                    })
                    .build(app)?;
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            // 文件操作
            open_file_dialog,
            save_file_dialog,
            read_text_file,
            write_text_file,
            read_binary_file,
            write_binary_file,
            get_file_metadata,
            delete_file,
            rename_file,
            batch_rename,
            list_directory,
            scan_files,
            // Excel处理
            excel_convert_format,
            excel_clean_data,
            excel_merge_files,
            excel_split_file,
            // Word处理
            word_convert_format,
            word_replace_text,
            // PDF处理
            pdf_to_images,
            pdf_to_text,
            merge_pdfs,
            split_pdf,
            // 打印相关
            get_printers,
            refresh_printers,
            print_file,
            print_image,
            batch_print_files,
            // OCR相关
            recognize_image,
            // OCR模型管理
            ocr_model::get_models_dir,
            ocr_model::get_models_list,
            ocr_model::check_model,
            ocr_model::check_all_models,
            ocr_model::download_model,
            ocr_model::cancel_download,
            ocr_model::delete_model,
            // 编码转换
            detect_encoding,
            convert_encoding,
            // 系统/配置
            get_config,
            set_config,
            get_app_version,
            toggle_auto_start,
            minimize_to_tray
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
