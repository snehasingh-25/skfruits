/**
 * Tries to assign one available driver (User with role = driver, driverStatus = available) to the order.
 * Uses atomic raw SQL with FOR UPDATE SKIP LOCKED to avoid race conditions.
 * Sets User.driverStatus = 'busy' and Order.driverUserId.
 * If no available driver, order remains unassigned.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx - Prisma transaction client
 * @param {number} orderId - Order id to assign a driver to
 */
export async function tryAssignDriverToOrder(tx, orderId) {
  const result = await tx.$queryRaw`
    WITH selected AS (
      SELECT id FROM "User"
      WHERE role = 'driver' AND "driverStatus" = 'available'
      ORDER BY id ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    ),
    updated AS (
      UPDATE "User" SET "driverStatus" = 'busy'
      WHERE id IN (SELECT id FROM selected)
      RETURNING id
    )
    SELECT id FROM updated
  `;
  const driverUserId = result?.[0]?.id ?? null;
  if (driverUserId != null) {
    await tx.order.update({
      where: { id: orderId },
      data: { driverUserId: Number(driverUserId) },
    });
  }
}

/**
 * Releases the driver when an order is marked delivered.
 * - If order has driverUserId: sets User.driverStatus = 'available'.
 * - If order has driverId (legacy): sets Driver.status = 'available' for backward compatibility.
 * @param {import('@prisma/client').PrismaClient} prisma - Prisma client
 * @param {{ driverUserId?: number | null; driverId?: number | null }} options - Order's assigned driver(s)
 */
export async function releaseDriverIfAssigned(prisma, options = {}) {
  const { driverUserId, driverId } = typeof options === "number" ? { driverUserId: null, driverId: options } : options;
  if (driverUserId != null && Number.isInteger(Number(driverUserId))) {
    await prisma.user.updateMany({
      where: { id: Number(driverUserId), role: "driver" },
      data: { driverStatus: "available" },
    });
  }
  if (driverId != null && Number.isInteger(Number(driverId))) {
    await prisma.driver.updateMany({
      where: { id: Number(driverId) },
      data: { status: "available" },
    });
  }
}
