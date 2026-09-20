'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Profile } from '@football-app/shared-types';
import { Crest } from './ui/crest';
import { ProfileMatchCard } from './profile-match-card';
import { EmptyContent, EmptySocial } from './ui/empty-state';
import { Button } from './ui/button';

function StatCell({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  return (
    <div style={{ background: 'var(--fb-surface)', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <span className="fb-num" style={{ fontSize: 24, fontWeight: 600, color: accent ? 'var(--fb-action)' : 'var(--fb-text)' }}>
        {value}
      </span>
      <span className="fb-label" style={{ fontSize: 10.5, color: 'var(--fb-text-2)', textAlign: 'center' }}>
        {label}
      </span>
    </div>
  );
}

// Vue de profil partagée entre "mon profil" (/profile) et "le profil de quelqu'un d'autre"
// (/profile/[id]) — même mise en page (handoff design), seule la zone d'action en haut à
// droite change (éditer vs suivre).
export function ProfileView({ profile, headerAction }: { profile: Profile; headerAction: ReactNode }) {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Crest src={profile.avatarUrl} alt={profile.displayName} size={96} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h1 className="fb-display" style={{ fontSize: 40, margin: 0 }}>
              {profile.displayName}
            </h1>
            <span className="fb-meta" style={{ fontSize: 13.5 }}>
              @{profile.username}
            </span>
          </div>
        </div>
        {headerAction}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 1,
          background: 'var(--fb-border)',
          border: '1px solid var(--fb-border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <StatCell value={profile.followersCount} label="Followers" />
        <StatCell value={profile.followingCount} label="Suivi(e)s" />
        <StatCell value={profile.totalReviewsCount} label="Matchs notés" />
        <StatCell value={profile.reviewsThisSeasonCount} label="Vus cette saison" accent />
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 className="fb-section" style={{ margin: 0 }}>
          Matchs préférés
        </h2>
        {profile.favoriteMatches.length === 0 ? (
          <EmptySocial
            title="Ta saison commence ici"
            subtitle="Logge un match pour voir apparaître tes préférés."
            action={
              <Link href="/">
                <Button size="sm">Voir les matchs du jour</Button>
              </Link>
            }
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
            {profile.favoriteMatches.map((review) => (
              <ProfileMatchCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 className="fb-section" style={{ margin: 0 }}>
          Derniers matchs loggés
        </h2>
        {profile.lastReviews.length === 0 ? (
          <EmptyContent title="Aucun match loggé cette saison" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
            {profile.lastReviews.map((review) => (
              <ProfileMatchCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
