-- CreateTable
CREATE TABLE "DeliveryRule" (
    "id" SERIAL NOT NULL,
    "minimumOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freeDeliveryThreshold" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverySlot" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "maxOrders" INTEGER,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliverySlot_pkey" PRIMARY KEY ("id")
);

-- Add Order delivery fields
ALTER TABLE "Order" ADD COLUMN "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "estimatedDeliveryDate" DATE;
ALTER TABLE "Order" ADD COLUMN "deliverySlotId" INTEGER;

-- CreateIndex
CREATE INDEX "DeliveryRule_minimumOrderAmount_idx" ON "DeliveryRule"("minimumOrderAmount");

-- CreateIndex
CREATE INDEX "DeliverySlot_date_isActive_idx" ON "DeliverySlot"("date", "isActive");
CREATE INDEX "DeliverySlot_date_idx" ON "DeliverySlot"("date");

-- CreateIndex
CREATE INDEX "Order_deliverySlotId_idx" ON "Order"("deliverySlotId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliverySlotId_fkey" FOREIGN KEY ("deliverySlotId") REFERENCES "DeliverySlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default delivery rule (single rule: fee 49, free above 500)
INSERT INTO "DeliveryRule" ("minimumOrderAmount", "deliveryFee", "freeDeliveryThreshold", "createdAt")
VALUES (0, 49, 500, CURRENT_TIMESTAMP);

-- Seed sample delivery slots for next 7 days (9-12 and 14-17)
INSERT INTO "DeliverySlot" ("date", "startTime", "endTime", "maxOrders", "bookedCount", "isActive", "createdAt", "updatedAt")
SELECT
  CURRENT_DATE + n.n,
  CASE WHEN s.slot = 1 THEN '09:00' ELSE '14:00' END,
  CASE WHEN s.slot = 1 THEN '12:00' ELSE '17:00' END,
  20,
  0,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM generate_series(0, 6) AS n(n)
CROSS JOIN (VALUES (1), (2)) AS s(slot);
