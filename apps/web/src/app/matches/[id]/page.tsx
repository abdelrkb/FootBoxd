'use client';

import { use, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Match, Review, MatchEvent, RatingDistribution, TagSelection } from '@football-app/shared-types';
import * as api from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { DevelopedReviewCard } from './developed-review-card';
import { MatchEvents } from './match-events';
import { RatingHistogram } from './rating-histogram';
import { Lineups } from './lineups';
import { ClientDate } from '../../../components/client-date';
import { Crest } from '../../../components/ui/crest';
import { ScoreChip } from '../../../components/ui/badges';
import { StatusLabel } from '../../../components/ui/status-label';
import { StarsDisplay, StarsSelector } from '../../../components/ui/stars';
import { TagInput } from '../../../components/ui/tag-input';
import { LockIcon } from '../../../components/ui/lock-icon';
import { Button } from '../../../components/ui/button';
import { EmptyContent } from '../../../components/ui/empty-state';
import { SpoilerScore } from '../../../components/ui/spoiler-score';
import { WatchlistMenuButton } from '../../../components/ui/watchlist-menu-button';
import { leagueAccentColor } from '../../../components/ui/card-shell';

export default function MatchDetailPage({ params }: PageProps<'/matches/[id]'>) {
  const t = useTranslations('MatchDetailPage');
  const tNav = useTranslations('Nav');
  const tCommon = useTranslations('Common');
  const { id } = use(params);
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [distribution, setDistribution] = useState<RatingDistribution | null>(null);
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<TagSelection[]>([]);
  const [error, setError] = useState<string | null>(null);
  // "Reloguer ce match" (issue #14) : la première review ouvre le formulaire par défaut
  // (myReviews vide), un revisionnage doit être demandé explicitement via le bouton dédié.
  const [showLogForm, setShowLogForm] = useState(false);
  // "Compléter ma note rapide" (issue #15) : si la dernière review active est une quickRating,
  // on complète CETTE review (PATCH) plutôt que d'en créer une nouvelle — voir log-match-modal.tsx
  // pour la même logique côté modal, dupliquée ici car le formulaire de cette page est inline.
  const [completingQuick, setCompletingQuick] = useState(false);

  const loadReviews = () => api.getReviewsForMatch(id).then(setReviews);

  useEffect(() => {
    api.getMatch(id).then(setMatch);
    api.getMatchEvents(id).then(setEvents);
    api.getRatingDistribution(id).then(setDistribution);
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function openCompleteQuickRating(latest: Review) {
    setRating(Number(latest.rating));
    setComment('');
    setTags([]);
    setCompletingQuick(true);
    setShowLogForm(true);
  }

  function openNewLog() {
    setRating(3);
    setComment('');
    setTags([]);
    setCompletingQuick(false);
    setShowLogForm(true);
  }

  async function handleLogMatch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (completingQuick && latestMyReview) {
        await api.updateReview(latestMyReview.id, { rating, comment: comment || undefined, tags, quickRating: false });
      } else {
        await api.createReview(id, rating, comment || undefined, tags.length ? tags : undefined);
      }
      setRating(3);
      setComment('');
      setTags([]);
      setCompletingQuick(false);
      setShowLogForm(false);
      loadReviews();
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : tCommon('unknownError'));
    }
  }

  if (!match) return null; // squelette omis pour cette passe — voir handoff pour la géométrie exacte

  // Plusieurs reviews actives possibles pour le même utilisateur depuis l'issue #14 (rewatch) —
  // `reviews` est trié du plus récent au plus ancien (reviews.service.ts `findForMatch`), donc
  // le premier élément après filtrage est la plus récente, utilisée comme aperçu du bandeau
  // "déjà loggé".
  const myReviews = user ? (reviews?.filter((r) => r.userId === user.id) ?? []) : [];
  const latestMyReview = myReviews[0];

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 24px 80px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <Link href="/" className="fb-label" style={{ fontSize: 12, color: 'var(--fb-text-2)' }}>
        ← {tNav('home')}
      </Link>

      <div
        style={{
          border: '1px solid var(--fb-border)',
          borderRadius: 16,
          background: 'var(--fb-surface)',
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 4, height: 16, borderRadius: 999, background: leagueAccentColor(match.league) }} />
            <span className="fb-label" style={{ fontSize: 12.5, color: 'var(--fb-text-2)' }}>
              {match.league.name}
            </span>
          </div>
          <WatchlistMenuButton matchId={match.id} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            href={`/teams/${match.homeTeam.id}`}
            style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
          >
            <Crest src={match.homeTeam.logoUrl} alt={match.homeTeam.name} size={64} />
            <h1 className="fb-display" style={{ fontSize: 40, margin: 0 }}>
              {match.homeTeam.name}
            </h1>
          </Link>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            {(() => {
              const scoreEl = (
                <span
                  className="fb-num"
                  style={{
                    fontWeight: 600,
                    fontSize: 34,
                    background: 'var(--fb-surface-2)',
                    border: '1px solid var(--fb-border)',
                    borderRadius: 10,
                    padding: '6px 18px',
                    whiteSpace: 'nowrap',
                    color: match.status === 'live' ? 'var(--fb-action)' : undefined,
                  }}
                >
                  {match.homeScore ?? '-'}—{match.awayScore ?? '-'}
                </span>
              );
              return match.status === 'live' || match.status === 'finished' ? (
                <SpoilerScore>{scoreEl}</SpoilerScore>
              ) : (
                scoreEl
              );
            })()}
            <StatusLabel status={match.status} minute={match.liveMinute} />
          </div>
          <Link
            href={`/teams/${match.awayTeam.id}`}
            style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
          >
            <h1 className="fb-display" style={{ fontSize: 40, margin: 0 }}>
              {match.awayTeam.name}
            </h1>
            <Crest src={match.awayTeam.logoUrl} alt={match.awayTeam.name} size={64} />
          </Link>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            flexWrap: 'wrap',
            borderTop: '1px solid var(--fb-border)',
            paddingTop: 18,
          }}
        >
          <span className="fb-num" style={{ color: 'var(--fb-text-2)' }}>
            <ClientDate iso={match.kickoffAt} options={{ dateStyle: 'medium', timeStyle: 'short' }} fallback="" />
          </span>
          {match.venue && (
            <>
              <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--fb-border-strong)' }} />
              <span style={{ fontSize: 14, color: 'var(--fb-text-2)' }}>{match.venue}</span>
            </>
          )}
          <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--fb-border-strong)' }} />
          <span className="fb-num" style={{ color: 'var(--fb-text-2)' }}>
            {t('reviewsCount', { count: reviews?.length ?? 0 })}
          </span>
          {match.highlightUrl && (
            <a
              href={match.highlightUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="fb-label"
              style={{
                marginLeft: 'auto',
                padding: '10px 16px',
                borderRadius: 999,
                border: '1px solid var(--fb-border)',
                fontSize: 12,
                whiteSpace: 'nowrap',
              }}
            >
              {t('viewHighlights')} ↗
            </a>
          )}
        </div>
      </div>

      <div className="fb-split" style={{ gap: 32, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, minWidth: 0 }}>
          {!user && (
            <div
              style={{
                padding: 24,
                border: '1px dashed var(--fb-border-strong)',
                borderRadius: 16,
                background: 'var(--fb-hatch)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <span className="fb-card-title" style={{ fontSize: 18 }}>
                {t('loginToRate')}
              </span>
              <Link href="/login">
                <Button>{t('login')}</Button>
              </Link>
            </div>
          )}

          {user && latestMyReview && !showLogForm && (
            <div
              style={{
                border: '1px solid var(--fb-border)',
                borderRadius: 16,
                background: 'var(--fb-surface)',
                padding: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              <StarsDisplay rating={Number(latestMyReview.rating)} size={22} />
              <span className="fb-num" style={{ fontSize: 16, color: 'var(--fb-rating)' }}>
                {Number(latestMyReview.rating).toFixed(1)}
              </span>
              <span style={{ fontSize: 15, color: 'var(--fb-text-2)' }}>
                {latestMyReview.quickRating ? t('alreadyQuickRated') : t('alreadyLogged', { count: myReviews.length })}
              </span>
              <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                {latestMyReview.quickRating && (
                  <Button variant="secondary" size="sm" onClick={() => openCompleteQuickRating(latestMyReview)}>
                    {t('completeThisRating')}
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={openNewLog}>
                  {latestMyReview.quickRating ? t('logNewWatch') : t('rewatchThisMatch')}
                </Button>
              </div>
            </div>
          )}

          {user && myReviews.length === 0 && match.status !== 'finished' && (
            <div
              style={{
                position: 'relative',
                border: '1px solid var(--fb-border)',
                borderRadius: 16,
                background: 'var(--fb-surface)',
                overflow: 'hidden',
              }}
            >
              <div
                aria-hidden
                style={{
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                  opacity: 0.4,
                  filter: 'blur(1.5px)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                <h2 className="fb-card-title" style={{ fontSize: 20, margin: 0 }}>
                  {t('logTheMatch')}
                </h2>
                <StarsSelector value={3} onChange={() => {}} size={38} />
                <div
                  style={{
                    width: '100%',
                    minHeight: 110,
                    boxSizing: 'border-box',
                    border: '1px solid var(--fb-border)',
                    borderRadius: 12,
                    background: 'var(--fb-bg)',
                  }}
                />
                <div
                  style={{
                    width: '100%',
                    minHeight: 46,
                    boxSizing: 'border-box',
                    border: '1px solid var(--fb-border)',
                    borderRadius: 12,
                    background: 'var(--fb-bg)',
                  }}
                />
              </div>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  textAlign: 'center',
                  padding: 24,
                  background: 'var(--fb-curtain)',
                }}
              >
                <LockIcon size={26} color="var(--fb-text)" />
                <p className="fb-card-title" style={{ fontSize: 15, margin: 0, maxWidth: 260 }}>
                  {t('watchUntilEndToLog')}
                </p>
              </div>
            </div>
          )}

          {user && (myReviews.length === 0 || showLogForm) && match.status === 'finished' && (
            <form
              onSubmit={handleLogMatch}
              style={{
                border: '1px solid var(--fb-border)',
                borderRadius: 16,
                background: 'var(--fb-surface)',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <h2 className="fb-card-title" style={{ fontSize: 20, margin: 0 }}>
                  {completingQuick ? t('completeMyRating') : myReviews.length > 0 ? t('rewatchThisMatch') : t('logTheMatch')}
                </h2>
                {myReviews.length > 0 && (
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onClick={() => {
                      setCompletingQuick(false);
                      setShowLogForm(false);
                    }}
                  >
                    {t('cancel')}
                  </Button>
                )}
              </div>
              <StarsSelector value={rating} onChange={setRating} size={38} />
              <textarea
                placeholder={t('commentPlaceholder')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 110,
                  boxSizing: 'border-box',
                  padding: 14,
                  border: '1px solid var(--fb-border)',
                  borderRadius: 12,
                  background: 'var(--fb-bg)',
                  color: 'var(--fb-text)',
                  fontFamily: 'var(--fb-font-sans)',
                  fontSize: 15,
                  lineHeight: 1.55,
                  resize: 'vertical',
                }}
              />
              <TagInput value={tags} onChange={setTags} />
              {error && <p style={{ color: 'var(--fb-live-text)', fontSize: 13 }}>{error}</p>}
              <Button type="submit" style={{ width: 'fit-content' }}>
                {tCommon('log')}
              </Button>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
                borderBottom: '2px solid var(--fb-text)',
                paddingBottom: 9,
              }}
            >
              <h2 className="fb-section" style={{ fontSize: 14, margin: 0 }}>
                {t('reviews')}
              </h2>
              <span className="fb-meta">{reviews?.length ?? 0}</span>
            </div>

            {reviews?.length === 0 && (
              <EmptyContent title={t('nobodyLoggedYet')} subtitle={t('beTheFirst')} />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {reviews?.map((review) => (
                <DevelopedReviewCard
                  key={review.id}
                  review={review}
                  isMine={user?.id === review.userId}
                  onChange={loadReviews}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <MatchEvents events={events} />
          <Lineups match={match} />
          {distribution && <RatingHistogram distribution={distribution} />}
        </div>
      </div>
    </div>
  );
}
