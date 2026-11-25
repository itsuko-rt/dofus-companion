import { test } from 'node:test';
import assert from 'node:assert/strict';
import { binaryViews, otsu } from '../src/threshold.ts';

/** pixels as [r, g, b] triples, in RGBA or BGRA */
const image = (pixels: number[][], bgr = false) => new Uint8ClampedArray(pixels.flatMap(([r, g, b]) => (bgr ? [b, g, r, 255] : [r, g, b, 255])));
const values = (view: Uint8ClampedArray) => [...view].filter((_, i) => i % 4 === 0);

test('otsu splits a two-peak histogram between the peaks', () => {
  const hist = new Array(256).fill(0);
  hist[40] = 500; hist[200] = 100;
  const t = otsu(hist);
  assert.ok(t >= 40 && t < 200, String(t));
});

test('game text: light text on a dark scene and a dark panel comes out black on white, in RGBA and BGRA', () => {
  // scene (very dark), panel (dark brown), text (beige): the bright-side threshold keeps only the text
  const px = [...Array(60).fill([20, 16, 12]), ...Array(30).fill([58, 46, 34]), ...Array(10).fill([234, 223, 200])];
  for (const bgr of [false, true]) {
    const [first] = binaryViews(image(px, bgr), bgr);
    const v = values(first);
    assert.deepEqual(v.slice(90), Array(10).fill(0), 'text is black');
    assert.deepEqual(v.slice(0, 90), Array(90).fill(255), 'scene and panel are white');
  }
});

test('a light screenshot is mirrored: dark text still comes out black', () => {
  const px = [...Array(90).fill([245, 245, 245]), ...Array(10).fill([20, 20, 20])];
  const v = values(binaryViews(image(px))[0]);
  assert.deepEqual(v.slice(90), Array(10).fill(0));
  assert.deepEqual(v.slice(0, 90), Array(90).fill(255));
});
