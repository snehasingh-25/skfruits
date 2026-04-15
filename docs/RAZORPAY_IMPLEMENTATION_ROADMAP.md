# Razorpay Implementation Status & Roadmap

**Current Date:** March 22, 2026  
**Status:** Verified implementation; core checkout works, reliability gaps remain

---

## Executive Summary

This roadmap has been updated after verifying code and env state in the repository.

### Verified As Completed
1. Razorpay keys are configured in backend env.
2. Frontend Razorpay key is configured.
3. Currency is set to INR in backend payment order creation.
4. Amount sent to Razorpay is converted to paise (`Math.round(total * 100)`).
5. Signature verification for `/payments/verify` is implemented.
6. Basic idempotency exists for online verify flow via unique `razorpayPaymentId`.

### Remaining In Scope
1. Webhook endpoint and signature verification for incoming Razorpay events.
2. Payment failure handling on backend (especially async failure paths).
3. Stronger idempotency for duplicate/retried requests (including COD flow).
4. Payment timeout / stuck-payment reconciliation.

### Explicitly Out Of Scope For Now
1. Refund endpoint and refund workflows.
2. Environment setup documentation.
3. Testing docs/Postman setup.

---

## Verification Notes (Codebase)

### Backend
1. `CURRENCY = "INR"` is set in [skfruits-sbackend/routes/payments.js](skfruits-sbackend/routes/payments.js).
2. `/payments/create-order` sends Razorpay amount in paise and currency from server.
3. `/payments/verify` is implemented with signature validation and transactional order creation.
4. No `/payments/webhook` route exists yet.
5. No timeout scheduler/cron for pending payment reconciliation is present.

### Frontend
1. Checkout loads key from env and can fallback to `/payments/config` in [skfruits-frontend/src/pages/Checkout.jsx](skfruits-frontend/src/pages/Checkout.jsx).
2. Razorpay options use `currency: "INR"`.
3. Error state exists for verify network failure, but no backend-supported reconciliation flow yet.

### Env State
1. Backend env contains Razorpay key id/secret.
2. Frontend env contains `VITE_RAZORPAY_KEY_ID`.
3. Keep secrets out of docs and git history where possible.

---

## Current Gaps

### Gap 1: Webhook Handling
**Status:** Not implemented

Missing:
1. `POST /payments/webhook` route in backend.
2. Raw body signature verification using webhook secret.
3. Event persistence/logging for audit and retries.

### Gap 2: Payment Failure Recovery
**Status:** Partial frontend messaging only

Missing:
1. Backend action path for `payment.failed`/`order.paid` webhook events.
2. Recovery path when frontend verify request never arrives.
3. Consistent order/payment state transitions for failed/abandoned attempts.

### Gap 3: Idempotency Hardening
**Status:** Partial

Implemented:
1. Online verify dedupe through unique `razorpayPaymentId`.

Missing:
1. Request-level idempotency key for `POST /orders/create` (COD).
2. Dedupe strategy for repeated create-order attempts.
3. Stored idempotency records with TTL/expiry policy.

### Gap 4: Payment Timeout/Reconciliation
**Status:** Not implemented

Missing:
1. Background worker/job to find stale payment attempts.
2. Timeout policy (for example: pending beyond 5-15 mins).
3. Reconciliation action (cancel pending attempt, restore stock only if reserved).

---

## Focused Roadmap (In-Scope Only)

### Phase 1: Webhook Foundation
**Priority:** Critical

- [ ] Add `POST /payments/webhook` endpoint in [skfruits-sbackend/routes/payments.js](skfruits-sbackend/routes/payments.js).
- [ ] Add raw-body capture for webhook signature verification (cannot rely on parsed JSON only).
- [ ] Add `RAZORPAY_WEBHOOK_SECRET` env variable usage.
- [ ] Verify signature from `X-Razorpay-Signature` header.
- [ ] Log webhook event id/type/payload hash to prevent duplicate processing.

### Phase 2: Failure & Recovery Logic
**Priority:** High

- [ ] Handle `order.paid` webhook: create/confirm order if verify path missed.
- [ ] Handle `payment.failed` webhook: mark payment attempt as failed and clean up any pending state.
- [ ] Add deterministic order/payment status mapping for webhook-driven transitions.

### Phase 3: Idempotency Hardening
**Priority:** High

- [ ] Add idempotency key support to `POST /orders/create`.
- [ ] Add idempotency key support to payment order creation requests.
- [ ] Persist idempotency key + response mapping and return same response on retries.
- [ ] Add unique constraints/indexes required for duplicate prevention.

### Phase 4: Payment Timeout Job
**Priority:** High

- [ ] Add scheduled reconciliation for stale payment intents/attempts.
- [ ] Define timeout window and cancellation conditions.
- [ ] Ensure stock is restored only when previously reserved.
- [ ] Emit structured logs for alerting.

---

## Suggested Data Model Additions

To implement webhook + timeout + idempotency safely, introduce dedicated payment attempt tracking (recommended):

1. `PaymentAttempt` table/model
   - `id`, `sessionId`, `razorpayOrderId`, `razorpayPaymentId`, `status`, `idempotencyKey`, `expiresAt`, timestamps.
2. `PaymentWebhookLog` table/model
   - `eventId`, `eventType`, `signatureValid`, `processedAt`, payload reference/hash.
3. Optional idempotency table (if not embedded in PaymentAttempt)
   - `key`, `endpoint`, `requestHash`, `responseJson`, `expiresAt`.

---

## Security Notes

1. Do not expose or store real secrets in markdown docs.
2. Webhook verification must use raw request body bytes.
3. Keep payment/order state changes transactional where possible.
4. Treat webhook handlers as at-least-once delivery; always design for duplicate events.

---

## Success Criteria (Current Scope)

The in-scope work is complete when:

1. Webhooks are verified and processed idempotently.
2. Failed or abandoned payments are reconciled without manual intervention.
3. Retry storms and duplicate submit events do not create duplicate COD/online orders.
4. Timeout job regularly closes stale attempts and keeps order/stock state consistent.

---

Generated: March 22, 2026  
Prepared for: Razorpay Integration Completion Project
