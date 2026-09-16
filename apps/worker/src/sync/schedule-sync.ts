import { fetchV1 } from '../sportsdb/http.js';
import type { EventsDayResponse } from '../sportsdb/types.js';
import { upsertMatchFromScheduleEvent } from './upsert.js';
import { config } from '../config.js';

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function nextNDays(n: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);
    days.push(formatDate(d));
  }
  return days;
}

// Toutes ligues confondues, sans paramètre `l` (voir architecture.md section 2 — découverte
// du 2026-09-16 : eventsday.php sans `l` renvoie déjà tout, ~1000 matchs/225 ligues en 1 call).
export async function syncSchedule(): Promise<void> {
  const days = nextNDays(config.calendarDaysAhead);
  for (const day of days) {
    try {
      const response = await fetchV1<EventsDayResponse>('eventsday.php', { d: day, s: 'Soccer' });
      const events = response.events ?? [];
      console.log(`[schedule-sync] ${day} : ${events.length} matchs`);
      for (const event of events) {
        await upsertMatchFromScheduleEvent(event);
      }
    } catch (err) {
      console.error(`[schedule-sync] échec pour ${day}:`, err);
    }
  }
}
