# KitchenPal API Testing Guide

Complete guide for testing all API endpoints using PowerShell/curl.

## Prerequisites

```powershell
# Set base URL
$BASE_URL = "http://localhost:3000/api"
```

## 1. Health Check

```powershell
curl http://localhost:3000/api/health
```

## 2. Authentication

### Register User

```powershell
curl -X POST "$BASE_URL/auth/register" `
  -H "Content-Type: application/json" `
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "user"
  }'
```

### Login

```powershell
curl -X POST "$BASE_URL/auth/login" `
  -H "Content-Type: application/json" `
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Save the token from response:**

```powershell
$TOKEN = "your-jwt-token-here"
```

### Get Current User

```powershell
curl -X GET "$BASE_URL/auth/me" `
  -H "Authorization: Bearer $TOKEN"
```

### Logout

```powershell
curl -X POST "$BASE_URL/auth/logout" `
  -H "Authorization: Bearer $TOKEN"
```

## 3. Common Data

### Get All Units

```powershell
curl -X GET "$BASE_URL/common/units" `
  -H "Authorization: Bearer $TOKEN"
```

### Get All Storage Types

```powershell
curl -X GET "$BASE_URL/common/storage-types" `
  -H "Authorization: Bearer $TOKEN"
```

## 4. Ingredients

### Create Ingredient

```powershell
curl -X POST "$BASE_URL/ingredients" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "branch_id": 1,
    "name": "Fresh Milk",
    "quantity": 20,
    "unit_id": 3,
    "price": 5.99,
    "expiry_date": "2025-12-05",
    "manufacture_date": "2025-11-26",
    "storage_type_id": 1,
    "image_url": "/uploads/milk.jpg"
  }'
```

### Get All Ingredients for Branch

```powershell
curl -X GET "$BASE_URL/ingredients/branch/1" `
  -H "Authorization: Bearer $TOKEN"
```

### Get Ingredient by ID

```powershell
curl -X GET "$BASE_URL/ingredients/1" `
  -H "Authorization: Bearer $TOKEN"
```

### Get Expiring Ingredients

```powershell
curl -X GET "$BASE_URL/ingredients/branch/1/expiring?days=7" `
  -H "Authorization: Bearer $TOKEN"
```

### Get Monthly Statistics

```powershell
curl -X GET "$BASE_URL/ingredients/branch/1/stats?year=2025&month=11" `
  -H "Authorization: Bearer $TOKEN"
```

### Update Ingredient

```powershell
curl -X PUT "$BASE_URL/ingredients/1" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "quantity": 15,
    "price": 6.99
  }'
```

### Delete Ingredient

```powershell
curl -X DELETE "$BASE_URL/ingredients/1" `
  -H "Authorization: Bearer $TOKEN"
```

## 5. Recipes

### Create Recipe

```powershell
curl -X POST "$BASE_URL/recipes" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "branch_id": 1,
    "name": "Vanilla Latte",
    "cooking_time_minutes": 5,
    "description": "Classic vanilla latte with steamed milk",
    "base_price": 4.50,
    "is_generated": false,
    "image_url": "/uploads/vanilla-latte.jpg",
    "ingredients": [
      {
        "ingredient_id": 1,
        "quantity_required": 0.25,
        "unit_id": 3
      },
      {
        "ingredient_id": 2,
        "quantity_required": 30,
        "unit_id": 4
      }
    ],
    "steps": [
      "Brew espresso",
      "Steam milk to 150°F",
      "Add vanilla syrup",
      "Combine and serve"
    ]
  }'
```

### Get All Recipes

```powershell
# All recipes
curl -X GET "$BASE_URL/recipes/branch/1" `
  -H "Authorization: Bearer $TOKEN"

# Only standard recipes
curl -X GET "$BASE_URL/recipes/branch/1?is_generated=false" `
  -H "Authorization: Bearer $TOKEN"

# Only generated recipes
curl -X GET "$BASE_URL/recipes/branch/1?is_generated=true" `
  -H "Authorization: Bearer $TOKEN"
```

### Get Recipe by ID

```powershell
curl -X GET "$BASE_URL/recipes/1" `
  -H "Authorization: Bearer $TOKEN"
```

### Find Matching Recipes

```powershell
curl -X POST "$BASE_URL/recipes/branch/1/matching" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "ingredient_ids": [1, 2, 3]
  }'
```

### Update Recipe

```powershell
curl -X PUT "$BASE_URL/recipes/1" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "base_price": 5.00,
    "description": "Updated description"
  }'
```

### Delete Recipe

```powershell
curl -X DELETE "$BASE_URL/recipes/1" `
  -H "Authorization: Bearer $TOKEN"
```

## 6. Notifications

### Create Notification

```powershell
curl -X POST "$BASE_URL/notifications" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "branch_id": 1,
    "ingredient_id": 1,
    "type": "EXPIRING_SOON",
    "message": "Milk is expiring in 3 days",
    "expiry_date": "2025-12-05"
  }'
```

### Auto-Create Expiry Notifications

```powershell
curl -X POST "$BASE_URL/notifications/branch/1/auto-create" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "days": 7
  }'
```

### Get All Notifications

```powershell
# Unresolved notifications
curl -X GET "$BASE_URL/notifications/branch/1?is_resolved=false" `
  -H "Authorization: Bearer $TOKEN"

# Resolved notifications
curl -X GET "$BASE_URL/notifications/branch/1?is_resolved=true" `
  -H "Authorization: Bearer $TOKEN"
```

### Get Notification by ID

```powershell
curl -X GET "$BASE_URL/notifications/1" `
  -H "Authorization: Bearer $TOKEN"
```

### Resolve Notification

```powershell
curl -X PUT "$BASE_URL/notifications/1/resolve" `
  -H "Authorization: Bearer $TOKEN"
```

### Delete Notification

```powershell
curl -X DELETE "$BASE_URL/notifications/1" `
  -H "Authorization: Bearer $TOKEN"
```

## 7. Recipe Suggestions

### Generate Recipe Suggestion

```powershell
curl -X POST "$BASE_URL/suggestions/generate" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "branch_id": 1,
    "ingredient_ids": [1, 2, 3],
    "notification_id": 1
  }'
```

### Get All Suggestions

```powershell
# All suggestions
curl -X GET "$BASE_URL/suggestions/branch/1" `
  -H "Authorization: Bearer $TOKEN"

# Pending suggestions
curl -X GET "$BASE_URL/suggestions/branch/1?status=pending" `
  -H "Authorization: Bearer $TOKEN"

# Approved suggestions
curl -X GET "$BASE_URL/suggestions/branch/1?status=approved" `
  -H "Authorization: Bearer $TOKEN"
```

### Get Suggestion by ID

```powershell
curl -X GET "$BASE_URL/suggestions/1" `
  -H "Authorization: Bearer $TOKEN"
```

### Approve Suggestion (Admin Only)

```powershell
curl -X PUT "$BASE_URL/suggestions/1/approve" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "admin_discount_percentage": 30,
    "admin_notes": "Approved with 30% discount"
  }'
```

### Reject Suggestion (Admin Only)

```powershell
curl -X PUT "$BASE_URL/suggestions/1/reject" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "rejection_reason": "Discount too high for current inventory"
  }'
```

### Update Suggestion Discount (Admin Only)

```powershell
curl -X PUT "$BASE_URL/suggestions/1/discount" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "discount_percentage": 25
  }'
```

### Delete Suggestion

```powershell
curl -X DELETE "$BASE_URL/suggestions/1" `
  -H "Authorization: Bearer $TOKEN"
```

## 8. Sales

### Create Sale

```powershell
curl -X POST "$BASE_URL/sales" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "branch_id": 1,
    "recipe_id": 1,
    "discount_id": 1,
    "quantity_sold": 2,
    "notes": "Customer order #1234"
  }'
```

### Get All Sales

```powershell
# All sales
curl -X GET "$BASE_URL/sales/branch/1" `
  -H "Authorization: Bearer $TOKEN"

# Only generated recipe sales
curl -X GET "$BASE_URL/sales/branch/1?recipe_type=generated" `
  -H "Authorization: Bearer $TOKEN"

# Sales by date range
curl -X GET "$BASE_URL/sales/branch/1?start_date=2025-11-01&end_date=2025-11-30" `
  -H "Authorization: Bearer $TOKEN"
```

### Get Sale by ID

```powershell
curl -X GET "$BASE_URL/sales/1" `
  -H "Authorization: Bearer $TOKEN"
```

### Get Sales Statistics

```powershell
curl -X GET "$BASE_URL/sales/branch/1/statistics?start_date=2025-11-01&end_date=2025-11-30" `
  -H "Authorization: Bearer $TOKEN"
```

### Delete Sale

```powershell
curl -X DELETE "$BASE_URL/sales/1" `
  -H "Authorization: Bearer $TOKEN"
```

## 9. Complete Workflow Example

```powershell
# 1. Register and Login
$registerResponse = curl -X POST "$BASE_URL/auth/register" `
  -H "Content-Type: application/json" `
  -d '{"name":"Admin User","email":"admin@kitchenpal.com","password":"admin123","role":"admin"}' | ConvertFrom-Json

$loginResponse = curl -X POST "$BASE_URL/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@kitchenpal.com","password":"admin123"}' | ConvertFrom-Json

$TOKEN = $loginResponse.token

# 2. Create ingredients that will expire soon
curl -X POST "$BASE_URL/ingredients" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "branch_id": 1,
    "name": "Milk",
    "quantity": 10,
    "unit_id": 3,
    "price": 5.99,
    "expiry_date": "2025-11-28",
    "manufacture_date": "2025-11-20",
    "storage_type_id": 1
  }'

# 3. Auto-create notifications for expiring items
curl -X POST "$BASE_URL/notifications/branch/1/auto-create" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"days": 7}'

# 4. Generate recipe suggestion
curl -X POST "$BASE_URL/suggestions/generate" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "branch_id": 1,
    "ingredient_ids": [1],
    "notification_id": 1
  }'

# 5. Admin approves suggestion
curl -X PUT "$BASE_URL/suggestions/1/approve" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "admin_discount_percentage": 30,
    "admin_notes": "Approved"
  }'

# 6. Create sale (inventory auto-deducted)
curl -X POST "$BASE_URL/sales" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "branch_id": 1,
    "recipe_id": 1,
    "discount_id": 1,
    "quantity_sold": 2
  }'

# 7. Check monthly statistics
curl -X GET "$BASE_URL/ingredients/branch/1/stats" `
  -H "Authorization: Bearer $TOKEN"
```

## 10. Testing with Postman

1. Import the following as a Postman Collection
2. Set environment variable `BASE_URL` = `http://localhost:3000/api`
3. Set environment variable `TOKEN` after login
4. Use `{{BASE_URL}}` and `{{TOKEN}}` in requests

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message",
  "details": [] // Optional validation errors
}
```

Common HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error
