-- Issue #14 : permettre de reloguer un match déjà noté (rewatch, façon Letterboxd).

-- DropIndex
DROP INDEX "reviews_user_id_match_id_active_key";

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN "watch_number" INTEGER NOT NULL DEFAULT 1;
