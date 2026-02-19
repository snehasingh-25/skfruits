-- AlterTable User: add driverStatus (optional; used when role = driver). Reuses existing DriverStatus enum.
ALTER TABLE "User" ADD COLUMN "driverStatus" "DriverStatus";

-- AlterTable Order: add driverUserId for assigning orders to User (role = driver)
ALTER TABLE "Order" ADD COLUMN "driverUserId" INTEGER;

-- CreateIndex
CREATE INDEX "Order_driverUserId_idx" ON "Order"("driverUserId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_driverUserId_fkey" FOREIGN KEY ("driverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
