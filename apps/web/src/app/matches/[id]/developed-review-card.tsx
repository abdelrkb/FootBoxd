'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Comment, Review } from '@football-app/shared-types';
import * as api from '../../../lib/api';
import { Crest } from '../../../components/ui/crest';
import { StarsDisplay, StarsSelector } from '../../../components/ui/stars';
import { OwnRatingPill } from '../../../components/ui/badges';
import { Button } from '../../../components/ui/button';
import { ClientDate } from '../../../components/client-date';

export function DevelopedReviewCard({
  review,
  isMine,
  onChange,
}: {
  review: Review;
  isMine: boolean;
  onChange: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(review._count.likes);
  const [threadOpen, setThreadOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [newComment, setNewComment] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editRating, setEditRating] = useState(Number(review.rating));
  const [editComment, setEditComment] = useState(review.comment ?? '');

  async function toggleLike() {
    setLiked((prev) => !prev);
    setLikeCount((prev) => prev + (liked ? -1 : 1));
    if (liked) await api.unlikeReview(review.id);
    else await api.likeReview(review.id);
  }

  async function loadThread() {
    if (comments === null) setComments(await api.getComments(review.id));
    setThreadOpen((prev) => !prev);
  }

  async function sendComment() {
    if (!newComment.trim()) return;
    await api.createComment(review.id, newComment);
    setNewComment('');
    setComments(await api.getComments(review.id));
  }

  async function saveEdit() {
    await api.updateReview(review.id, { rating: editRating, comment: editComment || undefined });
    setEditing(false);
    onChange();
  }

  async function handleDelete() {
    await api.deleteReview(review.id);
    onChange();
  }

  return (
    <div
      style={{
        border: `1px solid ${isMine ? 'var(--fb-rating)' : 'var(--fb-border)'}`,
        borderRadius: 16,
        background: isMine ? '#15161A' : 'var(--fb-surface)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <Link
          href={`/profile/${review.user.id}`}
          style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
        >
          <Crest src={review.user.avatarUrl} alt={review.user.displayName} size={40} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{review.user.displayName}</span>
              {isMine && <OwnRatingPill />}
            </span>
            <span className="fb-meta">
              <ClientDate iso={review.createdAt} options={{ dateStyle: 'medium', timeStyle: 'short' }} fallback="" />
            </span>
          </div>
        </Link>
        {!editing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
            <StarsDisplay rating={Number(review.rating)} size={17} />
            <span className="fb-num" style={{ fontSize: 14, color: 'var(--fb-rating)' }}>
              {Number(review.rating).toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StarsSelector value={editRating} onChange={setEditRating} size={26} />
          <textarea
            value={editComment}
            onChange={(e) => setEditComment(e.target.value)}
            placeholder="Ton commentaire (optionnel)"
            style={{
              width: '100%',
              minHeight: 104,
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
          <div style={{ display: 'flex', gap: 10 }}>
            <Button size="sm" onClick={saveEdit}>
              Enregistrer
            </Button>
            <Button size="sm" variant="tertiary" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        review.comment && <p className="fb-body">{review.comment}</p>
      )}

      {!editing && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
            borderTop: '1px solid var(--fb-border)',
            paddingTop: 14,
          }}
        >
          <button
            onClick={toggleLike}
            className="fb-num"
            style={{
              height: 38,
              padding: '0 15px',
              borderRadius: 999,
              fontSize: 12.5,
              whiteSpace: 'nowrap',
              border: `1px solid ${liked ? 'var(--fb-social)' : 'var(--fb-border)'}`,
              background: liked ? 'var(--fb-social-bg)' : 'transparent',
              color: liked ? 'var(--fb-social)' : 'var(--fb-text-2)',
            }}
          >
            {liked ? '♥' : '♡'} {likeCount}
          </button>
          <button
            onClick={loadThread}
            className="fb-num"
            style={{
              height: 38,
              padding: '0 15px',
              borderRadius: 999,
              fontSize: 12.5,
              whiteSpace: 'nowrap',
              border: '1px solid var(--fb-border)',
              background: 'transparent',
              color: 'var(--fb-text-2)',
            }}
          >
            💬 {review._count.comments} {threadOpen ? 'replier' : 'déplier'}
          </button>
          {isMine && (
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                style={{
                  width: 38,
                  height: 38,
                  border: '1px solid var(--fb-border)',
                  borderRadius: 999,
                  background: 'transparent',
                  color: 'var(--fb-text-2)',
                  fontSize: 17,
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ···
              </button>
              {menuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 44,
                    zIndex: 2,
                    minWidth: 168,
                    border: '1px solid var(--fb-border)',
                    borderRadius: 12,
                    background: 'var(--fb-surface-2)',
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
                  }}
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setEditing(true);
                    }}
                    style={{
                      height: 38,
                      padding: '0 12px',
                      border: 'none',
                      borderRadius: 8,
                      background: 'transparent',
                      color: 'var(--fb-text)',
                      fontWeight: 600,
                      fontSize: 14,
                      textAlign: 'left',
                    }}
                  >
                    Modifier ma note
                  </button>
                  <button
                    onClick={handleDelete}
                    style={{
                      height: 38,
                      padding: '0 12px',
                      border: 'none',
                      borderRadius: 8,
                      background: 'transparent',
                      color: 'var(--fb-live-text)',
                      fontWeight: 600,
                      fontSize: 14,
                      textAlign: 'left',
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {threadOpen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            borderTop: '1px solid var(--fb-border)',
            paddingTop: 14,
          }}
        >
          {comments?.map((c) => (
            <div key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Link href={`/profile/${c.user.id}`}>
                <Crest src={c.user.avatarUrl} alt={c.user.displayName} size={28} />
              </Link>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <Link href={`/profile/${c.user.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{c.user.displayName}</span>
                </Link>
                <span style={{ fontSize: 14.5, lineHeight: 1.5, color: 'var(--fb-text-strong-2)' }}>{c.content}</span>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ajoute un commentaire…"
              style={{
                flex: 1,
                minWidth: 0,
                height: 42,
                boxSizing: 'border-box',
                padding: '0 14px',
                border: '1px solid var(--fb-border)',
                borderRadius: 999,
                background: 'var(--fb-bg)',
                color: 'var(--fb-text)',
                fontFamily: 'var(--fb-font-sans)',
                fontSize: 14.5,
              }}
            />
            <button
              onClick={sendComment}
              className="fb-label"
              style={{
                height: 42,
                padding: '0 16px',
                border: 'none',
                borderRadius: 999,
                background: 'var(--fb-surface-2)',
                color: 'var(--fb-text)',
                fontSize: 12,
                whiteSpace: 'nowrap',
              }}
            >
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
