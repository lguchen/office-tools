fn main() {
    use std::io::Write;

    let sizes = [32u32, 128, 256];
    let base_dir = std::path::Path::new("icons");
    std::fs::create_dir_all(base_dir).unwrap();

    for &size in &sizes {
        let mut img = image::ImageBuffer::new(size, size);

        for y in 0..size {
            for x in 0..size {
                let cx = size as f32 / 2.0;
                let cy = size as f32 / 2.0;
                let dx = x as f32 - cx;
                let dy = y as f32 - cy;
                let dist = (dx * dx + dy * dy).sqrt();
                let radius = size as f32 * 0.45;

                if dist < radius {
                    let t = dist / radius;
                    let r = (59.0 * (1.0 - t) + 130.0 * t) as u8;
                    let g = (130.0 * (1.0 - t) + 200.0 * t) as u8;
                    let b = (246.0 * (1.0 - t) + 255.0 * t) as u8;
                    img.put_pixel(x, y, image::Rgba([r, g, b, 255]));
                } else {
                    img.put_pixel(x, y, image::Rgba([0, 0, 0, 0]));
                }
            }
        }

        let filename = if size == 32 {
            "32x32.png".to_string()
        } else if size == 128 {
            "128x128.png".to_string()
        } else {
            "128x128@2x.png".to_string()
        };

        let path = base_dir.join(&filename);
        img.save(&path).unwrap();
        println!("Generated {}", filename);
    }

    println!("All icons generated successfully!");
}
