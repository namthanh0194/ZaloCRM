-- CreateTable
CREATE TABLE IF NOT EXISTS "conversation_accesses" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_by_id" TEXT,
    "can_chat" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_accesses_conversation_id_user_id_key" ON "conversation_accesses"("conversation_id", "user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "conversation_accesses_org_id_user_id_idx" ON "conversation_accesses"("org_id", "user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "conversation_accesses_conversation_id_idx" ON "conversation_accesses"("conversation_id");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "conversation_accesses" ADD CONSTRAINT "conversation_accesses_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_accesses" ADD CONSTRAINT "conversation_accesses_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_accesses" ADD CONSTRAINT "conversation_accesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "conversation_accesses" ADD CONSTRAINT "conversation_accesses_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
