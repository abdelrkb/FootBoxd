-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'kickoff_reminder';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_watchlist_public" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "watchlist_entries" (
    "user_id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reminder_sent_at" TIMESTAMP(3),

    CONSTRAINT "watchlist_entries_pkey" PRIMARY KEY ("user_id","match_id")
);

-- AddForeignKey
ALTER TABLE "watchlist_entries" ADD CONSTRAINT "watchlist_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_entries" ADD CONSTRAINT "watchlist_entries_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
