import type { MatchEvent } from '@football-app/shared-types';

// Traitement visuel par type d'événement (handoff design du 2026-09-20). `detail` est la
// valeur brute TheSportsDB (ex: "Normal Goal", "Yellow Card") — pas un enum fermé côté API,
// donc on gère les variantes connues et on retombe sur un traitement neutre sinon plutôt que
// de planter.
function describeEvent(event: MatchEvent) {
  const detail = (event.detail ?? '').toLowerCase();

  if (event.type === 'goal') {
    if (detail.includes('missed')) {
      return { shape: '999px', size: 10, color: 'var(--fb-text-3)', label: 'Penalty manqué', strike: true };
    }
    if (detail.includes('own')) {
      return { shape: '999px', size: 10, color: 'var(--fb-action)', label: 'But contre son camp', strike: false };
    }
    if (detail.includes('penalty')) {
      return { shape: '999px', size: 10, color: 'var(--fb-action)', label: 'But (penalty)', strike: false };
    }
    return { shape: '999px', size: 10, color: 'var(--fb-action)', label: 'But', strike: false };
  }
  if (event.type === 'card') {
    if (detail.includes('red')) {
      return { shape: '2px', size: '9px 13px', color: 'var(--fb-live)', label: 'Carton rouge', strike: false };
    }
    return { shape: '2px', size: '9px 13px', color: 'var(--fb-rating)', label: 'Carton jaune', strike: false };
  }
  // substitution
  return { shape: '999px', size: 8, color: 'var(--fb-text-3)', label: 'Remplacement', strike: false };
}

export function MatchEvents({ events }: { events: MatchEvent[] }) {
  if (events.length === 0) return null;
  const sorted = [...events].sort((a, b) => b.minute - a.minute); // "du plus récent au coup d'envoi"

  return (
    <div style={{ border: '1px solid var(--fb-border)', borderRadius: 16, background: 'var(--fb-surface)', overflow: 'hidden' }}>
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--fb-border)',
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <span className="fb-section" style={{ fontSize: 13 }}>
          Faits de match
        </span>
        <span className="fb-meta">du plus récent au coup d'envoi</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {sorted.map((event) => {
          const d = describeEvent(event);
          const who = [event.playerName, event.assistName ? `(passe : ${event.assistName})` : null]
            .filter(Boolean)
            .join(' ');
          const dims = typeof d.size === 'number' ? { width: d.size, height: d.size } : { width: 9, height: 13 };
          return (
            <div
              key={event.id}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'baseline',
                padding: '12px 20px',
                borderBottom: '1px solid var(--fb-border-soft)',
              }}
            >
              <span className="fb-num" style={{ color: 'var(--fb-text-3)', width: 42, flexShrink: 0 }}>
                {event.minute}&apos;
              </span>
              <span
                style={{
                  ...dims,
                  borderRadius: d.shape,
                  background: d.color,
                  flexShrink: 0,
                  transform: 'translateY(2px)',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                <span
                  className="fb-label"
                  style={{
                    fontSize: 11.5,
                    color: d.strike ? 'var(--fb-text-3)' : 'var(--fb-text)',
                    textDecoration: d.strike ? 'line-through' : 'none',
                  }}
                >
                  {d.label}
                </span>
                <span style={{ fontSize: 14, color: 'var(--fb-text-strong-2)' }}>{who || '—'}</span>
              </div>
              <span className="fb-meta" style={{ flexShrink: 0 }}>
                {event.team.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
