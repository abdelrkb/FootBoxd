'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Team } from '@football-app/shared-types';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { Crest } from '../../components/ui/crest';
import { Switch } from '../../components/ui/switch';
import { Button } from '../../components/ui/button';

const PREF_LABELS = [
  { key: 'notifyOnLike' as const, label: "J'aime" },
  { key: 'notifyOnComment' as const, label: 'Réponses' },
  { key: 'notifyOnNewFollower' as const, label: 'Nouveaux abonnés' },
  { key: 'notifyKickoffReminder' as const, label: "Rappel au coup d'envoi (ligues favorites)" },
  { key: 'hideScoresUntilClick' as const, label: 'Masquer les scores jusqu\'au clic' },
];

export default function SettingsPage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState({
    notifyOnLike: true,
    notifyOnComment: true,
    notifyOnNewFollower: true,
    notifyKickoffReminder: false,
    hideScoresUntilClick: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFavoriteTeamId(user.favoriteTeamId);
    setPrefs({
      notifyOnLike: user.notifyOnLike,
      notifyOnComment: user.notifyOnComment,
      notifyOnNewFollower: user.notifyOnNewFollower,
      notifyKickoffReminder: user.notifyKickoffReminder,
      hideScoresUntilClick: user.hideScoresUntilClick,
    });
    api.getFavoriteLeagues(user.id).then(async (leagues) => {
      const lists = await Promise.all(leagues.map((l) => api.getTeamsForLeague(l.id)));
      const byId = new Map<string, Team>();
      for (const list of lists) for (const t of list) byId.set(t.id, t);
      setTeams(Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name)));
    });
  }, [user]);

  async function save() {
    await Promise.all([api.setFavoriteTeam(favoriteTeamId), api.updatePreferences(prefs)]);
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (authLoading) return null;
  if (!user) {
    return (
      <p style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link href="/login">Connecte-toi</Link> pour accéder aux réglages.
      </p>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <h1 className="fb-display" style={{ fontSize: 32, margin: 0 }}>
        Réglages
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="fb-section" style={{ fontSize: 13 }}>
          Club de cœur
        </span>
        {teams.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--fb-text-2)' }}>
            Ajoute des ligues favorites depuis <Link href="/leagues" style={{ color: 'var(--fb-nav)' }}>Toutes les ligues</Link> pour
            choisir un club.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {teams.map((team) => {
              const selected = favoriteTeamId === team.id;
              return (
                <button
                  key={team.id}
                  onClick={() => setFavoriteTeamId(selected ? null : team.id)}
                  className="fb-label"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 999,
                    fontSize: 12,
                    border: `1px solid ${selected ? 'var(--fb-rating)' : 'var(--fb-border)'}`,
                    background: selected ? 'var(--fb-rating-bg)' : 'transparent',
                    color: selected ? 'var(--fb-rating)' : 'var(--fb-text-2)',
                  }}
                >
                  <Crest src={team.logoUrl} alt={team.name} size={18} />
                  {team.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="fb-section" style={{ fontSize: 13, marginBottom: 8 }}>
          Notifications
        </span>
        {PREF_LABELS.map(({ key, label }) => (
          <div
            key={key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 4px',
              borderBottom: '1px solid var(--fb-border-soft)',
            }}
          >
            <span style={{ fontSize: 15 }}>{label}</span>
            <Switch checked={prefs[key]} onChange={(v) => setPrefs((prev) => ({ ...prev, [key]: v }))} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Button onClick={save}>Enregistrer</Button>
        {saved && <span style={{ color: 'var(--fb-action)', fontSize: 13 }}>Enregistré ✓</span>}
      </div>
    </div>
  );
}
