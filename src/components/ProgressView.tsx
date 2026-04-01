import { useEffect, useState } from 'react';
import type { ProgressPayload } from '../lib/types';
import { onTranscriptionProgress } from '../lib/tauri-bridge';

interface Props {
  fileName: string;
}

export function ProgressView({ fileName }: Props) {
  const [progress, setProgress] = useState<ProgressPayload>({
    stage: 'extracting',
    progress: 0,
    message: 'Preparando...',
  });

  useEffect(() => {
    const unlisten = onTranscriptionProgress(setProgress);
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      {/* Spinner */}
      <div className="relative w-20 h-20">
        <svg className="animate-spin w-20 h-20" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="var(--bg-tertiary)"
            strokeWidth="2"
          />
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeDasharray={`${(progress.progress / 100) * 62.8} 62.8`}
            strokeLinecap="round"
            transform="rotate(-90 12 12)"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
          {progress.progress}%
        </span>
      </div>

      <div className="text-center">
        <p className="text-lg font-medium">{progress.message}</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {fileName}
        </p>
      </div>

      {/* Progress bar */}
      <div
        className="w-full max-w-md h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            backgroundColor: 'var(--accent)',
            width: `${progress.progress}%`,
          }}
        />
      </div>
    </div>
  );
}
