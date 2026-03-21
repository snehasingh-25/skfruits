# Personalized fruit basket — implementation phases

## Phase 1 — Admin & API
- Prisma `FruitBasket` model; public `GET /baskets`, admin CRUD + reorder.
- Admin UI: **Fruit Baskets** (forms, list).

## Phase 2 — Customer builder
- `FruitBasketProvider`, routes `/fruit-basket`, `/fruit-basket/create`, `.../fruits`, `.../review`.
- Navbar **Fruit Basket** entry.

## Phase 3 — Cart, checkout, gift
- Cart lines: `lineKind`, packaging price/title, `fruitBasketId`; `POST /cart/fruit-basket`.
- System packaging product; stock rules skip packaging lines.
- Gift notes / order `notes` wiring.

## Phase 4 — Saved baskets
- `SavedFruitBasket` model; `GET/POST/PATCH/DELETE /saved-fruit-baskets` (customer-only JWT).
- Landing: list/load/delete; review: save/update; `?fresh=1` / `?saved=id` on create.

## Phase 5 — Discovery & fulfillment clarity *(this phase)*
- **Homepage**: hero secondary CTA + promo strip → `/fruit-basket`.
- **Orders**: `GET /orders/my-orders` includes `sizeLabel` + `subtotal` on items for UI logic.
- **Customer**: order detail callout + “Basket” badge on packaging line; **Reorder** skips packaging lines and explains rebuilding the basket.
- **Admin**: 🧺 indicator on order list; detail page banner + “Basket packaging” badge on the packaging line.
- **Utils**: `src/utils/fruitBasketOrder.js` — detects packaging lines by `sizeLabel === "Packaging"` and product name shape (`… — basket` / `Fruit basket`), matching server-side cart hydration.

### DB / deploy reminders
- Run Prisma migrations after pulling (including `SavedFruitBasket` and cart packaging columns if not already applied).
