/**
 * Tries to assign one available driver (User with role = driver, driverStatus = available) to the order.
 * Uses atomic raw SQL with FOR UPDATE SKIP LOCKED to avoid race conditions.
 * Sets User.driverStatus = 'busy' and Order.driverUserId.
 * If no available driver, order remains unassigned.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx - Prisma transaction client
 * @param {number} orderId - Order id to assign a driver to
 */
export async function tryAssignDriverToOrder(tx, orderId) {
  /**
   * MySQL/MariaDB-safe driver assignment:
   * - Pick the smallest available driver id.
   * - Atomically flip that driver's status from `available` -> `busy` using updateMany.
   *   Only one concurrent transaction will successfully flip the same row.
   * - If flip succeeded, assign the driver to the order.
   *
   * This replaces Postgres-only raw SQL (FOR UPDATE SKIP LOCKED / RETURNING).
   */
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = await tx.user.findFirst({
      where: { role: "driver", driverStatus: "available" },
      orderBy: { id: "asc" },
      select: { id: true },
    });

    if (!candidate) return;

    const updated = await tx.user.updateMany({
      where: { id: candidate.id, driverStatus: "available" },
      data: { driverStatus: "busy" },
    });

    if (updated.count === 1) {
      await tx.order.update({
        where: { id: orderId },
        data: { driverUserId: Number(candidate.id) },
      });
      return;
    }
    // Someone else took this driver between our findFirst and updateMany.
    // Retry to find the next available driver.
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
