'use client';

import { useEffect, useState } from 'react';
import { TAG_PALETTE, tagBackground } from '../../lib/tag-colors';

// Carré de couleur du champ Tag, à côté de "« … » (créer le tag)" : ouvre une modale pour
// choisir une couleur unie (palette ou picker natif) ou un dégradé à 2 couleurs, façon
// Photoshop en simplifié (direction fixe à 135deg, pas de stops multiples) — voir tag-input.tsx.
export function TagColorPicker({
  color,
  colorEnd,
  open,
  onToggle,
  onChange,
}: {
  color: string;
  colorEnd?: string | null;
  open: boolean;
  onToggle: () => void;
  onChange: (color: string, colorEnd: string | null) => void;
}) {
  const [gradient, setGradient] = useState(Boolean(colorEnd));

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onToggle();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onToggle]);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        title="Choisir une couleur"
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: '1px solid var(--fb-border-strong)',
          background: tagBackground(color, gradient ? colorEnd ?? color : null),
          flexShrink: 0,
          cursor: 'pointer',
          padding: 0,
        }}
      />

      {open && (
        <div
          onClick={onToggle}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 280,
              border: '1px solid var(--fb-border)',
              borderRadius: 16,
              background: 'var(--fb-surface-2)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.55)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="fb-card-title" style={{ fontSize: 15, margin: 0 }}>
                Couleur du tag
              </h3>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid var(--fb-border-strong)',
                  background: tagBackground(color, gradient ? colorEnd ?? color : null),
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
              {TAG_PALETTE.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange(preset, gradient ? colorEnd ?? preset : null)}
                  title={preset}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: preset === color ? '2px solid var(--fb-text)' : '1px solid var(--fb-border-strong)',
                    background: preset,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fb-text-2)' }}>
              <span>Couleur</span>
              <input
                type="color"
                value={color}
                onChange={(e) => onChange(e.target.value, gradient ? colorEnd ?? color : null)}
                style={{ width: 36, height: 26, border: 'none', background: 'none', marginLeft: 'auto', cursor: 'pointer' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fb-text-2)' }}>
              <input
                type="checkbox"
                checked={gradient}
                onChange={(e) => {
                  const next = e.target.checked;
                  setGradient(next);
                  onChange(color, next ? colorEnd ?? color : null);
                }}
              />
              <span>Dégradé</span>
            </label>

            {gradient && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fb-text-2)' }}>
                <span>Couleur 2</span>
                <input
                  type="color"
                  value={colorEnd ?? color}
                  onChange={(e) => onChange(color, e.target.value)}
                  style={{ width: 36, height: 26, border: 'none', background: 'none', marginLeft: 'auto', cursor: 'pointer' }}
                />
              </label>
            )}

            <button
              type="button"
              onClick={onToggle}
              className="fb-label"
              style={{
                height: 40,
                border: 'none',
                borderRadius: 999,
                background: 'var(--fb-surface)',
                color: 'var(--fb-text)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Valider
            </button>
          </div>
        </div>
      )}
    </>
  );
}
