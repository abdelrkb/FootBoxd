'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ReviewDetail } from '@football-app/shared-types';
import * as api from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { DevelopedReviewCard } from '../../../components/developed-review-card';
import { CrestPair, TeamNamePair } from '../../../components/ui/crest';
import { ScoreChip } from '../../../components/ui/badges';
import { cardShellStyle, LeagueStripe } from '../../../components/ui/card-shell';
import { EmptyContent } from '../../../components/ui/empty-state';
import { SkeletonList } from '../../../components/ui/skeleton';

export default function ReviewDetailPage({ params }: PageProps<'/reviews/[id]'>) {
  const t = useTranslations('ReviewPage');
  const tNav = useTranslations('Nav');
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  // undefined = chargement, null = review introuvable (supprimée ou id invalide).
  const [review, setReview] = useState<ReviewDetail | null | undefined>(undefined);

  const loadReview = () =>
    api
      .getReview(id)
      .then(setReview)
      .catch(() => setReview(null));

  useEffect(() => {
    loadReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Après une suppression, la review n'existe plus : on renvoie vers la fiche du match.
  async function handleChange() {
    try {
      setReview(await api.getReview(id));
    } catch {
      router.push(review ? `/matches/${review.match.id}` : '/');
    }
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 24px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Link href="/" className="fb-label" style={{ fontSize: 12, color: 'var(--fb-text-2)' }}>
        ← {tNav('home')}
      </Link>

      {review === undefined && <SkeletonList />}
      {review === null && <EmptyContent title={t('notFound')} subtitle={t('notFoundHint')} />}

      {review && (
        <>
          <Link href={`/matches/${review.match.id}`} style={cardShellStyle()} className="fb-card">
            <CrestPair home={review.match.homeTeam} away={review.match.awayTeam} size={36} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
              <LeagueStripe league={review.match.league} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <TeamNamePair home={review.match.homeTeam} away={review.match.awayTeam} className="fb-card-title" />
                <ScoreChip
                  home={review.match.homeScore}
                  away={review.match.awayScore}
                  live={review.match.status === 'live'}
                />
              </div>
              <span className="fb-meta" style={{ fontSize: 12 }}>
                {t('seeMatch')} →
              </span>
            </div>
          </Link>

          <DevelopedReviewCard
            key={review.id}
            review={review}
            isMine={user?.id === review.userId}
            onChange={handleChange}
            initialThreadOpen
            initialLiked={review.likedByMe}
          />
        </>
      )}
    </div>
  );
}
