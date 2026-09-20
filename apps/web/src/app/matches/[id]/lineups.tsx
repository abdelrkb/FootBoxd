import type { Match } from '@football-app/shared-types';
import { Crest } from '../../../components/ui/crest';
import { EmptyContent } from '../../../components/ui/empty-state';

interface LineupRow {
  idPlayer: string;
  strPlayer: string;
  strHome: 'Yes' | 'No';
}

// L'API ne fournit ni formation tactique ni remplaçants (vérifié en réel, voir
// architecture.md section 2) — pas de terrain tactique, juste les 11 titulaires à plat.
export function Lineups({ match }: { match: Match }) {
  const rows = match.lineups as LineupRow[] | null;

  if (!rows || rows.length === 0) {
    return <EmptyContent title="Compositions indisponibles" subtitle="Cette ligue ne fournit pas les feuilles de match." />;
  }

  const home = rows.filter((p) => p.strHome === 'Yes');
  const away = rows.filter((p) => p.strHome === 'No');

  return (
    <div style={{ border: '1px solid var(--fb-border)', borderRadius: 16, background: 'var(--fb-surface)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--fb-border)', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span className="fb-section" style={{ fontSize: 13 }}>
          Compositions
        </span>
        <span className="fb-meta">11 titulaires</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--fb-border)' }}>
        {[
          { team: match.homeTeam, players: home },
          { team: match.awayTeam, players: away },
        ].map(({ team, players }) => (
          <div key={team.id} style={{ background: 'var(--fb-surface)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Crest src={team.logoUrl} alt={team.name} size={22} />
              <span className="fb-label" style={{ color: 'var(--fb-text-2)', fontSize: 11.5 }}>
                {team.name}
              </span>
            </div>
            {players.map((p) => (
              <span key={p.idPlayer} style={{ fontSize: 14, color: '#E6EAF1' }}>
                {p.strPlayer}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
