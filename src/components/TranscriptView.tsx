import { useState } from 'react';
import type { TranscriptionResult } from '../lib/types';
import { generateSrt, generateTxt } from '../lib/srt';
import { copyToClipboard, saveFile } from '../lib/tauri-bridge';

interface Props {
  result: TranscriptionResult;
  fileName: string;
  onNewTranscription: () => void;
}

function stripExtension(name: string): string {
  const lastDot = name.lastIndexOf('.');
  return lastDot > 0 ? name.substring(0, lastDot) : name;
}

export function TranscriptView({ result, fileName, onNewTranscription }: Props) {
  const [copied, setCopied] = useState(false);

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
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Transcrição concluída</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {segmentCount} segmentos &middot; ~{durationMin} min &middot; {result.language}
          </p>
        </div>
        <button
          onClick={onNewTranscription}
          className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          Nova transcrição
        </button>
      </div>

      {/* Transcript text */}
      <div
        className="flex-1 overflow-y-auto rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}
      >
        {result.full_text}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="flex-1 py-3 rounded-lg font-medium text-sm cursor-pointer transition-colors"
          style={{
            backgroundColor: copied ? '#22c55e' : 'var(--accent)',
          }}
        >
          {copied ? 'Copiado!' : 'Copiar texto'}
        </button>
        <button
          onClick={handleExportTxt}
          className="flex-1 py-3 rounded-lg font-medium text-sm cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
          }}
        >
          Exportar .txt
        </button>
        <button
          onClick={handleExportSrt}
          className="flex-1 py-3 rounded-lg font-medium text-sm cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
          }}
        >
          Exportar .srt
        </button>
      </div>
    </div>
  );
}
