'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Profile, BlockStatus, FollowStatus, Compatibility } from '@football-app/shared-types';
import * as api from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { ProfileView } from '../../../components/profile-view';
import { ReportDialog } from '../../../components/report-dialog';
import { Button } from '../../../components/ui/button';
import { SkeletonList } from '../../../components/ui/skeleton';

export default function UserProfilePage({ params }: PageProps<'/profile/[id]'>) {
  const t = useTranslations('UserProfilePage');
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);
  const [compatibility, setCompatibility] = useState<Compatibility | null>(null);
  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const [pending, setPending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    // Le profil d'un utilisateur est le sien : on réutilise directement /profile (qui a le
    // bouton "Modifier" au lieu de "Suivre"), plutôt que de dupliquer l'affichage.
    if (user && user.id === id) {
      router.replace('/profile');
    }
  }, [user, id, router]);

  useEffect(() => {
    api.getProfile(id).then(setProfile);
  }, [id]);

  useEffect(() => {
    if (!user || user.id === id) return;
    api.amIFollowing(id).then(setFollowStatus);
    api.getBlockStatus(id).then(setBlockStatus);
    api.getCompatibility(id).then(setCompatibility);
  }, [user, id]);

  async function toggleFollow() {
    setPending(true);
    try {
      if (followStatus?.following || followStatus?.pendingRequest) {
        await api.unfollowUser(id);
        setFollowStatus((prev) => (prev ? { ...prev, following: false, pendingRequest: false } : prev));
      } else {
        const { status } = await api.followUser(id);
        setFollowStatus((prev) =>
          prev ? { ...prev, following: status === 'following', pendingRequest: status === 'requested' } : prev,
        );
      }
      const fresh = await api.getProfile(id);
      setProfile(fresh);
    } finally {
      setPending(false);
    }
  }

  // "Accepter/refuser se fait... depuis le profil du demandeur" (issue #18, réponse explicite
  // du 2026-10-22) : affiché ici quand CETTE personne (:id) m'a envoyé une demande.
  async function respondToIncomingRequest(accept: boolean) {
    setPending(true);
    try {
      if (accept) await api.acceptFollowRequest(id);
      else await api.rejectFollowRequest(id);
      setFollowStatus((prev) => (prev ? { ...prev, incomingRequest: false } : prev));
    } finally {
      setPending(false);
    }
  }

  async function toggleBlock() {
    setPending(true);
    setMenuOpen(false);
    try {
      if (blockStatus?.viewerHasBlocked) {
        await api.unblockUser(id);
        setBlockStatus({ ...blockStatus, viewerHasBlocked: false });
      } else {
        await api.blockUser(id);
        // Bloquer coupe le follow dans les deux sens côté API (voir blocks.service.ts).
        setFollowStatus((prev) => (prev ? { ...prev, following: false, pendingRequest: false } : prev));
        setBlockStatus({ blockedByOwner: blockStatus?.blockedByOwner ?? false, viewerHasBlocked: true });
      }
    } finally {
      setPending(false);
    }
  }

  if (!profile) return <SkeletonList />;

  // Profil privé (issue #18) : contenu masqué pour un visiteur qui ne suit pas encore (sauf
  // le propriétaire lui-même) — même principe d'affichage que blockedByOwner dans ProfileView.
  const isOwner = user?.id === id;
  const hasAccess = isOwner || !profile.isPrivate || followStatus?.following === true;
  const followLabel = blockStatus?.viewerHasBlocked
    ? t('unblock')
    : followStatus?.following
      ? t('following')
      : followStatus?.pendingRequest
        ? t('requestSent')
        : profile.isPrivate
          ? t('requestToFollow')
          : t('follow');

  return (
    <>
      {followStatus?.incomingRequest && (
        <div
          style={{
            maxWidth: 960,
            margin: '20px auto 0',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
            border: '1px solid var(--fb-border)',
            borderRadius: 12,
            background: 'var(--fb-surface)',
          }}
        >
          <span style={{ fontSize: 14, color: 'var(--fb-text-2)' }}>
            {t('wantsToFollowYou', { name: profile.displayName })}
          </span>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <Button size="sm" loading={pending} onClick={() => respondToIncomingRequest(true)}>
              {t('accept')}
            </Button>
            <Button size="sm" variant="secondary" loading={pending} onClick={() => respondToIncomingRequest(false)}>
              {t('decline')}
            </Button>
          </div>
        </div>
      )}
      <ProfileView
        profile={profile}
        blockedByOwner={blockStatus?.blockedByOwner}
        restricted={!hasAccess}
        compatibility={compatibility}
        headerAction={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {!blockStatus?.blockedByOwner && hasAccess && profile.isWatchlistPublic && (
              <Link href={`/profile/${id}/watchlist`}>
                <Button variant="secondary">{t('watchlist')}</Button>
              </Link>
            )}
            {user && user.id !== id ? (
              <>
                {!blockStatus?.blockedByOwner && (
                  <Button
                    variant={blockStatus?.viewerHasBlocked || followStatus?.following || followStatus?.pendingRequest ? 'secondary' : 'primary'}
                    loading={pending}
                    onClick={blockStatus?.viewerHasBlocked ? toggleBlock : toggleFollow}
                  >
                    {followLabel}
                  </Button>
                )}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setMenuOpen((prev) => !prev)}
                    style={{
                      width: 44,
                      height: 44,
                      border: '1px solid var(--fb-border)',
                      borderRadius: 999,
                      background: 'transparent',
                      color: 'var(--fb-text-2)',
                      fontSize: 17,
                      lineHeight: 1,
                    }}
                  >
                    ···
                  </button>
                  {menuOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 50,
                        zIndex: 2,
                        minWidth: 180,
                        border: '1px solid var(--fb-border)',
                        borderRadius: 12,
                        background: 'var(--fb-surface-2)',
                        padding: 6,
                        boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
                      }}
                    >
                      {!blockStatus?.viewerHasBlocked && (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            setReportOpen(true);
                          }}
                          style={{
                            width: '100%',
                            height: 38,
                            padding: '0 12px',
                            border: 'none',
                            borderRadius: 8,
                            background: 'transparent',
                            color: 'var(--fb-text)',
                            fontWeight: 600,
                            fontSize: 14,
                            textAlign: 'left',
                          }}
                        >
                          {t('report')}
                        </button>
                      )}
                      {!blockStatus?.viewerHasBlocked && (
                        <button
                          onClick={toggleBlock}
                          style={{
                            width: '100%',
                            height: 38,
                            padding: '0 12px',
                            border: 'none',
                            borderRadius: 8,
                            background: 'transparent',
                            color: 'var(--fb-live-text)',
                            fontWeight: 600,
                            fontSize: 14,
                            textAlign: 'left',
                          }}
                        >
                          {t('block')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : !user ? (
              <Link href="/login">
                <Button variant="secondary">{t('loginToFollow')}</Button>
              </Link>
            ) : null}
          </div>
        }
      />
      {reportOpen && <ReportDialog targetType="user" targetId={id} onClose={() => setReportOpen(false)} />}
    </>
  );
}
