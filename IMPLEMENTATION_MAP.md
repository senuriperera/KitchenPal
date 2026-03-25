# KitchenPal — Implementation Map (code-grounded)

Generated: 2026-03-25

This document maps **what’s actually implemented in this repo**:

- Backend: Express routes under `backend/src/routes/*` mounted at `/api` (see `backend/src/routes/index.js`)
- Clients:
  - Angular admin: `KitchenPal-admin/src/app/core/services/*`
  - Flutter mobile: `KitchenPal-Mobile/lib/services/*` (plus key pages)
- Side effects: Socket.IO events + nightly cron job

If you find a mismatch between UI expectations and backend behavior, check **“Mismatches / Drift”** near the end.

---

## Base URLs & Auth

### Angular admin env

- Base REST: `KitchenPal-admin/src/environments/environment.ts` → `apiUrl = http://localhost:3000/api`
- WebSocket: `wsUrl = http://localhost:3000`
- Production env is a placeholder in `KitchenPal-admin/src/environments/environment.prod.ts`.

### Authentication (backend)

Routes: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/refresh`, `GET /api/auth/me`.

- Angular admin calls:
  - `POST /api/auth/login` (stores `accessToken`, `refreshToken`, `currentUser` in `localStorage`)
  - `POST /api/auth/logout`
  - `POST /api/auth/refresh` on `401` via interceptor
- Angular interceptor: `KitchenPal-admin/src/app/core/interceptors/auth.interceptor.ts`
  - Adds `Authorization: Bearer <accessToken>` for most requests
  - Retries once after refresh if the original request returns `401`

Backend auth middleware: `backend/src/middleware/auth.js` (JWT + session check; exact logic is in code).

---

## Backend Route Map (mounted at `/api`)

### Health

- `GET /api/health` → `{ status: 'OK', timestamp }`

### Common lookups + branches

Routes: `backend/src/routes/commonRoutes.js`

- `GET /api/common/units` (auth)
- `GET /api/common/storage-types` (auth)

Branch admin (auth + admin role):

- `GET /api/common/branches`
- `GET /api/common/branches/:id`
- `POST /api/common/branches`
- `PUT /api/common/branches/:id`
- `DELETE /api/common/branches/:id`

Angular admin uses:

- `BranchService` → `/api/common/branches*`
- `IngredientService.getUnits()` → `/api/common/units`
- `IngredientService.getStorageTypes()` → `/api/common/storage-types`

### Master ingredients

Routes: `backend/src/routes/masterIngredientRoutes.js`

- `GET /api/master-ingredients/search?q=<term>&limit=<n>` (auth)
- `GET /api/master-ingredients` (auth)
- `GET /api/master-ingredients/:id` (auth)
- `POST /api/master-ingredients` (auth) body `{ name, default_unit_id?, is_custom? }`
- `POST /api/master-ingredients/find-or-create` (auth) body `{ name, default_unit_id? }` (controller also accepts `unit_id`)
- `PUT /api/master-ingredients/:id` (auth)
- `DELETE /api/master-ingredients/:id` (auth)

Angular admin uses:

- `MasterIngredientService.search()` → `/search`
- `MasterIngredientService.findOrCreate(name, unitId)` → posts `{ name, unit_id }` (supported by controller)

### Ingredients / inventory

Routes: `backend/src/routes/ingredientRoutes.js`

- `POST /api/ingredients/scan` (auth) body `{ imageUrl }` → OCR service result
- `GET /api/ingredients/expiring?days=<n>` (auth) → expiring ingredients list (stock-level)
- `GET /api/ingredients/existing?master_ingredient_id=<id>` (auth) → used for restock autofill

Main:

- `GET /api/ingredients` (auth) → inventory list for the **branch derived from JWT**
- `GET /api/ingredients/:ingredient_id` (auth) → ingredient + batch details
- `POST /api/ingredients` (auth) → create/restock via transaction (updates `stock_ingredients`, inserts `ingredient_batches`)
- `DELETE /api/ingredients/:ingredient_id` (auth)

Clients:

- Flutter mobile uses these endpoints directly (see services/pages in the mobile app).
- Angular admin:
  - `IngredientService.getAllIngredients()` → `GET /api/ingredients`
  - `IngredientService.updateIngredient(id, ...)` → `PUT /api/ingredients/:id` (NOTE: backend does **not** expose `PUT` in `ingredientRoutes.js`)
  - `IngredientService.getIngredientsByBranch(branchId)` → `GET /api/ingredients/branch/:branchId` (NOTE: backend does **not** expose this route)
  - Inventory UI also calls `POST /api/ingredients/scan` directly via `fetch()`.

### Notifications

Routes: `backend/src/routes/notificationRoutes.js`

- `GET /api/notifications` (auth) → **mobile-focused**: unread `expiry_alert` notifications for logged-in user (batch-aware join)
- Branch/general management:
  - `GET /api/notifications/branch/:branch_id`
  - `GET /api/notifications/:id`
  - `POST /api/notifications`
  - `POST /api/notifications/branch/:branch_id/auto-create`
  - `PUT /api/notifications/:id/resolve`
  - `PATCH /api/notifications/:id/acknowledge`
  - `DELETE /api/notifications/:id`

### Recipes

Routes: `backend/src/routes/recipeRoutes.js`

- `GET /api/recipes` (public)
- `GET /api/recipes/:id` (public)
- `POST /api/recipes` (auth)
- `PUT /api/recipes/:id` (auth)
- `DELETE /api/recipes/:id` (auth)
- `POST /api/recipes/generate` (auth) → Jaccard-based suggestions from `selected_items[]` (does not persist)

Angular admin uses:

- `RecipeService` → CRUD against `/api/recipes*`
- Recipe image uploads via backend `UploadService` (below)
- Listens to recipe WS events: `recipe:created`, `recipe:updated`, `recipe:deleted`

### Generated recipes (discount approval)

Routes: `backend/src/routes/generatedRecipeRoutes.js`

- Staff:
  - `POST /api/generated-recipes` (auth) → create pending generated recipe + admin notification + websocket emit
  - `GET /api/generated-recipes` (auth) → list generated recipes for staff branch
- Admin:
  - `GET /api/generated-recipes/pending` (auth + admin)
  - `GET /api/generated-recipes/recently-approved` (auth + admin)
  - `PUT /api/generated-recipes/:id/approve` (auth + admin) body `{ final_discount_percent, final_discount_price }`
  - `PUT /api/generated-recipes/:id/reject` (auth + admin) body `{ admin_note }`
- Shared:
  - `GET /api/generated-recipes/:id/ingredients` (auth)

Angular admin uses `GeneratedRecipeService` for the admin endpoints above and listens for websocket `recipe:pending`.

### Upload

Routes: `backend/src/routes/uploadRoutes.js`

- `POST /api/upload/image` (auth, multipart `image`) → uploads to Cloudinary, returns `{ imageUrl, publicId, ... }`
- `POST /api/upload/images` (auth, multipart `images[]`) → up to 5 files
- `DELETE /api/upload/image` (auth) body `{ imageUrl }`

Clients:

- Angular recipes page uses backend upload via `UploadService.uploadImage(file)`.
- Flutter add-ingredient flow uploads directly to Cloudinary (separate from backend upload routes).
- Angular inventory page uploads directly to Cloudinary (unsigned) too.

### Sales

Routes: `backend/src/routes/saleRoutes.js`

- `GET /api/sales/branch/:branch_id`
- `GET /api/sales/branch/:branch_id/statistics`
- `GET /api/sales/:id`
- `POST /api/sales` body `{ branch_id, recipe_id, quantity_sold }`
- `DELETE /api/sales/:id`

Important: current sales deduction logic is flagged as **legacy/mismatched** versus the newer stock/batch schema (see “Mismatches / Drift”).

### Suggestions (legacy)

Mounted at `/api/suggestions` (`backend/src/routes/recipeSuggestionRoutes.js`). This is an older pipeline that co-exists with the newer `/api/recipes/generate` + `/api/generated-recipes` workflow.

---

## WebSocket (Socket.IO) events

Backend server sets up Socket.IO in `backend/src/server.js`.

Observed event names used by clients:

- Recipes CRUD (admin listens):
  - `recipe:created`, `recipe:updated`, `recipe:deleted`
- Generated recipe pending approval (admin listens):
  - `recipe:pending`
- Inventory change (mobile listens):
  - `inventory:changed` (mobile’s `WebSocketService` subscribes to this)

---

## Cron job: expiry notifications

Backend cron: `backend/src/cron/expiryNotificationsJob.js` scheduled from `backend/src/server.js`.

- Runs daily at midnight.
- Scans `ingredient_batches` expiring within the threshold.
- Inserts `expiry_alert` notifications for users in the branch (staff/branch_manager) if not already created for that day.

---

## Angular Admin → Backend Contract Summary

### Login screen

- `POST /api/auth/login` → saves tokens + `currentUser` (role/branch_id)

### Recipes screen

- `GET /api/recipes` (list)
- `POST /api/recipes` (create)
- `PUT /api/recipes/:id` (update)
- `DELETE /api/recipes/:id` (delete)
- `GET /api/common/units` (unit dropdown)
- `GET /api/master-ingredients/search?q=`
- `POST /api/master-ingredients/find-or-create` (new ingredient creation)
- `POST /api/upload/image` (recipe image upload)
- WebSocket: listens to `recipe:created|updated|deleted`

### Discount approvals screen

- `GET /api/generated-recipes/pending`
- `GET /api/generated-recipes/recently-approved`
- `GET /api/generated-recipes/:id/ingredients`
- `PUT /api/generated-recipes/:id/approve`
- `PUT /api/generated-recipes/:id/reject`
- WebSocket: listens to `recipe:pending`

### User management screen

- `GET /api/users` (admin + branch_manager)
- `POST /api/users` (admin)
- `DELETE /api/users/:id` (admin)
- `GET /api/common/branches` (admin)
- `POST /api/common/branches` (admin)
- `DELETE /api/common/branches/:id` (admin)

### Inventory screen

Implemented calls (current code):

- `GET /api/common/storage-types`
- `GET /api/common/units`
- `POST /api/ingredients/scan` (OCR)
- `GET /api/ingredients/branch/1` (hardcoded) — **backend route does not exist**
- `PUT /api/ingredients/:id` — **backend route does not exist**

Also: inventory screen uploads images directly to Cloudinary using an unsigned preset (not via `/api/upload`).

---

## Mismatches / Drift (important)

These are cases where code suggests two competing implementations or client↔server contracts don’t align.

1. Admin Inventory uses missing endpoints

- Admin calls `GET /api/ingredients/branch/:branchId` and `PUT /api/ingredients/:id`.
- Backend currently only supports `GET /api/ingredients` (branch inferred from JWT), `GET /api/ingredients/:ingredient_id`, `POST /api/ingredients`, `DELETE /api/ingredients/:ingredient_id`.

2. Expiry notifications: stock-level vs batch-level

- Backend `/api/notifications` is batch-aware and returns unread expiry alerts.
- Flutter notifications UI currently uses `/api/ingredients/expiring` (stock-level), not `/api/notifications`.

3. Two recipe suggestion pipelines coexist

- “New” flow: `POST /api/recipes/generate` + `POST /api/generated-recipes` (approval workflow)
- “Legacy” flow: `/api/suggestions/*` (older tables/logic still present)

4. Sales deduction logic appears legacy

- Backend sales routes exist, but the current deduction implementation was identified as not aligned with the newer `stock_ingredients` + `ingredient_batches` model (see earlier code archaeology notes).

---

## Notes

- This map intentionally prefers **what the code does** over what earlier handoff docs claim.
- If you want, I can also generate a compact “OpenAPI-ish” table (endpoint, auth, request, response, callers) from this same source data.
