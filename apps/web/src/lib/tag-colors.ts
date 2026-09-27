// Palette par défaut du color-picker de tag (carré de couleur du champ Tag) — voir
// components/ui/tag-input.tsx et tag-color-picker.tsx.
export const TAG_PALETTE = [
  '#F94144',
  '#F3722C',
  '#F8961E',
  '#F9C74F',
  '#90BE6D',
  '#43AA8B',
  '#4D908E',
  '#577590',
  '#277DA1',
  '#9D4EDD',
  '#EF476F',
  '#118AB2',
  '#06D6A0',
  '#8338EC',
  '#FB5607',
  '#6C63FF',
];

export function tagBackground(color: string, colorEnd?: string | null): string {
  if (colorEnd && colorEnd !== color) return `linear-gradient(135deg, ${color}, ${colorEnd})`;
  return color;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return `rgba(108, 99, 255, ${alpha})`; // repli sur --fb-rating-ish si hex invalide
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Rendu "holographique" du chip de tag (glassmorphism) : fond translucide en dégradé + reflet
// clair en haut, façon carte holographique — voir components/ui/tag-chip.tsx.
export function tagHoloBackground(color: string, colorEnd?: string | null): string {
  const from = hexToRgba(color, 0.4);
  const to = hexToRgba(colorEnd ?? color, colorEnd ? 0.4 : 0.18);
  return `linear-gradient(135deg, ${from}, ${to})`;
}

export function tagHoloBorder(color: string, colorEnd?: string | null): string {
  return `1px solid ${hexToRgba(colorEnd ?? color, 0.55)}`;
}
