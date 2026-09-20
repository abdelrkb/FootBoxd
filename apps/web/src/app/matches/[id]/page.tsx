'use client';

import { use, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { Match, Review, MatchEvent, RatingDistribution } from '@football-app/shared-types';
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
import { Button } from '../../../components/ui/button';
import { EmptyContent } from '../../../components/ui/empty-state';
import { SpoilerScore } from '../../../components/ui/spoiler-score';
import { leagueAccentColor } from '../../../components/ui/card-shell';

export default function MatchDetailPage({ params }: PageProps<'/matches/[id]'>) {
  const { id } = use(params);
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [distribution, setDistribution] = useState<RatingDistribution | null>(null);
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadReviews = () => api.getReviewsForMatch(id).then(setReviews);

  useEffect(() => {
    api.getMatch(id).then(setMatch);
    api.getMatchEvents(id).then(setEvents);
    api.getRatingDistribution(id).then(setDistribution);
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleLogMatch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createReview(id, rating, comment || undefined);
      setComment('');
      loadReviews();
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Erreur inconnue');
    }
  }

  if (!match) return null; // squelette omis pour cette passe — voir handoff pour la géométrie exacte

  const myReview = user ? reviews?.find((r) => r.userId === user.id) : undefined;

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 24px 80px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <Link href="/" className="fb-label" style={{ fontSize: 12, color: 'var(--fb-text-2)' }}>
        ← Accueil
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 4, height: 16, borderRadius: 999, background: leagueAccentColor(match.league) }} />
          <span className="fb-label" style={{ fontSize: 12.5, color: 'var(--fb-text-2)' }}>
            {match.league.name}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <Crest src={match.homeTeam.logoUrl} alt={match.homeTeam.name} size={64} />
            <h1 className="fb-display" style={{ fontSize: 40, margin: 0 }}>
              {match.homeTeam.name}
            </h1>
          </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <h1 className="fb-display" style={{ fontSize: 40, margin: 0 }}>
              {match.awayTeam.name}
            </h1>
            <Crest src={match.awayTeam.logoUrl} alt={match.awayTeam.name} size={64} />
          </div>
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
            {reviews?.length ?? 0} reviews
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
              Voir les highlights ↗
            </a>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)', gap: 32, alignItems: 'start' }}>
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
                Connecte-toi pour noter ce match
              </span>
              <Link href="/login">
                <Button>Connexion</Button>
              </Link>
            </div>
          )}

          {user && myReview && (
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
              <StarsDisplay rating={Number(myReview.rating)} size={22} />
              <span className="fb-num" style={{ fontSize: 16, color: 'var(--fb-rating)' }}>
                {Number(myReview.rating).toFixed(1)}
              </span>
              <span style={{ fontSize: 15, color: 'var(--fb-text-2)' }}>Tu as déjà loggé ce match.</span>
            </div>
          )}

          {user && !myReview && (
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
              <h2 className="fb-card-title" style={{ fontSize: 20, margin: 0 }}>
                Logger le match
              </h2>
              <StarsSelector value={rating} onChange={setRating} size={38} />
              <textarea
                placeholder="Ton commentaire (optionnel)"
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
              {error && <p style={{ color: 'var(--fb-live-text)', fontSize: 13 }}>{error}</p>}
              <Button type="submit" style={{ width: 'fit-content' }}>
                Logger
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
                Reviews
              </h2>
              <span className="fb-meta">{reviews?.length ?? 0}</span>
            </div>

            {reviews?.length === 0 && (
              <EmptyContent title="Personne n'a encore loggé ce match" subtitle="Sois le premier à donner ta note." />
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
