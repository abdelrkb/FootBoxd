-- CreateTable
CREATE TABLE "favorite_leagues" (
    "user_id" UUID NOT NULL,
    "league_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_leagues_pkey" PRIMARY KEY ("user_id","league_id")
);

-- AddForeignKey
ALTER TABLE "favorite_leagues" ADD CONSTRAINT "favorite_leagues_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_leagues" ADD CONSTRAINT "favorite_leagues_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
