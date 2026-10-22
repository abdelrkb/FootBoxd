'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Notification } from '@football-app/shared-types';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { Crest, CrestPair } from '../../components/ui/crest';
import { EmptyContent, EmptySocial } from '../../components/ui/empty-state';
import { Button } from '../../components/ui/button';
import { SkeletonList } from '../../components/ui/skeleton';
import { ClientDate } from '../../components/client-date';

export default function NotificationsPage() {
  const t = useTranslations('NotificationsPage');
  const LABELS: Record<Notification['type'], string> = {
    comment: t('labelComment'),
    like: t('labelLike'),
    follow: t('labelFollow'),
    kickoff_reminder: '',
    mention: t('labelMention'),
    comment_reply: t('labelCommentReply'),
    comment_like: t('labelCommentLike'),
    follow_request: t('labelFollowRequest'),
    follow_accepted: t('labelFollowAccepted'),
  };
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  // follow_request n'a pas de flag "déjà traitée" côté API (pas de liste dédiée, voir issue
  // #18) — on masque juste localement les boutons Accepter/Refuser après action.
  const [resolvedRequests, setResolvedRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) api.getNotifications().then(setNotifications);
  }, [user]);

  if (authLoading) return null;
  if (!user) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px' }}>
        <EmptySocial
          title={t('loginToSeeNotifications')}
          subtitle={t('loginHint')}
          action={
            <Link href="/login">
              <Button size="sm">{t('login')}</Button>
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
    const { status } = await api.followUser(actorId);
    setNotifications(
      (prev) => prev?.map((n) => (n.id === notifId ? { ...n, isFollowingActor: status === 'following' } : n)) ?? null,
    );
  }

  async function respondToFollowRequest(notif: Notification, accept: boolean) {
    try {
      if (accept) await api.acceptFollowRequest(notif.actorId);
      else await api.rejectFollowRequest(notif.actorId);
    } catch {
      // Déjà traitée ailleurs (ex: depuis le profil du demandeur) — pas d'erreur à l'utilisateur,
      // juste masquer les boutons comme si l'action avait réussi.
    }
    setResolvedRequests((prev) => new Set(prev).add(notif.id));
  }

  const hasUnread = notifications?.some((n) => !n.isRead) ?? false;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="fb-display" style={{ fontSize: 34, margin: 0 }}>
          {t('title')}
        </h1>
        {hasUnread && (
          <button
            onClick={markAllRead}
            className="fb-label"
            style={{ fontSize: 12, color: 'var(--fb-nav)', background: 'none', border: 'none' }}
          >
            {t('markAllRead')}
          </button>
        )}
      </div>

      {notifications === null && <SkeletonList />}
      {notifications?.length === 0 && <EmptyContent title={t('noNotifications')} />}

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
            {n.type === 'kickoff_reminder' && n.match ? (
              <>
                <Link href={`/matches/${n.match.id}`} onClick={(e) => e.stopPropagation()}>
                  <CrestPair home={n.match.homeTeam} away={n.match.awayTeam} size={38} />
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    href={`/matches/${n.match.id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      color: n.isRead ? 'var(--fb-text-2)' : 'var(--fb-text)',
                      textDecoration: 'none',
                      fontSize: 14.5,
                      fontWeight: n.isRead ? 400 : 700,
                    }}
                  >
                    {t.rich('kickoffIn30', {
                      home: n.match.homeTeam.name,
                      away: n.match.awayTeam.name,
                      strong: (chunks) => <strong>{chunks}</strong>,
                    })}
                  </Link>
                </div>
              </>
            ) : (
              <>
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
                    <Link
                      href={`/profile/${n.actorId}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      <strong>{n.actor.displayName}</strong>
                    </Link>{' '}
                    {LABELS[n.type]}
                  </span>
                </div>
              </>
            )}
            {n.type === 'follow' && !n.isFollowingActor && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  followBack(n.actorId, n.id);
                }}
              >
                {t('follow')}
              </Button>
            )}
            {n.type === 'follow_request' && !resolvedRequests.has(n.id) && (
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                <Button size="sm" onClick={() => respondToFollowRequest(n, true)}>
                  {t('accept')}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => respondToFollowRequest(n, false)}>
                  {t('decline')}
                </Button>
              </div>
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
