-- AlterTable
ALTER TABLE "Tracking" ADD COLUMN     "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paymentMethod" TEXT;
