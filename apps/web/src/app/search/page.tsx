'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { UserSummary } from '@football-app/shared-types';
import * as api from '../../lib/api';
import { Crest } from '../../components/ui/crest';
import { EmptyContent } from '../../components/ui/empty-state';
import { SkeletonList } from '../../components/ui/skeleton';

const DEBOUNCE_MS = 300;

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[] | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setResults(null);
    const timer = setTimeout(() => {
      api.searchUsers(q).then((r) => {
        if (!cancelled) setResults(r);
      });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 className="fb-display" style={{ fontSize: 32, margin: 0 }}>
        Rechercher
      </h1>

      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Pseudo ou nom…"
        style={{
          width: '100%',
          height: 46,
          boxSizing: 'border-box',
          padding: '0 16px',
          borderRadius: 999,
          border: '1px solid var(--fb-border)',
          background: 'var(--fb-surface)',
          color: 'var(--fb-text)',
          fontSize: 15,
        }}
      />

      {query.trim().length > 0 && query.trim().length < 2 && (
        <p className="fb-meta" style={{ fontSize: 12 }}>
          Encore un caractère…
        </p>
      )}

      {query.trim().length >= 2 && results === null && <SkeletonList />}

      {results?.length === 0 && (
        <EmptyContent title="Personne ne porte ce nom" subtitle="Vérifie l'orthographe du pseudo." />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {results?.map((u) => (
          <Link
            key={u.id}
            href={`/profile/${u.id}`}
            className="fb-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: 12,
              border: '1px solid var(--fb-border)',
              borderRadius: 12,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <Crest src={u.avatarUrl} alt={u.displayName} size={42} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span className="fb-card-title" style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.displayName}
              </span>
              <span className="fb-meta" style={{ fontSize: 12.5 }}>
                @{u.username}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
