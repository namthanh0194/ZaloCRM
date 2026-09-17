-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_providers" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "api_key_encrypted" BYTEA,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_providers_org_id_slug_key"
  ON "ai_providers"("org_id", "slug");
CREATE INDEX IF NOT EXISTS "ai_providers_org_id_is_active_idx"
  ON "ai_providers"("org_id", "is_active");

DO $$ BEGIN
    ALTER TABLE "ai_providers"
      ADD CONSTRAINT "ai_providers_org_id_fkey"
      FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
