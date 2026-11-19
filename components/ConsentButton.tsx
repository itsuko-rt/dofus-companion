'use client';
// "Gérer mes choix": opens Google's certified CMP (Privacy & messaging) when ads are active;
// otherwise there is nothing to consent to, and the button says so instead of pretending.
import { useState } from 'react';
import { Button } from './ui';

type Googlefc = { callbackQueue?: unknown[]; showRevocationMessage?: () => void };

export default function ConsentButton() {
  const [msg, setMsg] = useState<string | null>(null);
  const open = () => {
    const fc = (window as unknown as { googlefc?: Googlefc }).googlefc;
    if (fc?.showRevocationMessage) { fc.showRevocationMessage(); return; }
    setMsg('Aucune publicité ni aucun traceur soumis à consentement n’est actif sur ce site pour le moment : il n’y a rien à accepter ou refuser.');
  };
  return (
    <div>
      <Button onClick={open}>Gérer mes choix de cookies</Button>
      {msg && <p role="status" className="mt-2 text-sm text-muted">{msg}</p>}
    </div>
  );
}
