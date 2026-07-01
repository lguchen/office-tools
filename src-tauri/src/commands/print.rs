// 打印相关命令
// 优化说明：添加打印机缓存机制，配置存放在软件运行目录下的config目录
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

use serde::{Deserialize, Serialize};

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

#[tauri::command]
pub fn print_file(
    data: Vec<u8>,
    file_name: String,
    printer: Option<String>,
    copies: i32,
) -> Result<bool, String> {
    let temp_dir = std::env::temp_dir();
    let temp_path = temp_dir.join(format!("print_{}_{}", timestamp_millis(), file_name));

    fs::write(&temp_path, &data).map_err(|e| format!("Failed to write temp file: {}", e))?;

    let result = print_with_shell(&temp_path, printer.as_deref(), copies);

    let _ = fs::remove_file(&temp_path);

    result
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
                if let Err(e) = print_pdf_windows(&file_str, printer, copies) {
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
fn print_pdf_windows(file_path: &str, printer: Option<&str>, _copies: i32) -> Result<(), String> {
    let mut cmd = Command::new("rundll32.exe");
    cmd.arg("shell32.dll,ShellExec_RunDLL");
    cmd.arg(file_path);
    cmd.arg("printto");
    if let Some(p) = printer {
        cmd.arg(format!("\"{}\"", p));
    }
    cmd.creation_flags(0x08000000);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to print PDF: {}", e))?;
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