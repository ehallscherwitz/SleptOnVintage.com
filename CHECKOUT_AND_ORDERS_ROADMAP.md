# Checkout, orders, and admin — working roadmap

This document is the **ordered backlog** for Slept On Vintage ecommerce. We tick items off as we ship them. Last aligned: checkout polish + “My orders” + future `/admin`.

---

## Phase 1 — Customer checkout & orders (current focus)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1 | **Checkout UI** — standard layout (header, two-column on desktop: forms left, sticky order summary right), consistent inputs, primary CTA, free shipping line | Done | `checkout.css` + `CheckoutPage` |
| 1.2 | **Post-payment flow** — clear success state, then **navigate to `/orders/:id`** (Supabase order UUID) | Done | Uses `supabaseOrderId` from payment API + `navigate` |
| 1.3 | **My orders** — `/orders` list (date, status, total, item count) | Done | `OrdersPage.tsx` + `orderService` |
| 1.4 | **Order detail** — `/orders/:orderId` — line items, totals, shipping snapshot, tracking when set | Done | `OrderDetailPage.tsx` |
| 1.5 | **Header nav** — “My orders” (or under account menu) for signed-in users | Done | `Header.tsx` account dropdown |
| 1.6 | **Finalize payload** — pass full `customerInfo` into `finalize_order` so `orders.buyer_email` / `shipping_name` are complete | Done | `checkoutService` + `api/payments/create` |
| 1.7 | **Remove or gate dev-only UI** — “Test order creation” only in dev (`import.meta.env.DEV`) | Done | Dev-only Square order test button |

---

## Phase 2 — Shipping & tracking (USPS)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | **Document tracking fields** — `tracking_number`, `tracking_url`, `shipped_at`, `status` values | Pending | Already in `orders` table |
| 2.2 | **Order detail UX** — prominent “Track package” when `tracking_url` or number present; copy tracking number | Pending | |
| 2.3 | **Optional: USPS link helper** — build URL from number if `tracking_url` empty | Pending | e.g. tools.usps.com |

---

## Phase 3 — Admin (`/admin`, option A)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | **Admin gate** — `ADMIN_EMAILS` + JWT + `SUPABASE_SERVICE_ROLE_KEY` server-side (`api/adminAuth.ts`) | Done | Same email must appear in signed-in Google session |
| 3.2 | **Admin orders list** — `GET /api/admin/list-orders`, UI `/admin` (`AdminDashboardPage`) | Done | |
| 3.3 | **Tracking + status** — `PATCH /api/admin/update-order` (+ modal on dashboard) | Done | Status `shipped` sets `shipped_at` |
| 3.4 | **Delete order** — `POST /api/admin/delete-order`: restore `products.available`, delete `orders` | Done | Confirm in UI |
| 3.5 | **Header Admin link** — optional `VITE_ADMIN_EMAILS` to show link only for you | Done | Still need server-side allowlist |
| — | Filters / search admin list | Pending | Nice-to-have |
| — | **Refund / cancel in Square** — Square refund API + sync DB | Pending | Separate from DB delete flow |

---

## Phase 4 — Hardening & growth

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1 | **Email receipts** — order confirmation + shipped with tracking | Pending | Resend / Supabase Edge / etc. |
| 4.2 | **Idempotency** — if payment succeeds but finalize fails, **manual replay** or webhook recovery | Pending | Log + admin tool |
| 4.3 | **Policies / terms / privacy** pages + footer links | Pending | |
| 4.4 | **SEO + OG** for product pages | Pending | |

---

## How we use this doc

1. Work **top to bottom** within a phase unless something blocks you.
2. When a row is done, change **Status** to `Done` in a PR or follow-up edit.
3. If scope changes, add a row rather than rewriting history.

---

## Related files (quick reference)

| Area | Files |
|------|--------|
| Checkout | `sleptonvintage-react/src/pages/CheckoutPage.tsx`, `sleptonvintage-react/src/styles/checkout.css` |
| Orders UI | `sleptonvintage-react/src/pages/OrdersPage.tsx`, `sleptonvintage-react/src/pages/OrderDetailPage.tsx`, `sleptonvintage-react/src/services/orderService.ts` |
| Payment + DB finalize | `sleptonvintage-react/api/payments/create.ts`, `supabase-orders.sql` (`finalize_order`) |
| Routes | `sleptonvintage-react/src/App.tsx` |
| Admin API | `sleptonvintage-react/api/adminAuth.ts`, `api/admin/list-orders.ts`, `update-order.ts`, `delete-order.ts` |
| Admin UI | `sleptonvintage-react/src/pages/AdminDashboardPage.tsx`, `src/services/adminService.ts`, `src/styles/admin.css` |
| Schema | `supabase-manual-schema.sql`, `supabase-orders.sql`, `supabase-migrate-price-to-cents.sql` |
