'use client';

import { use, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Match, Player, Standing, TeamOverview, TeamStats } from '@football-app/shared-types';
import * as api from '../../../lib/api';
import { ClientDate } from '../../../components/client-date';
import { Crest, CrestPair, TeamNamePair } from '../../../components/ui/crest';
import { ScoreChip } from '../../../components/ui/badges';
import { StatusLabel } from '../../../components/ui/status-label';
import { StarsDisplay } from '../../../components/ui/stars';
import { SpoilerScore } from '../../../components/ui/spoiler-score';
import { EmptyContent } from '../../../components/ui/empty-state';
import { SkeletonList } from '../../../components/ui/skeleton';
import { LeagueStripe } from '../../../components/ui/card-shell';
import { MatchCardMenu } from '../../../components/ui/match-card-menu';
import { StandingsTable } from '../../../components/standings-table';

type Tab = 'results' | 'calendar' | 'standings' | 'news' | 'squad';

type MatchResult = 'win' | 'draw' | 'loss';

// Demandé explicitement (2026-10-21) : savoir si l'équipe suivie a gagné/perdu/fait nul, pas
// seulement voir le score brut. Null si le match n'est pas terminé ou si l'équipe n'y joue pas.
function resultFor(match: Match, teamId: string): MatchResult | null {
  if (match.status !== 'finished' || match.homeScore === null || match.awayScore === null) return null;
  const isHome = match.homeTeam.id === teamId;
  if (!isHome && match.awayTeam.id !== teamId) return null;
  const myScore = isHome ? match.homeScore : match.awayScore;
  const oppScore = isHome ? match.awayScore : match.homeScore;
  if (myScore > oppScore) return 'win';
  if (myScore < oppScore) return 'loss';
  return 'draw';
}

function ResultBadge({ result }: { result: MatchResult }) {
  const t = useTranslations('TeamPage');
  const RESULT_BADGE: Record<MatchResult, { label: string; color: string }> = {
    win: { label: t('resultWin'), color: 'var(--fb-positive, #2DBE60)' },
    draw: { label: t('resultDraw'), color: 'var(--fb-text-2)' },
    loss: { label: t('resultLoss'), color: 'var(--fb-negative, #E5484D)' },
  };
  const { label, color } = RESULT_BADGE[result];
  return (
    <span
      className="fb-label"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 20,
        height: 20,
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        color: '#fff',
        background: color,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

// `perspectiveTeamId` optionnel : affiche le badge V/N/D relatif à cette équipe quand fourni
// (onglet Résultats d'une page équipe) — absent partout ailleurs où MatchRow est déjà utilisé.
function MatchRow({ match, perspectiveTeamId }: { match: Match; perspectiveTeamId?: string }) {
  const result = perspectiveTeamId ? resultFor(match, perspectiveTeamId) : null;
  return (
    <Link
      href={`/matches/${match.id}`}
      className="fb-card"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        border: '1px solid var(--fb-border)',
        borderRadius: 12,
        textDecoration: 'none',
        color: 'inherit',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
        <CrestPair home={match.homeTeam} away={match.awayTeam} size={32} />
        <TeamNamePair
          home={match.homeTeam}
          away={match.awayTeam}
          className="fb-card-title"
          style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        />
      </div>
      {/* Colonne de droite de largeur fixe (issue #52) : sans elle, le score et le badge V/N/D se
          décalent d'une ligne à l'autre selon la longueur du nom des équipes. */}
      <div className="fb-match-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        {match.status === 'scheduled' ? (
          <span className="fb-num" style={{ color: 'var(--fb-text-2)' }}>
            <ClientDate iso={match.kickoffAt} options={{ day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }} fallback="" />
          </span>
        ) : match.status === 'live' || match.status === 'finished' ? (
          <>
            <SpoilerScore>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Emplacement du badge toujours réservé, même sans résultat, pour que le score
                    reste à la même abscisse. */}
                <span style={{ width: 20, flexShrink: 0 }}>{result && <ResultBadge result={result} />}</span>
                <ScoreChip home={match.homeScore} away={match.awayScore} live={match.status === 'live'} />
              </div>
            </SpoilerScore>
            {match.status === 'live' && <StatusLabel status={match.status} minute={match.liveMinute} />}
          </>
        ) : (
          <StatusLabel status={match.status} />
        )}
      </div>
      <MatchCardMenu match={match} />
    </Link>
  );
}

// Résultats et calendrier sont tous les deux "par compétition" (demandé explicitement) — même
// regroupement pour les deux, juste des matchs différents en entrée.
function MatchesByCompetition({
  matches,
  emptyTitle,
  perspectiveTeamId,
}: {
  matches: Match[] | null;
  emptyTitle: string;
  perspectiveTeamId?: string;
}) {
  if (matches === null) return <SkeletonList />;
  if (matches.length === 0) return <EmptyContent title={emptyTitle} />;

  const byLeague = new Map<string, { league: Match['league']; matches: Match[] }>();
  for (const match of matches) {
    const entry = byLeague.get(match.league.id) ?? { league: match.league, matches: [] };
    entry.matches.push(match);
    byLeague.set(match.league.id, entry);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {Array.from(byLeague.values()).map(({ league, matches: leagueMatches }) => (
        <div key={league.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <LeagueStripe league={league} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leagueMatches.map((m) => <MatchRow key={m.id} match={m} perspectiveTeamId={perspectiveTeamId} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// Texte libre fourni par l'API (`strDescription` sur lookuptable.php), pas d'enum fermé — varie
// trop selon la compétition ("Promotion - Champions League (League phase)", "Relegation -
// Championship", etc., vide pour le milieu de tableau). On catégorise juste assez pour une
// couleur, le texte complet (vérifié en réel) reste affiché tel quel au survol.
function SquadGrid({ players }: { players: Player[] }) {
  const t = useTranslations('TeamPage');
  if (players.length === 0) {
    return <EmptyContent title={t('squadUnavailable')} subtitle={t('squadUnavailableHint')} />;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
      {players.map((p) => (
        <div
          key={p.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: 12,
            border: '1px solid var(--fb-border)',
            borderRadius: 12,
            textAlign: 'center',
          }}
        >
          <Crest src={p.photoUrl} alt={p.name} size={56} />
          <span className="fb-card-title" style={{ fontSize: 12.5, lineHeight: 1.3 }}>
            {p.name}
          </span>
          {p.position && <span className="fb-meta" style={{ fontSize: 10.5 }}>{p.position}</span>}
        </div>
      ))}
    </div>
  );
}

// Note moyenne vue par la communauté (issue #7) : pas un onglet à part, juste une info de
// contexte compacte sous l'en-tête — "son match le mieux noté" vit dans l'onglet Résultats,
// où il a naturellement sa place (c'est un match passé).
function CommunityRatingBadge({ stats }: { stats: TeamStats | null }) {
  const t = useTranslations('TeamPage');
  if (stats === null) return null;
  if (stats.totalReviews === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <StarsDisplay rating={stats.averageRating ?? 0} size={16} />
      <span className="fb-num" style={{ fontSize: 14, color: 'var(--fb-rating)' }}>
        {stats.averageRating?.toFixed(1)}
      </span>
      <span className="fb-meta" style={{ fontSize: 12 }}>
        {t('outOfReviews', { count: stats.totalReviews })}
      </span>
    </div>
  );
}

function ResultsTab({ past, stats, teamId }: { past: Match[] | null; stats: TeamStats | null; teamId: string }) {
  const t = useTranslations('TeamPage');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {stats?.bestRatedMatch && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="fb-meta" style={{ fontSize: 11 }}>
            {t('bestRatedMatchOfSeason')}
          </span>
          <MatchRow match={stats.bestRatedMatch.match} perspectiveTeamId={teamId} />
        </div>
      )}
      <MatchesByCompetition matches={past} emptyTitle={t('noMatchPlayedThisSeason')} perspectiveTeamId={teamId} />
    </div>
  );
}

export default function TeamPage({ params }: PageProps<'/teams/[id]'>) {
  const t = useTranslations('TeamPage');
  const tNav = useTranslations('Nav');
  // Ordre demandé explicitement (2026-10-21) : Résultats d'abord, onglet actif par défaut.
  const TABS: { key: Tab; label: string }[] = [
    { key: 'results', label: t('tabResults') },
    { key: 'calendar', label: t('tabCalendar') },
    { key: 'standings', label: t('tabStandings') },
    { key: 'news', label: t('tabNews') },
    { key: 'squad', label: t('tabSquad') },
  ];
  const { id } = use(params);
  const [overview, setOverview] = useState<TeamOverview | null>(null);
  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [upcoming, setUpcoming] = useState<Match[] | null>(null);
  const [past, setPast] = useState<Match[] | null>(null);
  const [squad, setSquad] = useState<Player[] | null>(null);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [tab, setTab] = useState<Tab>('results');

  useEffect(() => {
    api.getTeamOverview(id).then(setOverview);
    api.getTeamStandings(id).then(setStandings);
    api.getTeamMatches(id, 'upcoming').then(setUpcoming);
    api.getTeamMatches(id, 'past').then(setPast);
    api.getTeamSquad(id).then(setSquad);
    api.getTeamStats(id).then(setStats);
  }, [id]);

  if (!overview) return <SkeletonList />;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <Link href="/" className="fb-label" style={{ fontSize: 12, color: 'var(--fb-text-2)' }}>
        ← {tNav('home')}
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <Crest src={overview.logoUrl} alt={overview.name} size={80} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 className="fb-display" style={{ fontSize: 36, margin: 0 }}>
            {overview.name}
          </h1>
          {overview.primaryLeague && (
            <Link
              href={`/leagues/${overview.primaryLeague.id}`}
              className="fb-label"
              style={{ fontSize: 12, color: 'var(--fb-text-2)', textDecoration: 'none' }}
            >
              {overview.primaryLeague.name}
              {overview.standing && ` · ${t('rankOrdinal', { rank: overview.standing.rank })} · ${t('pointsCount', { count: overview.standing.points })}`}
            </Link>
          )}
          <CommunityRatingBadge stats={stats} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--fb-border)', overflowX: 'auto' }}>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="fb-label"
            style={{
              padding: '10px 14px',
              background: 'none',
              border: 'none',
              borderBottom: tab === key ? '2px solid var(--fb-action)' : '2px solid transparent',
              color: tab === key ? 'var(--fb-text)' : 'var(--fb-text-2)',
              fontSize: 13,
              fontWeight: tab === key ? 700 : 600,
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'results' && <ResultsTab past={past} stats={stats} teamId={id} />}
      {tab === 'calendar' && <MatchesByCompetition matches={upcoming} emptyTitle={t('noUpcomingMatch')} />}
      {tab === 'standings' && (standings === null ? <SkeletonList /> : <StandingsTable standings={standings} highlightTeamId={id} />)}
      {tab === 'news' && <EmptyContent title={t('comingSoon')} />}
      {tab === 'squad' && (squad === null ? <SkeletonList /> : <SquadGrid players={squad} />)}
    </div>
  );
}
