import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import type {
  TranscriptionResult,
  ProgressPayload,
  ModelInfo,
  DownloadProgress,
} from './types';

const MEDIA_EXTENSIONS = [
  'mp3', 'wav', 'm4a', 'flac', 'ogg', 'aac',
  'mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v',
];

export async function pickFile(): Promise<{ path: string; name: string } | null> {
  const selected = await open({
    title: 'Selecionar áudio ou vídeo',
    multiple: false,
    filters: [
      { name: 'Mídia', extensions: MEDIA_EXTENSIONS },
    ],
  });
  if (!selected || typeof selected !== 'string') return null;
  return { path: selected, name: selected.split('/').pop() ?? selected };
}

export async function transcribe(
  filePath: string,
  language: string,
  modelName: string,
): Promise<TranscriptionResult> {
  return invoke<TranscriptionResult>('transcribe', {
    filePath,
    language,
    modelName,
  });
}

export async function getAvailableModels(): Promise<ModelInfo[]> {
  return invoke<ModelInfo[]>('get_available_models');
}

export async function downloadModel(modelName: string): Promise<string> {
  return invoke<string>('download_model', { modelName });
}

export async function getModelPath(modelName: string): Promise<string> {
  return invoke<string>('get_model_path', { modelName });
}

export function onTranscriptionProgress(
  cb: (payload: ProgressPayload) => void,
): Promise<UnlistenFn> {
  return listen<ProgressPayload>('transcription-progress', (event) => {
    cb(event.payload);
  });
}

export function onModelDownloadProgress(
  cb: (payload: DownloadProgress) => void,
): Promise<UnlistenFn> {
  return listen<DownloadProgress>('model-download-progress', (event) => {
    cb(event.payload);
  });
}

export async function checkFfmpeg(): Promise<boolean> {
  return invoke<boolean>('check_ffmpeg');
}

export async function installFfmpeg(): Promise<string> {
  return invoke<string>('install_ffmpeg');
}

export function onFfmpegInstallProgress(
  cb: (payload: ProgressPayload) => void,
): Promise<UnlistenFn> {
  return listen<ProgressPayload>('ffmpeg-install-progress', (event) => {
    cb(event.payload);
  });
}

export async function copyToClipboard(text: string): Promise<void> {
  await writeText(text);
}

export async function saveFile(
  content: string,
  defaultName: string,
  filterName: string,
  extensions: string[],
): Promise<void> {
  const path = await save({
    title: 'Exportar transcrição',
    defaultPath: defaultName,
    filters: [{ name: filterName, extensions }],
  });
  if (!path) return;
  await invoke('write_file', { path, content });
}
