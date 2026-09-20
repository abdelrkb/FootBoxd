-- CreateEnum
CREATE TYPE "match_event_type" AS ENUM ('goal', 'card', 'substitution');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "favorite_team_id" UUID,
ADD COLUMN     "has_completed_onboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hide_scores_until_click" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notify_kickoff_reminder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notify_on_comment" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_on_like" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_on_new_follower" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "match_events" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "type" "match_event_type" NOT NULL,
    "detail" TEXT,
    "minute" INTEGER NOT NULL,
    "is_home" BOOLEAN NOT NULL,
    "team_id" UUID NOT NULL,
    "player_name" TEXT,
    "assist_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_events_external_id_key" ON "match_events"("external_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_favorite_team_id_fkey" FOREIGN KEY ("favorite_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
