'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { League, UserSummary } from '@football-app/shared-types';
import * as api from '../../lib/api';
import { Crest } from '../../components/ui/crest';
import { EmptyContent } from '../../components/ui/empty-state';
import { SkeletonList } from '../../components/ui/skeleton';
import styles from './search.module.css';

const DEBOUNCE_MS = 300;
const RESULTS_LIMIT = 4;
const MOBILE_QUERY = '(max-width: 600px)';

type Category = 'leagues' | 'users';

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', flexShrink: 0 }}
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <span
      className="fb-card-title"
      style={{ fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 2px', display: 'block' }}
    >
      {title} {count > 0 && <span className="fb-meta">({count})</span>}
    </span>
  );
}

function ShowMoreButton({ expanded, remaining, onToggle }: { expanded: boolean; remaining: number; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={expanded}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        width: '100%',
        padding: '8px 2px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--fb-text-2)',
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {expanded ? 'Voir moins' : `Voir ${remaining} de plus`}
      <Chevron open={expanded} />
    </button>
  );
}

function LeagueRow({ league }: { league: League }) {
  return (
    <Link
      href={`/leagues/${league.id}`}
      className="fb-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: 12,
        border: '1px solid var(--fb-border)',
        borderRadius: 12,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <Crest src={league.logoUrl} alt={league.name} size={42} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span className="fb-card-title" style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {league.name}
        </span>
        {league.country && (
          <span className="fb-meta" style={{ fontSize: 12.5 }}>
            {league.country}
          </span>
        )}
      </div>
    </Link>
  );
}

function UserRow({ user }: { user: UserSummary }) {
  return (
    <Link
      href={`/profile/${user.id}`}
      className="fb-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: 12,
        border: '1px solid var(--fb-border)',
        borderRadius: 12,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <Crest src={user.avatarUrl} alt={user.displayName} size={42} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span className="fb-card-title" style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.displayName}
        </span>
        <span className="fb-meta" style={{ fontSize: 12.5 }}>
          @{user.username}
        </span>
      </div>
    </Link>
  );
}

const TAB_LABEL: Record<Category, string> = { leagues: 'Ligues', users: 'Utilisateurs' };

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [leagueResults, setLeagueResults] = useState<League[] | null>(null);
  const [userResults, setUserResults] = useState<UserSummary[] | null>(null);
  const [expanded, setExpanded] = useState<Record<Category, boolean>>({ leagues: false, users: false });
  const [selectedTab, setSelectedTab] = useState<Category | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Sur mobile, une catégorie est toujours active (Ligues par défaut) ; sur desktop, aucune
  // par défaut (vue double colonne). On détecte le passage en mobile pour appliquer ce défaut.
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (isMobile) setSelectedTab((prev) => prev ?? 'leagues');
  }, [isMobile]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setLeagueResults(null);
      setUserResults(null);
      return;
    }
    let cancelled = false;
    setLeagueResults(null);
    setUserResults(null);
    const timer = setTimeout(() => {
      api.searchLeagues(q).then((r) => {
        if (!cancelled) setLeagueResults(r);
      });
      api.searchUsers(q).then((r) => {
        if (!cancelled) setUserResults(r);
      });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const searching = query.trim().length >= 2;
  const loading = searching && (leagueResults === null || userResults === null);
  const noResults = searching && leagueResults?.length === 0 && userResults?.length === 0;

  function toggleExpanded(cat: Category) {
    setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  function selectTab(cat: Category) {
    // Sur mobile une catégorie reste toujours sélectionnée ; sur desktop un second clic
    // désélectionne et revient à la vue double colonne.
    setSelectedTab((prev) => (isMobile ? cat : prev === cat ? null : cat));
  }

  return (
    <div className={styles.page}>
      <h1 className={`fb-display ${styles.title}`}>Rechercher</h1>

      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ligue, pseudo ou nom…"
        style={{
          width: '100%',
          height: 46,
          boxSizing: 'border-box',
          padding: '0 16px',
          borderRadius: 999,
          border: '1px solid var(--fb-border)',
          background: 'var(--fb-surface)',
          color: 'var(--fb-text)',
          fontSize: 15,
        }}
      />

      <div className={styles.tabs}>
        {(Object.keys(TAB_LABEL) as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => selectTab(cat)}
            aria-pressed={selectedTab === cat}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 999,
              border: '1px solid var(--fb-border)',
              background: selectedTab === cat ? 'var(--fb-action)' : 'transparent',
              color: selectedTab === cat ? 'var(--fb-bg)' : 'var(--fb-text)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              maxWidth: 220,
            }}
          >
            {TAB_LABEL[cat]}
          </button>
        ))}
      </div>

      {query.trim().length > 0 && query.trim().length < 2 && (
        <p className="fb-meta" style={{ fontSize: 12 }}>
          Encore un caractère…
        </p>
      )}

      {loading && <SkeletonList />}

      {noResults && <EmptyContent title="Aucun résultat" subtitle="Vérifie l'orthographe." />}

      {searching && !loading && selectedTab === null && (
        <div className={styles.dualLayout}>
          {leagueResults !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SectionHeader title="Ligues" count={leagueResults.length} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {leagueResults.length === 0 ? (
                  <p className="fb-meta" style={{ fontSize: 13 }}>
                    Aucune ligue ne correspond.
                  </p>
                ) : (
                  leagueResults.slice(0, expanded.leagues ? undefined : RESULTS_LIMIT).map((l) => <LeagueRow key={l.id} league={l} />)
                )}
              </div>
              {leagueResults.length > RESULTS_LIMIT && (
                <ShowMoreButton
                  expanded={expanded.leagues}
                  remaining={leagueResults.length - RESULTS_LIMIT}
                  onToggle={() => toggleExpanded('leagues')}
                />
              )}
            </div>
          )}

          {userResults !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SectionHeader title="Utilisateurs" count={userResults.length} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {userResults.length === 0 ? (
                  <p className="fb-meta" style={{ fontSize: 13 }}>
                    Personne ne porte ce nom.
                  </p>
                ) : (
                  userResults.slice(0, expanded.users ? undefined : RESULTS_LIMIT).map((u) => <UserRow key={u.id} user={u} />)
                )}
              </div>
              {userResults.length > RESULTS_LIMIT && (
                <ShowMoreButton
                  expanded={expanded.users}
                  remaining={userResults.length - RESULTS_LIMIT}
                  onToggle={() => toggleExpanded('users')}
                />
              )}
            </div>
          )}
        </div>
      )}

      {searching && !loading && selectedTab === 'leagues' && leagueResults !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeader title="Ligues" count={leagueResults.length} />
          {leagueResults.length === 0 ? (
            <p className="fb-meta" style={{ fontSize: 13 }}>
              Aucune ligue ne correspond.
            </p>
          ) : (
            <div className={styles.resultsGrid}>
              {leagueResults.map((l) => (
                <LeagueRow key={l.id} league={l} />
              ))}
            </div>
          )}
        </div>
      )}

      {searching && !loading && selectedTab === 'users' && userResults !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHeader title="Utilisateurs" count={userResults.length} />
          {userResults.length === 0 ? (
            <p className="fb-meta" style={{ fontSize: 13 }}>
              Personne ne porte ce nom.
            </p>
          ) : (
            <div className={styles.resultsGrid}>
              {userResults.map((u) => (
                <UserRow key={u.id} user={u} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
