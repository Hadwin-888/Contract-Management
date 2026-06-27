-- CreateTable
CREATE TABLE "asset_prices" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effective_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "remark" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_purchase_requests" (
    "id" TEXT NOT NULL,
    "request_no" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "cost_center" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "reason" TEXT,
    "requester_id" TEXT NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "submit_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_purchase_request_items" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unit_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remark" TEXT,

    CONSTRAINT "asset_purchase_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_purchase_orders" (
    "id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "request_id" TEXT,
    "supplier_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ordered_date" TIMESTAMP(3),
    "remark" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_purchase_order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "received_qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "unit_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remark" TEXT,

    CONSTRAINT "asset_purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_receiving_records" (
    "id" TEXT NOT NULL,
    "receipt_no" TEXT NOT NULL,
    "order_id" TEXT,
    "warehouse" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "received_by" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submit_note" TEXT,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_receiving_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_receiving_items" (
    "id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "order_item_id" TEXT,
    "item_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unit_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remark" TEXT,

    CONSTRAINT "asset_receiving_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_balances" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "warehouse" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "warehouse" TEXT NOT NULL,
    "operation_type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "remark" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_purchase_requests_request_no_key" ON "asset_purchase_requests"("request_no");

-- CreateIndex
CREATE UNIQUE INDEX "asset_purchase_orders_order_no_key" ON "asset_purchase_orders"("order_no");

-- CreateIndex
CREATE UNIQUE INDEX "asset_receiving_records_receipt_no_key" ON "asset_receiving_records"("receipt_no");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_balances_item_id_warehouse_key" ON "inventory_balances"("item_id", "warehouse");

-- AddForeignKey
ALTER TABLE "asset_prices" ADD CONSTRAINT "asset_prices_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "asset_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_prices" ADD CONSTRAINT "asset_prices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "asset_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_purchase_requests" ADD CONSTRAINT "asset_purchase_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_purchase_request_items" ADD CONSTRAINT "asset_purchase_request_items_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "asset_purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_purchase_request_items" ADD CONSTRAINT "asset_purchase_request_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "asset_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_purchase_request_items" ADD CONSTRAINT "asset_purchase_request_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "asset_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_purchase_orders" ADD CONSTRAINT "asset_purchase_orders_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "asset_purchase_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_purchase_orders" ADD CONSTRAINT "asset_purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "asset_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_purchase_order_items" ADD CONSTRAINT "asset_purchase_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "asset_purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_purchase_order_items" ADD CONSTRAINT "asset_purchase_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "asset_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_receiving_records" ADD CONSTRAINT "asset_receiving_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "asset_purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_receiving_items" ADD CONSTRAINT "asset_receiving_items_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "asset_receiving_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_receiving_items" ADD CONSTRAINT "asset_receiving_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "asset_purchase_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_receiving_items" ADD CONSTRAINT "asset_receiving_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "asset_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "asset_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "asset_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

