import { useState, useCallback, useEffect } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { pickFiles, MEDIA_EXTENSIONS } from '../lib/tauri-bridge';
import { LANGUAGES, OUTPUT_LANGUAGES, DEFAULT_LANGUAGE, DEFAULT_OUTPUT_LANGUAGE } from '../lib/languages';

interface Props {
  onFilesSelected: (files: {path: string, name: string}[], language: string, outputLanguage: string) => void;
  modelName: string;
  onChangeModel: () => void;
}

export function DropZone({ onFilesSelected, modelName, onChangeModel }: Props) {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [outputLanguage, setOutputLanguage] = useState(DEFAULT_OUTPUT_LANGUAGE);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback((filePaths: string[]) => {
    const validFiles = filePaths
      .filter((p) => {
        const ext = p.split('.').pop()?.toLowerCase() ?? '';
        return MEDIA_EXTENSIONS.includes(ext);
      })
      .map((p) => ({
        path: p,
        name: p.split('/').pop() ?? p,
      }));
    if (validFiles.length > 0) {
      onFilesSelected(validFiles, language, outputLanguage);
    }
  }, [language, outputLanguage, onFilesSelected]);

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
          handleFiles(paths);
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [handleFiles]);

  const handlePick = useCallback(async () => {
    const files = await pickFiles();
    if (files && files.length > 0) {
      onFilesSelected(files, language, outputLanguage);
    }
  }, [language, outputLanguage, onFilesSelected]);

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
            {isDragging ? 'Solte os arquivos aqui' : 'Arraste ou clique para selecionar'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(148, 163, 184, 0.8)' }}>
            Selecione um ou mais arquivos de audio/video
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Idioma do audio:
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
            Saida:
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
