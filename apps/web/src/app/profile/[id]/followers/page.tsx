'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';
import { UserRelationList } from '../../../../components/user-relation-list';

export default function FollowersPage({ params }: PageProps<'/profile/[id]/followers'>) {
  const t = useTranslations('UserRelationList');
  const { id } = use(params);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 className="fb-display" style={{ fontSize: 30, margin: 0 }}>
        {t('followersTitle')}
      </h1>
      <UserRelationList userId={id} kind="followers" />
    </div>
  );
}
