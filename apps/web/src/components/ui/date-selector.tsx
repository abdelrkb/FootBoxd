'use client';

import { useState } from 'react';
import { ClientDate } from '../client-date';
import { Pill } from './pill';
import { daysFromOffset, offsetFromToday, todayString } from '../../lib/calendar-days';

const DAYS_BEFORE_TODAY = 2;
const VISIBLE_DAYS = 7; // 2 jours passés, aujourd'hui, 4 jours à venir

function ArrowButton({ direction, onClick }: { direction: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={direction === 'prev' ? 'Jour précédent' : 'Jour suivant'}
      style={{
        width: 38,
        height: 38,
        flexShrink: 0,
        borderRadius: 999,
        border: '1px solid var(--fb-border)',
        background: 'transparent',
        color: 'var(--fb-text-2)',
        fontSize: 18,
        lineHeight: 1,
      }}
    >
      {direction === 'prev' ? '‹' : '›'}
    </button>
  );
}

// "Format court + date numérique, dans la locale du navigateur" (handoff design), ex "jeu. 17/09".
// Fenêtre de VISIBLE_DAYS jours qui glisse d'un jour à chaque clic sur une flèche (pas de scroll) :
// par défaut 2 jours passés max visibles avant aujourd'hui.
export function DateSelector({ selected, onSelect }: { selected: string; onSelect: (day: string) => void }) {
  const [startOffset, setStartOffset] = useState(() => {
    // Un lien profond (?date=...) hors de la fenêtre par défaut doit rester visible.
    const selectedOffset = offsetFromToday(selected);
    const defaultStart = -DAYS_BEFORE_TODAY;
    if (selectedOffset < defaultStart) return selectedOffset;
    if (selectedOffset > defaultStart + VISIBLE_DAYS - 1) return selectedOffset - (VISIBLE_DAYS - 1);
    return defaultStart;
  });
  const days = daysFromOffset(startOffset, VISIBLE_DAYS);
  const today = todayString();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <ArrowButton direction="prev" onClick={() => setStartOffset((o) => o - 1)} />
      <div style={{ display: 'flex', gap: 5, flex: 1, minWidth: 0, flexWrap: 'nowrap' }}>
        {days.map((d) => (
          <Pill key={d} compact selected={d === selected} onClick={() => onSelect(d)}>
            {d === today ? (
              "Aujourd'hui"
            ) : (
              <ClientDate iso={d} options={{ weekday: 'short', day: '2-digit', month: '2-digit' }} fallback={d} />
            )}
          </Pill>
        ))}
      </div>
      <ArrowButton direction="next" onClick={() => setStartOffset((o) => o + 1)} />
    </div>
  );
}
