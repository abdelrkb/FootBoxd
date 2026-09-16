'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Notification } from '@football-app/shared-types';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

const LABELS: Record<Notification['type'], string> = {
  comment: 'a commenté votre review',
  like: 'a aimé votre review',
  follow: "a commencé à vous suivre",
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
      <p style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link href="/login">Connectez-vous</Link> pour voir vos notifications.
      </p>
    );
  }

  async function markRead(id: string) {
    await api.markNotificationRead(id);
    setNotifications((prev) => prev?.map((n) => (n.id === id ? { ...n, isRead: true } : n)) ?? null);
  }

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto' }}>
      <h1>Notifications</h1>
      {notifications === null && <p>Chargement...</p>}
      {notifications?.length === 0 && <p>Aucune notification.</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {notifications?.map((n) => (
          <li
            key={n.id}
            onClick={() => !n.isRead && markRead(n.id)}
            style={{
              padding: '0.75rem',
              border: '1px solid #333',
              borderRadius: 8,
              fontWeight: n.isRead ? 400 : 700,
              cursor: n.isRead ? 'default' : 'pointer',
            }}
          >
            <strong>{n.actor.displayName}</strong> {LABELS[n.type]}
          </li>
        ))}
      </ul>
    </div>
  );
}
