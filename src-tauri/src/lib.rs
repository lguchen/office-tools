mod commands;

use log::info;
use tauri::Manager;

pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    info!("Starting LightOfficeTools application");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            commands::pdf::pdf_merge,
            commands::pdf::pdf_split,
            commands::pdf::pdf_compress,
            commands::pdf::pdf_to_images,
            commands::pdf::extract_text_from_pdf,
            commands::file::read_file,
            commands::file::write_file,
            commands::file::get_file_info,
            commands::image::image_resize,
            commands::image::image_convert,
            commands::image::image_compress,
            commands::image::image_get_info,
            commands::image::compress_image_data,
            commands::image::convert_image_format_data,
            commands::image::resize_image_data,
            commands::hash::calculate_md5,
            commands::hash::calculate_sha1,
            commands::hash::calculate_sha256,
            commands::hash::calculate_sha512,
            commands::hash::calculate_hashes,
            commands::codec::base64_encode,
            commands::codec::base64_decode,
            commands::codec::base64_encode_file_data,
            commands::codec::base64_decode_to_bytes,
            commands::encoding::convert_encoding_text,
            commands::encoding::convert_encoding_data,
            commands::qrcode::generate_qrcode,
            commands::qrcode::scan_qrcode,
            commands::print::print_file,
            commands::print::get_printers,
            commands::print::get_printer_details,
            commands::print::scan_network_printers,
            commands::print::add_network_printer,
            commands::print::save_network_printer,
            commands::print::remove_saved_printer,
            commands::print::get_saved_network_printers,
            commands::print::get_cached_printers,
            commands::print::refresh_printers,
            commands::print::get_cached_printer_details,
            commands::print::get_cached_network_printers,
        ])
        .setup(|app| {
            info!("Application setup complete");
            let window = app.get_webview_window("main").unwrap();
            window.set_title("轻量化办公文档工具箱").ok();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
