import type { MatchStatus } from '@football-app/shared-types';
import { LivePill } from './badges';

// Les 7 statuts de match (handoff design) : le libellé est TOUJOURS écrit, la couleur ne porte
// jamais seule l'information (accessibilité). Un seul composant, un seul endroit à vérifier
// pour les 7 cas.
export function StatusLabel({ status, minute }: { status: MatchStatus; minute?: string | null }) {
  switch (status) {
    case 'live':
      return <LivePill minute={minute} />;
    case 'finished':
      return <span className="fb-status fb-status--finished">Terminé</span>;
    case 'postponed':
      return <span className="fb-status fb-status--postponed">Reporté</span>;
    case 'cancelled':
      return <span className="fb-status fb-status--cancelled">Annulé</span>;
    case 'suspended':
      return (
        <span className="fb-status fb-status--suspended" style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 8, height: 8, background: 'var(--fb-rating)' }} />
          Suspendu
        </span>
      );
    case 'abandoned':
      return <span className="fb-status fb-status--abandoned">Abandonné</span>;
    case 'scheduled':
    default:
      return null; // l'heure du coup d'envoi est affichée à la place, pas de libellé de statut
  }
}
