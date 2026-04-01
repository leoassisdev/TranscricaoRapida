use crate::commands::audio;
use crate::types::{ProgressPayload, TranscriptionResult, TranscriptionSegment};
use tauri::{AppHandle, Emitter, Manager};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

#[tauri::command]
pub async fn transcribe(
    app: AppHandle,
    file_path: String,
    language: String,
    model_name: String,
) -> Result<TranscriptionResult, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Falha ao obter diretório: {}", e))?;

    // Stage 1: Extract audio
    let _ = app.emit(
        "transcription-progress",
        ProgressPayload {
            stage: "extracting".to_string(),
            progress: 0,
            message: "Extraindo áudio...".to_string(),
        },
    );

    let wav_path = audio::prepare_audio(&file_path, &app_data_dir)?;

    // Stage 2: Load model and transcribe
    let _ = app.emit(
        "transcription-progress",
        ProgressPayload {
            stage: "transcribing".to_string(),
            progress: 0,
            message: "Carregando modelo...".to_string(),
        },
    );

    let model_path = app_data_dir
        .join("models")
        .join(format!("ggml-{}.bin", model_name));

    if !model_path.exists() {
        return Err(format!("Modelo '{}' não encontrado. Faça o download primeiro.", model_name));
    }

    let model_path_str = model_path.to_string_lossy().to_string();
    let lang = language.clone();

    let result = tokio::task::spawn_blocking(move || {
        run_whisper(&model_path_str, &wav_path, &lang, &app)
    })
    .await
    .map_err(|e| format!("Erro na task: {}", e))??;

    // Cleanup temp audio
    audio::cleanup_temp(&app_data_dir);

    Ok(result)
}

fn run_whisper(
    model_path: &str,
    wav_path: &str,
    language: &str,
    app: &AppHandle,
) -> Result<TranscriptionResult, String> {
    // Load audio
    let audio_data = load_wav_f32(wav_path)?;
    let duration_ms = (audio_data.len() as f64 / 16000.0 * 1000.0) as u64;

    // Create whisper context with GPU
    let mut ctx_params = WhisperContextParameters::default();
    ctx_params.use_gpu(true);

    let ctx = WhisperContext::new_with_params(model_path, ctx_params)
        .map_err(|e| format!("Falha ao carregar modelo: {}", e))?;

    let mut state = ctx
        .create_state()
        .map_err(|e| format!("Falha ao criar estado: {}", e))?;

    // Configure params
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });

    if language == "auto" {
        params.set_language(Some("auto"));
    } else {
        params.set_language(Some(language));
    }

    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);

    // Progress callback
    let app_handle = app.clone();
    params.set_progress_callback_safe(move |progress: i32| {
        let _ = app_handle.emit(
            "transcription-progress",
            ProgressPayload {
                stage: "transcribing".to_string(),
                progress: progress as u32,
                message: format!("Transcrevendo... {}%", progress),
            },
        );
    });

    // Run transcription
    state
        .full(params, &audio_data)
        .map_err(|e| format!("Falha na transcrição: {}", e))?;

    // Collect segments
    let n_segments = state.full_n_segments().map_err(|e| format!("Erro: {}", e))?;
    let mut segments = Vec::new();
    let mut full_text = String::new();

    for i in 0..n_segments {
        let text = state
            .full_get_segment_text(i)
            .map_err(|e| format!("Erro ao obter segmento: {}", e))?;
        let start = state
            .full_get_segment_t0(i)
            .map_err(|e| format!("Erro: {}", e))?;
        let end = state
            .full_get_segment_t1(i)
            .map_err(|e| format!("Erro: {}", e))?;

        if !full_text.is_empty() {
            full_text.push(' ');
        }
        full_text.push_str(text.trim());

        segments.push(TranscriptionSegment {
            start_ms: start as i64 * 10,
            end_ms: end as i64 * 10,
            text: text.trim().to_string(),
        });
    }

    // Emit done
    let _ = app.emit(
        "transcription-progress",
        ProgressPayload {
            stage: "done".to_string(),
            progress: 100,
            message: "Transcrição concluída!".to_string(),
        },
    );

    let detected_language = language.to_string();

    Ok(TranscriptionResult {
        segments,
        full_text,
        language: detected_language,
        duration_ms,
    })
}

fn load_wav_f32(path: &str) -> Result<Vec<f32>, String> {
    let reader = hound::WavReader::open(path)
        .map_err(|e| format!("Falha ao abrir WAV: {}", e))?;

    let spec = reader.spec();
    let samples: Vec<f32> = match spec.sample_format {
        hound::SampleFormat::Int => {
            let max_val = (1 << (spec.bits_per_sample - 1)) as f32;
            reader
                .into_samples::<i32>()
                .filter_map(|s| s.ok())
                .map(|s| s as f32 / max_val)
                .collect()
        }
        hound::SampleFormat::Float => {
            reader
                .into_samples::<f32>()
                .filter_map(|s| s.ok())
                .collect()
        }
    };

    Ok(samples)
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content).map_err(|e| format!("Falha ao escrever arquivo: {}", e))
}
