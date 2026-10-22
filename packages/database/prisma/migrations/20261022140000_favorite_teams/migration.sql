-- CreateTable
CREATE TABLE "favorite_teams" (
    "user_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_teams_pkey" PRIMARY KEY ("user_id","team_id")
);

-- AddForeignKey
ALTER TABLE "favorite_teams" ADD CONSTRAINT "favorite_teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_teams" ADD CONSTRAINT "favorite_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

