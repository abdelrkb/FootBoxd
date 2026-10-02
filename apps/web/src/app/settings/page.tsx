'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Team, UserSummary } from '@football-app/shared-types';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { Crest } from '../../components/ui/crest';
import { Field } from '../../components/ui/field';
import { Switch } from '../../components/ui/switch';
import { Button } from '../../components/ui/button';

const PREF_LABELS = [
  { key: 'notifyOnLike' as const, label: "J'aime" },
  { key: 'notifyOnComment' as const, label: 'Réponses' },
  { key: 'notifyOnNewFollower' as const, label: 'Nouveaux abonnés' },
  { key: 'notifyKickoffReminder' as const, label: 'Rappel au coup d\'envoi (ligues favorites)' },
  { key: 'notifyWatchlistKickoff' as const, label: 'Rappel 30 min avant le coup d\'envoi (watchlist)' },
  { key: 'hideScoresUntilClick' as const, label: 'Masquer les scores jusqu\'au clic' },
];

const USERNAME_COOLDOWN_DAYS = 14;

function sectionStyle() {
  return { display: 'flex', flexDirection: 'column' as const, gap: 14, paddingTop: 24, borderTop: '1px solid var(--fb-border)' };
}

export default function SettingsPage() {
  const { user, loading: authLoading, refresh, logout } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState({
    notifyOnLike: true,
    notifyOnComment: true,
    notifyOnNewFollower: true,
    notifyKickoffReminder: false,
    notifyWatchlistKickoff: false,
    hideScoresUntilClick: false,
  });
  const [saved, setSaved] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSaving, setUsernameSaving] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);

  const [blockedAccounts, setBlockedAccounts] = useState<UserSummary[] | null>(null);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFavoriteTeamId(user.favoriteTeamId);
    setPrefs({
      notifyOnLike: user.notifyOnLike,
      notifyOnComment: user.notifyOnComment,
      notifyOnNewFollower: user.notifyOnNewFollower,
      notifyKickoffReminder: user.notifyKickoffReminder,
      notifyWatchlistKickoff: user.notifyWatchlistKickoff,
      hideScoresUntilClick: user.hideScoresUntilClick,
    });
    setDisplayName(user.displayName);
    setBio(user.bio ?? '');
    setUsername(user.username);
    api.getFavoriteLeagues(user.id).then(async (leagues) => {
      const lists = await Promise.all(leagues.map((l) => api.getTeamsForLeague(l.id)));
      const byId = new Map<string, Team>();
      for (const list of lists) for (const t of list) byId.set(t.id, t);
      setTeams(Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name)));
    });
    api.getBlockedAccounts().then(setBlockedAccounts);
  }, [user]);

  async function save() {
    await Promise.all([api.setFavoriteTeam(favoriteTeamId), api.updatePreferences(prefs)]);
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function saveProfile() {
    setProfileSaving(true);
    try {
      await api.updateProfile({ displayName, bio });
      await refresh();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveUsername() {
    setUsernameError(null);
    setUsernameSaving(true);
    try {
      await api.updateUsername(username);
      await refresh();
    } catch (err) {
      setUsernameError(err instanceof api.ApiError ? err.message : 'Erreur inconnue');
    } finally {
      setUsernameSaving(false);
    }
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      await api.uploadAvatar(file);
      await refresh();
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  }

  async function handleRemoveAvatar() {
    setAvatarUploading(true);
    try {
      await api.removeAvatar();
      await refresh();
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleUnblock(targetId: string) {
    await api.unblockUser(targetId);
    setBlockedAccounts((prev) => prev?.filter((u) => u.id !== targetId) ?? null);
  }

  async function handleDeleteAccount() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await api.deleteAccount(deletePassword || undefined);
      await logout();
      router.push('/');
    } catch (err) {
      setDeleteError(err instanceof api.ApiError ? err.message : 'Erreur inconnue');
    } finally {
      setDeleting(false);
    }
  }

  if (authLoading) return null;
  if (!user) {
    return (
      <p style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link href="/login">Connecte-toi</Link> pour accéder aux réglages.
      </p>
    );
  }

  const nextUsernameChangeAt = user.usernameChangedAt
    ? new Date(user.usernameChangedAt).getTime() + USERNAME_COOLDOWN_DAYS * 86_400_000
    : null;
  const usernameCooldownDaysLeft = nextUsernameChangeAt ? Math.ceil((nextUsernameChangeAt - Date.now()) / 86_400_000) : 0;
  const usernameLocked = usernameCooldownDaysLeft > 0;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <h1 className="fb-display" style={{ fontSize: 32, margin: 0 }}>
        Réglages
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <span className="fb-section" style={{ fontSize: 13 }}>
          Profil
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Crest src={user.avatarUrl} alt={user.displayName} size={72} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleAvatarChange} />
            <Button size="sm" variant="secondary" loading={avatarUploading} onClick={() => fileInputRef.current?.click()}>
              Changer l'avatar
            </Button>
            <button
              onClick={handleRemoveAvatar}
              className="fb-meta"
              style={{ background: 'none', border: 'none', fontSize: 12, textAlign: 'left', color: 'var(--fb-text-3)' }}
            >
              Retirer l'avatar
            </button>
          </div>
        </div>
        <Field label="Nom affiché" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <label className="fb-label" style={{ fontSize: 11.5, color: 'var(--fb-text-2)' }}>
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            placeholder="Quelques mots sur toi…"
            style={{
              width: '100%',
              minHeight: 90,
              boxSizing: 'border-box',
              padding: 14,
              border: '1px solid var(--fb-border)',
              borderRadius: 12,
              background: 'var(--fb-bg)',
              color: 'var(--fb-text)',
              fontFamily: 'var(--fb-font-sans)',
              fontSize: 15,
              resize: 'vertical',
            }}
          />
          <span className="fb-meta" style={{ fontSize: 11, alignSelf: 'flex-end' }}>
            {bio.length}/280
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Button size="sm" loading={profileSaving} onClick={saveProfile}>
            Enregistrer
          </Button>
          {profileSaved && <span style={{ color: 'var(--fb-action)', fontSize: 13 }}>Enregistré ✓</span>}
        </div>
      </div>

      <div style={sectionStyle()}>
        <span className="fb-section" style={{ fontSize: 13 }}>
          Pseudo
        </span>
        <Field
          label="@"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          pattern="[a-z0-9_]{3,20}"
          disabled={usernameLocked}
          error={usernameError ?? undefined}
          hint={
            usernameLocked
              ? `Déjà changé récemment — réessaie dans ${usernameCooldownDaysLeft} jour${usernameCooldownDaysLeft > 1 ? 's' : ''}`
              : 'Une fois tous les 14 jours maximum'
          }
        />
        <div>
          <Button
            size="sm"
            variant="secondary"
            disabled={usernameLocked || username === user.username}
            loading={usernameSaving}
            onClick={saveUsername}
          >
            Changer le pseudo
          </Button>
        </div>
      </div>

      <div style={sectionStyle()}>
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

      <div style={sectionStyle()}>
        <span className="fb-section" style={{ fontSize: 13 }}>
          Comptes bloqués
        </span>
        {blockedAccounts === null ? (
          <p className="fb-meta">Chargement…</p>
        ) : blockedAccounts.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--fb-text-2)' }}>Aucun compte bloqué.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {blockedAccounts.map((u) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                <Crest src={u.avatarUrl} alt={u.displayName} size={32} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{u.displayName}</span>
                <Button size="sm" variant="secondary" onClick={() => handleUnblock(u.id)}>
                  Débloquer
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...sectionStyle(), borderTop: '1px solid var(--fb-live)' }}>
        <span className="fb-section" style={{ fontSize: 13, color: 'var(--fb-live-text)' }}>
          Zone dangereuse
        </span>
        {!confirmingDelete ? (
          <Button variant="destructive" onClick={() => setConfirmingDelete(true)}>
            Supprimer mon compte
          </Button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--fb-text-2)', margin: 0 }}>
              Ton compte sera anonymisé (pseudo, nom, email, avatar supprimés). Tes reviews et commentaires restent visibles,
              attribués à "Utilisateur supprimé". Action irréversible.
            </p>
            <Field
              label="Mot de passe"
              hint="Laisse vide si tu t'es inscrit uniquement avec Google/Apple"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              error={deleteError ?? undefined}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="destructive" loading={deleting} onClick={handleDeleteAccount}>
                Confirmer la suppression
              </Button>
              <Button variant="tertiary" onClick={() => setConfirmingDelete(false)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
