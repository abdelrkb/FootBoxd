-- CreateEnum
CREATE TYPE "verification_code_purpose" AS ENUM ('email_verification', 'password_reset');

-- CreateEnum
CREATE TYPE "report_target_type" AS ENUM ('user', 'review', 'comment');

-- CreateEnum
CREATE TYPE "report_reason" AS ENUM ('spam', 'harassment', 'inappropriate_content', 'fake_account', 'other');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_data" BYTEA,
ADD COLUMN     "avatar_mime_type" TEXT,
ADD COLUMN     "bio" VARCHAR(280),
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "username_changed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "verification_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" "verification_code_purpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("blocker_id","blocked_id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "target_type" "report_target_type" NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" "report_reason" NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "verification_codes_user_id_purpose_idx" ON "verification_codes"("user_id", "purpose");

-- AddForeignKey
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

