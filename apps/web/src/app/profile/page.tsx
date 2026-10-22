'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Profile } from '@football-app/shared-types';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { ProfileView } from '../../components/profile-view';
import { Button } from '../../components/ui/button';
import { SkeletonList } from '../../components/ui/skeleton';

export default function ProfilePage() {
  const t = useTranslations('OwnProfilePage');
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user) api.getProfile(user.id).then(setProfile);
  }, [user]);

  if (authLoading) return null;
  if (!user) {
    return (
      <p style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link href="/login">{t('loginLink')}</Link> {t('toSeeProfile')}
      </p>
    );
  }
  if (!profile) return <SkeletonList />;

  return (
    <ProfileView
      profile={profile}
      headerAction={
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/watchlist">
            <Button variant="secondary">{t('watchlist')}</Button>
          </Link>
          <Link href="/settings">
            <Button variant="secondary">{t('editProfile')}</Button>
          </Link>
        </div>
      }
    />
  );
}
