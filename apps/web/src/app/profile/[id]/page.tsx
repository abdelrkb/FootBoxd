'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Profile, BlockStatus } from '@football-app/shared-types';
import * as api from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { ProfileView } from '../../../components/profile-view';
import { ReportDialog } from '../../../components/report-dialog';
import { Button } from '../../../components/ui/button';
import { SkeletonList } from '../../../components/ui/skeleton';

export default function UserProfilePage({ params }: PageProps<'/profile/[id]'>) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
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
    api.amIFollowing(id).then(setIsFollowing);
    api.getBlockStatus(id).then(setBlockStatus);
  }, [user, id]);

  async function toggleFollow() {
    setPending(true);
    try {
      if (isFollowing) await api.unfollowUser(id);
      else await api.followUser(id);
      setIsFollowing((prev) => !prev);
      const fresh = await api.getProfile(id);
      setProfile(fresh);
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
        setIsFollowing(false);
        setBlockStatus({ blockedByOwner: blockStatus?.blockedByOwner ?? false, viewerHasBlocked: true });
      }
    } finally {
      setPending(false);
    }
  }

  if (!profile) return <SkeletonList />;

  return (
    <>
      <ProfileView
        profile={profile}
        blockedByOwner={blockStatus?.blockedByOwner}
        headerAction={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {!blockStatus?.blockedByOwner && profile.isWatchlistPublic && (
              <Link href={`/profile/${id}/watchlist`}>
                <Button variant="secondary">Watchlist</Button>
              </Link>
            )}
            {user && user.id !== id ? (
              <>
                {!blockStatus?.blockedByOwner && (
                  <Button
                    variant={blockStatus?.viewerHasBlocked ? 'secondary' : isFollowing ? 'secondary' : 'primary'}
                    loading={pending}
                    onClick={blockStatus?.viewerHasBlocked ? toggleBlock : toggleFollow}
                  >
                    {blockStatus?.viewerHasBlocked ? 'Débloquer' : isFollowing ? 'Suivi(e)' : 'Suivre'}
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
                          Signaler
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
                          Bloquer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : !user ? (
              <Link href="/login">
                <Button variant="secondary">Connexion pour suivre</Button>
              </Link>
            ) : null}
          </div>
        }
      />
      {reportOpen && <ReportDialog targetType="user" targetId={id} onClose={() => setReportOpen(false)} />}
    </>
  );
}
