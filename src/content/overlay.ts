import type { ContentData } from '../types';

const OVERLAY_KEY = 'libry_content_overlay_v1';

export function loadContentOverlay(): ContentData | null {
  try {
    const raw = localStorage.getItem(OVERLAY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ContentData;
    if (!parsed || !Array.isArray(parsed.stands)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveContentOverlay(data: ContentData): void {
  localStorage.setItem(OVERLAY_KEY, JSON.stringify(data));
}

export function clearContentOverlay(): void {
  localStorage.removeItem(OVERLAY_KEY);
}

export function downloadContentJson(data: ContentData, filename = 'content.json'): void {
  const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadBinaryFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Re-download a data: URL as a binary file (for public/cards/). */
export function downloadDataUrlAsFile(
  dataUrl: string,
  filename = 'card.webp',
): void {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return;
  const header = dataUrl.slice(0, comma);
  const body = dataUrl.slice(comma + 1);
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? 'application/octet-stream';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  downloadBinaryFile(new Blob([bytes], { type: mime }), filename);
}
