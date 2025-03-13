/*
  Warnings:

  - You are about to drop the column `trackingId` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Activity` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `Tracking` table. All the data in the column will be lost.
  - Made the column `quoteId` on table `Activity` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_trackingId_fkey";

-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "trackingId",
DROP COLUMN "updatedAt",
ALTER COLUMN "quoteId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Tracking" DROP COLUMN "paymentMethod";

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
