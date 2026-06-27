-- Task completion workflow: completion support files and approval metadata.

ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "completion_note" TEXT,
  ADD COLUMN IF NOT EXISTS "completion_submitted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completion_approved_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "task_files" (
  "id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "original_name" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_type" TEXT NOT NULL DEFAULT 'completion',
  "uploaded_by" TEXT,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_files_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_files_task_id_fkey'
  ) THEN
    ALTER TABLE "task_files"
      ADD CONSTRAINT "task_files_task_id_fkey"
      FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_files_uploaded_by_fkey'
  ) THEN
    ALTER TABLE "task_files"
      ADD CONSTRAINT "task_files_uploaded_by_fkey"
      FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "task_files_task_id_idx" ON "task_files"("task_id");
CREATE INDEX IF NOT EXISTS "tasks_completion_submitted_at_idx" ON "tasks"("completion_submitted_at");
