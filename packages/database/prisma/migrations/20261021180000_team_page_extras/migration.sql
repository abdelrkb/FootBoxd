-- AlterTable
ALTER TABLE "standings" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "next_fixtures_synced_at" TIMESTAMP(3);

