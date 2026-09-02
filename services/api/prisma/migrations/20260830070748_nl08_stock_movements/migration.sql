-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('initial', 'set', 'adjust');

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "stock_before" INTEGER NOT NULL,
    "stock_after" INTEGER NOT NULL,
    "reason" TEXT,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_product_variant_id_idx" ON "StockMovement"("product_variant_id");

-- CreateIndex
CREATE INDEX "StockMovement_created_at_idx" ON "StockMovement"("created_at");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
