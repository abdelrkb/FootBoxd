'use client';

import { useEffect, useRef, useState } from 'react';
import type { Tag, TagSelection } from '@football-app/shared-types';
import * as api from '../../lib/api';
import { TagChip } from './tag-chip';
import { TagColorPicker } from './tag-color-picker';
import { TAG_PALETTE, tagBackground } from '../../lib/tag-colors';

// Champ "Tag" du log de match (juste sous le commentaire) : autocomplete sur les tags déjà
// créés par n'importe quel user (nom unique global), sinon proposition de créer un nouveau tag
// avec sa propre couleur/dégradé — voir matches/[id]/page.tsx et developed-review-card.tsx.
export function TagInput({ value, onChange }: { value: TagSelection[]; onChange: (tags: TagSelection[]) => void }) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerColor, setPickerColor] = useState(TAG_PALETTE[0]);
  const [pickerColorEnd, setPickerColorEnd] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getTags().then(setAllTags).catch(() => setAllTags([]));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmedQuery = query.trim();
  const selectedNames = new Set(value.map((t) => t.name.toLowerCase()));
  const matches = trimmedQuery
    ? allTags.filter(
        (t) => t.name.toLowerCase().includes(trimmedQuery.toLowerCase()) && !selectedNames.has(t.name.toLowerCase()),
      )
    : [];
  const exactMatch = allTags.some((t) => t.name.toLowerCase() === trimmedQuery.toLowerCase());
  const canCreate = trimmedQuery.length > 0 && !exactMatch && !selectedNames.has(trimmedQuery.toLowerCase());

  function selectExisting(tag: Tag) {
    onChange([...value, { id: tag.id, name: tag.name, color: tag.color, colorEnd: tag.colorEnd }]);
    setQuery('');
  }

  function createNew() {
    if (!canCreate) return;
    onChange([...value, { name: trimmedQuery, color: pickerColor, colorEnd: pickerColorEnd }]);
    setQuery('');
    setPickerOpen(false);
    setPickerColor(TAG_PALETTE[(value.length + 1) % TAG_PALETTE.length]);
    setPickerColorEnd(null);
  }

  function removeTag(name: string) {
    onChange(value.filter((t) => t.name.toLowerCase() !== name.toLowerCase()));
  }

  const showDropdown = open && (matches.length > 0 || canCreate);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          padding: '8px 10px',
          border: '1px solid var(--fb-border)',
          borderRadius: 12,
          background: 'var(--fb-bg)',
          minHeight: 46,
          boxSizing: 'border-box',
        }}
      >
        {value.map((tag) => (
          <TagChip key={tag.id ?? tag.name} color={tag.color ?? TAG_PALETTE[0]} colorEnd={tag.colorEnd} onRemove={() => removeTag(tag.name)}>
            {tag.name}
          </TagChip>
        ))}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (matches.length > 0) selectExisting(matches[0]);
            else createNew();
          }}
          placeholder="Tag… (ambiance, avec qui, où)"
          style={{
            flex: 1,
            minWidth: 140,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--fb-text)',
            fontFamily: 'var(--fb-font-sans)',
            fontSize: 14,
            lineHeight: 1.6,
            padding: '6px 4px 8px',
          }}
        />
      </div>

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 5,
            marginTop: 4,
            border: '1px solid var(--fb-border)',
            borderRadius: 12,
            background: 'var(--fb-surface-2)',
            boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {matches.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => selectExisting(tag)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                height: 38,
                padding: '0 10px',
                border: 'none',
                borderRadius: 8,
                background: 'transparent',
                color: 'var(--fb-text)',
                fontSize: 14,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 20,
                  borderRadius: 999,
                  background: tagBackground(tag.color, tag.colorEnd),
                  flexShrink: 0,
                }}
              />
              {tag.name}
            </button>
          ))}

          {canCreate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px' }}>
              <button
                type="button"
                onClick={createNew}
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 6,
                  height: 38,
                  padding: '0 4px',
                  border: 'none',
                  borderRadius: 8,
                  background: 'transparent',
                  color: 'var(--fb-text)',
                  fontSize: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>« {trimmedQuery} »</span>
                <span style={{ color: 'var(--fb-text-2)', fontSize: 12.5, whiteSpace: 'nowrap' }}>(créer le tag)</span>
              </button>
              <TagColorPicker
                color={pickerColor}
                colorEnd={pickerColorEnd}
                open={pickerOpen}
                onToggle={() => setPickerOpen((p) => !p)}
                onChange={(color, colorEnd) => {
                  setPickerColor(color);
                  setPickerColorEnd(colorEnd);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
