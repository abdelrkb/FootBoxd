'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { Team, UserSummary } from '@football-app/shared-types';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { setLocaleCookie, type Locale } from '../../i18n/config';
import { Crest } from '../../components/ui/crest';
import { Field } from '../../components/ui/field';
import { Switch } from '../../components/ui/switch';
import { Button } from '../../components/ui/button';

const USERNAME_COOLDOWN_DAYS = 14;

function sectionStyle() {
  return { display: 'flex', flexDirection: 'column' as const, gap: 14, paddingTop: 24, borderTop: '1px solid var(--fb-border)' };
}

export default function SettingsPage() {
  const t = useTranslations('SettingsPage');
  const tLang = useTranslations('SettingsLanguage');
  const tCommon = useTranslations('Common');
  const PREF_LABELS = [
    { key: 'notifyOnLike' as const, label: t('prefLikes') },
    { key: 'notifyOnComment' as const, label: t('prefReplies') },
    { key: 'notifyOnNewFollower' as const, label: t('prefNewFollowers') },
    { key: 'notifyKickoffReminder' as const, label: t('prefKickoffReminder') },
    { key: 'notifyWatchlistKickoff' as const, label: t('prefWatchlistKickoffReminder') },
    { key: 'hideScoresUntilClick' as const, label: t('prefHideScores') },
  ];
  const { user, loading: authLoading, refresh, logout } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(null);
  // Équipes suivies (issue #53) : appliquées immédiatement (une requête par ajout/retrait),
  // pas groupées avec le bouton "Enregistrer" comme le club de cœur.
  const [followedTeams, setFollowedTeams] = useState<Team[]>([]);
  const [teamQuery, setTeamQuery] = useState('');
  const [teamResults, setTeamResults] = useState<Team[]>([]);
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

  const [isPrivate, setIsPrivateState] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);

  // Langue active résolue côté serveur (cookie) — reflète la préférence du compte une fois
  // que auth-context.tsx les a synchronisées (voir son `refresh`). Pas de state séparé : cette
  // valeur suit déjà le provider, qui se met à jour après le router.refresh() du changement.
  const activeLocale = useLocale() as Locale;
  const [localeSaving, setLocaleSaving] = useState(false);

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
    setIsPrivateState(user.isPrivate);
    api.getFavoriteLeagues(user.id).then(async (leagues) => {
      const lists = await Promise.all(leagues.map((l) => api.getTeamsForLeague(l.id)));
      const byId = new Map<string, Team>();
      for (const list of lists) for (const t of list) byId.set(t.id, t);
      setTeams(Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name)));
    });
    api.getBlockedAccounts().then(setBlockedAccounts);
    api.getFavoriteTeams(user.id).then(setFollowedTeams);
  }, [user]);

  useEffect(() => {
    const q = teamQuery.trim();
    if (q.length < 2) {
      setTeamResults([]);
      return;
    }
    const timer = setTimeout(() => {
      api.searchTeams(q).then(setTeamResults);
    }, 250);
    return () => clearTimeout(timer);
  }, [teamQuery]);

  async function addFollowedTeam(team: Team) {
    await api.favoriteTeam(team.id);
    setFollowedTeams((prev) => (prev.some((t) => t.id === team.id) ? prev : [...prev, team]));
    setTeamQuery('');
    setTeamResults([]);
  }

  async function removeFollowedTeam(teamId: string) {
    await api.unfavoriteTeam(teamId);
    setFollowedTeams((prev) => prev.filter((t) => t.id !== teamId));
  }

  async function save() {
    await Promise.all([api.setFavoriteTeam(favoriteTeamId), api.updatePreferences(prefs)]);
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Profil privé (issue #18) : appliqué immédiatement, même pattern que la visibilité de la
  // watchlist (voir watchlist/page.tsx `togglePrivacy`) plutôt que groupé avec "Enregistrer".
  async function toggleProfilePrivacy() {
    const next = !isPrivate;
    setPrivacySaving(true);
    try {
      setIsPrivateState(next);
      await api.setProfilePrivacy(next);
      await refresh();
    } finally {
      setPrivacySaving(false);
    }
  }

  // i18n (issue #27) : sauvegarde la préférence sur le compte, pose le cookie tout de suite
  // (pas besoin d'attendre le prochain `refresh`) et rafraîchit pour que le rendu serveur
  // reparte avec les nouveaux messages — même geste que le changement de visibilité ci-dessus.
  async function changeLocale(next: Locale) {
    setLocaleSaving(true);
    try {
      await api.setLocale(next);
      setLocaleCookie(next);
      await refresh();
      router.refresh();
    } finally {
      setLocaleSaving(false);
    }
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
      setUsernameError(err instanceof api.ApiError ? err.message : tCommon('unknownError'));
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
      setDeleteError(err instanceof api.ApiError ? err.message : tCommon('unknownError'));
    } finally {
      setDeleting(false);
    }
  }

  if (authLoading) return null;
  if (!user) {
    return (
      <p style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link href="/login">{t('loginLink')}</Link> {t('toAccessSettings')}
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
        {t('title')}
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <span className="fb-section" style={{ fontSize: 13 }}>
          {t('profile')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Crest src={user.avatarUrl} alt={user.displayName} size={72} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleAvatarChange} />
            <Button size="sm" variant="secondary" loading={avatarUploading} onClick={() => fileInputRef.current?.click()}>
              {t('changeAvatar')}
            </Button>
            <button
              onClick={handleRemoveAvatar}
              className="fb-meta"
              style={{ background: 'none', border: 'none', fontSize: 12, textAlign: 'left', color: 'var(--fb-text-3)' }}
            >
              {t('removeAvatar')}
            </button>
          </div>
        </div>
        <Field label={t('displayName')} value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <label className="fb-label" style={{ fontSize: 11.5, color: 'var(--fb-text-2)' }}>
            {t('bio')}
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            placeholder={t('bioPlaceholder')}
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
            {t('save')}
          </Button>
          {profileSaved && <span style={{ color: 'var(--fb-action)', fontSize: 13 }}>{t('saved')}</span>}
        </div>
      </div>

      <div style={sectionStyle()}>
        <span className="fb-section" style={{ fontSize: 13 }}>
          {t('username')}
        </span>
        <Field
          label="@"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          pattern="[a-z0-9_]{3,20}"
          disabled={usernameLocked}
          error={usernameError ?? undefined}
          hint={usernameLocked ? t('usernameLocked', { count: usernameCooldownDaysLeft }) : t('usernameHint')}
        />
        <div>
          <Button
            size="sm"
            variant="secondary"
            disabled={usernameLocked || username === user.username}
            loading={usernameSaving}
            onClick={saveUsername}
          >
            {t('changeUsername')}
          </Button>
        </div>
      </div>

      <div style={sectionStyle()}>
        <span className="fb-section" style={{ fontSize: 13 }}>
          {t('privacy')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 14 }}>{t('privateProfile')}</span>
            <span className="fb-meta" style={{ fontSize: 12 }}>
              {t('privateProfileHint')}
            </span>
          </div>
          <Switch checked={isPrivate} onChange={toggleProfilePrivacy} />
        </div>
      </div>

      <div style={sectionStyle()}>
        <span className="fb-section" style={{ fontSize: 13 }}>
          {tLang('title')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 14 }}>{tLang('language')}</span>
            <span className="fb-meta" style={{ fontSize: 12 }}>
              {tLang('hint')}
            </span>
          </div>
          <select
            value={activeLocale}
            disabled={localeSaving}
            onChange={(e) => changeLocale(e.target.value as Locale)}
            style={{
              height: 42,
              padding: '0 14px',
              border: '1px solid var(--fb-border)',
              borderRadius: 12,
              background: 'var(--fb-bg)',
              color: 'var(--fb-text)',
              fontFamily: 'var(--fb-font-sans)',
              fontSize: 14,
            }}
          >
            <option value="fr">{tLang('french')}</option>
            <option value="en">{tLang('english')}</option>
          </select>
        </div>
      </div>

      <div style={sectionStyle()}>
        <span className="fb-section" style={{ fontSize: 13 }}>
          {t('favoriteClub')}
        </span>
        {teams.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--fb-text-2)' }}>
            {t.rich('favoriteClubEmptyHint', {
              link: (chunks) => <Link href="/leagues" style={{ color: 'var(--fb-nav)' }}>{chunks}</Link>,
            })}
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

      <div style={sectionStyle()}>
        <span className="fb-section" style={{ fontSize: 13 }}>
          {t('followedTeams')}
        </span>
        <p style={{ fontSize: 13, color: 'var(--fb-text-2)', margin: 0 }}>{t('followedTeamsHint')}</p>

        {followedTeams.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {followedTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => removeFollowedTeam(team.id)}
                className="fb-label"
                title={t('removeFollowedTeam')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 999,
                  fontSize: 12,
                  border: '1px solid var(--fb-border)',
                  background: 'var(--fb-surface)',
                  color: 'var(--fb-text-2)',
                }}
              >
                <Crest src={team.logoUrl} alt={team.name} size={18} />
                {team.name}
                <span style={{ color: 'var(--fb-text-3)' }}>✕</span>
              </button>
            ))}
          </div>
        )}

        <input
          value={teamQuery}
          onChange={(e) => setTeamQuery(e.target.value)}
          placeholder={t('followedTeamsSearchPlaceholder')}
          className="fb-label"
          style={{
            height: 42,
            padding: '0 16px',
            borderRadius: 999,
            border: '1px solid var(--fb-border)',
            background: 'var(--fb-bg)',
            color: 'var(--fb-text)',
            fontSize: 13,
            textTransform: 'none',
            letterSpacing: 'normal',
          }}
        />

        {teamResults.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {teamResults
              .filter((team) => !followedTeams.some((t) => t.id === team.id))
              .map((team) => (
                <button
                  key={team.id}
                  onClick={() => addFollowedTeam(team)}
                  className="fb-label"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 999,
                    fontSize: 12,
                    border: '1px dashed var(--fb-border-strong)',
                    background: 'transparent',
                    color: 'var(--fb-text-2)',
                  }}
                >
                  <Crest src={team.logoUrl} alt={team.name} size={18} />
                  {team.name}
                  <span style={{ color: 'var(--fb-action)' }}>+</span>
                </button>
              ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="fb-section" style={{ fontSize: 13, marginBottom: 8 }}>
          {t('notifications')}
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
        <Button onClick={save}>{t('save')}</Button>
        {saved && <span style={{ color: 'var(--fb-action)', fontSize: 13 }}>{t('saved')}</span>}
      </div>

      <div style={sectionStyle()}>
        <span className="fb-section" style={{ fontSize: 13 }}>
          {t('blockedAccounts')}
        </span>
        {blockedAccounts === null ? (
          <p className="fb-meta">{t('loading')}</p>
        ) : blockedAccounts.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--fb-text-2)' }}>{t('noBlockedAccounts')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {blockedAccounts.map((u) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                <Crest src={u.avatarUrl} alt={u.displayName} size={32} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{u.displayName}</span>
                <Button size="sm" variant="secondary" onClick={() => handleUnblock(u.id)}>
                  {t('unblock')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...sectionStyle(), borderTop: '1px solid var(--fb-live)' }}>
        <span className="fb-section" style={{ fontSize: 13, color: 'var(--fb-live-text)' }}>
          {t('dangerZone')}
        </span>
        {!confirmingDelete ? (
          <Button variant="destructive" onClick={() => setConfirmingDelete(true)}>
            {t('deleteAccount')}
          </Button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--fb-text-2)', margin: 0 }}>
              {t('deleteAccountWarning')}
            </p>
            <Field
              label={t('password')}
              hint={t('passwordHint')}
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              error={deleteError ?? undefined}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="destructive" loading={deleting} onClick={handleDeleteAccount}>
                {t('confirmDeletion')}
              </Button>
              <Button variant="tertiary" onClick={() => setConfirmingDelete(false)}>
                {t('cancel')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
