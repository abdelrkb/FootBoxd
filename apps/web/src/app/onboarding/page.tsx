'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { League, Team } from '@football-app/shared-types';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { Crest } from '../../components/ui/crest';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { leagueAccentColor } from '../../components/ui/card-shell';

// Parcours après inscription (handoff design, "à valider" → validé le 2026-09-20) : choix des
// ligues, club de cœur, réglages de notification. 3 segments : Ligues / Réglages / Confirmation
// (un léger ajout de notre part pour donner un sens à "3 segments" — le handoff n'en décrivait
// que 2 en détail).
const STEPS = ['Tes ligues', 'Réglages', 'C\'est parti'] as const;

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {STEPS.map((_, i) => (
        <span
          key={i}
          style={{ flex: 1, height: 3, borderRadius: 999, background: i <= step ? 'var(--fb-action)' : 'var(--fb-border)' }}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<Set<string>>(new Set());
  const [teams, setTeams] = useState<Team[]>([]);
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState({
    notifyOnLike: true,
    notifyOnComment: true,
    notifyOnNewFollower: true,
    notifyKickoffReminder: false,
    hideScoresUntilClick: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getAllLeagues().then(setLeagues);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  function toggleLeague(id: string) {
    setSelectedLeagueIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function goToStep2() {
    setSaving(true);
    await Promise.all(Array.from(selectedLeagueIds, (id) => api.favoriteLeague(id)));
    const teamLists = await Promise.all(Array.from(selectedLeagueIds, (id) => api.getTeamsForLeague(id)));
    const byId = new Map<string, Team>();
    for (const list of teamLists) for (const t of list) byId.set(t.id, t);
    setTeams(Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name)));
    setSaving(false);
    setStep(1);
  }

  async function goToStep3() {
    setSaving(true);
    await Promise.all([api.setFavoriteTeam(favoriteTeamId), api.updatePreferences(prefs)]);
    setSaving(false);
    setStep(2);
  }

  async function finish() {
    await api.completeOnboarding();
    router.push('/');
  }

  const sortedLeagues = useMemo(() => (leagues ? [...leagues].sort((a, b) => a.name.localeCompare(b.name)) : []), [leagues]);

  return (
    <div style={{ maxWidth: 880, margin: '48px auto', padding: '0 24px 80px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <ProgressBar step={step} />

      {step === 0 && (
        <>
          <div>
            <h1 className="fb-display" style={{ fontSize: 32, margin: 0 }}>
              Tes ligues
            </h1>
            <p style={{ color: 'var(--fb-text-2)', fontSize: 15, marginTop: 8 }}>
              Choisis les compétitions que tu veux suivre — tu pourras en ajouter d'autres plus tard.
            </p>
          </div>

          {leagues === null ? (
            <p className="fb-meta">Chargement…</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))', gap: 14 }}>
              {sortedLeagues.map((league) => {
                const selected = selectedLeagueIds.has(league.id);
                return (
                  <button
                    key={league.id}
                    onClick={() => toggleLeague(league.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 14,
                      border: `1px solid ${selected ? 'var(--fb-rating)' : 'var(--fb-border)'}`,
                      borderRadius: 12,
                      background: selected ? 'var(--fb-rating-bg)' : 'var(--fb-surface)',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ width: 3, height: 20, borderRadius: 999, background: leagueAccentColor(league), flexShrink: 0 }} />
                    <Crest src={league.logoUrl} alt={league.name} size={28} />
                    <span style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {league.name}
                    </span>
                    <span style={{ color: selected ? 'var(--fb-rating)' : 'var(--fb-text-3)', flexShrink: 0 }}>
                      {selected ? '★' : '☆'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="fb-num" style={{ color: selectedLeagueIds.size === 0 ? 'var(--fb-live-text)' : 'var(--fb-text-2)' }}>
              {selectedLeagueIds.size} sélectionnée(s)
            </span>
            <Button disabled={selectedLeagueIds.size === 0 || saving} loading={saving} onClick={goToStep2}>
              Continuer
            </Button>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div>
            <h1 className="fb-display" style={{ fontSize: 32, margin: 0 }}>
              Réglages
            </h1>
          </div>

          {teams.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="fb-section" style={{ fontSize: 13 }}>
                Club de cœur (optionnel)
              </span>
              <p style={{ fontSize: 13, color: 'var(--fb-text-2)', margin: 0 }}>Ses matchs seront épinglés en haut de l'accueil.</p>
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
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { key: 'notifyOnLike' as const, label: "J'aime" },
              { key: 'notifyOnComment' as const, label: 'Réponses' },
              { key: 'notifyOnNewFollower' as const, label: 'Nouveaux abonnés' },
              { key: 'notifyKickoffReminder' as const, label: 'Rappel au coup d\'envoi (ligues favorites)' },
              { key: 'hideScoresUntilClick' as const, label: 'Masquer les scores jusqu\'au clic' },
            ].map(({ key, label }) => (
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

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button loading={saving} onClick={goToStep3}>
              Continuer
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start' }}>
          <h1 className="fb-display" style={{ fontSize: 32, margin: 0 }}>
            C'est parti
          </h1>
          <p style={{ color: 'var(--fb-text-2)', fontSize: 15 }}>
            {selectedLeagueIds.size} ligue(s) suivie(s){favoriteTeamId ? ', un club de cœur épinglé' : ''}. Tu peux tout
            modifier plus tard depuis ton profil.
          </p>
          <Button onClick={finish}>Voir mes ligues</Button>
        </div>
      )}
    </div>
  );
}
