# Delivery in X Minutes — Testing Guide

## Prerequisites

### 1. Run the Prisma Migration
```bash
cd skfruits-sbackend
npx prisma migrate dev --name add-delivery-time-feature
```
This creates:
- `ShopLocation` table
- `DeliveryTimeConfig` table
- 4 new columns on `Order`: `estimatedDeliveryMinutes`, `nearestShopName`, `distanceKm`, `driverAvailable`

### 2. Seed the Shop Locations & Config

Open your database tool (pgAdmin, Prisma Studio, or psql) and run:

```sql
-- Replace lat/lng with your actual two shop coordinates
INSERT INTO "ShopLocation" (name, latitude, longitude, "isActive", "processingTimeMinutes", "createdAt", "updatedAt")
VALUES
  ('SK Fruits - Shop 1', 28.5245, 77.2066, true, 10, NOW(), NOW()),13.02071640778142, 77.7096930887642
  ('SK Fruits - Shop 2', 28.4900, 77.1855, true, 10, NOW(), NOW());13.028912, 77.711764

-- One config row (all defaults are sensible, tweak as needed)
INSERT INTO "DeliveryTimeConfig" ("averageSpeedKmph", "baseProcessingMinutes", "bufferMinutes", "maxDeliverableKm", "noDriverExtraMinutes", "updatedAt")
VALUES (25, 10, 5, 15, 15, NOW());
```

Or use **Prisma Studio**:
```bash
npx prisma studio
```
Then manually add the rows in the `ShopLocation` and `DeliveryTimeConfig` tables.

---

## Testing Steps

### Test 1: Home Page — "Delivery in less than 30 mins" Banner
1. Start frontend: `cd skfruits-frontend && npm run dev`
2. Open the home page
3. **Verify**: The old `mins.png` image is replaced with a green gradient banner saying **"Delivery in less than 30 mins"**
4. Should appear between "Recently Viewed" and "Buy Again" sections

### Test 2: Delivery Estimate API
```bash
# Replace with coordinates near your shop
curl "http://localhost:3000/delivery/estimate-time?latitude=28.52&longitude=77.20"
```

**Expected response (serviceable):**
```json
{
  "serviceable": true,
  "estimatedMinutes": 18,
  "nearestShop": "SK Fruits - Shop 1",
  "distanceKm": 0.82,
  "driverAvailable": true
}
```

**Test with far-away coordinates (outside range):**
```bash
curl "http://localhost:3000/delivery/estimate-time?latitude=28.70&longitude=77.50"
```
**Expected:**
```json
{
  "serviceable": false,
  "reason": "Address is outside our delivery range",
  "distanceKm": 35.12,
  "maxDeliverableKm": 15
}
```

**Test with missing params:**
```bash
curl "http://localhost:3000/delivery/estimate-time"
```
**Expected:** `400` error

### Test 3: Order Creation — ETA Persisted

1. Add items to cart on the frontend
2. Go to checkout, fill in an address **with latitude/longitude** (use the Google address autocomplete so lat/lng get captured)
3. Place the order
4. **Check the API response** in the browser Network tab — `POST /orders/create` should return:
   ```json
   {
     "orderId": 123,
     "success": true,
     "estimatedDeliveryMinutes": 28,
     "driverAvailable": true,
     "nearestShopName": "SK Fruits - Shop 1"
   }
   ```
5. Verify in the database: `SELECT "estimatedDeliveryMinutes", "nearestShopName", "distanceKm", "driverAvailable" FROM "Order" WHERE id = 123;`

### Test 4: Order Success Page
1. After placing an order, you'll be redirected to `/order-success?orderId=123`
2. **Verify**: A green card appears showing **"Arriving in ~28 mins"**
3. If a driver was assigned → see "Your delivery partner is on the way!"
4. If no driver was assigned → see "We're assigning a delivery partner — may take slightly longer"

### Test 5: Order Details Page
1. Go to **My Orders** → click on an order that has `estimatedDeliveryMinutes`
2. **Verify**: A green ETA card appears above the address section:
   - "Estimated delivery: ~28 mins"
   - Shop name + distance shown below
   - If `driverAvailable` is false → "Driver assignment pending — time includes wait"

### Test 6: No Driver Available Scenario
1. Set all drivers to `busy` or `offline`:
   ```sql
   UPDATE "User" SET "driverStatus" = 'offline' WHERE role = 'driver';
   ```
2. Place a new order
3. **Verify**:
   - `estimatedDeliveryMinutes` is ~15 mins higher than normal (the `noDriverExtraMinutes` buffer)
   - `driverAvailable` is `false` in the response
   - Order Success page shows the "assigning a delivery partner" message
4. **Reset drivers** after testing:
   ```sql
   UPDATE "User" SET "driverStatus" = 'available' WHERE role = 'driver';
   ```

### Test 7: No Coordinates on Address
1. Place an order without lat/lng (e.g., manually enter address without using Google autocomplete)
2. **Verify**: Order still creates successfully, `estimatedDeliveryMinutes` is `null`, no ETA card shows on Order Success/Details pages (graceful fallback)

---

## Summary of All Changes Made

| File | What Changed |
|---|---|
| `skfruits-sbackend/prisma/schema.prisma` | Added `ShopLocation`, `DeliveryTimeConfig` models; added 4 new columns to `Order` |
| `skfruits-sbackend/utils/distance.js` | **New file** — Haversine distance formula |
| `skfruits-sbackend/routes/delivery.js` | Added `estimateDeliveryTime()` function + `GET /delivery/estimate-time` endpoint |
| `skfruits-sbackend/routes/orders.js` | `POST /orders/create` computes & saves ETA; `GET /orders/:id` and `GET /orders/my-orders` return new fields |
| `skfruits-frontend/src/pages/Home.jsx` | Replaced static `mins.png` with dynamic green "Delivery in less than 30 mins" banner |
| `skfruits-frontend/src/pages/OrderSuccess.jsx` | Added green ETA card with "Arriving in ~X mins" + driver status |
| `skfruits-frontend/src/pages/OrderDetails.jsx` | Added green ETA card with estimated time, shop name, distance |

---

## Config You Can Tweak (DeliveryTimeConfig table)

| Field | Default | Meaning |
|---|---|---|
| `averageSpeedKmph` | 25 | Average delivery bike speed |
| `baseProcessingMinutes` | 10 | Base order packing time |
| `bufferMinutes` | 5 | Safety padding added to every estimate |
| `maxDeliverableKm` | 15 | Beyond this → "Not serviceable" |
| `noDriverExtraMinutes` | 15 | Extra wait time when no driver is free |
