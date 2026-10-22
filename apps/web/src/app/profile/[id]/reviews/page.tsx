'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ReviewWithMatch } from '@football-app/shared-types';
import * as api from '../../../../lib/api';
import { ReviewMiniCard } from '../../../../components/review-mini-card';
import { EmptyContent } from '../../../../components/ui/empty-state';
import { SkeletonList } from '../../../../components/ui/skeleton';
import { Button } from '../../../../components/ui/button';

// Les 10 derniers d'abord, puis "Voir plus" page par page (issue #56).
const PAGE_SIZE = 10;

// useSearchParams() doit être sous un Suspense pour le build de prod (même contrainte que
// /leagues/[id], vérifiée au premier build de prod du projet le 2026-10-22).
export default function UserReviewsPage({ params }: PageProps<'/profile/[id]/reviews'>) {
  return (
    <Suspense fallback={null}>
      <UserReviewsContent params={params} />
    </Suspense>
  );
}

function UserReviewsContent({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('UserReviewsPage');
  const { id } = use(params);
  const searchParams = useSearchParams();
  const scope = searchParams.get('scope') === 'season' ? 'season' : 'all';

  const [reviews, setReviews] = useState<ReviewWithMatch[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [restricted, setRestricted] = useState(false);

  // Repart de zéro quand on bascule entre "tout" et "cette saison".
  useEffect(() => {
    setReviews(null);
    setPage(0);
  }, [scope, id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getUserReviews(id, { scope, page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setReviews((prev) => (page === 0 || prev === null ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
      })
      .catch((err) => {
        if (err instanceof api.ApiError && err.status === 403) setRestricted(true);
        else throw err;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, scope, page]);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 className="fb-display" style={{ fontSize: 30, margin: 0 }}>
        {scope === 'season' ? t('titleSeason') : t('titleAll')}
      </h1>

      {restricted ? (
        <EmptyContent title={t('restricted')} />
      ) : reviews === null ? (
        <SkeletonList count={5} />
      ) : reviews.length === 0 ? (
        <EmptyContent title={t('empty')} />
      ) : (
        <>
          <span className="fb-meta" style={{ fontSize: 12.5 }}>
            {t('count', { count: total })}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.map((review) => (
              <ReviewMiniCard key={review.id} review={review} />
            ))}
          </div>
          {reviews.length < total && (
            <Button variant="secondary" loading={loading} onClick={() => setPage((p) => p + 1)}>
              {t('loadMore')}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
