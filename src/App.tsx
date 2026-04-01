import { useCallback, useEffect, useState } from 'react';
import type { TranscriptionResult, AppView } from './lib/types';
import { getAvailableModels, transcribe } from './lib/tauri-bridge';
import { ModelManager } from './components/ModelManager';
import { DropZone } from './components/DropZone';
import { ProgressView } from './components/ProgressView';
import { TranscriptView } from './components/TranscriptView';

export default function App() {
  const [view, setView] = useState<AppView>('checking');
  const [modelName, setModelName] = useState('small');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if any model is downloaded on mount
  useEffect(() => {
    getAvailableModels()
      .then((models) => {
        const downloaded = models.find((m) => m.downloaded);
        if (downloaded) {
          setModelName(downloaded.name);
          setView('idle');
        } else {
          setView('model-setup');
        }
      })
      .catch(() => setView('model-setup'));
  }, []);

  const handleModelReady = useCallback((name: string) => {
    setModelName(name);
    setView('idle');
  }, []);

  const handleFileSelected = useCallback(
    async (filePath: string, name: string, language: string) => {
      setFileName(name);
      setError(null);
      setView('processing');
      try {
        const res = await transcribe(filePath, language, modelName);
        setResult(res);
        setView('result');
      } catch (e) {
        setError(String(e));
        setView('idle');
      }
    },
    [modelName],
  );

  const handleNewTranscription = useCallback(() => {
    setResult(null);
    setError(null);
    setView('idle');
  }, []);

  const handleChangeModel = useCallback(() => {
    setView('model-setup');
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Title bar drag region */}
      <div
        className="h-8 flex items-center justify-center text-xs shrink-0 select-none"
        data-tauri-drag-region
        style={{ color: 'var(--text-secondary)' }}
      >
        Transcrição Rápida
      </div>

      {/* Error toast */}
      {error && (
        <div className="mx-6 mb-2 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-h-0">
        {view === 'checking' && (
          <div className="flex items-center justify-center h-full">
            <p style={{ color: 'var(--text-secondary)' }}>Carregando...</p>
          </div>
        )}

        {view === 'model-setup' && (
          <ModelManager onModelReady={handleModelReady} />
        )}

        {view === 'idle' && (
          <DropZone
            onFileSelected={handleFileSelected}
            modelName={modelName}
            onChangeModel={handleChangeModel}
          />
        )}

        {view === 'processing' && (
          <ProgressView fileName={fileName} />
        )}

        {view === 'result' && result && (
          <TranscriptView
            result={result}
            onNewTranscription={handleNewTranscription}
          />
        )}
      </div>
    </div>
  );
}
