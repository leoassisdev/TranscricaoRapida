import { useCallback, useEffect, useRef, useState } from 'react';
import type { TranscriptionJob, AppView } from './lib/types';
import {
  checkFfmpeg,
  getAvailableModels,
  transcribe,
  onTranscriptionProgress,
  exportZip,
} from './lib/tauri-bridge';
import { generateTxt } from './lib/srt';
import { FfmpegSetup } from './components/FfmpegSetup';
import { ModelManager } from './components/ModelManager';
import { DropZone } from './components/DropZone';
import { QueuePopup } from './components/QueuePopup';
import { TranscriptView } from './components/TranscriptView';

function stripExtension(name: string): string {
  const lastDot = name.lastIndexOf('.');
  return lastDot > 0 ? name.substring(0, lastDot) : name;
}

export default function App() {
  const [view, setView] = useState<AppView>('checking');
  const [modelName, setModelName] = useState('small');
  const [error, setError] = useState<string | null>(null);

  // Batch state
  const [jobs, setJobs] = useState<TranscriptionJob[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const currentJobIndexRef = useRef(-1);

  // Check FFmpeg and models on mount
  useEffect(() => {
    checkFfmpeg()
      .then((hasFfmpeg) => {
        if (!hasFfmpeg) {
          setView('ffmpeg-setup');
        } else {
          checkModels();
        }
      })
      .catch(() => setView('ffmpeg-setup'));
  }, []);

  function checkModels() {
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
  }

  // Progress listener — maps events to the currently processing job
  useEffect(() => {
    const unlisten = onTranscriptionProgress((payload) => {
      const idx = currentJobIndexRef.current;
      if (idx >= 0) {
        setJobs((prev) =>
          prev.map((j, i) =>
            i === idx
              ? { ...j, progress: payload.progress, progressMessage: payload.message }
              : j,
          ),
        );
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleFfmpegReady = useCallback(() => {
    checkModels();
  }, []);

  const handleModelReady = useCallback((name: string) => {
    setModelName(name);
    setView('idle');
  }, []);

  const handleFilesSelected = useCallback(
    async (
      files: { path: string; name: string }[],
      language: string,
      outputLanguage: string,
    ) => {
      const newJobs: TranscriptionJob[] = files.map((f, i) => ({
        id: `job-${i}-${Date.now()}`,
        filePath: f.path,
        fileName: f.name,
        language,
        outputLanguage,
        status: 'queued' as const,
        progress: 0,
        progressMessage: '',
        result: null,
        error: null,
      }));

      setJobs(newJobs);
      setActiveTab(0);
      setShowQueue(true);
      setView('batch');
      setError(null);

      // Process one at a time (GPU can only run one Whisper instance)
      for (let i = 0; i < newJobs.length; i++) {
        currentJobIndexRef.current = i;

        setJobs((prev) =>
          prev.map((j, idx) =>
            idx === i
              ? { ...j, status: 'processing', progress: 0, progressMessage: 'Iniciando...' }
              : j,
          ),
        );

        try {
          const result = await transcribe(
            newJobs[i].filePath,
            newJobs[i].language,
            modelName,
            newJobs[i].outputLanguage,
          );
          setJobs((prev) =>
            prev.map((j, idx) =>
              idx === i ? { ...j, status: 'done', progress: 100, result } : j,
            ),
          );
        } catch (e) {
          setJobs((prev) =>
            prev.map((j, idx) =>
              idx === i ? { ...j, status: 'error', error: String(e) } : j,
            ),
          );
        }
      }

      currentJobIndexRef.current = -1;
    },
    [modelName],
  );

  const handleNewTranscription = useCallback(() => {
    setJobs([]);
    setActiveTab(0);
    setShowQueue(false);
    setError(null);
    setView('idle');
  }, []);

  const handleChangeModel = useCallback(() => {
    setView('model-setup');
  }, []);

  const handleExportAll = useCallback(async () => {
    const doneJobs = jobs.filter((j) => j.status === 'done' && j.result);
    if (doneJobs.length === 0) return;

    const entries = doneJobs.map((j) => ({
      name: `${stripExtension(j.fileName)}.txt`,
      content: generateTxt(j.result!.segments),
    }));

    await exportZip(entries, 'transcricoes.zip');
  }, [jobs]);

  return (
    <div className="h-full flex flex-col">
      {/* Title bar drag region */}
      <div
        className="h-8 flex items-center justify-center text-xs shrink-0 select-none"
        data-tauri-drag-region
        style={{ color: 'var(--text-secondary)' }}
      >
        Transcricao Rapida
      </div>

      {/* Error toast */}
      {error && (
        <div className="mx-6 mb-2 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline cursor-pointer">
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

        {view === 'ffmpeg-setup' && <FfmpegSetup onReady={handleFfmpegReady} />}
        {view === 'model-setup' && <ModelManager onModelReady={handleModelReady} />}

        {view === 'idle' && (
          <DropZone
            onFilesSelected={handleFilesSelected}
            modelName={modelName}
            onChangeModel={handleChangeModel}
          />
        )}

        {view === 'batch' && (
          <TranscriptView
            jobs={jobs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onNewTranscription={handleNewTranscription}
            onShowQueue={() => setShowQueue(true)}
            onExportAll={handleExportAll}
          />
        )}
      </div>

      {/* Queue popup overlay */}
      <QueuePopup
        jobs={jobs}
        visible={showQueue}
        onClose={() => setShowQueue(false)}
        onExportAll={handleExportAll}
      />
    </div>
  );
}
