mod commands;
mod types;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            commands::ffmpeg::check_ffmpeg,
            commands::ffmpeg::install_ffmpeg,
            commands::model::get_available_models,
            commands::model::get_model_path,
            commands::model::download_model,
            commands::transcribe::transcribe,
            commands::transcribe::write_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running TranscricaoRapida");
}
