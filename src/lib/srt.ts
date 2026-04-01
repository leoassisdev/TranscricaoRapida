import type { TranscriptionSegment } from './types';

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function pad3(n: number): string {
  return n.toString().padStart(3, '0');
}

function formatSrtTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const ml = ms % 1000;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(ml)}`;
}

export function generateSrt(segments: TranscriptionSegment[]): string {
  return segments
    .map((seg, i) => {
      const start = formatSrtTime(seg.start_ms);
      const end = formatSrtTime(seg.end_ms);
      return `${i + 1}\n${start} --> ${end}\n${seg.text.trim()}\n`;
    })
    .join('\n');
}

export function generateTxt(segments: TranscriptionSegment[]): string {
  return segments.map((s) => s.text.trim()).join(' ');
}
