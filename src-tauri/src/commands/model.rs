use crate::types::{DownloadProgress, ModelInfo};
use futures_util::StreamExt;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

const MODELS: &[(&str, &str, u64)] = &[
    ("tiny", "Tiny (rápido, menor precisão)", 75),
    ("base", "Base (equilibrado)", 148),
    ("small", "Small (recomendado)", 465),
    ("medium", "Medium (alta precisão, lento)", 1500),
];

fn models_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Falha ao obter diretório de dados: {}", e))?
        .join("models");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Falha ao criar diretório de modelos: {}", e))?;
    Ok(dir)
}

#[tauri::command]
pub fn get_available_models(app: AppHandle) -> Result<Vec<ModelInfo>, String> {
    let dir = models_dir(&app)?;
    let models = MODELS
        .iter()
        .map(|(name, display, size_mb)| {
            let path = dir.join(format!("ggml-{}.bin", name));
            ModelInfo {
                name: name.to_string(),
                display_name: display.to_string(),
                size_mb: *size_mb,
                downloaded: path.exists(),
            }
        })
        .collect();
    Ok(models)
}

#[tauri::command]
pub fn get_model_path(app: AppHandle, model_name: String) -> Result<String, String> {
    let dir = models_dir(&app)?;
    let path = dir.join(format!("ggml-{}.bin", model_name));
    if path.exists() {
        Ok(path.to_string_lossy().to_string())
    } else {
        Err(format!("Modelo '{}' não encontrado", model_name))
    }
}

#[tauri::command]
pub async fn download_model(app: AppHandle, model_name: String) -> Result<String, String> {
    let dir = models_dir(&app)?;
    let filename = format!("ggml-{}.bin", model_name);
    let dest = dir.join(&filename);

    if dest.exists() {
        return Ok(dest.to_string_lossy().to_string());
    }

    let url = format!(
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/{}",
        filename
    );

    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Falha no download: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Download falhou com status: {}", res.status()));
    }

    let total_bytes = res.content_length().unwrap_or(0);
    let mut downloaded_bytes: u64 = 0;

    // Write to a temp file first, then rename
    let tmp_dest = dir.join(format!("{}.tmp", filename));
    let mut file = tokio::fs::File::create(&tmp_dest)
        .await
        .map_err(|e| format!("Falha ao criar arquivo: {}", e))?;

    let mut stream = res.bytes_stream();
    let mut last_percent: u32 = 0;

    use tokio::io::AsyncWriteExt;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Erro no download: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Erro ao escrever arquivo: {}", e))?;

        downloaded_bytes += chunk.len() as u64;
        let percent = if total_bytes > 0 {
            ((downloaded_bytes as f64 / total_bytes as f64) * 100.0) as u32
        } else {
            0
        };

        // Only emit every 1% change to avoid flooding
        if percent != last_percent {
            last_percent = percent;
            let _ = app.emit(
                "model-download-progress",
                DownloadProgress {
                    downloaded_bytes,
                    total_bytes,
                    percent,
                },
            );
        }
    }

    file.flush()
        .await
        .map_err(|e| format!("Erro ao finalizar arquivo: {}", e))?;
    drop(file);

    // Rename temp to final
    tokio::fs::rename(&tmp_dest, &dest)
        .await
        .map_err(|e| format!("Falha ao renomear arquivo: {}", e))?;

    Ok(dest.to_string_lossy().to_string())
}
