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
 * Black-on-white views of a capture for the OCR. Game windows mix a dark scene, panels, striped rows, icons and
 * light text: grey levels alone keep the stripes, which made Tesseract skip most rows (2026-11-23, 3 lines read out
 * of 7). Thresholding keeps only the text. A single Otsu threshold tends to split the dark tones (scene vs panel), so
 * a second one is computed on the bright side only, which isolates the text; both views are read.
 * Game text at 1080p is ~12 px high: upscaled to ~2000 px of height it reads much better (max ×3).
 */
export function preprocess(img: CanvasImageSource & { width: number; height: number }, minHeight = 2000): HTMLCanvasElement[] {
  const scale = Math.min(3, Math.max(1, minHeight / img.height));
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const base = document.createElement('canvas');
  base.width = w; base.height = h;
  const ctx = base.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const grey = new Uint8ClampedArray(w * h);
  const hist = new Array<number>(256).fill(0);
  let sum = 0;
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    grey[j] = g; hist[g]++; sum += g;
  }
  // on a light screenshot the text is the dark side: mirror the histogram so "text = bright" holds
  const dark = sum / grey.length < 128;
  if (!dark) { hist.reverse(); for (let j = 0; j < grey.length; j++) grey[j] = 255 - grey[j]; }
  const t1 = otsu(hist, 0, 255);
  const t2 = otsu(hist, t1 + 1, 255);
  const thresholds = [...new Set([t2, t1])].filter((t) => t > 0 && t < 255);
  return thresholds.map((t) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const out = new ImageData(w, h);
    for (let j = 0, i = 0; j < grey.length; j++, i += 4) {
      const v = grey[j] > t ? 0 : 255;
      out.data[i] = out.data[i + 1] = out.data[i + 2] = v; out.data[i + 3] = 255;
    }
    c.getContext('2d')!.putImageData(out, 0, 0);
    return c;
  });
}

/** Otsu's threshold on the histogram range [from, to]: the level that best separates it into two classes. */
export function otsu(hist: number[], from = 0, to = 255): number {
  let total = 0, sumAll = 0;
  for (let i = from; i <= to; i++) { total += hist[i]; sumAll += i * hist[i]; }
  let sumB = 0, wB = 0, best = -1, t = Math.round((from + to) / 2);
  for (let i = from; i <= to; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const between = wB * wF * (sumB / wB - (sumAll - sumB) / wF) ** 2;
    if (between > best) { best = between; t = i; }
  }
  return t;
}

export async function readLines(img: CanvasImageSource & { width: number; height: number }, onProgress?: (p: number) => void): Promise<OcrLine[]> {
  const w = await ocrWorker(onProgress);
  const lines: OcrLine[] = [];
  for (const view of preprocess(img)) {
    const { data } = await w.recognize(view, {}, { blocks: true, text: false });
    for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) {
      const text = l.text.trim();
      if (text) lines.push({ text, confidence: l.confidence });
    }
  }
  return lines; // every view: the matcher keeps the best reading of each name
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

/**
 * A sharing session on one window the player picks in the browser's dialog (the browser shows its own "sharing"
 * indicator). Frames are read only when asked (grab) or, in automatic mode, when the view has changed (the player
 * scrolls the list in game). Read-only pixels: nothing is sent to the game, nothing leaves the browser.
 */
export interface ShareSession { video: HTMLVideoElement; grab(): Promise<ImageBitmap>; changed(): boolean; stop(): void; onEnded(f: () => void): void }
export async function startShare(): Promise<ShareSession> {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  await video.play();
  await new Promise((r) => setTimeout(r, 300));
  const small = document.createElement('canvas');
  small.width = 48; small.height = 48;
  const sctx = small.getContext('2d', { willReadFrequently: true })!;
  let last: Uint8ClampedArray | null = null;
  return {
    video,
    grab: () => createImageBitmap(video),
    /** true when the view differs from the last call's (mean grey difference on a 48×48 thumbnail) */
    changed() {
      sctx.drawImage(video, 0, 0, 48, 48);
      const d = sctx.getImageData(0, 0, 48, 48).data;
      let diff = 0;
      if (last) for (let i = 0; i < d.length; i += 4) diff += Math.abs(d[i] - last[i]) + Math.abs(d[i + 1] - last[i + 1]) + Math.abs(d[i + 2] - last[i + 2]);
      const moved = !last || diff / (48 * 48 * 3) > 4;
      last = d;
      return moved;
    },
    stop: () => stream.getTracks().forEach((t) => t.stop()),
    onEnded: (f) => stream.getVideoTracks()[0]?.addEventListener('ended', f),
  };
}
