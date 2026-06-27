-- RenameForeignKey
ALTER TABLE "approval_records" RENAME CONSTRAINT "approval_records_request_id_fkey" TO "fk_approval_procurement";

-- AddForeignKey
ALTER TABLE "approval_records" ADD CONSTRAINT "fk_approval_contract" FOREIGN KEY ("request_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
