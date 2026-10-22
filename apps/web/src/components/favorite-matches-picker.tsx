'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ReviewWithMatch } from '@football-app/shared-types';
import * as api from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { Crest } from './ui/crest';
import { Button } from './ui/button';
import { StarsDisplay } from './ui/stars';

const PAGE_SIZE = 10;

// Sélecteur des "matchs préférés" du profil (issue #51) : on choisit parmi ses propres reviews
// plutôt que de laisser l'app prendre automatiquement les mieux notés. Une review par ligne —
// un même match revu plusieurs fois (rewatch, issue #14) peut donc apparaître plusieurs fois,
// chaque visionnage ayant sa propre note.
export function FavoriteMatchesPicker({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const t = useTranslations('FavoriteMatchesPicker');
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewWithMatch[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    api.getUserReviews(user.id, { page, pageSize: PAGE_SIZE }).then((res) => {
      if (cancelled) return;
      setReviews((prev) => (page === 0 ? res.items : [...prev, ...res.items]));
      setTotal(res.total);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [page, user]);

  async function toggle(review: ReviewWithMatch) {
    setPending(review.id);
    try {
      const nowFavorite = review.favoritedAt === null;
      if (nowFavorite) await api.favoriteReview(review.id);
      else await api.unfavoriteReview(review.id);
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, favoritedAt: nowFavorite ? new Date().toISOString() : null } : r)),
      );
      onChanged();
    } finally {
      setPending(null);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '80vh',
          background: 'var(--fb-surface-2)',
          border: '1px solid var(--fb-border)',
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <h2 className="fb-display" style={{ fontSize: 22, margin: 0 }}>
            {t('title')}
          </h2>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('done')}
          </Button>
        </div>
        <p className="fb-meta" style={{ margin: 0, fontSize: 12.5 }}>
          {t('hint')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          {!loading && reviews.length === 0 && <p className="fb-meta">{t('noReviews')}</p>}

          {reviews.map((review) => {
            const selected = review.favoritedAt !== null;
            return (
              <button
                key={review.id}
                onClick={() => toggle(review)}
                disabled={pending === review.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  borderRadius: 12,
                  textAlign: 'left',
                  border: `1px solid ${selected ? 'var(--fb-rating)' : 'var(--fb-border)'}`,
                  background: selected ? 'var(--fb-rating-bg)' : 'var(--fb-surface)',
                }}
              >
                <Crest src={review.match.homeTeam.logoUrl} alt={review.match.homeTeam.name} size={24} />
                <Crest src={review.match.awayTeam.logoUrl} alt={review.match.awayTeam.name} size={24} />
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span
                    style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {review.match.homeTeam.name} — {review.match.awayTeam.name}
                  </span>
                  <StarsDisplay rating={Number(review.rating)} />
                </span>
                <span style={{ color: selected ? 'var(--fb-rating)' : 'var(--fb-text-3)', flexShrink: 0 }}>
                  {selected ? '★' : '☆'}
                </span>
              </button>
            );
          })}

          {reviews.length < total && (
            <Button variant="secondary" size="sm" loading={loading} onClick={() => setPage((p) => p + 1)}>
              {t('loadMore')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
