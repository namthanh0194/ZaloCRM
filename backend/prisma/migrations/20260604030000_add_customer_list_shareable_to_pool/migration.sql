-- AlterTable
ALTER TABLE "customer_lists" ADD COLUMN IF NOT EXISTS "shareable_to_pool" BOOLEAN NOT NULL DEFAULT false;

