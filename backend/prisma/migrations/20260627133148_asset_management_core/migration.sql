-- CreateTable
CREATE TABLE "asset_settings" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_items" (
    "id" TEXT NOT NULL,
    "item_no" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_dec" TEXT,
    "item_brand" TEXT,
    "item_unit" TEXT,
    "bsstype" TEXT,
    "assettype" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_suppliers" (
    "id" TEXT NOT NULL,
    "suppliers_id" TEXT NOT NULL,
    "suppliers_name_cn" TEXT NOT NULL,
    "suppliers_name_en" TEXT,
    "suppliers_city" TEXT,
    "contact_person" TEXT,
    "contact_title" TEXT,
    "contact_number" TEXT,
    "email" TEXT,
    "invoice_name" TEXT,
    "tax_id" TEXT,
    "invoice_add" TEXT,
    "bank" TEXT,
    "bank_account_no" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_change_requests" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submit_note" TEXT,
    "requested_by" TEXT NOT NULL,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_settings_category_code_key" ON "asset_settings"("category", "code");

-- CreateIndex
CREATE UNIQUE INDEX "asset_items_item_no_key" ON "asset_items"("item_no");

-- CreateIndex
CREATE UNIQUE INDEX "asset_suppliers_suppliers_id_key" ON "asset_suppliers"("suppliers_id");

-- AddForeignKey
ALTER TABLE "asset_change_requests" ADD CONSTRAINT "asset_change_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
