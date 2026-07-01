use image::{DynamicImage, ImageFormat, ImageReader};
use std::path::Path;

#[tauri::command]
pub fn image_resize(
    input_path: String,
    output_path: String,
    width: u32,
    height: u32,
    maintain_aspect: bool,
) -> Result<String, String> {
    let img = ImageReader::open(&input_path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let resized = if maintain_aspect {
        img.resize(width, height, image::imageops::FilterType::Lanczos3)
    } else {
        img.resize_exact(width, height, image::imageops::FilterType::Lanczos3)
    };

    resized.save(&output_path).map_err(|e| e.to_string())?;
    Ok(output_path)
}

#[tauri::command]
pub fn image_convert(input_path: String, output_path: String, format: String) -> Result<String, String> {
    let img = ImageReader::open(&input_path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let output_format = match format.to_lowercase().as_str() {
        "png" => ImageFormat::Png,
        "jpg" | "jpeg" => ImageFormat::Jpeg,
        "webp" => ImageFormat::WebP,
        "gif" => ImageFormat::Gif,
        "bmp" => ImageFormat::Bmp,
        "tiff" => ImageFormat::Tiff,
        _ => return Err(format!("Unsupported format: {}", format)),
    };

    img.save_with_format(&output_path, output_format).map_err(|e| e.to_string())?;
    Ok(output_path)
}

#[tauri::command]
pub fn image_compress(
    input_path: String,
    output_path: String,
    quality: u8,
    format: String,
) -> Result<String, String> {
    let img = ImageReader::open(&input_path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    let output_format = match format.to_lowercase().as_str() {
        "jpg" | "jpeg" => ImageFormat::Jpeg,
        "png" => ImageFormat::Png,
        "webp" => ImageFormat::WebP,
        _ => return Err(format!("Unsupported format: {}", format)),
    };

    if output_format == ImageFormat::Jpeg {
        let rgb_img = img.to_rgb8();
        let mut output_file = std::fs::File::create(&output_path).map_err(|e| e.to_string())?;
        let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut output_file, quality);
        encoder.encode(&rgb_img, rgb_img.width(), rgb_img.height(), image::ExtendedColorType::Rgb8)
            .map_err(|e| e.to_string())?;
    } else {
        img.save_with_format(&output_path, output_format).map_err(|e| e.to_string())?;
    }

    Ok(output_path)
}

#[tauri::command]
pub fn image_get_info(input_path: String) -> Result<ImageInfo, String> {
    let img = ImageReader::open(&input_path)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;

    Ok(ImageInfo {
        width: img.width(),
        height: img.height(),
        format: format!("{:?}", img.color()),
    })
}

#[derive(serde::Serialize)]
pub struct ImageInfo {
    pub width: u32,
    pub height: u32,
    pub format: String,
}

#[derive(serde::Serialize)]
pub struct CompressedImageData {
    pub data: Vec<u8>,
    pub size: usize,
}

#[tauri::command]
pub fn compress_image_data(data: Vec<u8>, quality: u8, format: String) -> Result<CompressedImageData, String> {
    let img = image::load_from_memory(&data).map_err(|e| e.to_string())?;

    let output_format = match format.to_lowercase().as_str() {
        "jpg" | "jpeg" => ImageFormat::Jpeg,
        "png" => ImageFormat::Png,
        "webp" => ImageFormat::WebP,
        _ => return Err(format!("Unsupported format: {}", format)),
    };

    let mut output_data: Vec<u8> = Vec::new();

    if output_format == ImageFormat::Jpeg {
        let rgb_img = img.to_rgb8();
        let mut cursor = std::io::Cursor::new(&mut output_data);
        let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut cursor, quality);
        encoder.encode(&rgb_img, rgb_img.width(), rgb_img.height(), image::ExtendedColorType::Rgb8)
            .map_err(|e| e.to_string())?;
    } else {
        img.write_to(&mut std::io::Cursor::new(&mut output_data), output_format)
            .map_err(|e| e.to_string())?;
    }

    let size = output_data.len();
    Ok(CompressedImageData { data: output_data, size })
}

#[tauri::command]
pub fn convert_image_format_data(data: Vec<u8>, format: String) -> Result<Vec<u8>, String> {
    let img = image::load_from_memory(&data).map_err(|e| e.to_string())?;

    let output_format = match format.to_lowercase().as_str() {
        "png" => ImageFormat::Png,
        "jpg" | "jpeg" => ImageFormat::Jpeg,
        "webp" => ImageFormat::WebP,
        "gif" => ImageFormat::Gif,
        "bmp" => ImageFormat::Bmp,
        "tiff" => ImageFormat::Tiff,
        _ => return Err(format!("Unsupported format: {}", format)),
    };

    let mut output_data: Vec<u8> = Vec::new();
    img.write_to(&mut std::io::Cursor::new(&mut output_data), output_format)
        .map_err(|e| e.to_string())?;
    Ok(output_data)
}

#[tauri::command]
pub fn resize_image_data(data: Vec<u8>, width: u32, height: u32, maintain_aspect: bool) -> Result<Vec<u8>, String> {
    let img = image::load_from_memory(&data).map_err(|e| e.to_string())?;

    let resized = if maintain_aspect {
        img.resize(width, height, image::imageops::FilterType::Lanczos3)
    } else {
        img.resize_exact(width, height, image::imageops::FilterType::Lanczos3)
    };

    let mut output_data: Vec<u8> = Vec::new();
    resized.write_to(&mut std::io::Cursor::new(&mut output_data), ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    Ok(output_data)
}
