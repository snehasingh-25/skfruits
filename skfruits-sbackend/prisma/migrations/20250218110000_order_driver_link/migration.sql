-- AlterTable (add only; no destructive changes)
ALTER TABLE "Order" ADD COLUMN "driverId" INTEGER;
ALTER TABLE "Order" ADD COLUMN "estimatedDeliveryTime" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_driverId_idx" ON "Order"("driverId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
