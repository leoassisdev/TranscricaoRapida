import type { TranscriptionJob } from '../lib/types';

interface Props {
  jobs: TranscriptionJob[];
  visible: boolean;
  onClose: () => void;
  onExportAll: () => void;
}

export function QueuePopup({ jobs, visible, onClose, onExportAll }: Props) {
  if (!visible || jobs.length === 0) return null;

  const doneCount = jobs.filter((j) => j.status === 'done').length;
  const errorCount = jobs.filter((j) => j.status === 'error').length;
  const total = jobs.length;
  const allFinished = doneCount + errorCount === total;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div
        className="rounded-2xl p-6 w-[460px] max-h-[80vh] flex flex-col"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Fila de Transcricao</h3>
          <span
            className="text-sm font-mono px-2 py-0.5 rounded"
            style={{
              backgroundColor: allFinished ? '#22c55e20' : 'var(--bg-tertiary)',
              color: allFinished ? '#22c55e' : 'var(--text-secondary)',
            }}
          >
            {doneCount}/{total}
          </span>
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-lg p-3"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: `1px solid ${
                  job.status === 'processing'
                    ? 'var(--accent)'
                    : job.status === 'done'
                    ? '#22c55e40'
                    : job.status === 'error'
                    ? '#ef444440'
                    : 'var(--border)'
                }`,
              }}
            >
              <div className="flex items-center gap-3">
                {/* Status indicator */}
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      job.status === 'queued'
                        ? '#64748b'
                        : job.status === 'processing'
                        ? 'var(--accent)'
                        : job.status === 'done'
                        ? '#22c55e'
                        : '#ef4444',
                    boxShadow:
                      job.status === 'processing'
                        ? '0 0 8px var(--accent)'
                        : 'none',
                    animation:
                      job.status === 'processing'
                        ? 'pulse 1.5s ease-in-out infinite'
                        : 'none',
                  }}
                />

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{job.fileName}</p>
                  {job.status === 'processing' && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {job.progressMessage || 'Processando...'}
                    </p>
                  )}
                  {job.status === 'error' && (
                    <p className="text-xs text-red-400 truncate mt-0.5">{job.error}</p>
                  )}
                  {job.status === 'queued' && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      Na fila...
                    </p>
                  )}
                </div>

                {/* Progress % */}
                {job.status === 'processing' && (
                  <span className="text-sm font-mono shrink-0" style={{ color: 'var(--accent)' }}>
                    {job.progress}%
                  </span>
                )}
                {job.status === 'done' && (
                  <span className="text-xs shrink-0" style={{ color: '#22c55e' }}>
                    Pronto
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {job.status === 'processing' && (
                <div
                  className="mt-2 h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--bg-primary)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: 'var(--accent)',
                      width: `${job.progress}%`,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex gap-3">
          {allFinished && doneCount > 0 && (
            <button
              onClick={onExportAll}
              className="flex-1 py-2.5 rounded-lg font-medium text-sm cursor-pointer transition-colors"
              style={{ backgroundColor: 'var(--accent)', color: '#0a0e17' }}
            >
              Exportar Todos (.zip)
            </button>
          )}
          <button
            onClick={onClose}
            className={`${allFinished && doneCount > 0 ? '' : 'flex-1'} py-2.5 px-4 rounded-lg font-medium text-sm cursor-pointer`}
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
            }}
          >
            {allFinished ? 'Ver Transcricoes' : 'Minimizar'}
          </button>
        </div>
      </div>
    </div>
  );
}
