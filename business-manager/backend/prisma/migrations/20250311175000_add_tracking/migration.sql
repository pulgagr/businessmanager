-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "trackingId" INTEGER;

-- CreateTable
CREATE TABLE "Tracking" (
    "id" SERIAL NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "declaredValue" DOUBLE PRECISION NOT NULL,
    "shippingCost" DOUBLE PRECISION NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tracking_trackingNumber_key" ON "Tracking"("trackingNumber");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES "Tracking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
