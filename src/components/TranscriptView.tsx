import { useState } from 'react';
import type { TranscriptionJob } from '../lib/types';
import { generateSrt, generateTxt } from '../lib/srt';
import { copyToClipboard, saveFile } from '../lib/tauri-bridge';

interface Props {
  jobs: TranscriptionJob[];
  activeTab: number;
  onTabChange: (index: number) => void;
  onNewTranscription: () => void;
  onShowQueue: () => void;
  onExportAll: () => void;
}

function stripExtension(name: string): string {
  const lastDot = name.lastIndexOf('.');
  return lastDot > 0 ? name.substring(0, lastDot) : name;
}

export function TranscriptView({
  jobs,
  activeTab,
  onTabChange,
  onNewTranscription,
  onShowQueue,
  onExportAll,
}: Props) {
  const [copied, setCopied] = useState(false);

  const doneJobs = jobs.filter((j) => j.status === 'done' && j.result);
  const isProcessing = jobs.some((j) => j.status === 'queued' || j.status === 'processing');
  const safeTab = Math.min(activeTab, Math.max(0, doneJobs.length - 1));
  const activeJob = doneJobs[safeTab];

  if (!activeJob || !activeJob.result) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        {/* Spinner */}
        <div className="relative w-16 h-16">
          <svg className="animate-spin w-16 h-16" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="var(--bg-tertiary)" strokeWidth="2" />
            <circle
              cx="12" cy="12" r="10" fill="none" stroke="var(--accent)" strokeWidth="2"
              strokeDasharray="15 62.8" strokeLinecap="round" transform="rotate(-90 12 12)"
            />
          </svg>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>Processando transcricoes...</p>
        <button
          onClick={onShowQueue}
          className="px-4 py-2 rounded-lg text-sm cursor-pointer"
          style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          Ver fila
        </button>
      </div>
    );
  }

  const result = activeJob.result;
  const fileName = activeJob.fileName;

  const handleCopy = async () => {
    await copyToClipboard(result.full_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportTxt = async () => {
    const text = generateTxt(result.segments);
    await saveFile(text, `${stripExtension(fileName)}.txt`, 'Texto', ['txt']);
  };

  const handleExportSrt = async () => {
    const srt = generateSrt(result.segments);
    await saveFile(srt, `${stripExtension(fileName)}.srt`, 'Legenda SRT', ['srt']);
  };

  const durationMin = Math.round(result.duration_ms / 60000);
  const segmentCount = result.segments.length;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      {(doneJobs.length > 1 || isProcessing) && (
        <div
          className="flex overflow-x-auto shrink-0 px-4 pt-1 gap-1"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {doneJobs.map((job, i) => (
            <button
              key={job.id}
              onClick={() => {
                onTabChange(i);
                setCopied(false);
              }}
              className="px-4 py-2 text-xs font-medium rounded-t-lg shrink-0 cursor-pointer transition-colors truncate max-w-[180px]"
              style={{
                backgroundColor: i === safeTab ? 'var(--bg-secondary)' : 'transparent',
                color: i === safeTab ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: i === safeTab ? '2px solid var(--accent)' : '2px solid transparent',
              }}
              title={stripExtension(job.fileName)}
            >
              {stripExtension(job.fileName)}
            </button>
          ))}
          {isProcessing && (
            <span
              className="px-3 py-2 text-xs flex items-center gap-1 shrink-0"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: 'var(--accent)', animation: 'pulse 1.5s ease-in-out infinite' }}
              />
              processando...
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col p-6 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold truncate">{stripExtension(fileName)}</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {segmentCount} segmentos &middot; ~{durationMin} min &middot; {result.language}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {jobs.length > 1 && (
              <button
                onClick={onShowQueue}
                className="px-3 py-2 rounded-lg text-sm font-medium cursor-pointer"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                Fila
              </button>
            )}
            <button
              onClick={onNewTranscription}
              className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              Nova transcricao
            </button>
          </div>
        </div>

        {/* Transcript text */}
        <div
          className="flex-1 overflow-y-auto rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          {result.full_text}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 py-3 rounded-lg font-medium text-sm cursor-pointer transition-colors"
            style={{ backgroundColor: copied ? '#22c55e' : 'var(--accent)', color: '#0a0e17' }}
          >
            {copied ? 'Copiado!' : 'Copiar texto'}
          </button>
          <button
            onClick={handleExportTxt}
            className="flex-1 py-3 rounded-lg font-medium text-sm cursor-pointer"
            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          >
            Exportar .txt
          </button>
          <button
            onClick={handleExportSrt}
            className="flex-1 py-3 rounded-lg font-medium text-sm cursor-pointer"
            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          >
            Exportar .srt
          </button>
          {doneJobs.length > 1 && (
            <button
              onClick={onExportAll}
              className="flex-1 py-3 rounded-lg font-medium text-sm cursor-pointer"
              style={{ backgroundColor: '#6366f1', color: '#fff' }}
            >
              Todos (.zip)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
