use std::path::PathBuf;
use std::process::Command;

/// Converts any audio/video file to 16kHz mono WAV using FFmpeg.
/// Returns the path to the generated WAV file.
pub fn prepare_audio(file_path: &str, app_data_dir: &PathBuf) -> Result<String, String> {
    let tmp_dir = app_data_dir.join("tmp");
    std::fs::create_dir_all(&tmp_dir)
        .map_err(|e| format!("Falha ao criar diretório temporário: {}", e))?;

    let output_name = format!("{}.wav", uuid::Uuid::new_v4());
    let output_path = tmp_dir.join(&output_name);
    let output_str = output_path.to_string_lossy().to_string();

    // Try common FFmpeg locations
    let ffmpeg = find_ffmpeg().ok_or_else(|| {
        "FFmpeg não encontrado. Instale com: brew install ffmpeg".to_string()
    })?;

    let result = Command::new(&ffmpeg)
        .args([
            "-y",
            "-i", file_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            &output_str,
        ])
        .output()
        .map_err(|e| format!("Falha ao executar FFmpeg: {}", e))?;

    if !result.status.success() {
        let stderr = String::from_utf8_lossy(&result.stderr);
        return Err(format!("FFmpeg falhou: {}", stderr));
    }

    Ok(output_str)
}

fn find_ffmpeg() -> Option<String> {
    let candidates = [
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
        "/usr/bin/ffmpeg",
        "ffmpeg",
    ];
    for candidate in candidates {
        if Command::new(candidate).arg("-version").output().is_ok() {
            return Some(candidate.to_string());
        }
    }
    None
}

/// Clean up temporary WAV files
pub fn cleanup_temp(app_data_dir: &PathBuf) {
    let tmp_dir = app_data_dir.join("tmp");
    if tmp_dir.exists() {
        let _ = std::fs::remove_dir_all(&tmp_dir);
    }
}
