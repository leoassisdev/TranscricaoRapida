use crate::types::ProgressPayload;
use futures_util::StreamExt;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

fn ffmpeg_bin_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Falha ao obter diretório de dados: {}", e))?
        .join("bin");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Falha ao criar diretório bin: {}", e))?;
    Ok(dir)
}

/// Find FFmpeg binary - checks app data dir first, then common system locations.
pub fn find_ffmpeg(app: &AppHandle) -> Option<String> {
    // Check app data dir first (our bundled copy)
    if let Ok(bin_dir) = ffmpeg_bin_dir(app) {
        let app_ffmpeg = bin_dir.join("ffmpeg");
        if app_ffmpeg.exists() {
            return Some(app_ffmpeg.to_string_lossy().to_string());
        }
    }

    // Check common macOS locations
    let candidates = [
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
        "/usr/bin/ffmpeg",
    ];
    for candidate in candidates {
        if std::path::Path::new(candidate).exists() {
            if std::process::Command::new(candidate)
                .arg("-version")
                .output()
                .is_ok()
            {
                return Some(candidate.to_string());
            }
        }
    }

    // Check PATH
    if std::process::Command::new("ffmpeg")
        .arg("-version")
        .output()
        .is_ok()
    {
        return Some("ffmpeg".to_string());
    }

    None
}

#[tauri::command]
pub fn check_ffmpeg(app: AppHandle) -> bool {
    find_ffmpeg(&app).is_some()
}

#[tauri::command]
pub async fn install_ffmpeg(app: AppHandle) -> Result<String, String> {
    // Check if already available
    if let Some(path) = find_ffmpeg(&app) {
        return Ok(path);
    }

    let bin_dir = ffmpeg_bin_dir(&app)?;
    let dest = bin_dir.join("ffmpeg");

    // Determine download URL based on architecture
    let arch = std::env::consts::ARCH;
    let arch_suffix = match arch {
        "aarch64" => "arm64",
        "x86_64" => "x64",
        _ => return Err(format!("Arquitetura não suportada: {}", arch)),
    };

    let url = format!(
        "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-darwin-{}.gz",
        arch_suffix
    );

    let _ = app.emit(
        "ffmpeg-install-progress",
        ProgressPayload {
            stage: "downloading".to_string(),
            progress: 0,
            message: "Baixando FFmpeg...".to_string(),
        },
    );

    // Download the gzipped binary
    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Falha no download do FFmpeg: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Download do FFmpeg falhou: {}", res.status()));
    }

    let total = res.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut stream = res.bytes_stream();
    let mut last_percent: u32 = 0;

    let gz_path = bin_dir.join("ffmpeg.gz");
    let mut file = tokio::fs::File::create(&gz_path)
        .await
        .map_err(|e| format!("Falha ao criar arquivo: {}", e))?;

    use tokio::io::AsyncWriteExt;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Erro no download: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Erro ao escrever: {}", e))?;

        downloaded += chunk.len() as u64;
        let percent = if total > 0 {
            ((downloaded as f64 / total as f64) * 100.0) as u32
        } else {
            0
        };

        if percent != last_percent {
            last_percent = percent;
            let _ = app.emit(
                "ffmpeg-install-progress",
                ProgressPayload {
                    stage: "downloading".to_string(),
                    progress: percent,
                    message: format!("Baixando FFmpeg... {}%", percent),
                },
            );
        }
    }

    file.flush()
        .await
        .map_err(|e| format!("Erro ao finalizar: {}", e))?;
    drop(file);

    let _ = app.emit(
        "ffmpeg-install-progress",
        ProgressPayload {
            stage: "installing".to_string(),
            progress: 95,
            message: "Instalando FFmpeg...".to_string(),
        },
    );

    // Decompress using gunzip (always available on macOS)
    let output = std::process::Command::new("gunzip")
        .arg("-f")
        .arg(gz_path.to_string_lossy().to_string())
        .output()
        .map_err(|e| format!("Falha ao descompactar: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Falha ao descompactar FFmpeg: {}", stderr));
    }

    // Make executable
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&dest, std::fs::Permissions::from_mode(0o755))
            .map_err(|e| format!("Falha ao definir permissões: {}", e))?;
    }

    // Verify it works
    let verify = std::process::Command::new(dest.to_string_lossy().to_string())
        .arg("-version")
        .output();

    if verify.is_err() || !verify.unwrap().status.success() {
        let _ = std::fs::remove_file(&dest);
        return Err("FFmpeg baixado está corrompido. Tente novamente.".to_string());
    }

    let _ = app.emit(
        "ffmpeg-install-progress",
        ProgressPayload {
            stage: "done".to_string(),
            progress: 100,
            message: "FFmpeg instalado com sucesso!".to_string(),
        },
    );

    Ok(dest.to_string_lossy().to_string())
}
