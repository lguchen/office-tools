use md5::{Md5, Digest as Md5Digest};
use sha1::{Sha1, Digest as Sha1Digest};
use sha2::{Sha256, Sha512, Digest as Sha2Digest};
use std::collections::HashMap;

#[tauri::command]
pub fn calculate_md5(content: Vec<u8>) -> Result<String, String> {
    let mut hasher = Md5::new();
    hasher.update(&content);
    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

#[tauri::command]
pub fn calculate_sha1(content: Vec<u8>) -> Result<String, String> {
    let mut hasher = Sha1::new();
    hasher.update(&content);
    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

#[tauri::command]
pub fn calculate_sha256(content: Vec<u8>) -> Result<String, String> {
    let mut hasher = Sha256::new();
    hasher.update(&content);
    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

#[tauri::command]
pub fn calculate_sha512(content: Vec<u8>) -> Result<String, String> {
    let mut hasher = Sha512::new();
    hasher.update(&content);
    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

#[tauri::command]
pub fn calculate_hashes(data: Vec<u8>) -> Result<HashMap<String, String>, String> {
    let mut result = HashMap::new();

    let mut md5_hasher = Md5::new();
    md5_hasher.update(&data);
    result.insert("MD5".to_string(), format!("{:x}", md5_hasher.finalize()));

    let mut sha1_hasher = Sha1::new();
    sha1_hasher.update(&data);
    result.insert("SHA1".to_string(), format!("{:x}", sha1_hasher.finalize()));

    let mut sha256_hasher = Sha256::new();
    sha256_hasher.update(&data);
    result.insert("SHA256".to_string(), format!("{:x}", sha256_hasher.finalize()));

    let mut sha512_hasher = Sha512::new();
    sha512_hasher.update(&data);
    result.insert("SHA512".to_string(), format!("{:x}", sha512_hasher.finalize()));

    Ok(result)
}

#[tauri::command]
pub fn calculate_file_md5(path: String) -> Result<String, String> {
    let content = std::fs::read(&path).map_err(|e| e.to_string())?;
    calculate_md5(content)
}

#[tauri::command]
pub fn calculate_file_sha256(path: String) -> Result<String, String> {
    let content = std::fs::read(&path).map_err(|e| e.to_string())?;
    calculate_sha256(content)
}
