'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { UserWithRelation } from '@football-app/shared-types';
import * as api from '../lib/api';
import { Crest } from './ui/crest';
import { EmptyContent } from './ui/empty-state';
import { SkeletonList } from './ui/skeleton';
import { cardShellStyle } from './ui/card-shell';

// Liste d'abonnés / d'abonnements d'un profil (issue #54). Chaque ligne indique la relation
// avec le visiteur : "Tu le suis" et/ou "Te suit". L'API renvoie un 403 pour un profil privé
// auquel on n'a pas accès — on affiche alors le message dédié plutôt qu'une page vide.
export function UserRelationList({ userId, kind }: { userId: string; kind: 'followers' | 'following' }) {
  const t = useTranslations('UserRelationList');
  const [users, setUsers] = useState<UserWithRelation[] | null>(null);
  const [restricted, setRestricted] = useState(false);

  useEffect(() => {
    const load = kind === 'followers' ? api.getFollowers : api.getFollowing;
    load(userId)
      .then(setUsers)
      .catch((err) => {
        if (err instanceof api.ApiError && err.status === 403) setRestricted(true);
        else throw err;
      });
  }, [userId, kind]);

  if (restricted) return <EmptyContent title={t('restricted')} />;
  if (users === null) return <SkeletonList count={5} />;
  if (users.length === 0) {
    return <EmptyContent title={kind === 'followers' ? t('noFollowers') : t('noFollowing')} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {users.map((u) => (
        <Link
          key={u.id}
          href={`/profile/${u.id}`}
          style={{ ...cardShellStyle(14), alignItems: 'center' }}
          className="fb-card"
        >
          <Crest src={u.avatarUrl} alt={u.displayName} size={40} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
            <span className="fb-card-title" style={{ fontSize: 14.5 }}>
              {u.displayName}
            </span>
            <span className="fb-meta" style={{ fontSize: 12 }}>
              @{u.username}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {u.isSelf && <RelationTag label={t('you')} />}
            {!u.isSelf && u.youFollow && <RelationTag label={t('youFollow')} accent />}
            {!u.isSelf && u.followsYou && <RelationTag label={t('followsYou')} />}
          </div>
        </Link>
      ))}
    </div>
  );
}

function RelationTag({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span
      className="fb-label"
      style={{
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 10.5,
        whiteSpace: 'nowrap',
        border: `1px solid ${accent ? 'var(--fb-action)' : 'var(--fb-border)'}`,
        color: accent ? 'var(--fb-action)' : 'var(--fb-text-2)',
        background: 'transparent',
      }}
    >
      {label}
    </span>
  );
}
