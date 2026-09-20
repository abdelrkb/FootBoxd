-- AlterTable
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Backfill des comptes existants : slug ASCII du display_name + fragment d'id pour garantir
-- l'unicité même en cas de display_name identiques. Les nouvelles inscriptions passeront
-- toujours par la validation applicative (RegisterDto), ce backfill ne sert qu'aux lignes
-- déjà en base au moment de l'ajout de la colonne.
UPDATE "users"
SET "username" = lower(regexp_replace(display_name, '[^a-zA-Z0-9]+', '', 'g')) || '_' || substr(id::text, 1, 6)
WHERE "username" IS NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
