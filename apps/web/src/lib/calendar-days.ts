// Date locale du navigateur, pas UTC (bug observé le 2026-10-22 : à 1h du matin en France
// l'heure UTC est encore la veille, donc `toISOString().slice(0, 10)` affichait "Aujourd'hui"
// sur le mauvais jour) — getFullYear/getMonth/getDate sont déjà en heure locale en JS.
export function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayString(): string {
  return toDateString(new Date());
}

// `count` jours consécutifs à partir de aujourd'hui + `startOffset` (négatif = passé). Généré à
// la demande : le sélecteur de date peut reculer/avancer indéfiniment (les jours passés restent en
// base une fois synchronisés, voir apps/worker ; côté futur, le worker ne couvre que ~5 jours).
export function daysFromOffset(startOffset: number, count: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + startOffset + i);
    days.push(toDateString(d));
  }
  return days;
}

// Écart en jours entre aujourd'hui et `day` (YYYY-MM-DD), négatif si passé.
export function offsetFromToday(day: string): number {
  const ms = new Date(`${day}T00:00:00Z`).getTime() - new Date(`${todayString()}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}
