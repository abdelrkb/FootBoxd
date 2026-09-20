'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Notification } from '@football-app/shared-types';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { Crest } from '../../components/ui/crest';
import { EmptyContent, EmptySocial } from '../../components/ui/empty-state';
import { Button } from '../../components/ui/button';
import { SkeletonList } from '../../components/ui/skeleton';
import { ClientDate } from '../../components/client-date';

const LABELS: Record<Notification['type'], string> = {
  comment: 'a commenté ta review',
  like: 'a aimé ta review',
  follow: 'a commencé à te suivre',
};

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[] | null>(null);

  useEffect(() => {
    if (user) api.getNotifications().then(setNotifications);
  }, [user]);

  if (authLoading) return null;
  if (!user) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px' }}>
        <EmptySocial
          title="Connecte-toi pour voir tes notifications"
          subtitle="Les likes, commentaires et nouveaux abonnés apparaissent ici."
          action={
            <Link href="/login">
              <Button size="sm">Connexion</Button>
            </Link>
          }
        />
      </div>
    );
  }

  async function markRead(id: string) {
    await api.markNotificationRead(id);
    setNotifications((prev) => prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? null);
  }

  async function markAllRead() {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? null);
  }

  async function followBack(actorId: string, notifId: string) {
    await api.followUser(actorId);
    setNotifications((prev) => prev?.map((n) => (n.id === notifId ? { ...n, isFollowingActor: true } : n)) ?? null);
  }

  const hasUnread = notifications?.some((n) => !n.isRead) ?? false;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="fb-display" style={{ fontSize: 34, margin: 0 }}>
          Notifications
        </h1>
        {hasUnread && (
          <button
            onClick={markAllRead}
            className="fb-label"
            style={{ fontSize: 12, color: 'var(--fb-nav)', background: 'none', border: 'none' }}
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {notifications === null && <SkeletonList />}
      {notifications?.length === 0 && <EmptyContent title="Aucune notification" />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {notifications?.map((n) => (
          <div
            key={n.id}
            onClick={() => !n.isRead && markRead(n.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 12px',
              borderRadius: 10,
              background: n.isRead ? 'transparent' : 'var(--fb-surface-unread)',
              cursor: n.isRead ? 'default' : 'pointer',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: n.isRead ? 'transparent' : 'var(--fb-social)',
                flexShrink: 0,
              }}
            />
            <Link href={`/profile/${n.actorId}`} onClick={(e) => e.stopPropagation()}>
              <Crest src={n.actor.avatarUrl} alt={n.actor.displayName} size={38} />
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 14.5,
                  fontWeight: n.isRead ? 400 : 700,
                  color: n.isRead ? 'var(--fb-text-2)' : 'var(--fb-text)',
                }}
              >
                <Link href={`/profile/${n.actorId}`} onClick={(e) => e.stopPropagation()} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <strong>{n.actor.displayName}</strong>
                </Link>{' '}
                {LABELS[n.type]}
              </span>
            </div>
            {n.type === 'follow' && !n.isFollowingActor && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  followBack(n.actorId, n.id);
                }}
              >
                Suivre
              </Button>
            )}
            <span className="fb-meta" style={{ flexShrink: 0 }}>
              <ClientDate iso={n.createdAt} options={{ dateStyle: 'short', timeStyle: 'short' }} fallback="" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
