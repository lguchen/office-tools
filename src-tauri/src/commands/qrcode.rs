use image::{ImageBuffer, ImageFormat, Rgb};
use qrcode::QrCode;

#[tauri::command]
pub fn generate_qrcode(content: String, size: u32, error_level: String) -> Result<Vec<u8>, String> {
    let ecl = match error_level.to_uppercase().as_str() {
        "L" => qrcode::EcLevel::L,
        "M" => qrcode::EcLevel::M,
        "Q" => qrcode::EcLevel::Q,
        "H" => qrcode::EcLevel::H,
        _ => qrcode::EcLevel::M,
    };

    let code = QrCode::with_error_correction_level(content.as_bytes(), ecl)
        .map_err(|e| format!("Failed to generate QR code: {:?}", e))?;

    let modules = code.width() as u32;
    let quiet_zone = 4u32;
    let total_modules = modules + 2 * quiet_zone;
    let pixel_per_module = if size > total_modules {
        size / total_modules
    } else {
        1
    };
    let img_size = total_modules * pixel_per_module;

    let mut img = ImageBuffer::new(img_size, img_size);

    for y in 0..img_size {
        for x in 0..img_size {
            let module_x = (x / pixel_per_module) as i32 - quiet_zone as i32;
            let module_y = (y / pixel_per_module) as i32 - quiet_zone as i32;

            let is_dark = if module_x >= 0
                && module_x < modules as i32
                && module_y >= 0
                && module_y < modules as i32
            {
                code[(module_x as usize, module_y as usize)] == qrcode::Color::Dark
            } else {
                false
            };

            let pixel = if is_dark {
                Rgb([0u8, 0u8, 0u8])
            } else {
                Rgb([255u8, 255u8, 255u8])
            };

            img.put_pixel(x, y, pixel);
        }
    }

    let mut output_data: Vec<u8> = Vec::new();
    img.write_to(
        &mut std::io::Cursor::new(&mut output_data),
        ImageFormat::Png,
    )
    .map_err(|e| e.to_string())?;

    Ok(output_data)
}

fn is_dark_pixel(gray: u8, threshold: u8) -> bool {
    gray < threshold
}

#[derive(Clone, Copy)]
struct Point {
    x: f32,
    y: f32,
}

#[tauri::command]
pub fn scan_qrcode(data: Vec<u8>) -> Result<String, String> {
    let img = image::load_from_memory(&data).map_err(|e| e.to_string())?;
    let gray = img.to_luma8();
    let (width, height) = gray.dimensions();

    if width < 21 || height < 21 {
        return Err("Image too small for QR code".to_string());
    }

    let mut threshold = 128u8;
    let mut best_try = String::new();

    for _try in 0..3 {
        let mut row_lengths: Vec<Vec<usize>> = Vec::new();

        for y in 0..height {
            let mut runs: Vec<usize> = Vec::new();
            let mut current_run = 1usize;
            let mut prev_dark = is_dark_pixel(gray.get_pixel(0, y)[0], threshold);

            for x in 1..width {
                let dark = is_dark_pixel(gray.get_pixel(x, y)[0], threshold);
                if dark == prev_dark {
                    current_run += 1;
                } else {
                    runs.push(current_run);
                    current_run = 1;
                    prev_dark = dark;
                }
            }
            runs.push(current_run);
            row_lengths.push(runs);
        }

        let mut finder_patterns: Vec<(Point, f32)> = Vec::new();

        for y in 0..height {
            let runs = &row_lengths[y as usize];
            let mut x_pos = 0i32;
            for i in 0..runs.len().saturating_sub(4) {
                let r1 = runs[i] as f32;
                let r2 = runs[i + 1] as f32;
                let r3 = runs[i + 2] as f32;
                let r4 = runs[i + 3] as f32;
                let r5 = runs[i + 4] as f32;

                let total = r1 + r2 + r3 + r4 + r5;
                let module = total / 7.0;

                if module > 0.0 {
                    let ratio_ok = (r1 / module - 1.0).abs() < 0.7
                        && (r2 / module - 1.0).abs() < 0.7
                        && (r3 / module - 3.0).abs() < 1.2
                        && (r4 / module - 1.0).abs() < 0.7
                        && (r5 / module - 1.0).abs() < 0.7;

                    if ratio_ok {
                        let cx = (x_pos as f32) + r1 + r2 + r3 / 2.0;
                        finder_patterns.push((Point { x: cx, y: y as f32 }, module));
                    }
                }
                x_pos += runs[i] as i32;
            }
        }

        if finder_patterns.len() >= 3 {
            best_try = format!(
                "Found {} potential finder patterns (threshold={})",
                finder_patterns.len(),
                threshold
            );
            break;
        }

        threshold = if _try == 0 { 100 } else { 150 };
    }

    if best_try.is_empty() {
        Err(
            "Could not find QR code in image. Note: Full QR decoding requires the rqrr crate."
                .to_string(),
        )
    } else {
        Err(format!("QR code detection limited: {}", best_try))
    }
}
