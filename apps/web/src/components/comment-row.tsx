'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Comment } from '@football-app/shared-types';
import * as api from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { Crest } from './ui/crest';

const MENTION_TOKEN = /(@[a-z0-9_]{3,20})/gi;
const IS_MENTION = /^@[a-z0-9_]{3,20}$/i;

// Met en valeur les @mentions dans le texte (issue #18) — pas cliquable : pas de résolution
// username -> id côté front, juste un repère visuel (le ping + la notification suffisent).
function renderContent(content: string) {
  return content.split(MENTION_TOKEN).map((part, i) =>
    IS_MENTION.test(part) ? (
      <span key={i} style={{ color: 'var(--fb-action)', fontWeight: 600 }}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

// Pas de fetch de l'état initial "déjà liké" — même limite déjà acceptée pour ReviewLike
// (optimiste uniquement), gardée cohérente ici plutôt que de la corriger juste pour les commentaires.
function CommentLikeButton({ comment }: { comment: Comment }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(comment._count.likes);

  async function toggle() {
    const next = !liked;
    setLiked(next);
    setCount((prev) => prev + (next ? 1 : -1));
    if (next) await api.likeComment(comment.reviewId, comment.id);
    else await api.unlikeComment(comment.reviewId, comment.id);
  }

  return (
    <button
      onClick={toggle}
      className="fb-num"
      style={{ background: 'none', border: 'none', fontSize: 12, color: liked ? 'var(--fb-social)' : 'var(--fb-text-3)', padding: 0 }}
    >
      {liked ? '♥' : '♡'} {count > 0 ? count : ''}
    </button>
  );
}

// Un seul niveau de profondeur (issue #18) : `depth` vaut 0 ou 1, jamais plus — "Répondre" sur
// une réponse rattache quand même au commentaire racine (voir comments.service.ts `create`).
export function CommentRow({
  comment,
  onReply,
  onReport,
  depth = 0,
}: {
  comment: Comment;
  onReply: (comment: Comment) => void;
  onReport: (commentId: string) => void;
  depth?: number;
}) {
  const t = useTranslations('CommentRow');
  const { user } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginLeft: depth * 32 }}>
        <Link href={`/profile/${comment.user.id}`}>
          <Crest src={comment.user.avatarUrl} alt={comment.user.displayName} size={depth > 0 ? 24 : 28} />
        </Link>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
          <Link href={`/profile/${comment.user.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{comment.user.displayName}</span>
          </Link>
          <span style={{ fontSize: 14.5, lineHeight: 1.5, color: 'var(--fb-text-strong-2)' }}>
            {renderContent(comment.content)}
          </span>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <CommentLikeButton comment={comment} />
            {user && (
              <button
                onClick={() => onReply(comment)}
                className="fb-meta"
                style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--fb-text-3)', padding: 0 }}
              >
                {t('reply')}
              </button>
            )}
          </div>
        </div>
        {user && user.id !== comment.user.id && (
          <button
            onClick={() => onReport(comment.id)}
            className="fb-meta"
            style={{ background: 'none', border: 'none', fontSize: 11.5, flexShrink: 0, color: 'var(--fb-text-3)' }}
          >
            {t('report')}
          </button>
        )}
      </div>
      {comment.replies?.map((reply) => (
        <CommentRow key={reply.id} comment={reply} onReply={onReply} onReport={onReport} depth={depth + 1} />
      ))}
    </div>
  );
}
