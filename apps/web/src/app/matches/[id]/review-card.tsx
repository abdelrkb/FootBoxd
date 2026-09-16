'use client';

import { useState, type FormEvent } from 'react';
import type { Review, Comment } from '@football-app/shared-types';
import * as api from '../../../lib/api';

export function ReviewCard({
  review,
  currentUserId,
  onChange,
}: {
  review: Review;
  currentUserId: string | undefined;
  onChange: () => void;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);

  async function toggleLike() {
    if (!currentUserId) return;
    if (liked) {
      await api.unlikeReview(review.id);
    } else {
      await api.likeReview(review.id);
    }
    setLiked(!liked);
  }

  async function loadComments() {
    setComments(await api.getComments(review.id));
  }

  async function handleAddComment(e: FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    await api.createComment(review.id, newComment);
    setNewComment('');
    loadComments();
  }

  async function handleDelete() {
    await api.deleteReview(review.id);
    onChange();
  }

  return (
    <div style={{ padding: '0.75rem', border: '1px solid #333', borderRadius: 8 }}>
      <p>
        <strong>{review.user.displayName}</strong> — {review.rating}/5
      </p>
      {review.comment && <p>{review.comment}</p>}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={toggleLike} disabled={!currentUserId}>
          {liked ? 'Aimé' : "J'aime"} ({review._count.likes + (liked ? 1 : 0)})
        </button>
        <button onClick={() => (comments === null ? loadComments() : setComments(null))}>
          Commentaires ({review._count.comments})
        </button>
        {currentUserId === review.userId && <button onClick={handleDelete}>Supprimer</button>}
      </div>

      {comments !== null && (
        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {comments.map((c) => (
            <p key={c.id}>
              <strong>{c.user.displayName}</strong> : {c.content}
            </p>
          ))}
          {currentUserId && (
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire"
                style={{ flex: 1 }}
              />
              <button type="submit">Envoyer</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
