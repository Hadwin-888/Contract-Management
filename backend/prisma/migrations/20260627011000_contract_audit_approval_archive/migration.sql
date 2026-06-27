-- Add contract approval/archive closure fields
ALTER TABLE "contracts"
  ADD COLUMN IF NOT EXISTS "sealed_file_path" TEXT,
  ADD COLUMN IF NOT EXISTS "archive_status" TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS "sealed_uploaded_by" TEXT,
  ADD COLUMN IF NOT EXISTS "sealed_uploaded_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sealed_verification_status" TEXT,
  ADD COLUMN IF NOT EXISTS "sealed_verification_report" TEXT,
  ADD COLUMN IF NOT EXISTS "approval_submitted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approval_approved_at" TIMESTAMP(3);

-- Store the AI audit basis on each approval record so later template changes do not change the approval evidence.
ALTER TABLE "approval_records"
  ADD COLUMN IF NOT EXISTS "audit_record_id" TEXT,
  ADD COLUMN IF NOT EXISTS "audit_snapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "submit_note" TEXT,
  ADD COLUMN IF NOT EXISTS "risk_score" INTEGER,
  ADD COLUMN IF NOT EXISTS "critical_issue_count" INTEGER;
