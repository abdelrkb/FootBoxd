'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Match, League, PopularReview, PopularMatch, ReviewWithMatch, UserSuggestion } from '@football-app/shared-types';
import * as api from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { ReviewMiniCard } from '../components/review-mini-card';
import { MatchMiniCard } from '../components/match-mini-card';
import { DateSelector } from '../components/ui/date-selector';
import { Crest } from '../components/ui/crest';
import { LiveCountBadge } from '../components/ui/badges';
import { EmptyContent, EmptySocial } from '../components/ui/empty-state';
import { SkeletonList } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { leagueAccentColor, cardShellStyle } from '../components/ui/card-shell';
import { todayString } from '../lib/calendar-days';

interface LeagueRow {
  league: League;
  liveCount: number;
  isFavorite: boolean;
}

// "Supporte le même club, amis de tes amis" (issue #17) — raison affichée telle que calculée
// côté service (follows.service.ts `getSuggestions`), pas reformulée en front. Le pluriel
// "ami(s)" est géré par le pluriel ICU du message (issue #27 : différent en anglais).
function reasonLabel(t: ReturnType<typeof useTranslations>, s: UserSuggestion): string {
  if (s.reason === 'both') return t('sameClubAndMutualFriends', { count: s.mutualFriends });
  if (s.reason === 'same_club') return t('sameClub');
  return t('mutualFriends', { count: s.mutualFriends });
}

function SuggestionRow({ suggestion, onFollowed }: { suggestion: UserSuggestion; onFollowed: (id: string) => void }) {
  const t = useTranslations('HomePage');
  const [pending, setPending] = useState(false);

  async function handleFollow() {
    setPending(true);
    try {
      await api.followUser(suggestion.id);
      onFollowed(suggestion.id);
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ ...cardShellStyle(), alignItems: 'center' }} className="fb-card">
      <Link href={`/profile/${suggestion.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1, textDecoration: 'none', color: 'inherit' }}>
        <Crest src={suggestion.avatarUrl} alt={suggestion.displayName} size={36} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span className="fb-card-title" style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {suggestion.displayName}
          </span>
          <span className="fb-meta" style={{ fontSize: 11.5 }}>
            {suggestion.compatibility !== null && (
              <>
                <span className="fb-num" style={{ fontWeight: 700, color: 'var(--fb-action)' }}>
                  {t('compatiblePercent', { percent: suggestion.compatibility })}
                </span>
                {' · '}
              </>
            )}
            {reasonLabel(t, suggestion)}
          </span>
        </div>
      </Link>
      <Button size="sm" loading={pending} onClick={handleFollow} style={{ flexShrink: 0 }}>
        {t('follow')}
      </Button>
    </div>
  );
}

function Sidebar({ user }: { user: { id: string } | null }) {
  const t = useTranslations('HomePage');
  const tNav = useTranslations('Nav');
  const [popularReviews, setPopularReviews] = useState<PopularReview[] | null>(null);
  const [followingReviews, setFollowingReviews] = useState<ReviewWithMatch[] | null>(null);
  const [popularMatches, setPopularMatches] = useState<PopularMatch[] | null>(null);
  const [suggestions, setSuggestions] = useState<UserSuggestion[] | null>(null);

  useEffect(() => {
    api.getPopularReviews().then(setPopularReviews);
    api.getPopularMatches().then(setPopularMatches);
  }, []);

  useEffect(() => {
    if (user) {
      api.getFollowingReviews().then(setFollowingReviews);
      api.getFollowSuggestions().then(setSuggestions);
    }
  }, [user]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 className="fb-section" style={{ margin: 0 }}>
          {t('popularReviews')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {popularReviews === null && <SkeletonList />}
          {popularReviews?.length === 0 && (
            <EmptyContent title={t('nothingPopular')} subtitle={t('quietLast48h')} />
          )}
          {popularReviews?.map((r) => (
            <ReviewMiniCard key={r.id} review={r} />
          ))}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 className="fb-section" style={{ margin: 0 }}>
          {t('friendsReviews')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!user && (
            <EmptySocial
              title={t('loginToSeeFriends')}
              subtitle={t('friendsRatingsHint')}
              action={
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Link href="/login">
                    <Button size="sm">{tNav('login')}</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" variant="secondary">
                      {tNav('register')}
                    </Button>
                  </Link>
                </div>
              }
            />
          )}
          {user && followingReviews === null && <SkeletonList />}
          {user && followingReviews?.length === 0 && (
            <EmptySocial
              title={t('followPeopleFillFeed')}
              subtitle={t('notFollowingAnyoneYet')}
              action={
                <Link href="/search">
                  <Button size="sm">{t('findPeople')}</Button>
                </Link>
              }
            />
          )}
          {followingReviews?.map((r) => (
            <ReviewMiniCard key={r.id} review={r} />
          ))}
        </div>
      </section>

      {user && suggestions !== null && suggestions.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 className="fb-section" style={{ margin: 0 }}>
            {t('accountsToFollow')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {suggestions.map((s) => (
              <SuggestionRow
                key={s.id}
                suggestion={s}
                onFollowed={(id) => setSuggestions((prev) => prev?.filter((p) => p.id !== id) ?? null)}
              />
            ))}
          </div>
        </section>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 className="fb-section" style={{ margin: 0 }}>
          {t('popularMatches')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {popularMatches === null && <SkeletonList />}
          {popularMatches?.length === 0 && (
            <EmptyContent title={t('nothingPopular')} subtitle={t('quietLast48h')} />
          )}
          {popularMatches?.map((m) => (
            <MatchMiniCard key={m.id} match={m} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations('HomePage');
  const { user, loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [favoriteLeagueIds, setFavoriteLeagueIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    setMatches(null);
    api.getMatches(selectedDate).then(setMatches);
  }, [selectedDate]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setFavoriteLeagueIds(new Set());
      return;
    }
    api.getFavoriteLeagues(user.id).then((leagues) => setFavoriteLeagueIds(new Set(leagues.map((l) => l.id))));
  }, [user, authLoading]);

  // Toutes les ligues ayant un match à la date sélectionnée, favoris en priorité (triés en
  // premier), puis le reste par ordre alphabétique — décision produit du 2026-09-17.
  const leagueRows: LeagueRow[] = useMemo(() => {
    if (!matches || favoriteLeagueIds === null) return [];
    const byLeague = new Map<string, LeagueRow>();
    for (const m of matches) {
      const row = byLeague.get(m.league.id) ?? {
        league: m.league,
        liveCount: 0,
        isFavorite: favoriteLeagueIds.has(m.league.id),
      };
      if (m.status === 'live') row.liveCount += 1;
      byLeague.set(m.league.id, row);
    }
    return Array.from(byLeague.values()).sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return a.league.name.localeCompare(b.league.name);
    });
  }, [matches, favoriteLeagueIds]);

  const loading = matches === null || favoriteLeagueIds === null;

  return (
    <div
      className="fb-split"
      style={{
        maxWidth: 1240,
        margin: '0 auto',
        padding: '32px 24px 80px',
        gap: 40,
        alignItems: 'start',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="fb-display" style={{ margin: 0, fontSize: 34 }}>
            {t('myLeagues')}
          </h1>
          <Link href="/leagues" style={{ color: 'var(--fb-nav)', fontSize: 13 }}>
            {t('allLeagues')}
          </Link>
        </div>

        <DateSelector selected={selectedDate} onSelect={setSelectedDate} />

        {loading && <SkeletonList />}
        {!loading && leagueRows.length === 0 && (
          <EmptyContent title={t('noMatchesToday')} subtitle={t('tryAnotherDay')} />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leagueRows.map(({ league, liveCount, isFavorite }) => (
            <Link
              key={league.id}
              href={`/leagues/${league.id}?date=${selectedDate}`}
              className="fb-card"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                border: '1px solid var(--fb-border)',
                borderRadius: 12,
                textDecoration: 'none',
                color: 'inherit',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <span style={{ width: 3, height: 20, borderRadius: 999, background: leagueAccentColor(league), flexShrink: 0 }} />
                <Crest src={league.logoUrl} alt={league.name} size={24} />
                {isFavorite && (
                  <span style={{ color: 'var(--fb-rating)', fontSize: 15, flexShrink: 0 }} aria-label={t('favorite')}>
                    ★
                  </span>
                )}
                <span style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {league.name}
                </span>
              </div>
              {liveCount > 0 && <LiveCountBadge count={liveCount} />}
            </Link>
          ))}
        </div>
      </div>

      <Sidebar user={user} />
    </div>
  );
}
