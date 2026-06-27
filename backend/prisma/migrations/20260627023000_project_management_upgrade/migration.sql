-- Project management upgrade: owner, countdown planning, support files, completion approval metadata.

ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "department" TEXT,
  ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS "type" TEXT,
  ADD COLUMN IF NOT EXISTS "progress" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "owner_id" TEXT,
  ADD COLUMN IF NOT EXISTS "target_name" TEXT,
  ADD COLUMN IF NOT EXISTS "target_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "countdown_mode" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "countdown_label" TEXT,
  ADD COLUMN IF NOT EXISTS "completion_note" TEXT,
  ADD COLUMN IF NOT EXISTS "completion_submitted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completion_approved_at" TIMESTAMP(3);

ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "progress" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "relative_to_target" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "start_offset_days" INTEGER,
  ADD COLUMN IF NOT EXISTS "due_offset_days" INTEGER;

CREATE TABLE IF NOT EXISTS "project_files" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "original_name" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_type" TEXT NOT NULL DEFAULT 'support',
  "uploaded_by" TEXT,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_files_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_owner_id_fkey'
  ) THEN
    ALTER TABLE "projects"
      ADD CONSTRAINT "projects_owner_id_fkey"
      FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_files_project_id_fkey'
  ) THEN
    ALTER TABLE "project_files"
      ADD CONSTRAINT "project_files_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_files_uploaded_by_fkey'
  ) THEN
    ALTER TABLE "project_files"
      ADD CONSTRAINT "project_files_uploaded_by_fkey"
      FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "projects_owner_id_idx" ON "projects"("owner_id");
CREATE INDEX IF NOT EXISTS "projects_target_date_idx" ON "projects"("target_date");
CREATE INDEX IF NOT EXISTS "project_files_project_id_idx" ON "project_files"("project_id");
CREATE INDEX IF NOT EXISTS "tasks_project_due_date_idx" ON "tasks"("project_id", "due_date");
