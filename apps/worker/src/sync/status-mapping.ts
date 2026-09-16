import type { MatchStatus } from '@football-app/database';

// Table de correspondance décidée le 2026-09-16 — voir architecture.md section 2/6.
const STATUS_MAP: Record<string, MatchStatus> = {
  NS: 'scheduled',
  TBD: 'scheduled',
  // Observés en conditions réelles le 2026-09-16 sur des matchs très en amont (+3/+4 jours) :
  // l'API renvoie parfois un strStatus vide ou la string littérale "null" avant d'assigner NS.
  '': 'scheduled',
  'null': 'scheduled',
  '1H': 'live',
  HT: 'live',
  '2H': 'live',
  ET: 'live',
  BT: 'live',
  P: 'live',
  FT: 'finished',
  AET: 'finished',
  PEN: 'finished',
  AWD: 'finished',
  WO: 'finished',
  PST: 'postponed',
  CANC: 'cancelled',
  SUSP: 'suspended',
  INT: 'suspended',
  ABD: 'abandoned',
};

// Statuts après lesquels le worker ne doit plus jamais réécrire le match (section 2 :
// "Terminé : 1 seule fois — récupération score final, puis plus jamais, sauf edge case").
export const TERMINAL_STATUSES: MatchStatus[] = ['finished', 'cancelled', 'abandoned'];

export function mapApiStatus(rawStatus: string, externalId: string): MatchStatus | null {
  const mapped = STATUS_MAP[rawStatus];
  if (!mapped) {
    console.warn(`[status-mapping] Statut API inconnu "${rawStatus}" pour le match ${externalId} — ignoré`);
    return null;
  }
  return mapped;
}
