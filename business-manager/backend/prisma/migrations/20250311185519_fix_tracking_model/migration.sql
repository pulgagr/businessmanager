/*
  Warnings:

  - You are about to drop the column `clientId` on the `Tracking` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Tracking` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Tracking" DROP CONSTRAINT "Tracking_clientId_fkey";

-- AlterTable
ALTER TABLE "Tracking" DROP COLUMN "clientId",
DROP COLUMN "status";
