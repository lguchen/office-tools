use encoding_rs::*;

fn get_encoding(name: &str) -> Result<&'static Encoding, String> {
    match name.to_uppercase().as_str() {
        "UTF-8" | "UTF8" => Ok(UTF_8),
        "GBK" => Ok(GBK),
        "GB2312" | "GB_2312" => Ok(GBK),
        "BIG5" | "BIG-5" => Ok(BIG5),
        "UTF-16" | "UTF16" => Ok(UTF_16LE),
        "SHIFT_JIS" | "SHIFTJIS" | "SJIS" => Ok(SHIFT_JIS),
        "EUC-KR" | "EUCKR" => Ok(EUC_KR),
        "ISO-8859-1" | "LATIN1" | "WINDOWS-1252" => Ok(WINDOWS_1252),
        _ => Err(format!("Unsupported encoding: {}", name)),
    }
}

#[tauri::command]
pub fn convert_encoding_text(
    text: String,
    from_enc: String,
    to_enc: String,
) -> Result<String, String> {
    let from = get_encoding(&from_enc)?;
    let to = get_encoding(&to_enc)?;

    let bytes = text.as_bytes();
    let (decoded, _, _) = from.decode(bytes);
    let (encoded, _, _) = to.encode(&decoded);

    if to == UTF_8 {
        String::from_utf8(encoded.to_vec()).map_err(|e| e.to_string())
    } else {
        Ok(String::from_utf8_lossy(&encoded).to_string())
    }
}

#[tauri::command]
pub fn convert_encoding_data(
    data: Vec<u8>,
    from_enc: String,
    to_enc: String,
) -> Result<Vec<u8>, String> {
    let from = get_encoding(&from_enc)?;
    let to = get_encoding(&to_enc)?;

    let (decoded, _, _) = from.decode(&data);
    let (encoded, _, _) = to.encode(&decoded);

    Ok(encoded.to_vec())
}
