use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, AppHandle};
use futures_util::StreamExt;

// ============================================================================
// 数据结构定义
// ============================================================================

/// 模型信息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelInfo {
    /// 模型显示名称
    pub name: String,
    /// 语言代码（如 chi_sim, eng）
    pub lang: String,
    /// 预期文件大小（字节）
    pub size: u64,
    /// 默认下载URL
    pub url: String,
}

/// 模型状态
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelStatus {
    /// 语言代码
    pub lang: String,
    /// 文件是否存在
    pub exists: bool,
    /// 实际文件大小（字节）
    pub size: u64,
    /// 是否通过完整性校验
    pub verified: bool,
    /// 状态：not_downloaded / downloading / ready / corrupted
    pub status: String,
}

/// 下载进度事件载荷
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadProgress {
    /// 模型名称
    pub model: String,
    /// 语言代码
    pub lang: String,
    /// 已下载字节数
    pub downloaded: u64,
    /// 总字节数
    pub total: u64,
    /// 百分比（0-100）
    pub percent: f32,
    /// 下载速度（格式化字符串）
    pub speed: String,
    /// 状态：downloading / completed / failed / cancelled
    pub status: String,
}

// ============================================================================
// 内置模型配置
// ============================================================================

/// 获取内置默认模型列表
fn default_models() -> Vec<ModelInfo> {
    vec![
        ModelInfo {
            name: "简体中文".to_string(),
            lang: "chi_sim".to_string(),
            size: 19000000,
            url: "https://github.com/naptha/tessdata/raw/gh-pages/4.0.0/chi_sim.traineddata".to_string(),
        },
        ModelInfo {
            name: "英文".to_string(),
            lang: "eng".to_string(),
            size: 4000000,
            url: "https://github.com/naptha/tessdata/raw/gh-pages/4.0.0/eng.traineddata".to_string(),
        },
    ]
}

// ============================================================================
// 全局状态：下载取消标志
// ============================================================================

lazy_static::lazy_static! {
    /// 每个语言对应的取消下载标志
    static ref CANCEL_FLAGS: Arc<Mutex<std::collections::HashMap<String, Arc<AtomicBool>>>> =
        Arc::new(Mutex::new(std::collections::HashMap::new()));
}

// ============================================================================
// 工具函数
// ============================================================================

/// 获取模型存储目录（软件运行根目录/ocr_models）
pub fn get_models_dir_path() -> PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("ocr_models")
}

/// 获取模型文件路径
fn get_model_file_path(lang: &str) -> PathBuf {
    get_models_dir_path().join(format!("{}.traineddata", lang))
}

/// 确保模型目录存在，不存在则创建
fn ensure_models_dir() -> Result<(), String> {
    let dir = get_models_dir_path();
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| format!("创建模型目录失败: {}", e))?;
    }
    Ok(())
}

/// 格式化下载速度字符串
fn format_speed(bytes_per_sec: f64) -> String {
    if bytes_per_sec > 1024.0 * 1024.0 {
        format!("{:.1} MB/s", bytes_per_sec / 1024.0 / 1024.0)
    } else if bytes_per_sec > 1024.0 {
        format!("{:.0} KB/s", bytes_per_sec / 1024.0)
    } else {
        format!("{:.0} B/s", bytes_per_sec)
    }
}

// ============================================================================
// Tauri 命令实现
// ============================================================================

/// 返回模型存储目录路径
#[tauri::command]
pub fn get_models_dir() -> Result<String, String> {
    ensure_models_dir()?;
    Ok(get_models_dir_path().to_string_lossy().to_string())
}

/// 返回模型列表（名称、语言、大小、默认下载URL）
#[tauri::command]
pub fn get_models_list() -> Vec<ModelInfo> {
    default_models()
}

/// 检查单个模型文件是否存在且完整（用文件大小校验作为简化版完整性检查）
#[tauri::command]
pub fn check_model(lang: String) -> Result<ModelStatus, String> {
    let file_path = get_model_file_path(&lang);
    let models = default_models();

    let expected_size = models
        .iter()
        .find(|m| m.lang == lang)
        .map(|m| m.size)
        .unwrap_or(0);

    let (exists, actual_size) = if file_path.exists() {
        let size = std::fs::metadata(&file_path)
            .map(|m| m.len())
            .unwrap_or(0);
        (true, size)
    } else {
        (false, 0)
    };

    let verified = exists && expected_size > 0 && actual_size >= expected_size * 95 / 100;

    let status = if exists && verified {
        "ready".to_string()
    } else if exists {
        "corrupted".to_string()
    } else {
        "not_downloaded".to_string()
    };

    Ok(ModelStatus {
        lang,
        exists,
        size: actual_size,
        verified,
        status,
    })
}

/// 检查所有模型状态
#[tauri::command]
pub fn check_all_models() -> Result<Vec<ModelStatus>, String> {
    let models = default_models();
    let mut results = Vec::new();
    for model in models {
        let status = check_model(model.lang.clone())?;
        results.push(status);
    }
    Ok(results)
}

/// 删除本地模型文件
#[tauri::command]
pub fn delete_model(lang: String) -> Result<bool, String> {
    let file_path = get_model_file_path(&lang);
    if file_path.exists() {
        std::fs::remove_file(&file_path).map_err(|e| format!("删除模型失败: {}", e))?;
        Ok(true)
    } else {
        Ok(false)
    }
}

/// 取消下载
#[tauri::command]
pub fn cancel_download(lang: String) -> Result<bool, String> {
    let flags = CANCEL_FLAGS.lock().unwrap();
    if let Some(flag) = flags.get(&lang) {
        flag.store(true, Ordering::SeqCst);
        Ok(true)
    } else {
        Ok(false)
    }
}

/// 下载模型，支持自定义URL，实时进度回调
#[tauri::command]
pub async fn download_model(
    app: AppHandle,
    lang: String,
    custom_url: Option<String>,
) -> Result<bool, String> {
    // 获取模型信息
    let models = default_models();
    let model_info = models
        .iter()
        .find(|m| m.lang == lang)
        .ok_or_else(|| format!("不支持的语言模型: {}", lang))?
        .clone();

    // 确定下载URL
    let url = custom_url.unwrap_or(model_info.url.clone());

    // 确保目录存在
    ensure_models_dir()?;

    let file_path = get_model_file_path(&lang);
    let tmp_path = file_path.with_extension("traineddata.tmp");

    // 创建取消标志
    let cancel_flag = Arc::new(AtomicBool::new(false));
    {
        let mut flags = CANCEL_FLAGS.lock().unwrap();
        flags.insert(lang.clone(), cancel_flag.clone());
    }

    // 清理函数：确保退出时移除取消标志
    let cleanup = |lang: &str| {
        let mut flags = CANCEL_FLAGS.lock().unwrap();
        flags.remove(lang);
    };

    // 发送进度事件的辅助函数
    let emit_progress = |downloaded: u64, total: u64, status: &str, speed: &str| {
        let percent = if total > 0 {
            (downloaded as f32 / total as f32) * 100.0
        } else {
            0.0
        };
        let _ = app.emit(
            "ocr://download-progress",
            DownloadProgress {
                model: model_info.name.clone(),
                lang: lang.clone(),
                downloaded,
                total,
                percent,
                speed: speed.to_string(),
                status: status.to_string(),
            },
        );
    };

    // 发送初始进度
    emit_progress(0, model_info.size, "downloading", "0 KB/s");

    // 创建 reqwest 客户端
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("创建HTTP客户端失败: {}", e))?;

    // 发起下载请求
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| {
            cleanup(&lang);
            emit_progress(0, model_info.size, "failed", "");
            format!("下载请求失败: {}", e)
        })?;

    // 检查HTTP状态码
    if !response.status().is_success() {
        cleanup(&lang);
        emit_progress(0, model_info.size, "failed", "");
        return Err(format!("下载失败，HTTP状态码: {}", response.status()));
    }

    // 获取总大小
    let total_size = response.content_length().unwrap_or(model_info.size);
    let mut downloaded: u64 = 0;

    // 创建临时文件
    let mut file = std::fs::File::create(&tmp_path).map_err(|e| {
        cleanup(&lang);
        emit_progress(0, total_size, "failed", "");
        format!("创建临时文件失败: {}", e)
    })?;

    // 获取响应流
    let mut stream = response.bytes_stream();

    // 速度计算相关变量
    let start_time = std::time::Instant::now();
    let mut last_update = std::time::Instant::now();

    // 流式下载循环
    loop {
        // 检查是否已取消
        if cancel_flag.load(Ordering::SeqCst) {
            drop(file);
            let _ = std::fs::remove_file(&tmp_path);
            cleanup(&lang);
            emit_progress(0, total_size, "cancelled", "");
            return Err("下载已取消".to_string());
        }

        // 读取下一个数据块
        match stream.next().await {
            Some(Ok(chunk)) => {
                // 写入文件
                std::io::Write::write_all(&mut file, &chunk).map_err(|e| {
                    cleanup(&lang);
                    emit_progress(downloaded, total_size, "failed", "");
                    format!("写入文件失败: {}", e)
                })?;
                downloaded += chunk.len() as u64;

                // 每500ms更新一次进度
                let now = std::time::Instant::now();
                if now.duration_since(last_update).as_millis() >= 500 {
                    let elapsed = now.duration_since(start_time).as_secs_f64();
                    let speed = if elapsed > 0.0 {
                        let bps = downloaded as f64 / elapsed;
                        format_speed(bps)
                    } else {
                        "0 KB/s".to_string()
                    };
                    emit_progress(downloaded, total_size, "downloading", &speed);
                    last_update = now;
                }
            }
            Some(Err(e)) => {
                cleanup(&lang);
                emit_progress(downloaded, total_size, "failed", "");
                return Err(format!("下载中断: {}", e));
            }
            None => break,
        }
    }

    // 刷新并关闭文件
    std::io::Write::flush(&mut file).map_err(|e| {
        cleanup(&lang);
        emit_progress(downloaded, total_size, "failed", "");
        format!("刷新文件失败: {}", e)
    })?;
    drop(file);

    // 重命名临时文件为最终文件
    std::fs::rename(&tmp_path, &file_path).map_err(|e| {
        cleanup(&lang);
        emit_progress(downloaded, total_size, "failed", "");
        format!("重命名文件失败: {}", e)
    })?;

    // 获取最终文件大小
    let final_size = std::fs::metadata(&file_path)
        .map(|m| m.len())
        .unwrap_or(0);

    // 发送完成事件
    emit_progress(final_size, total_size, "completed", "");

    // 清理取消标志
    cleanup(&lang);

    Ok(true)
}
