'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Profile } from '@football-app/shared-types';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user) api.getProfile(user.id).then(setProfile);
  }, [user]);

  if (authLoading) return null;
  if (!user) {
    return (
      <p style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link href="/login">Connectez-vous</Link> pour voir votre profil.
      </p>
    );
  }
  if (!profile) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Chargement...</p>;

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {profile.avatarUrl && (
          <Image src={profile.avatarUrl} alt={profile.displayName} width={72} height={72} style={{ borderRadius: '50%' }} unoptimized />
        )}
        <h1 style={{ margin: 0 }}>{profile.displayName}</h1>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', margin: '1.5rem 0' }}>
        <span>
          <strong>{profile.followersCount}</strong> followers
        </span>
        <span>
          <strong>{profile.followingCount}</strong> suivi(e)s
        </span>
        <span>
          <strong>{profile.totalReviewsCount}</strong> matchs notés (total)
        </span>
        <span>
          <strong>{profile.reviewsThisSeasonCount}</strong> vus cette saison
        </span>
      </div>

      <h2>Matchs préférés (saison en cours)</h2>
      {profile.favoriteMatches.length === 0 && <p>Aucun match noté cette saison.</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {profile.favoriteMatches.map((review) => (
          <li key={review.id} style={{ padding: '0.75rem', border: '1px solid #333', borderRadius: 8 }}>
            <Link href={`/matches/${review.match.id}`}>
              {review.match.homeTeam.name} {review.match.homeScore ?? '-'} - {review.match.awayScore ?? '-'}{' '}
              {review.match.awayTeam.name}
            </Link>{' '}
            — note : {review.rating}/5
          </li>
        ))}
      </ul>

      <h2>Derniers matchs loggés (saison en cours)</h2>
      {profile.lastReviews.length === 0 && <p>Aucun match noté cette saison.</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {profile.lastReviews.map((review) => (
          <li key={review.id} style={{ padding: '0.75rem', border: '1px solid #333', borderRadius: 8 }}>
            <Link href={`/matches/${review.match.id}`}>
              {review.match.homeTeam.name} {review.match.homeScore ?? '-'} - {review.match.awayScore ?? '-'}{' '}
              {review.match.awayTeam.name}
            </Link>{' '}
            — note : {review.rating}/5
          </li>
        ))}
      </ul>
    </div>
  );
}
