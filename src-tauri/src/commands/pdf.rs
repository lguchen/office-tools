#[tauri::command]
pub fn pdf_merge(pdf_paths: Vec<String>, output_path: String) -> Result<String, String> {
    Err("PDF merge is handled in the frontend with pdf-lib".to_string())
}

#[tauri::command]
pub fn pdf_split(input_path: String, page_ranges: Vec<String>, output_dir: String) -> Result<Vec<String>, String> {
    Err("PDF split is handled in the frontend with pdf-lib".to_string())
}

#[tauri::command]
pub fn pdf_compress(input_path: String, output_path: String, quality: String) -> Result<String, String> {
    Err("PDF compress is handled in the frontend with pdf-lib".to_string())
}

#[tauri::command]
pub fn pdf_to_images(input_path: String, output_dir: String, dpi: u32, format: String) -> Result<Vec<String>, String> {
    Err("PDF to images is handled in the frontend with pdf-lib".to_string())
}

#[tauri::command]
pub fn extract_text_from_pdf(input_path: String) -> Result<String, String> {
    Err("PDF text extraction is handled in the frontend with pdf-lib".to_string())
}
