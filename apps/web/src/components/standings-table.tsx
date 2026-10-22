'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Standing } from '@football-app/shared-types';
import { Crest } from './ui/crest';
import { EmptyContent } from './ui/empty-state';

export function describeZone(description: string | null): { color: string; label: string } | null {
  if (!description) return null;
  const lower = description.toLowerCase();
  if (lower.includes('champions league')) return { color: '#4C8BF5', label: description };
  if (lower.includes('europa')) return { color: '#F5A623', label: description };
  if (lower.includes('conference')) return { color: '#2DBE60', label: description };
  if (lower.includes('relegation') || lower.includes('relégation')) return { color: '#E5484D', label: description };
  if (lower.includes('playoff')) return { color: '#E5C53D', label: description };
  if (lower.includes('promotion')) return { color: '#2DBE60', label: description };
  if (lower.includes('qualif')) return { color: '#4C8BF5', label: description };
  return { color: 'var(--fb-text-2)', label: description };
}

// Partagé entre la page équipe et la page ligue (issue #58) : même tableau, seule la ligne
// éventuellement mise en évidence change.
export function StandingsTable({ standings, highlightTeamId }: { standings: Standing[]; highlightTeamId?: string }) {
  const t = useTranslations('StandingsTable');
  if (standings.length === 0) {
    return <EmptyContent title={t('standingsUnavailable')} subtitle={t('standingsUnavailableHint')} />;
  }

  const zones = new Map<string, string>();
  for (const row of standings) {
    const zone = describeZone(row.description);
    if (zone) zones.set(zone.label, zone.color);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--fb-border)', borderRadius: 12, overflow: 'hidden' }}>
        <div
          className="fb-label"
          style={{
            display: 'grid',
            gridTemplateColumns: '28px 1fr 34px 34px 34px 34px',
            gap: 8,
            padding: '8px 14px',
            fontSize: 10.5,
            color: 'var(--fb-text-2)',
            background: 'var(--fb-surface-2)',
          }}
        >
          <span>#</span>
          <span>{t('team')}</span>
          <span style={{ textAlign: 'right' }}>{t('played')}</span>
          <span style={{ textAlign: 'right' }}>{t('goalDifference')}</span>
          <span style={{ textAlign: 'right' }}>{t('goalsFor')}</span>
          <span style={{ textAlign: 'right' }}>{t('points')}</span>
        </div>
        {standings.map((row) => {
          const zone = describeZone(row.description);
          return (
            <Link
              key={row.id}
              href={`/teams/${row.team.id}`}
              title={zone?.label}
              className="fb-num"
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr 34px 34px 34px 34px',
                gap: 8,
                padding: '10px 14px',
                fontSize: 13,
                alignItems: 'center',
                textDecoration: 'none',
                color: 'inherit',
                background: row.team.id === highlightTeamId ? 'var(--fb-rating-bg)' : undefined,
                borderTop: '1px solid var(--fb-border)',
                borderLeft: zone ? `3px solid ${zone.color}` : '3px solid transparent',
              }}
            >
              <span style={{ color: 'var(--fb-text-2)' }}>{row.rank}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <Crest src={row.team.logoUrl} alt={row.team.name} size={20} />
                <span className="fb-card-title" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.team.name}
                </span>
              </span>
              <span style={{ textAlign: 'right' }}>{row.played}</span>
              <span style={{ textAlign: 'right' }}>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</span>
              <span style={{ textAlign: 'right' }}>{row.goalsFor}</span>
              <span style={{ textAlign: 'right', fontWeight: 700 }}>{row.points}</span>
            </Link>
          );
        })}
      </div>
      {zones.size > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
          {Array.from(zones.entries()).map(([label, color]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }} className="fb-meta">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
