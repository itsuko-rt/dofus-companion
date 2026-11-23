'use client';
// Live view of the shared window, where the player draws a frame around the list to read (drag with mouse or
// finger). Only the framed part is read: faster, cleaner, and the moving game scene around it is ignored.
import { useEffect, useRef, useState } from 'react';
import type { Region } from './ocr';

export default function FramePicker({ video, region, onRegion }: { video: HTMLVideoElement; region: Region | null; onRegion: (r: Region | null) => void }) {
  const slot = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(16 / 9);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  useEffect(() => {
    const box = slot.current;
    if (!box) return;
    video.className = 'absolute inset-0 h-full w-full';
    video.style.objectFit = 'fill'; // the box has the video's own ratio: fractions of the box are fractions of the window
    box.replaceChildren(video);
    const size = () => { if (video.videoWidth && video.videoHeight) setRatio(video.videoWidth / video.videoHeight); };
    size();
    video.addEventListener('resize', size);
    video.addEventListener('loadedmetadata', size);
    return () => { video.removeEventListener('resize', size); video.removeEventListener('loadedmetadata', size); box.replaceChildren(); };
  }, [video]);

  const at = (e: React.PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const shown = drag
    ? { x: Math.min(drag.x0, drag.x1), y: Math.min(drag.y0, drag.y1), w: Math.abs(drag.x1 - drag.x0), h: Math.abs(drag.y1 - drag.y0) }
    : region;

  return (
    <div className="flex flex-col gap-1.5">
      <div ref={area} className="relative w-full touch-none select-none overflow-hidden rounded-md bg-black" style={{ aspectRatio: ratio }}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); const p = at(e); setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y }); }}
        onPointerMove={(e) => { if (drag) { const p = at(e); setDrag({ ...drag, x1: p.x, y1: p.y }); } }}
        onPointerUp={() => {
          if (!drag) return;
          const r = { x: Math.min(drag.x0, drag.x1), y: Math.min(drag.y0, drag.y1), w: Math.abs(drag.x1 - drag.x0), h: Math.abs(drag.y1 - drag.y0) };
          setDrag(null);
          if (r.w >= 0.03 && r.h >= 0.03) onRegion(r); // a click without dragging keeps the current frame
        }}
        role="img" aria-label="Fenêtre partagée : faites glisser pour encadrer la liste à lire">
        <div ref={slot} className="absolute inset-0" />
        <div className="absolute inset-0 cursor-crosshair" />
        {shown && (
          <div className="pointer-events-none absolute border-2 border-accent shadow-[0_0_0_9999px_rgb(0_0_0/0.55)]"
            style={{ left: `${shown.x * 100}%`, top: `${shown.y * 100}%`, width: `${shown.w * 100}%`, height: `${shown.h * 100}%` }} />
        )}
      </div>
      <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
        {region ? 'Seule la zone encadrée est lue.' : 'Faites glisser sur l’aperçu pour encadrer la liste : la lecture est plus rapide et plus sûre.'}
        {region && <button className="text-brand hover:underline" onClick={() => onRegion(null)}>Lire toute la fenêtre</button>}
      </p>
    </div>
  );
}
