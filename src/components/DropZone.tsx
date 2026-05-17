import { useState, useCallback, useEffect } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { pickFile, MEDIA_EXTENSIONS } from '../lib/tauri-bridge';
import { LANGUAGES, OUTPUT_LANGUAGES, DEFAULT_LANGUAGE, DEFAULT_OUTPUT_LANGUAGE } from '../lib/languages';

interface Props {
  onFileSelected: (filePath: string, fileName: string, language: string, outputLanguage: string) => void;
  modelName: string;
  onChangeModel: () => void;
}

export function DropZone({ onFileSelected, modelName, onChangeModel }: Props) {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [outputLanguage, setOutputLanguage] = useState(DEFAULT_OUTPUT_LANGUAGE);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
    if (!MEDIA_EXTENSIONS.includes(ext)) return;
    const name = filePath.split('/').pop() ?? filePath;
    onFileSelected(filePath, name, language, outputLanguage);
  }, [language, outputLanguage, onFileSelected]);

  // Tauri native drag-and-drop
  useEffect(() => {
    const appWindow = getCurrentWebviewWindow();
    const unlisten = appWindow.onDragDropEvent((event) => {
      if (event.payload.type === 'over') {
        setIsDragging(true);
      } else if (event.payload.type === 'leave') {
        setIsDragging(false);
      } else if (event.payload.type === 'drop') {
        setIsDragging(false);
        const paths = event.payload.paths;
        if (paths.length > 0) {
          handleFile(paths[0]);
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [handleFile]);

  const handlePick = useCallback(async () => {
    const file = await pickFile();
    if (file) {
      onFileSelected(file.path, file.name, language, outputLanguage);
    }
  }, [language, outputLanguage, onFileSelected]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 p-8">
      {/* Logo */}
      <img
        src="/logo.png"
        alt="Transcrição Rápida"
        className="w-32 h-32 rounded-2xl"
        style={{ filter: 'drop-shadow(0 0 20px rgba(45, 212, 191, 0.3))' }}
      />

      {/* Drop Zone */}
      <div
        onClick={handlePick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        className="w-full max-w-lg h-48 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300"
        style={{
          border: `2px dashed ${isDragging ? '#2dd4bf' : 'rgba(45, 212, 191, 0.3)'}`,
          background: isDragging
            ? 'linear-gradient(135deg, rgba(45, 212, 191, 0.08), rgba(59, 130, 246, 0.08))'
            : 'linear-gradient(135deg, rgba(45, 212, 191, 0.04), rgba(59, 130, 246, 0.04))',
        }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: '#2dd4bf' }}
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="text-center">
          <p className="text-lg font-medium" style={{ color: '#e2e8f0' }}>
            {isDragging ? 'Solte o arquivo aqui' : 'Arraste ou clique para selecionar'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(148, 163, 184, 0.8)' }}>
            mp3, wav, m4a, flac, ogg, aac, mp4, mov, webm, mkv, avi, m4v, ts
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Idioma do áudio:
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm bg-transparent outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Saída:
          </label>
          <select
            value={outputLanguage}
            onChange={(e) => setOutputLanguage(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm bg-transparent outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            {OUTPUT_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Modelo:
          </label>
          <button
            onClick={(e) => { e.stopPropagation(); onChangeModel(); }}
            className="px-3 py-1.5 rounded-lg text-sm cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            {modelName}
          </button>
        </div>
      </div>
    </div>
  );
}
