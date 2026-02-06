# Inventory Page Setup Guide

## Overview

This guide explains how the ingredient data flows from the database to the inventory page in the KitchenPal admin application.

## Architecture

### Backend (Node.js/Express)

1. **Database Schema** (`complete_schema.sql`)
   - Table: `ingredients`
   - Key fields: `ingredient_id`, `name`, `quantity_in_stock`, `unit_id`, `expiry_date`, `storage_type_id`, `cost_per_unit`, etc.
2. **Model** (`backend/src/models/Ingredient.js`)
   - `getAllByBranch(branch_id)` - Fetches all ingredients for a specific branch
   - Joins with `units` and `storage_types` tables
   - Maps database fields to API response format
   - Converts: `quantity_in_stock` → `quantity`, `cost_per_unit` → `price`

3. **Controller** (`backend/src/controllers/ingredientController.js`)
   - `getAllIngredients(req, res)` - Endpoint handler
   - Extracts `branch_id` from request parameters
   - Returns JSON: `{ ingredients: [...] }`

4. **Routes** (`backend/src/routes/ingredientRoutes.js`)
   - `GET /api/ingredients/branch/:branch_id` - Protected by authentication
   - Requires valid JWT token

### Frontend (Angular)

1. **Service** (`KitchenPal-admin/src/app/core/services/ingredient.service.ts`)
   - `getIngredientsByBranch(branchId: number)` - HTTP GET request
   - Endpoint: `http://localhost:3000/api/ingredients/branch/:branchId`
   - Returns `Observable<IngredientResponse[]>`

2. **Component** (`KitchenPal-admin/src/app/features/inventory/inventory.component.ts`)
   - `ngOnInit()` → `loadIngredients()`
   - Subscribes to service method
   - Maps backend data to UI model
   - Calculates status (OK, Near expiry, Expired) based on expiry date
   - Adds emoji icons based on ingredient name

3. **Template** (`inventory.component.html`)
   - Displays ingredients in a table using `*ngFor="let item of filteredIngredients"`
   - Shows: name, quantity, unit, storage type, dates, cost, status
   - Provides view/edit/delete actions via modals

## Setup Steps

### 1. Insert Sample Data

Run the sample data script to populate the database:

```bash
# Connect to PostgreSQL
psql -U postgres -d kitchenpal

# Run the sample data script
\i sample_ingredients.sql
```

Or using Docker:

```bash
docker exec -i kitchenpal_new-db-1 psql -U postgres -d kitchenpal < sample_ingredients.sql
```

### 2. Start the Backend

```bash
cd backend
npm install
npm start
```

Backend should be running on `http://localhost:3000`

### 3. Start the Frontend

```bash
cd KitchenPal-admin
npm install
ng serve
```

Frontend should be running on `http://localhost:4200`

### 4. Login and Access

1. Navigate to `http://localhost:4200`
2. Login with your credentials
3. Navigate to the Inventory page

## Data Flow

```
Database (PostgreSQL)
    ↓
Ingredient Model (maps DB fields)
    ↓
Ingredient Controller (handles request)
    ↓
API Route (/api/ingredients/branch/:branch_id)
    ↓
Angular HTTP Service (makes request)
    ↓
Inventory Component (processes & displays)
    ↓
Template (renders table)
```

## Field Mappings

### Database → Backend API

| Database Field      | API Response Field |
| ------------------- | ------------------ |
| `ingredient_id`     | `ingredient_id`    |
| `name`              | `name`             |
| `quantity_in_stock` | `quantity`         |
| `cost_per_unit`     | `price`            |
| `expiry_date`       | `expiry_date`      |
| `manufacture_date`  | `manufacture_date` |
| `unit_id`           | `unit.code`        |
| `storage_type_id`   | `storageType.name` |

### Backend API → Frontend UI

| API Field          | UI Field      |
| ------------------ | ------------- |
| `ingredient_id`    | `id`          |
| `name`             | `name`        |
| `quantity`         | `quantity`    |
| `price`            | `cost`        |
| `expiry_date`      | `expiryDate`  |
| `unit.code`        | `unit`        |
| `storageType.name` | `location`    |
| `added_at`         | `lastScanned` |

## Troubleshooting

### No Data Showing

1. Check browser console for errors
2. Verify backend is running: `http://localhost:3000/api/health`
3. Check if you're logged in (JWT token required)
4. Verify database has data: `SELECT * FROM ingredients WHERE branch_id = 1;`
5. Check network tab for API call to `/api/ingredients/branch/1`

### Authentication Errors

- Ensure you're logged in
- Check if JWT token is being sent in request headers
- Verify auth interceptor is working

### CORS Errors

- Check backend CORS configuration in `server.js`
- Ensure frontend URL is allowed

## Testing

You can test the API endpoint directly:

```bash
# Get a JWT token first (login)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Use the token to fetch ingredients
curl http://localhost:3000/api/ingredients/branch/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Next Steps

- [ ] Verify data is displaying correctly
- [ ] Test search functionality
- [ ] Test view modal
- [ ] Test edit modal
- [ ] Test delete functionality
- [ ] Add more sample data if needed
- [ ] Implement filter functionality
- [ ] Implement export functionality
