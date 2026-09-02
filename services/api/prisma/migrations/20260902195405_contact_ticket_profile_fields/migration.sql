/*
  Warnings:

  - Added the required column `email` to the `ContactTicket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `ContactTicket` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ContactTicket" DROP CONSTRAINT "ContactTicket_user_id_fkey";

-- AlterTable
ALTER TABLE "ContactTicket" ADD COLUMN     "admin_note" TEXT,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ContactTicket" ADD CONSTRAINT "ContactTicket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
