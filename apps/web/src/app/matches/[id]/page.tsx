'use client';

import { use, useEffect, useState, type FormEvent } from 'react';
import type { Match, Review } from '@football-app/shared-types';
import * as api from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { ReviewCard } from './review-card';
import { ClientDate } from '../../../components/client-date';

interface LineupRow {
  idPlayer: string;
  strPlayer: string;
  strPosition: string | null;
  strHome: 'Yes' | 'No';
}

export default function MatchDetailPage({ params }: PageProps<'/matches/[id]'>) {
  const { id } = use(params);
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadReviews = () => api.getReviewsForMatch(id).then(setReviews);

  useEffect(() => {
    api.getMatch(id).then(setMatch);
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleLogMatch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createReview(id, rating, comment || undefined);
      setComment('');
      loadReviews();
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Erreur inconnue');
    }
  }

  if (!match) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Chargement...</p>;

  const lineups = (match.lineups as LineupRow[] | null) ?? null;
  const alreadyReviewed = user && reviews?.some((r) => r.userId === user.id);

  return (
    <div style={{ maxWidth: 600, margin: '1.5rem auto' }}>
      <p>{match.league.name}</p>
      <h1>
        {match.homeTeam.name} {match.homeScore ?? '-'} - {match.awayScore ?? '-'} {match.awayTeam.name}
      </h1>
      <p>
        <ClientDate iso={match.kickoffAt} options={{ dateStyle: 'medium', timeStyle: 'short' }} />{' '}
        {match.venue ? `— ${match.venue}` : ''} — statut : {match.status}
      </p>
      {match.highlightUrl && (
        <p>
          <a href={match.highlightUrl} target="_blank" rel="noopener noreferrer">
            Voir les highlights
          </a>
        </p>
      )}

      {lineups && lineups.length > 0 && (
        <section>
          <h3>Compositions</h3>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <ul>
              {lineups.filter((p) => p.strHome === 'Yes').map((p) => (
                <li key={p.idPlayer}>{p.strPlayer}</li>
              ))}
            </ul>
            <ul>
              {lineups.filter((p) => p.strHome === 'No').map((p) => (
                <li key={p.idPlayer}>{p.strPlayer}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section style={{ margin: '1.5rem 0' }}>
        {!user && <p>Connectez-vous pour logger ce match.</p>}
        {user && alreadyReviewed && <p>Vous avez déjà loggé ce match.</p>}
        {user && !alreadyReviewed && (
          <form onSubmit={handleLogMatch} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h3>Logger le match</h3>
            <label>
              Note :{' '}
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {Array.from({ length: 10 }, (_, i) => (i + 1) * 0.5).map((r) => (
                  <option key={r} value={r}>
                    {r} / 5
                  </option>
                ))}
              </select>
            </label>
            <textarea
              placeholder="Commentaire (optionnel)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            {error && <p style={{ color: 'crimson' }}>{error}</p>}
            <button type="submit">Valider</button>
          </form>
        )}
      </section>

      <section>
        <h3>Reviews</h3>
        {reviews?.length === 0 && <p>Aucune review pour l'instant.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reviews?.map((review) => (
            <ReviewCard key={review.id} review={review} currentUserId={user?.id} onChange={loadReviews} />
          ))}
        </div>
      </section>
    </div>
  );
}
