// Black-on-white views of a capture for the OCR, shared by the browser scanner and the Windows companion.
// Game windows mix a dark scene, panels, striped rows, icons and light text: grey levels alone keep the stripes,
// which made Tesseract skip most rows (2026-11-23, 3 lines read out of 7). Thresholding keeps only the text. A single
// Otsu threshold tends to split the dark tones (scene vs panel), so a second one is computed on the bright side
// only, which isolates the text; both views are read.

/** Otsu's threshold on the histogram range [from, to]: the level that best separates it into two classes. */
export function otsu(hist: ArrayLike<number>, from = 0, to = 255): number {
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

/**
 * Binary views (black text on white, 4 bytes per pixel, alpha 255) of a 4-byte-per-pixel image.
 * `bgr` for Windows bitmaps (BGRA), otherwise RGBA. The output is grey, so it reads the same in either order.
 */
export function binaryViews(px: ArrayLike<number>, bgr = false): Uint8ClampedArray[] {
  const n = px.length >> 2;
  const grey = new Uint8ClampedArray(n);
  const hist = new Array<number>(256).fill(0);
  const [r, b] = bgr ? [2, 0] : [0, 2];
  let sum = 0;
  for (let i = 0, j = 0; j < n; i += 4, j++) {
    const g = Math.round(0.299 * px[i + r] + 0.587 * px[i + 1] + 0.114 * px[i + b]);
    grey[j] = g; hist[g]++; sum += g;
  }
  // on a light screenshot the text is the dark side: mirror the histogram so "text = bright" holds
  if (sum / n >= 128) { hist.reverse(); for (let j = 0; j < n; j++) grey[j] = 255 - grey[j]; }
  const t1 = otsu(hist, 0, 255);
  const t2 = otsu(hist, t1 + 1, 255);
  return [...new Set([t2, t1])].filter((t) => t > 0 && t < 255).map((t) => {
    const out = new Uint8ClampedArray(n * 4);
    for (let j = 0, i = 0; j < n; j++, i += 4) {
      const v = grey[j] > t ? 0 : 255;
      out[i] = out[i + 1] = out[i + 2] = v; out[i + 3] = 255;
    }
    return out;
  });
}
