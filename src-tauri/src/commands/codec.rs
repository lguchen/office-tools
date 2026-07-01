use base64::{engine::general_purpose, Engine as _};

#[tauri::command]
pub fn base64_encode(data: Vec<u8>) -> Result<String, String> {
    Ok(general_purpose::STANDARD.encode(&data))
}

#[tauri::command]
pub fn base64_decode(data: String) -> Result<Vec<u8>, String> {
    general_purpose::STANDARD
        .decode(data.trim())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn base64_encode_file_data(data: Vec<u8>) -> Result<String, String> {
    Ok(general_purpose::STANDARD.encode(&data))
}

#[tauri::command]
pub fn base64_decode_to_bytes(data: String) -> Result<Vec<u8>, String> {
    general_purpose::STANDARD
        .decode(data.trim())
        .map_err(|e| e.to_string())
}
