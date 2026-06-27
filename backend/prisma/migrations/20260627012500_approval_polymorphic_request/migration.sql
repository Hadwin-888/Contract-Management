-- approval_records.request_id is polymorphic:
-- request_type='contract' points to contracts.id, request_type='procurement' points to procurement_requests.id.
-- A single column cannot be constrained to both tables at the database level.
ALTER TABLE "approval_records" DROP CONSTRAINT IF EXISTS "fk_approval_procurement";
ALTER TABLE "approval_records" DROP CONSTRAINT IF EXISTS "fk_approval_contract";
ALTER TABLE "approval_records" DROP CONSTRAINT IF EXISTS "approval_records_request_id_fkey";
