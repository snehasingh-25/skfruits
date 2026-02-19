# User, Admin & Driver Profiles — How They’re Created and How to Access Dashboards

## Overview

| Role      | How profile is created              | Where they log in     | Dashboard / access                    |
|-----------|-------------------------------------|------------------------|--------------------------------------|
| **Customer** | Sign up on the storefront           | `/login`               | Storefront: profile, orders, wishlist |
| **Admin**    | Env seed on server start (or DB)    | `/admin/login`         | `/admin/*` (dashboard, orders, drivers, etc.) |
| **Driver**   | Admin adds via Admin → Drivers       | Same `/login` as customer | Backend: `GET /driver/me` (no driver UI yet) |

---

## 1. Customer (User)

### Create profile
- **Sign up** on the storefront: go to **Sign up** (e.g. `/signup`).
- Send: `name`, `email`, `password` (min 6 chars).
- Backend: `POST /auth/signup` → creates `User` with `role: "customer"`.

### Log in
- **Storefront login**: `/login`.
- Send: `email`, `password` → `POST /auth/login`.
- Response includes `token` and `user` (e.g. `id`, `name`, `email`, `phone`, `role: "customer"`). Frontend typically stores token (e.g. in localStorage or context) and uses it for customer APIs.

### Access “dashboard” (customer area)
- **Profile / addresses**: `/profile/addresses`
- **My orders**: `/profile/orders`
- **Wishlist**: `/profile/wishlist`
- **Order detail**: `/orders/:id` (with customer auth)
- All these use the **same JWT** from `/login`; backend uses it for `requireCustomerAuth` or similar.

---

## 2. Admin

### Create profile
- **Recommended**: Set env and let the server create the first admin on startup:
  - In backend `.env`:
    - `ADMIN_EMAIL=your-admin@example.com`
    - `ADMIN_PASSWORD=your-secure-password`
  - On server start, `ensureAdminUser()` runs: if no user with that email exists, it creates a `User` with `role: "admin"` and that password (hashed). No manual DB step needed.
- **Alternative**: Create a user in the DB with `role: "admin"` and a bcrypt-hashed password (e.g. via Prisma or SQL).

### Log in
- **Admin login page**: `/admin/login`.
- Send: `email`, `password` → same backend `POST /auth/login`.
- Frontend (e.g. `AuthContext`) checks `user.isAdmin` (or `user.role === "admin"`). Only then it stores the token as `adminToken` and treats the user as admin.

### Access dashboard
- After login, redirect to **`/admin/dashboard`** (or `/admin` which redirects to `/admin/dashboard`).
- All admin routes are under `/admin/*` and are protected by `ProtectedRoute` (which verifies admin token, e.g. via `GET /auth/verify`):
  - **Dashboard (products, categories, etc.)**: `/admin/dashboard`
  - **Orders**: `/admin/orders`, `/admin/orders/:id`
  - **Drivers**: `/admin/drivers`
  - **Analytics**: `/admin/analytics`
  - **Inventory**: `/admin/inventory`
  - **Reviews**: `/admin/reviews`
- Every admin API call must send: `Authorization: Bearer <adminToken>`.

---

## 3. Driver

### Create profile
- **Only admins** can create drivers.
- In **Admin dashboard** go to **Drivers** (`/admin/drivers`), then “Add driver”.
- Backend: `POST /admin/drivers/add` with body:
  - `name` (required)
  - `phone` (required)
  - `password` (required, min 6 chars)
  - `email` (optional but recommended; must be unique)
- Backend creates a **User** with `role: "driver"` and `driverStatus: "available"` (no separate Driver table for status). Driver can log in with this email and password.

### Log in
- **Same login endpoint** as customer: storefront **`/login`** → `POST /auth/login` with driver’s `email` and `password`.
- Response includes `token` and `user` with **`role: "driver"`** (and e.g. `id`, `name`, `email`, `phone`).
- **Important**: The current **Admin login** page (`/admin/login`) only accepts users with `isAdmin`; it will reject drivers with “Please use the storefront login page.” So drivers must use the **storefront** `/login`, not `/admin/login`.

### Access “driver dashboard”
- **Backend** is ready for drivers:
  - **Driver self**: `GET /driver/me` — requires `Authorization: Bearer <token>` and **`requireRole("driver")`** (validates role in DB). Returns e.g. `userId`, `email`, `role`. Non-drivers get 401.
- **Frontend**: There is **no dedicated driver dashboard yet**. To add one you would:
  1. After **storefront** login, if `user.role === "driver"` (from login or `GET /auth/me`), redirect to e.g. `/driver` or `/driver/dashboard`.
  2. Create routes like `/driver`, `/driver/dashboard` protected by a “driver only” check (e.g. call `GET /auth/me` and require `user.role === "driver"`, or call `GET /driver/me` and only then show the driver UI).
  3. Use the same JWT from storefront login for all driver API calls (e.g. `GET /driver/me` and any future driver endpoints).

So today: **driver profile = User with role driver (created by admin). Driver logs in at `/login`. Dashboard access = backend `GET /driver/me`; no driver UI yet.**

---

## Quick reference

| Action              | Customer              | Admin                    | Driver                         |
|---------------------|-----------------------|---------------------------|--------------------------------|
| **Create profile**  | Sign up at `/signup`  | Env `ADMIN_EMAIL`/`PASSWORD` or DB | Admin adds at `/admin/drivers` |
| **Login URL**       | `/login`              | `/admin/login`            | `/login` (storefront)          |
| **Token storage**   | e.g. customer token  | `adminToken`              | Same as customer (storefront)  |
| **Dashboard base**  | `/profile/*`, `/orders/:id` | `/admin/*`          | Backend `/driver/me` only (no UI yet) |
| **Backend role**    | `customer`            | `admin`                   | `driver`                       |

---

## Summary

- **Customer**: Sign up → login at `/login` → use storefront profile/orders/wishlist.
- **Admin**: Seed via env (or DB) → login at `/admin/login` → use `/admin/*` dashboard; token in `adminToken`.
- **Driver**: Admin creates driver → driver logs in at **storefront** `/login` → backend allows `GET /driver/me`; add frontend driver dashboard when needed by routing drivers (by `role === "driver"`) to `/driver` and protecting those routes with the same token.
