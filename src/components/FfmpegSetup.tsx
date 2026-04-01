import { useEffect, useState } from 'react';
import type { ProgressPayload } from '../lib/types';
import { installFfmpeg, onFfmpegInstallProgress } from '../lib/tauri-bridge';

interface Props {
  onReady: () => void;
}

export function FfmpegSetup({ onReady }: Props) {
  const [progress, setProgress] = useState<ProgressPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unlisten = onFfmpegInstallProgress(setProgress);
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Auto-start installation
  useEffect(() => {
    installFfmpeg()
      .then(() => onReady())
      .catch((e) => setError(String(e)));
  }, [onReady]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 p-8">
      <img
        src="/logo.png"
        alt="Transcrição Rápida"
        className="w-28 h-28 rounded-2xl"
        style={{ filter: 'drop-shadow(0 0 20px rgba(45, 212, 191, 0.3))' }}
      />
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Configuração inicial</h2>
        <p className="text-[var(--text-secondary)]">
          {error
            ? 'Falha ao instalar FFmpeg.'
            : 'Instalando FFmpeg necessário para processar áudio e vídeo...'}
        </p>
      </div>

      {!error && (
        <div className="w-full max-w-sm">
          <div className="flex justify-between text-sm mb-1">
            <span style={{ color: 'var(--text-secondary)' }}>
              {progress?.message ?? 'Preparando...'}
            </span>
            {progress && progress.progress > 0 && (
              <span style={{ color: 'var(--text-secondary)' }}>
                {progress.progress}%
              </span>
            )}
          </div>
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                backgroundColor: 'var(--accent)',
                width: `${progress?.progress ?? 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="text-center">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setProgress(null);
              installFfmpeg()
                .then(() => onReady())
                .catch((e) => setError(String(e)));
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
