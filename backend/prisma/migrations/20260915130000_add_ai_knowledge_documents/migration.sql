-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_knowledge_documents" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_knowledge_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_knowledge_documents_org_id_is_active_idx"
  ON "ai_knowledge_documents"("org_id", "is_active");

DO $$ BEGIN
    ALTER TABLE "ai_knowledge_documents"
      ADD CONSTRAINT "ai_knowledge_documents_org_id_fkey"
      FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
