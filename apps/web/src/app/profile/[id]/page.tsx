'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Profile } from '@football-app/shared-types';
import * as api from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { ProfileView } from '../../../components/profile-view';
import { Button } from '../../../components/ui/button';
import { SkeletonList } from '../../../components/ui/skeleton';

export default function UserProfilePage({ params }: PageProps<'/profile/[id]'>) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [pending, setPending] = useState(false);

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
    if (user && user.id !== id) api.amIFollowing(id).then(setIsFollowing);
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

  if (!profile) return <SkeletonList />;

  return (
    <ProfileView
      profile={profile}
      headerAction={
        user && user.id !== id ? (
          <Button variant={isFollowing ? 'secondary' : 'primary'} loading={pending} onClick={toggleFollow}>
            {isFollowing ? 'Suivi(e)' : 'Suivre'}
          </Button>
        ) : !user ? (
          <Link href="/login">
            <Button variant="secondary">Connexion pour suivre</Button>
          </Link>
        ) : null
      }
    />
  );
}
