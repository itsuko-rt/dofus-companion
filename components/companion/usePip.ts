'use client';
// Always-on-top window for the companion: Document Picture-in-Picture (Chrome and Edge 116+), which keeps a small
// browser window above other windows, including a game in windowed or borderless mode. Without the API, a regular
// popup opens instead (it does not stay on top: useful on a second screen). Read-only: nothing touches the game.
import { useCallback, useEffect, useState } from 'react';

interface DocumentPiP { requestWindow(o?: { width?: number; height?: number }): Promise<Window>; window: Window | null }
const pipApi = () => (typeof window !== 'undefined' ? (window as unknown as { documentPictureInPicture?: DocumentPiP }).documentPictureInPicture : undefined);

/** Copies the page's styles into the new window so the companion looks the same there. */
function copyStyles(to: Window) {
  for (const sheet of [...document.styleSheets]) {
    try {
      const style = to.document.createElement('style');
      style.textContent = [...sheet.cssRules].map((r) => r.cssText).join('\n');
      to.document.head.appendChild(style);
    } catch {
      // cross-origin sheet (fonts): link it instead
      if (sheet.href) { const link = to.document.createElement('link'); link.rel = 'stylesheet'; link.href = sheet.href; to.document.head.appendChild(link); }
    }
  }
  to.document.documentElement.className = document.documentElement.className;
  to.document.documentElement.lang = document.documentElement.lang;
  to.document.body.className = 'font-sans antialiased';
  to.document.title = 'Atlas · Compagnon';
}

export function usePip() {
  const [win, setWin] = useState<Window | null>(null);
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(!!pipApi()), []);
  /** 'pip': always-on-top window; 'popup': regular window (no API, or the API refused); 'blocked': the browser refused both */
  const open = useCallback(async (size = { width: 400, height: 620 }): Promise<'pip' | 'popup' | 'blocked'> => {
    const api = pipApi();
    if (api) {
      try {
        const w = await api.requestWindow(size); // needs a click (user activation)
        copyStyles(w);
        w.addEventListener('pagehide', () => setWin(null), { once: true });
        setWin(w);
        return 'pip';
      } catch { /* refused (no user activation, embedded browser, policy): fall back to a popup */ }
    }
    const pop = window.open('/compagnon?fenetre=1', 'atlas-compagnon', `popup,width=${size.width},height=${size.height}`);
    return pop ? 'popup' : 'blocked';
  }, []);
  const close = useCallback(() => { win?.close(); setWin(null); }, [win]);
  return { win, open, close, supported };
}
