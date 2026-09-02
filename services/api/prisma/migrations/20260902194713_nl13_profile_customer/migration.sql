-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('new', 'in_progress', 'resolved', 'closed');

-- AlterEnum
ALTER TYPE "RoleCode" ADD VALUE 'CUSTOMER';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "user_id" UUID;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "provider" TEXT;

-- CreateTable
CREATE TABLE "ContactTicket" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ContactTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactTicket_user_id_idx" ON "ContactTicket"("user_id");

-- CreateIndex
CREATE INDEX "ContactTicket_status_idx" ON "ContactTicket"("status");

-- CreateIndex
CREATE INDEX "Order_user_id_idx" ON "Order"("user_id");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactTicket" ADD CONSTRAINT "ContactTicket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
