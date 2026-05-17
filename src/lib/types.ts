export interface TranscriptionSegment {
  start_ms: number;
  end_ms: number;
  text: string;
}

export interface TranscriptionResult {
  segments: TranscriptionSegment[];
  full_text: string;
  language: string;
  duration_ms: number;
}

export interface TranscriptionJob {
  id: string;
  filePath: string;
  fileName: string;
  language: string;
  outputLanguage: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  progress: number;
  progressMessage: string;
  result: TranscriptionResult | null;
  error: string | null;
}

export interface ProgressPayload {
  stage: string;
  progress: number;
  message: string;
}

export interface ModelInfo {
  name: string;
  display_name: string;
  size_mb: number;
  downloaded: boolean;
}

export interface DownloadProgress {
  downloaded_bytes: number;
  total_bytes: number;
  percent: number;
}

export type AppView = 'checking' | 'ffmpeg-setup' | 'model-setup' | 'idle' | 'batch';
