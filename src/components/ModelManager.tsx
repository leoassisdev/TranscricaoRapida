import { useEffect, useState } from 'react';
import type { ModelInfo, DownloadProgress } from '../lib/types';
import {
  getAvailableModels,
  downloadModel,
  onModelDownloadProgress,
} from '../lib/tauri-bridge';

interface Props {
  onModelReady: (modelName: string) => void;
}

export function ModelManager({ onModelReady }: Props) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAvailableModels().then(setModels).catch(console.error);
  }, []);

  useEffect(() => {
    const unlisten = onModelDownloadProgress(setProgress);
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const handleDownload = async (name: string) => {
    setDownloading(name);
    setError(null);
    setProgress(null);
    try {
      await downloadModel(name);
      const updated = await getAvailableModels();
      setModels(updated);
      setDownloading(null);
      onModelReady(name);
    } catch (e) {
      setError(String(e));
      setDownloading(null);
    }
  };

  const downloadedModels = models.filter((m) => m.downloaded);
  if (downloadedModels.length > 0 && !downloading) {
    // Auto-select first downloaded model
    onModelReady(downloadedModels[0].name);
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 p-8">
      <img
        src="/logo.png"
        alt="Transcrição Rápida"
        className="w-28 h-28 rounded-2xl"
        style={{ filter: 'drop-shadow(0 0 20px rgba(45, 212, 191, 0.3))' }}
      />
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Transcrição Rápida</h2>
        <p className="text-[var(--text-secondary)]">
          Para começar, baixe um modelo de transcrição.
          <br />
          Recomendamos o <strong>Small</strong> para melhor equilíbrio entre velocidade e precisão.
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col gap-3">
        {models.map((model) => (
          <div
            key={model.name}
            className="flex items-center justify-between p-4 rounded-lg"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            <div>
              <p className="font-medium">{model.display_name}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {model.size_mb >= 1000
                  ? `${(model.size_mb / 1000).toFixed(1)} GB`
                  : `${model.size_mb} MB`}
              </p>
            </div>
            {model.downloaded ? (
              <button
                onClick={() => onModelReady(model.name)}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Usar
              </button>
            ) : downloading === model.name ? (
              <div className="flex flex-col items-end gap-1 min-w-[120px]">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {progress ? `${progress.percent}%` : 'Iniciando...'}
                </span>
                <div
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: 'var(--accent)',
                      width: `${progress?.percent ?? 0}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleDownload(model.name)}
                disabled={downloading !== null}
                className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: model.name === 'small' ? 'var(--accent)' : 'var(--bg-tertiary)',
                }}
              >
                Baixar
              </button>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center max-w-md">{error}</p>
      )}
    </div>
  );
}
