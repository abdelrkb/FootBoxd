'use client';

import { useEffect, useState } from 'react';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function diffParts(kickoffAt: string) {
  const ms = new Date(kickoffAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

// Compte à rebours J-H-M-S avant le coup d'envoi, mis à jour chaque seconde. Rendu identique
// SSR/premier rendu client (`null` puis vraie valeur) pour éviter un hydration mismatch — la
// valeur dépend de `Date.now()`, donc pas calculable côté serveur (même approche que ClientDate).
export function KickoffCountdown({ kickoffAt }: { kickoffAt: string }) {
  const [parts, setParts] = useState<ReturnType<typeof diffParts>>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setParts(diffParts(kickoffAt));
    const timer = setInterval(() => setParts(diffParts(kickoffAt)), 1000);
    return () => clearInterval(timer);
  }, [kickoffAt]);

  if (!mounted) return null;
  if (!parts) {
    return (
      <span className="fb-num" style={{ fontSize: 13, color: 'var(--fb-action)', fontWeight: 700 }}>
        Coup d&rsquo;envoi
      </span>
    );
  }

  return (
    <span className="fb-num" style={{ display: 'inline-flex', gap: 6, fontSize: 15, fontWeight: 700 }}>
      <span>{parts.days}j</span>
      <span>{pad(parts.hours)}h</span>
      <span>{pad(parts.minutes)}m</span>
      <span>{pad(parts.seconds)}s</span>
    </span>
  );
}
