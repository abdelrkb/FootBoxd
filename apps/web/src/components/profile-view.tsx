'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Profile, Team } from '@football-app/shared-types';
import { Crest } from './ui/crest';
import { ProfileMatchCard } from './profile-match-card';
import { EmptyContent, EmptySocial } from './ui/empty-state';
import { Button } from './ui/button';

// Club de cœur + équipes suivies (issue #53) : le club de cœur est mis en avant (écusson plus
// grand, libellé dédié), les autres équipes suivies suivent en pastilles.
function TeamChip({ team, primary }: { team: Team; primary?: boolean }) {
  return (
    <Link
      href={`/teams/${team.id}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: primary ? '7px 14px' : '6px 12px',
        borderRadius: 999,
        border: `1px solid ${primary ? 'var(--fb-rating)' : 'var(--fb-border)'}`,
        background: primary ? 'var(--fb-rating-bg)' : 'var(--fb-surface)',
        color: primary ? 'var(--fb-rating)' : 'var(--fb-text-2)',
        textDecoration: 'none',
      }}
    >
      <Crest src={team.logoUrl} alt={team.name} size={primary ? 24 : 20} />
      <span style={{ fontSize: primary ? 13.5 : 12.5, fontWeight: primary ? 700 : 600 }}>{team.name}</span>
    </Link>
  );
}

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
export function ProfileView({
  profile,
  headerAction,
  blockedByOwner,
  restricted,
}: {
  profile: Profile;
  headerAction: ReactNode;
  // Le PROPRIÉTAIRE du profil a bloqué le visiteur (2026-10-02) : le profil reste trouvable
  // (recherche, lien direct) mais n'affiche plus que ce message, ni stats ni contenu.
  blockedByOwner?: boolean;
  // Profil privé (issue #18) : le visiteur ne suit pas encore (ou n'est pas le propriétaire) —
  // même traitement que blockedByOwner, message différent.
  restricted?: boolean;
}) {
  const t = useTranslations('ProfileView');
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Crest src={profile.avatarUrl} alt={profile.displayName} size={96} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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

      {blockedByOwner ? (
        <div
          style={{
            padding: 24,
            border: '1px dashed var(--fb-border-strong)',
            borderRadius: 16,
            background: 'var(--fb-hatch)',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 15, color: 'var(--fb-text-2)' }}>{t('blockedMessage')}</p>
        </div>
      ) : restricted ? (
        <div
          style={{
            padding: 24,
            border: '1px dashed var(--fb-border-strong)',
            borderRadius: 16,
            background: 'var(--fb-hatch)',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 15, color: 'var(--fb-text-2)' }}>
            {t('restrictedMessage')}
          </p>
        </div>
      ) : (
        <>
          {profile.bio && (
            <p className="fb-body" style={{ margin: 0, maxWidth: 640, whiteSpace: 'pre-wrap' }}>
              {profile.bio}
            </p>
          )}

          {(profile.favoriteTeam || profile.favoriteTeams.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 className="fb-section" style={{ margin: 0, fontSize: 13 }}>
                {profile.favoriteTeam ? t('favoriteClubSection') : t('followedTeamsSection')}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {profile.favoriteTeam && <TeamChip team={profile.favoriteTeam} primary />}
                {profile.favoriteTeams.map((team) => (
                  <TeamChip key={team.id} team={team} />
                ))}
              </div>
            </div>
          )}

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
            <StatCell value={profile.followersCount} label={t('followers')} />
            <StatCell value={profile.followingCount} label={t('following')} />
            <StatCell value={profile.totalReviewsCount} label={t('matchesRated')} />
            <StatCell value={profile.reviewsThisSeasonCount} label={t('seenThisSeason')} accent />
          </div>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 className="fb-section" style={{ margin: 0 }}>
              {t('favoriteMatches')}
            </h2>
            {profile.favoriteMatches.length === 0 ? (
              <EmptySocial
                title={t('seasonStartsHereTitle')}
                subtitle={t('seasonStartsHereSubtitle')}
                action={
                  <Link href="/">
                    <Button size="sm">{t('viewTodayMatches')}</Button>
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
              {t('lastLoggedMatches')}
            </h2>
            {profile.lastReviews.length === 0 ? (
              <EmptyContent title={t('noMatchLoggedThisSeason')} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
                {profile.lastReviews.map((review) => (
                  <ProfileMatchCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
