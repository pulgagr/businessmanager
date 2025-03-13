/*
  Warnings:

  - Added the required column `clientId` to the `Tracking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Tracking" ADD COLUMN     "clientId" INTEGER NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'in_transit';

-- AddForeignKey
ALTER TABLE "Tracking" ADD CONSTRAINT "Tracking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
