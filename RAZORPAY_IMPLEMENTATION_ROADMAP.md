# Razorpay Implementation Status & Roadmap

**Current Date:** February 22, 2026  
**Status:** ~80% implemented with test keys pending and critical production issues to address

---

## 📋 Executive Summary

The Razorpay integration is **substantially implemented** with both backend and frontend components in place. However, there are **critical security and production readiness issues** that must be addressed before going live:

### 🟢 What's Done
- Razorpay SDK installed (`razorpay` npm package v2.9.6)
- Database schema updated (Razorpay fields: `razorpayOrderId`, `razorpayPaymentId`)
- Backend endpoints: `/payments/create-order`, `/payments/verify`, `/payments/config`
- Signature verification implemented (HMAC-SHA256)
- Frontend checkout UI with online/COD payment method toggle
- Stock validation and deduction
- Delivery slot integration with order creation
- Driver assignment logic
- Order status and payment status tracking

### 🟡 Critical Issues (Must Fix Before Production)
1. **Keys not configured** - `.env` has empty `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
2. **Currency mismatch** - Code uses USD but India uses INR; amounts need rupee conversion
3. **Missing amount conversion to paise** - Frontend needs to ensure paise conversion
4. **No webhook handling** - Payment failures/refunds not handled server-side
5. **Frontend key management** - VITE_RAZORPAY_KEY_ID env var not set
6. **No payment timeout/error recovery** - Network failures leave orders inconsistent
7. **Idempotency risk** - Multiple requests could create duplicate orders

### 🔴 What's Totally Missing
1. **Webhook endpoint** - No `/payments/webhook` to handle Razorpay notifications
2. **Payment failure handling** - No mechanism to cancel orders if payment fails
3. **Refund logic** - No refund endpoint for cancellations
4. **Webhook signature verification** - Can't validate incoming webhook events
5. **Environment variable documentation** - No clear setup guide
6. **Testing setup** - No postman collection or test documentation

---

## 📊 Current Implementation State

### Backend Implementation (`skfruits-sbackend`)

#### 💾 Database Schema (Prisma)
**File:** [prisma/schema.prisma](prisma/schema.prisma#L166-L184)

```prisma
model Order {
  ...
  razorpayOrderId    String?       // Set on order creation, idempotency key
  razorpayPaymentId  String?       @unique  // Set after payment verification
  ...
  @@index([razorpayPaymentId])
  @@index([razorpayOrderId])
}
```

**Status:** ✅ Complete and properly indexed

---

#### 🔌 Implemented Endpoints

**File:** [routes/payments.js](routes/payments.js) (261 lines)

| Endpoint | Method | Status | Purpose |
|----------|--------|--------|---------|
| `/payments/config` | GET | ✅ | Returns Razorpay `key_id` to frontend (public, safe) |
| `/payments/create-order` | POST | ✅ | Creates Razorpay order after validating cart |
| `/payments/verify` | POST | ✅ | Verifies signature & creates Order record (idempotent) |
| ~~`/payments/webhook`~~ | POST | ❌ | **MISSING** - Handle async payment notifications |

**Key Implementation Details:**

1. **POST /payments/create-order**
   - ✅ Validates session ID
   - ✅ Retrieves and validates cart items
   - ✅ Checks stock availability
   - ✅ Calculates subtotal + delivery fee (backend-driven, no frontend trust)
   - ✅ Validates delivery slot (if provided)
   - ❌ **BUG:** Uses `CURRENCY = "USD"` instead of `"INR"`
   - ❌ **BUG:** Amount in paise calculation correct but currency wrong
   - Returns: `razorpayOrderId`, `amount` (in paise), `currency`

2. **POST /payments/verify**
   - ✅ Signature verification via HMAC-SHA256
   - ✅ Prevents duplicate orders (checks `razorpayPaymentId` uniqueness)
   - ✅ Atomic transaction: stock deduction + order creation + driver assignment
   - ✅ Clears cart after successful verification
   - ⚠️ **RISK:** If network fails after signature verification, order created but frontend doesn't know

**Signature Verification Code:**
```javascript
function verifyPaymentSignature(orderId, paymentId, signature) {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body).digest("hex");
  return expected === signature;
}
```
✅ Correct implementation

---

#### 💳 COD (Cash on Delivery) Implementation

**File:** [routes/orders.js](routes/orders.js#L41-L150)

- ✅ Separate endpoint: `POST /orders/create`
- ✅ Accepts `paymentMethod: "cod"` in request
- ✅ Sets `paymentMethod = "cod"` on order record
- ✅ Full validation: stock, cart, delivery slot
- ✅ Driver assignment + slot booking
- Status after creation: `"pending"` (vs `"confirmed"` for online payments)

**Note:** COD is fully functional for orders; no payment processing needed.

---

#### 📍 Integration Points

**Stock Validation:** [utils/stock.js](utils/stock.js)
- ✅ `validateStockForItems()` - Checks availability
- ✅ `deductStockForOrder()` - Atomic deduction in transaction

**Delivery:** [routes/delivery.js](routes/delivery.js)
- ✅ `calculateDeliveryCharges()` - Based on subtotal
- ✅ `getEstimatedDeliveryForOrder()` - Default ETA if no slot
- ✅ Delivery slot validation (date, capacity)

**Driver Assignment:** [utils/driverAssignment.js](utils/driverAssignment.js)
- ✅ Auto-assigns driver to confirmed orders
- ✅ Respects driver assignment rules

---

### Frontend Implementation (`skfruits-frontend`)

#### 🎨 Checkout Page
**File:** [src/pages/Checkout.jsx](src/pages/Checkout.jsx) (991 lines)

**Payment Flow:**

1. **Online Payment (Razorpay)**
   ```
   User selects "Pay Online" → Validate form → 
   POST /payments/create-order → 
   Load Razorpay script → 
   Open Razorpay modal → 
   User completes payment → 
   Razorpay returns {razorpay_order_id, razorpay_payment_id, razorpay_signature} → 
   POST /payments/verify → 
   Redirect /order-success
   ```

2. **COD (Cash on Delivery)**
   ```
   User selects "Cash on Delivery" → Validate form → 
   POST /orders/create (paymentMethod: "cod") → 
   Redirect /order-success
   ```

**Key Components:**

| Component | Status | Details |
|-----------|--------|---------|
| Payment method toggle | ✅ | Online/COD radio buttons |
| Form validation | ✅ | Name, phone, address, pincode, city, state |
| Razorpay script loading | ✅ | Async, cached at `window.Razorpay` |
| Order creation | ✅ | Cart + delivery fee validation |
| Key loading | ⚠️ | Tries `VITE_RAZORPAY_KEY_ID` env first, then `/payments/config` fallback |
| Signature passing | ✅ | Sends all three Razorpay response fields |
| Error handling | ✅ | Shows toast errors, supports slot/delivery error recovery |

**Current Issues:**

```javascript
// Line 322 - Key ID loading
let keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
if (!keyId) {
  try {
    const configRes = await fetch(`${API}/payments/config`);
    const config = await configRes.json();
    keyId = config.razorpayKeyId || "";
  } catch { keyId = ""; }
}
```
- ✅ Fallback mechanism works
- ❌ `VITE_RAZORPAY_KEY_ID` not set in [.env](skfruits-frontend/.env)

```javascript
// Line 345 - Currency hardcoded to frontend
currency: currency || "INR",  // Uses INR (good!)
```
- ✅ Frontend defaults to INR (correct for India)
- ⚠️ But backend sends `currency: "USD"`

---

#### 📦 Environment Setup

**Backend (.env)** - [skfruits-sbackend/.env](.env)

```dotenv
# 🔴 CRITICAL - EMPTY!
RAZORPAY_KEY_ID = 
RAZORPAY_KEY_SECRET =
```

**Frontend (.env)** - [skfruits-frontend/.env](skfruits-frontend/.env)

```dotenv
# Missing - should have:
# VITE_RAZORPAY_KEY_ID=rzp_test_xxx (test) or rzp_live_xxx (prod)
```

---

## 🔍 Critical Issues Analysis

### Issue #1: Currency Mismatch ⚠️ CRITICAL

**Problem:**
```javascript
// Backend: payments.js, line 16
const CURRENCY = "USD";

// Frontend: Checkout.jsx, line 348
currency: currency || "INR",
```

**Impact:**
- Backend creates Razorpay orders in USD
- Frontend shows prices in rupees (₹)
- User sees ₹500, Razorpay charges $500 equivalent
- **Result:** 70-80x price markup for users! 💥

**Fix Required:**
- Change backend `CURRENCY` from `"USD"` to `"INR"`
- Ensure all amount calculations are in paise (₹ × 100)

---

### Issue #2: Empty API Keys ⚠️ CRITICAL

**Problem:**
```dotenv
RAZORPAY_KEY_ID = 
RAZORPAY_KEY_SECRET =
```

**Impact:**
- `getRazorpayInstance()` throws: "Razorpay keys not configured"
- NO ONLINE PAYMENTS CAN BE PROCESSED
- Backend returns 503 error to frontend

**Test Keys Provided by Sneha:**
```
KEY_ID: rzp_test_SHX9rhQtdqk8Zx
KEY_SECRET: rXo7jSnj8syoVc1DblfH2HS3
```

**Fix Required:**
- Add both keys to `.env` (test keys for dev, live keys for production)
- Add `VITE_RAZORPAY_KEY_ID` to frontend `.env`

---

### Issue #3: No Webhook Handling ⚠️ CRITICAL for Reliability

**Problem:**
- Backend only processes payments via `/payments/verify` (frontend-initiated)
- If frontend crashes after user pays but before calling verify:
  - Payment is processed by Razorpay ✅
  - Order is NOT created ❌
  - User's money is stuck
  - No automatic recovery

**Missing Webhook Endpoint:** [routes/payments.js](routes/payments.js)

Razorpay sends webhooks for:
- `payment.authorized`
- `payment.failed`
- `order.paid`
- `refund.created`

**Fix Required:**
- Add `POST /payments/webhook` endpoint
- Verify webhook signature (Razorpay sends `X-Razorpay-Signature` header)
- Create order if not already created (idempotent via `razorpayPaymentId`)
- Handle payment failures and refunds

---

### Issue #4: No Payment Failure Recovery ⚠️ HIGH

**Problem:**
- If user's payment fails on Razorpay's end, no backend recovery
- Order might be partially created
- Stock might be deducted
- No rollback mechanism

**Scenarios:**
1. User completes payment → Razorpay processes it → Network error on `/verify` call
   - Backend: Order created ✅
   - Frontend: Doesn't know, shows error ❌
   
2. User clicks "Pay" → Razorpay rejects payment → Modal closes
   - Order is NOT created ✅ (because verify wasn't called)
   - But user might retry, creating duplicate orders from different carts

**Fix Required:**
- Webhook endpoint to catch failed payments and notify frontend
- Payment timeout mechanism (if verify doesn't happen in 5 mins, cancel order)
- Better error states in frontend

---

### Issue #5: No Refund Logic ⚠️ MEDIUM

**Problem:**
- If admin cancels an order
- OR user returns items
- OR payment is disputed
- **No way to issue refunds programmatically**

**Missing Endpoint:**
```javascript
// Should exist at routes/payments.js
POST /payments/refund
Body: { orderId, refundAmount?, reason? }
```

**Fix Required:**
- Add refund endpoint that:
  - Validates order is eligible (payment confirmed, not already refunded)
  - Calls `razorpay.payments.refund(paymentId, amount)`
  - Updates order status
  - Logs refund in database

---

### Issue #6: No Idempotency Guard for COD ⚠️ MEDIUM

**Problem:**
```javascript
// Frontend: Checkout.jsx, line 265
const res = await fetch(`${API}/orders/create`, {
  method: "POST",
  ...
});
```

If network fails after first request:
- User retries manually
- Backend creates a new order with same items
- **Duplicate order!**

**Fix Required:**
- Add `idempotencyKey` to request
- Backend returns same order if key already exists
- Or implement request deduplication middleware

---

## 🛣️ Roadmap: Implementation Sequence

### Phase 1: Setup & Configuration (Hard Stop - Can't proceed without this)
**Time:** 30 mins | **Priority:** 🔴 CRITICAL

- [ ] **1.1** Add Razorpay test keys to backend `.env`
  - `RAZORPAY_KEY_ID=rzp_test_SHX9rhQtdqk8Zx`
  - `RAZORPAY_KEY_SECRET=rXo7jSnj8syoVc1DblfH2HS3`

- [ ] **1.2** Add test key to frontend `.env`
  - `VITE_RAZORPAY_KEY_ID=rzp_test_SHX9rhQtdqk8Zx`

- [ ] **1.3** Fix currency in backend
  - Change `CURRENCY = "USD"` → `"INR"` in [payments.js](routes/payments.js#L16)

**Validation:** Try checkout with online payment, should open Razorpay modal

---

### Phase 2: Webhook Implementation (Reliability Fix)
**Time:** 2 hours | **Priority:** 🟠 HIGH

- [ ] **2.1** Add webhook endpoint handler
  - File: [routes/payments.js](routes/payments.js)
  - Verify incoming webhook signature
  - Handle: `payment.authorized` → create order if not exists
  - Handle: `payment.failed` → log & alert admin

- [ ] **2.2** Database migrations (if needed)
  - Add `webhookLog` table to track received webhooks
  - Add `refundStatus` field to Order model

- [ ] **2.3** Webhook signature verification
  - Store webhook secret from Razorpay dashboard
  - Verify using: `crypto.createHmac("sha256", webhook_secret)`

- [ ] **2.4** Idempotency handling
  - Check if order exists before creating (via `razorpayPaymentId`)
  - Log all webhook events with timestamps

**Testing:** 
- Simulate webhook using Postman with correct signature
- Verify order created even if frontend request fails

---

### Phase 3: Payment Failure Handling (Error Recovery)
**Time:** 1.5 hours | **Priority:** 🟠 HIGH

- [ ] **3.1** Add payment timeout logic
  - Backend job/cron: Check if order has `razorpayOrderId` but no `razorpayPaymentId` after 5 mins
  - Auto-cancel such orders
  - Restore stock

- [ ] **3.2** Payment failure webhook handler
  - When `payment.failed` received:
    - Mark order as "cancelled"
    - Restore stock
    - Notify user via email

- [ ] **3.3** Frontend error state improvements
  - Show "Order creation failed, but payment may have been processed"
  - Provide retry option
  - Fetch `/orders/my-orders` to check if order was created anyway

**Testing:**
- Place order, interrupt before verify
- Manually trigger webhook failure
- Verify stock is restored

---

### Phase 4: Refund Functionality (Completeness)
**Time:** 2 hours | **Priority:** 🟡 MEDIUM

- [ ] **4.1** Add refund endpoint
  ```javascript
  POST /payments/refund
  Body: { orderId, amount?, reason? }
  ```

- [ ] **4.2** Refund request flow
  - Validate order has `razorpayPaymentId`
  - Validate amount ≤ total amount paid
  - Get partial or full refund
  - Call Razorpay API: `razorpay.payments.refund(paymentId, amountInPaise)`
  - Update order: `refundStatus = "pending"` or `"completed"`

- [ ] **4.3** Admin UI integration
  - Add "Refund" button in admin order detail
  - Show refund status
  - Log refund reason

- [ ] **4.4** Database schema update
  - Add columns:
    - `refundRequestedAt: DateTime?`
    - `refundStatus: String?` // pending, completed, failed
    - `refundIdempotencyKey: String?` // Prevent duplicate refunds
    - `refundRequestId: String?` // Link to Razorpay refund ID

**Testing:**
- Create order via online payment
- Issue refund via admin
- Verify amount returns to user's payment method

---

### Phase 5: Testing & Documentation (QA)
**Time:** 3 hours | **Priority:** 🟡 MEDIUM

- [ ] **5.1** Create test scenarios document
  - Successful payment flow
  - Payment failure scenarios
  - Webhook delivery / webhook retry
  - Refund scenarios
  - Edge cases (duplicate requests, network failures)

- [ ] **5.2** Create Postman collection
  - Test endpoints without UI
  - Include webhook simulation
  - Pre-configured with test keys
  - Example payloads for each scenario

- [ ] **5.3** Create migration guide
  - How to sync from test keys → live keys
  - How to handle existing test orders
  - Webhook URL registration steps

- [ ] **5.4** Add error logging
  - Log all Razorpay API calls
  - Log all webhook events
  - Track payment verification attempts

**Testing Platforms:**
- Razorpay's test card: `4111111111111111`, any future date, any CVV
- Test UPI: `success@razorpay` for instant success

---

### Phase 6: Production Readiness (Before Launch)
**Time:** 2 hours | **Priority:** 🔴 CRITICAL

- [ ] **6.1** Switch from test keys to live keys
  - Update `.env` with live keys
  - Update frontend `VITE_RAZORPAY_KEY_ID`

- [ ] **6.2** Register webhook URL with Razorpay
  - Go to Razorpay dashboard → Settings → Webhooks
  - Add: `https://your-domain.com/payments/webhook`
  - Subscribe to: payment.authorized, payment.failed, refund.created, order.paid

- [ ] **6.3** Security checklist
  - ✅ Keys never logged or exposed in responses
  - ✅ Webhook signature verified
  - ✅ Stock deduction is atomic (transaction)
  - ✅ Duplicate orders prevented (unique razorpayPaymentId)
  - ✅ Rate limiting on payment endpoints
  - ✅ HTTPS enforced on all payment routes

- [ ] **6.4** Monitoring setup
  - Alert on: Payment verify failures, Webhook failures, Refund failures
  - Dashboard: Monitor payment success rate
  - Daily: Reconcile Razorpay payments vs orders in DB

---

## 🧪 Testing Required (After Implementation)

### Test Matrix

| Scenario | Frontend | Backend | Razorpay | Expected Result |
|----------|----------|---------|----------|---|
| **T1: Successful Online Payment** | ✅ | ✅ | Mock | Order created, status: confirmed |
| **T2: Failed Payment** | ✅ | ✅ | Mock | No order created, error shown |
| **T3: COD Order** | ✅ | ✅ | N/A | Order created, status: pending |
| **T4: Webhook Delivery (Success)** | N/A | ✅ | ✅ | Order created via webhook |
| **T5: Webhook Retry** | N/A | ✅ | ✅ | Same order, idempotent (no duplicate) |
| **T6: Stock Validation** | ✅ | ✅ | Mock | Cart with OOS item rejected |
| **T7: Delivery Slot Booking** | ✅ | ✅ | Mock | Slot marked as booked, ETA set |
| **T8: Duplicate Request (Frontend Crash)** | ✅ | ✅ | Mock | Same order returned, no duplicate |
| **T9: Refund Flow** | N/A | ✅ | Mock | Payment refunded, order cancelled |
| **T10: Payment Timeout** | ✅ | ✅ | Mock | Order auto-cancelled after 5 mins |
| **T11: Invalid Razorpay Signature** | ✅ | ✅ | Mock | 400 error, no order created |
| **T12: Network Failure During Verify** | ✅ | ✅ | ✅ | Webhook recovers order creation |

### Test Data

**Test Payment Methods (Razorpay):**
- Card: `4111111111111111` (Success)
- Card: `4000000000000002` (Failure)
- Card: `5555555555554444` (Mastercard)
- UPI: `success@razorpay`
- NetBanking: Multiple options available

---

## 🚀 Deployment Checklist

Before going to production:

```yaml
Pre-Launch Checks:
  Environment:
    - [ ] Live Razorpay API keys configured
    - [ ] Webhook URL registered & tested
    - [ ] HTTPS enforced
    - [ ] Database backups enabled
  
  Code:
    - [ ] All tests passing (Phase 5)
    - [ ] Razorpay SDK up-to-date
    - [ ] Signature verification unit tests
    - [ ] Error handling for all scenarios
  
  Monitoring:
    - [ ] Payment alerts configured
    - [ ] Webhook failure alerts configured
    - [ ] Reconciliation job running
    - [ ] Admin dashboard shows payment status
  
  Documentation:
    - [ ] Team trained on refund process
    - [ ] Support guide for payment issues
    - [ ] Runbook for webhook failures

Post-Launch (First Week):
  - [ ] Monitor payment success rate (target: >99%)
  - [ ] Check webhook delivery reliability
  - [ ] Verify no duplicate orders
  - [ ] Test refund process with sample order
  - [ ] Review logs for any errors
```

---

## 📌 Key Files Summary

| File | Lines | Status | Key Changes Needed |
|------|-------|--------|---|
| [skfruits-sbackend/routes/payments.js](skfruits-sbackend/routes/payments.js) | 261 | 80% | Add webhook handler, fix currency |
| [skfruits-sbackend/routes/orders.js](skfruits-sbackend/routes/orders.js) | 348 | 100% | Add idempotency key support |
| [skfruits-sbackend/prisma/schema.prisma](skfruits-sbackend/prisma/schema.prisma) | 386 | 90% | Add webhook log, refund fields |
| [skfruits-frontend/src/pages/Checkout.jsx](skfruits-frontend/src/pages/Checkout.jsx) | 991 | 95% | Minor: error state improvements |
| [skfruits-sbackend/.env](.env) | - | 0% | **Add Razorpay keys** |
| [skfruits-frontend/.env](skfruits-frontend/.env) | - | 0% | **Add test key** |

---

## 🎯 Success Criteria

When complete, the Razorpay integration will:

✅ Accept payments securely via Razorpay with correct currency (INR)  
✅ Verify signatures server-side to prevent fraud  
✅ Create orders atomically (all-or-nothing with stock deduction)  
✅ Recover from network failures via webhooks  
✅ Support both online and COD payment methods  
✅ Handle refunds through admin panel  
✅ Prevent duplicate orders  
✅ Display accurate payment status in admin dashboard  
✅ Alert on payment failures  
✅ Pass all test scenarios  

---

## ⚠️ Important Reminders

- **NEVER commit live API keys** - use `.env` and `.env.local`
- **Razorpay test keys** provided by Sneha are already in this document (not production)
- **Always verify signatures** - Razorpay spoofing is a common attack
- **Use transactions** - Stock deduction must be atomic with order creation
- **Webhook retries** - Razorpay retries webhooks for 24 hours; handle duplicates gracefully
- **Amount in paise** - Always multiply rupees by 100 for Razorpay API
- **Test thoroughly** - Use Razorpay's test environment before going live

---

## 📞 Next Steps

1. **Approve this roadmap** - Confirm priority and timeline
2. **Assign tasks** - Decide who owns Phase 1-6
3. **Set test environment** - Prepare dev database for testing
4. **Notify team** - Share Razorpay test credentials securely
5. **Execute Phase 1** - Add keys and validate basic flow
6. **Proceed with remaining phases** - One phase at a time with testing

---

Generated: February 22, 2026  
Prepared for: Razorpay Integration Completion Project
