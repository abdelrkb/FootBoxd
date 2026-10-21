'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Match, Review, TagSelection } from '@football-app/shared-types';
import * as api from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { StarsSelector } from './ui/stars';
import { TagInput } from './ui/tag-input';
import { Button } from './ui/button';

type Step = 'loading' | 'choice' | 'form';

// "Noter un match sans ouvrir la fiche" (issue #15) : modal autonome, ouvrable depuis n'importe
// quelle mini-card de match (accueil, page ligue, page équipe, watchlist, profil…). Deux entrées
// distinctes :
// - mode 'quick' : juste les étoiles, crée/mets à jour une review quickRating=true (voir
//   reviews.service.ts) — n'apparaît jamais dans les flux de logs.
// - mode 'full' : formulaire complet (étoiles + commentaire + tags), identique à celui de la
//   fiche du match. Si la dernière review active de l'utilisateur sur ce match est une note
//   rapide (quickRating), on demande d'abord s'il veut la compléter (même review, devient un
//   vrai log) ou logger un nouveau visionnage à part (rewatch, voir issue #14) — décision
//   produit explicite du 2026-10-22, pas déduit automatiquement.
export function LogMatchModal({
  match,
  mode,
  onClose,
  onSaved,
}: {
  match: Match;
  mode: 'quick' | 'full';
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('loading');
  const [existing, setExisting] = useState<Review | null>(null);
  const [completing, setCompleting] = useState(false);
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<TagSelection[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.getReviewsForMatch(match.id).then((reviews) => {
      const mine = reviews
        .filter((r) => r.userId === user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const latest = mine[0] ?? null;
      setExisting(latest);

      if (mode === 'quick') {
        setRating(latest ? Number(latest.rating) : 3);
        setStep('form');
      } else if (latest?.quickRating) {
        setStep('choice');
      } else {
        setStep('form');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id, mode, user]);

  function startCompleting() {
    setCompleting(true);
    setRating(existing ? Number(existing.rating) : 3);
    setComment('');
    setTags([]);
    setStep('form');
  }

  function startNewWatch() {
    setCompleting(false);
    setRating(3);
    setComment('');
    setTags([]);
    setStep('form');
  }

  async function submitQuick() {
    setSubmitting(true);
    setError(null);
    try {
      if (existing) await api.updateReview(existing.id, { rating });
      else await api.createReview(match.id, rating, undefined, undefined, true);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitFull(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (completing && existing) {
        await api.updateReview(existing.id, { rating, comment: comment || undefined, tags, quickRating: false });
      } else {
        await api.createReview(match.id, rating, comment || undefined, tags.length ? tags : undefined, false);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--fb-surface-2)',
          border: '1px solid var(--fb-border)',
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span className="fb-card-title" style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {match.homeTeam.name} — {match.awayTeam.name}
          </span>
        </div>

        {step === 'loading' && <p className="fb-meta" style={{ margin: 0 }}>Chargement…</p>}

        {step === 'choice' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p className="fb-body" style={{ margin: 0, fontSize: 14 }}>
              Tu as déjà noté ce match rapidement. Tu veux compléter cette note avec un commentaire, ou logger un
              nouveau visionnage à part ?
            </p>
            <Button onClick={startCompleting}>Compléter cette note</Button>
            <Button variant="secondary" onClick={startNewWatch}>
              Logger un nouveau visionnage
            </Button>
            <Button variant="tertiary" onClick={onClose}>
              Annuler
            </Button>
          </div>
        )}

        {step === 'form' && mode === 'quick' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 className="fb-card-title" style={{ margin: 0, fontSize: 18 }}>
              Noter ce match
            </h2>
            <StarsSelector value={rating} onChange={setRating} size={34} />
            {error && <p style={{ color: 'var(--fb-live-text)', fontSize: 13, margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="tertiary" onClick={onClose}>
                Annuler
              </Button>
              <Button loading={submitting} onClick={submitQuick}>
                Enregistrer
              </Button>
            </div>
          </div>
        )}

        {step === 'form' && mode === 'full' && (
          <form onSubmit={submitFull} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 className="fb-card-title" style={{ margin: 0, fontSize: 18 }}>
              {completing ? 'Compléter ma note' : existing ? 'Reloguer ce match' : 'Logger le match'}
            </h2>
            <StarsSelector value={rating} onChange={setRating} size={34} />
            <textarea
              placeholder="Ton commentaire (optionnel)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{
                width: '100%',
                minHeight: 100,
                boxSizing: 'border-box',
                padding: 14,
                border: '1px solid var(--fb-border)',
                borderRadius: 12,
                background: 'var(--fb-bg)',
                color: 'var(--fb-text)',
                fontFamily: 'var(--fb-font-sans)',
                fontSize: 15,
                lineHeight: 1.55,
                resize: 'vertical',
              }}
            />
            <TagInput value={tags} onChange={setTags} />
            {error && <p style={{ color: 'var(--fb-live-text)', fontSize: 13, margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button type="button" variant="tertiary" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" loading={submitting}>
                {completing ? 'Enregistrer' : 'Logger'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
