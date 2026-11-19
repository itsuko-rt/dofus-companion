'use client';
// Advertising slot, OFF by default. It renders nothing until both are true:
//  1. NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-…) and the slot id are configured at build time;
//  2. the account plan includes ads (premium never sees any).
// Consent in the EEA/UK/CH is handled by Google's certified CMP (AdSense > Privacy & messaging), which
// AdSense loads itself: no ad script runs here before that is set up (docs/LANCEMENT_PUBLIC.md §5).
// Placement rule: only between content blocks of reading pages, never inside the quest map, the
// build tools or next to buttons.
import { useEffect, useRef } from 'react';
import Script from 'next/script';
import { hasFeature } from '../src/plans.ts';
import { useSession } from './account/useSession';

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export default function AdSlot({ slot, className }: { slot: string | undefined; className?: string }) {
  const session = useSession();
  const pushed = useRef(false);
  const enabled = !!CLIENT && !!slot && session.ready && hasFeature(session.user?.plan, 'ads');
  useEffect(() => {
    if (!enabled || pushed.current) return;
    pushed.current = true;
    try { ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ??= []).push({}); } catch { /* blocked: nothing to do */ }
  }, [enabled]);
  if (!enabled) return null;
  return (
    <aside aria-label="Publicité" className={`my-6 ${className ?? ''}`}>
      <p className="mb-1 text-[10px] uppercase tracking-wider text-faint">Publicité</p>
      {/* reserved height avoids layout shift when the ad loads */}
      <ins className="adsbygoogle block min-h-[100px] overflow-hidden rounded-lg" data-ad-client={CLIENT} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
      <Script id="adsbygoogle" async strategy="afterInteractive" crossOrigin="anonymous" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`} />
    </aside>
  );
}
