'use client';
// OCR step of the scan, in the browser: the screenshot never leaves the player's computer.
// Swappable: anything returning OcrLine[] for an image can replace Tesseract here.
import type { OcrLine } from '../../src/recognize.ts';

type Worker = Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>;
let worker: Promise<Worker> | null = null;

/** French model, loaded once (≈ 2 MB, downloaded from the Tesseract CDN on first use, then cached by the browser). */
export function ocrWorker(onProgress?: (p: number) => void): Promise<Worker> {
  return (worker ??= import('tesseract.js').then(({ createWorker }) =>
    createWorker('fra', 1, { logger: (m: { status: string; progress: number }) => onProgress?.(m.progress) }),
  ).catch((e) => { worker = null; throw e; }));
}

/**
 * Game UIs are light text on dark panels at small sizes: upscale, grey, and invert dark images
 * so the OCR sees dark text on light background. Works whatever the resolution or UI scale.
 */
export function preprocess(img: CanvasImageSource & { width: number; height: number }, minHeight = 1400): HTMLCanvasElement {
  const scale = Math.min(3, Math.max(1, minHeight / img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  let sum = 0;
  for (let i = 0; i < d.data.length; i += 4) {
    const g = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
    d.data[i] = d.data[i + 1] = d.data[i + 2] = g;
    sum += g;
  }
  if (sum / (d.data.length / 4) < 128) for (let i = 0; i < d.data.length; i += 4) d.data[i] = d.data[i + 1] = d.data[i + 2] = 255 - d.data[i];
  ctx.putImageData(d, 0, 0);
  return c;
}

export async function readLines(img: CanvasImageSource & { width: number; height: number }, onProgress?: (p: number) => void): Promise<OcrLine[]> {
  const w = await ocrWorker(onProgress);
  const { data } = await w.recognize(preprocess(img), {}, { blocks: true, text: false });
  const lines: OcrLine[] = [];
  for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) {
    const text = l.text.trim();
    if (text) lines.push({ text, confidence: l.confidence });
  }
  return lines;
}

/** One frame of a window or screen the player picks in the browser's own sharing dialog; sharing stops right after. */
export async function captureFrame(): Promise<ImageBitmap> {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  try {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise((r) => setTimeout(r, 300)); // let the first real frame arrive
    return await createImageBitmap(video);
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}
