-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "squad_synced_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "team_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "photo_url" TEXT,
    "birth_date" TIMESTAMP(3),

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standings" (
    "id" UUID NOT NULL,
    "league_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "season" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "played" INTEGER NOT NULL,
    "win" INTEGER NOT NULL,
    "draw" INTEGER NOT NULL,
    "loss" INTEGER NOT NULL,
    "goals_for" INTEGER NOT NULL,
    "goals_against" INTEGER NOT NULL,
    "goal_difference" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_external_id_key" ON "players"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "standings_league_id_team_id_season_key" ON "standings"("league_id", "team_id", "season");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

