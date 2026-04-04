# Analytics Endpoints - Postman Testing Guide

## Setup Instructions

### 1. Start Docker Services
```bash
docker-compose up -d
```

The backend will be available at: `http://localhost:3000`

### 2. Get Authentication Token

Before testing analytics endpoints, you need a valid JWT token.

**Login Request:**
- Method: `POST`
- URL: `http://localhost:3000/api/auth/login`
- Headers:
  ```
  Content-Type: application/json
  ```
- Body (raw JSON):
  ```json
  {
    "email": "your-email@example.com",
    "password": "your-password"
  }
  ```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "branch_id": 1
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Copy the `accessToken` value** - you'll use it in all analytics requests.

---

## Endpoint 1: Dashboard Statistics

**Purpose:** Powers the 5 stat cards on web dashboard and mobile home summary.

### Request
- Method: `GET`
- URL: `http://localhost:3000/api/analytics/dashboard-stats`
- Headers:
  ```
  Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
  ```

### Query Parameters (Optional)
- `branch_id` (admin only): Filter by specific branch
  - Example: `http://localhost:3000/api/analytics/dashboard-stats?branch_id=1`

### Expected Response
```json
{
  "nearExpiry": 5,
  "foodWasted": {
    "current": 12.45,
    "change": -15.3
  },
  "foodSaved": {
    "current": 8.75,
    "change": 22.1
  },
  "activeDiscounts": 3,
  "profitFromDiscounts": 145.50
}
```

### Response Fields
- `nearExpiry`: Count of items expiring within 3 days
- `foodWasted.current`: Food wasted this month (kg)
- `foodWasted.change`: Percentage change vs last month
- `foodSaved.current`: Food saved this month (kg)
- `foodSaved.change`: Percentage change vs last month
- `activeDiscounts`: Count of approved generated recipes
- `profitFromDiscounts`: Total revenue from discount sales this month

### Testing Checklist
- [ ] Staff user sees only their branch data
- [ ] Admin without branch_id sees aggregated data
- [ ] Admin with branch_id sees specific branch data
- [ ] All quantities are in kg (not grams)
- [ ] Percentage changes are calculated correctly

---

## Endpoint 2: Monthly Summary

**Purpose:** Powers mobile donut chart and web reports monthly trend bar chart.

### Request
- Method: `GET`
- URL: `http://localhost:3000/api/analytics/monthly-summary`
- Headers:
  ```
  Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
  ```

### Query Parameters
- `months` (optional, default: 6): Number of months to retrieve
  - Example: `http://localhost:3000/api/analytics/monthly-summary?months=12`
- `branch_id` (admin only): Filter by specific branch

### Expected Response
```json
{
  "currentMonth": {
    "wasted": 12.45,
    "saved": 8.75,
    "savedPercentage": 41.3
  },
  "monthlyData": [
    {
      "month": "2025-10",
      "wasted": 15.20,
      "saved": 6.30
    },
    {
      "month": "2025-11",
      "wasted": 13.80,
      "saved": 7.10
    },
    {
      "month": "2025-12",
      "wasted": 14.50,
      "saved": 7.80
    },
    {
      "month": "2026-01",
      "wasted": 12.90,
      "saved": 8.20
    },
    {
      "month": "2026-02",
      "wasted": 11.60,
      "saved": 8.50
    },
    {
      "month": "2026-03",
      "wasted": 12.45,
      "saved": 8.75
    }
  ]
}
```

### Response Fields
- `currentMonth.wasted`: Current month waste (kg)
- `currentMonth.saved`: Current month saved (kg)
- `currentMonth.savedPercentage`: saved / (saved + wasted) * 100
- `monthlyData`: Array of monthly data points
  - Always returns continuous data (fills zeros for missing months)

### Testing Checklist
- [ ] Returns exactly the number of months requested
- [ ] Monthly data is continuous (no gaps)
- [ ] Months with no data show 0 values
- [ ] savedPercentage calculation is correct
- [ ] All quantities are in kg

---

## Endpoint 3: Top Wasted Ingredients

**Purpose:** Powers the web reports pie chart.

### Request
- Method: `GET`
- URL: `http://localhost:3000/api/analytics/top-wasted`
- Headers:
  ```
  Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
  ```

### Query Parameters
- `date_range` (optional, default: last_30_days): Time period
  - Options: `last_30_days`, `last_90_days`, `last_6_months`
- `limit` (optional, default: 5): Number of top items
- `branch_id` (admin only): Filter by specific branch

### Example URLs
```
http://localhost:3000/api/analytics/top-wasted?date_range=last_30_days
http://localhost:3000/api/analytics/top-wasted?date_range=last_90_days&limit=10
http://localhost:3000/api/analytics/top-wasted?date_range=last_6_months&branch_id=1
```

### Expected Response
```json
{
  "totalWaste": 45.67,
  "changePercentage": -12.5,
  "topWasted": [
    {
      "ingredient_id": 5,
      "name": "Tomatoes",
      "quantity_kg": 12.34,
      "percentage": 27.0
    },
    {
      "ingredient_id": 8,
      "name": "Lettuce",
      "quantity_kg": 9.87,
      "percentage": 21.6
    },
    {
      "ingredient_id": 3,
      "name": "Milk",
      "quantity_kg": 8.45,
      "percentage": 18.5
    },
    {
      "ingredient_id": 12,
      "name": "Bread",
      "quantity_kg": 7.23,
      "percentage": 15.8
    },
    {
      "ingredient_id": 15,
      "name": "Cheese",
      "quantity_kg": 7.78,
      "percentage": 17.1
    }
  ]
}
```

### Response Fields
- `totalWaste`: Total waste for the period (kg)
- `changePercentage`: Change vs previous equivalent period
- `topWasted`: Array of top wasted ingredients
  - `quantity_kg`: Amount wasted (kg)
  - `percentage`: Percentage of total waste

### Testing Checklist
- [ ] Returns correct number of items (limit parameter)
- [ ] Items are ordered by quantity descending
- [ ] Percentages add up to ~100% (or less if limited)
- [ ] All date_range options work correctly
- [ ] changePercentage compares with previous period

---

## Endpoint 4: Recent Activity

**Purpose:** Powers the web dashboard recent activity feed.

### Request
- Method: `GET`
- URL: `http://localhost:3000/api/analytics/recent-activity`
- Headers:
  ```
  Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
  ```

### Query Parameters
- `branch_id` (admin only): Filter by specific branch

### Expected Response
```json
{
  "activities": [
    {
      "type": "sale",
      "id": 123,
      "message": "Sale of Margherita Pizza",
      "actor": "John Doe",
      "time_ago": "5 minutes ago"
    },
    {
      "type": "approval",
      "id": 45,
      "message": "Approved recipe: Veggie Wrap",
      "actor": "Jane Smith",
      "time_ago": "2 hours ago"
    },
    {
      "type": "expiry_alert",
      "id": 789,
      "message": "Tomatoes expiring in 2 days",
      "actor": "System",
      "time_ago": "1 day ago"
    }
  ]
}
```

### Response Fields
- `activities`: Array of recent activities (max 10)
  - `type`: Activity type (sale, approval, expiry_alert)
  - `id`: Related entity ID
  - `message`: Human-readable description
  - `actor`: User who performed the action (or "System")
  - `time_ago`: Human-readable time difference

### Testing Checklist
- [ ] Returns max 10 activities
- [ ] Activities are ordered by timestamp descending (newest first)
- [ ] time_ago format is correct (minutes/hours/days)
- [ ] All three activity types appear when available
- [ ] Branch filtering works for admin

---

## Endpoint 5: Nearing Expiry List

**Purpose:** Powers the mobile home nearing expiry section.

### Request
- Method: `GET`
- URL: `http://localhost:3000/api/analytics/nearing-expiry-list`
- Headers:
  ```
  Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
  ```

### Query Parameters
- `branch_id` (admin only): Filter by specific branch

### Expected Response
```json
{
  "nearingExpiry": [
    {
      "ingredient_id": 5,
      "batch_id": 123,
      "name": "Tomatoes",
      "image_url": "https://cloudinary.com/...",
      "quantity_remaining": 2500,
      "unit": "grams",
      "expiry_date": "2026-04-07T00:00:00.000Z",
      "days_left": 3
    },
    {
      "ingredient_id": 8,
      "batch_id": 124,
      "name": "Lettuce",
      "image_url": "https://cloudinary.com/...",
      "quantity_remaining": 1200,
      "unit": "grams",
      "expiry_date": "2026-04-06T00:00:00.000Z",
      "days_left": 2
    },
    {
      "ingredient_id": 12,
      "batch_id": 125,
      "name": "Milk",
      "image_url": "https://cloudinary.com/...",
      "quantity_remaining": 3000,
      "unit": "milliliters",
      "expiry_date": "2026-04-05T00:00:00.000Z",
      "days_left": 1
    }
  ]
}
```

### Response Fields
- `nearingExpiry`: Array of items expiring within 3 days (max 5)
  - `ingredient_id`: Stock ingredient ID
  - `batch_id`: Specific batch ID
  - `name`: Ingredient name
  - `image_url`: Ingredient image
  - `quantity_remaining`: Amount left (in base unit)
  - `unit`: Unit name
  - `expiry_date`: ISO date string
  - `days_left`: Days until expiry (0-3)

### Testing Checklist
- [ ] Returns max 5 items
- [ ] Only includes items with days_left <= 3
- [ ] Only includes non-depleted batches
- [ ] Items are ordered by expiry_date ascending (soonest first)
- [ ] Excludes already expired items (days_left >= 0)

---

## Common Testing Scenarios

### 1. Test as Staff User
Staff users should only see data for their assigned branch.

**Steps:**
1. Login with a staff account (role: 'staff')
2. Test all 5 endpoints
3. Verify all responses contain only data from user's branch_id

### 2. Test as Admin User (No Branch Filter)
Admin users without branch_id parameter should see aggregated data.

**Steps:**
1. Login with an admin account (role: 'admin')
2. Test all 5 endpoints WITHOUT branch_id parameter
3. Verify responses contain data from all branches

### 3. Test as Admin User (With Branch Filter)
Admin users can filter by specific branch.

**Steps:**
1. Login with an admin account
2. Test all 5 endpoints WITH `?branch_id=1` parameter
3. Verify responses contain only data from branch 1

### 4. Test Error Handling

**No Token:**
- Remove Authorization header
- Expected: 401 Unauthorized

**Invalid Token:**
- Use Authorization: `Bearer invalid_token_here`
- Expected: 401 Unauthorized

**Expired Token:**
- Use an expired token
- Expected: 401 Token expired

---

## Postman Collection Setup

### Create Environment Variables
1. In Postman, create a new environment called "KitchenPal Local"
2. Add these variables:
   - `base_url`: `http://localhost:3000`
   - `access_token`: (leave empty, will be set after login)
   - `branch_id`: `1` (for testing)

### Auto-Set Token After Login
In your login request, add this to the "Tests" tab:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("access_token", response.accessToken);
}
```

### Use Variables in Requests
- URL: `{{base_url}}/api/analytics/dashboard-stats`
- Authorization: `Bearer {{access_token}}`
- Query params: `?branch_id={{branch_id}}`

---

## Troubleshooting

### Backend Not Running
```bash
# Check Docker containers
docker ps

# View backend logs
docker logs kitchenpal_backend

# Restart backend
docker-compose restart backend
```

### Database Connection Issues
```bash
# Check database is running
docker ps | grep postgres

# Access database
docker exec -it kitchenpal_db psql -U postgres -d kitchenpal

# Check tables exist
\dt
```

### No Data Returned
If endpoints return empty arrays or zero values, you may need to seed test data:
- Add waste logs
- Add sales with generated recipes
- Add ingredient batches with near expiry dates
- Add notifications

### CORS Issues
If testing from a browser-based tool, ensure the backend CORS settings allow your origin.

---

## Quick Test Checklist

- [ ] Backend is running (`docker ps`)
- [ ] Successfully logged in and got access token
- [ ] Endpoint 1: Dashboard stats returns all 5 metrics
- [ ] Endpoint 2: Monthly summary returns correct number of months
- [ ] Endpoint 3: Top wasted returns limited items with percentages
- [ ] Endpoint 4: Recent activity returns up to 10 activities
- [ ] Endpoint 5: Nearing expiry returns up to 5 items
- [ ] Staff user sees only their branch data
- [ ] Admin sees aggregated or filtered data correctly
- [ ] All quantities are in kg where specified
- [ ] All timestamps have human-readable time_ago

---

## Notes

- All analytics endpoints require authentication
- The `logged_at` column is used in waste_logs table for timestamps
- All base unit quantities (grams/ml) are converted to kg in responses where specified
- Percentage changes compare current period with equivalent previous period
- Branch filtering is automatic for staff, optional for admin
