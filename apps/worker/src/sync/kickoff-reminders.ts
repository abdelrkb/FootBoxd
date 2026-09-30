import { prisma } from '@football-app/database';

const REMINDER_WINDOW_MS = 30 * 60_000;

// Rappel "coup d'envoi dans 30 min" pour les matchs en watchlist — n'envoie qu'aux users ayant
// activé `notifyKickoffReminder` (réglages, section "Notifications"), une seule fois par match
// grâce à `reminderSentAt` sur WatchlistEntry.
export async function syncKickoffReminders(): Promise<void> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const dueEntries = await prisma.watchlistEntry.findMany({
    where: {
      reminderSentAt: null,
      user: { notifyWatchlistKickoff: true },
      match: { status: 'scheduled', kickoffAt: { gte: now, lte: windowEnd } },
    },
    select: { userId: true, matchId: true },
  });

  if (dueEntries.length === 0) return;

  for (const entry of dueEntries) {
    await prisma.notification.create({
      data: { recipientId: entry.userId, actorId: entry.userId, type: 'kickoff_reminder', referenceId: entry.matchId },
    });
    await prisma.watchlistEntry.update({
      where: { userId_matchId: { userId: entry.userId, matchId: entry.matchId } },
      data: { reminderSentAt: now },
    });
  }
  console.log(`[kickoff-reminders] ${dueEntries.length} rappel(s) envoyé(s)`);
}
