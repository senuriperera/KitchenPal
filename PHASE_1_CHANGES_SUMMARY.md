# Phase 1 Changes — Backend Quantity Conversion Fix

## Overview
Fixed all analytics endpoints to properly handle quantity conversion across different unit families (weight, volume, count) instead of blindly dividing by 1000.

## Changes Made

### 1. New Helper Module: `backend/src/utils/quantityConverter.js`

Created a utility module with three functions:

#### `convertToDisplay(baseQty, unitFamily)`
Converts base quantity to appropriate display unit:
- **Weight**: g → kg (if >= 1000g)
- **Volume**: ml → L (if >= 1000ml)
- **Count**: units (no conversion)

Returns: `{ value, unit, display }`

Example:
```javascript
convertToDisplay(2500, 'weight') 
// Returns: { value: 2.5, unit: 'kg', display: '2.5 kg' }

convertToDisplay(500, 'weight')
// Returns: { value: 500, unit: 'g', display: '500 g' }

convertToDisplay(1500, 'volume')
// Returns: { value: 1.5, unit: 'L', display: '1.5 L' }
```

#### `buildFamilyTotals(rows)`
Aggregates query results by unit family:
```javascript
buildFamilyTotals(rows)
// Returns: { weight: 2500, volume: 1500, count: 8 }
```

#### `convertFamilyTotals(familyTotals)`
Converts all families to display format:
```javascript
convertFamilyTotals({ weight: 2500, volume: 1500, count: 8 })
// Returns: {
//   weight: { value: 2.5, unit: 'kg', display: '2.5 kg' },
//   volume: { value: 1.5, unit: 'L', display: '1.5 L' },
//   count: { value: 8, unit: 'units', display: '8 units' }
// }
```

---

### 2. Updated Endpoint 1: `GET /api/analytics/dashboard-stats`

#### Changes:
- ✅ Queries now GROUP BY unit_family
- ✅ Joins with units table to get unit_family
- ✅ Processes results by family
- ✅ Returns separate metrics for weight, volume, count

#### New Response Structure:
```json
{
  "nearExpiry": 1,
  "foodWasted": {
    "weight": { "value": 2.5, "unit": "kg", "display": "2.5 kg" },
    "volume": { "value": 1.2, "unit": "L", "display": "1.2 L" },
    "count": { "value": 8, "unit": "units", "display": "8 units" },
    "changePercent": -15.3
  },
  "foodSaved": {
    "weight": { "value": 12.0, "unit": "kg", "display": "12.0 kg" },
    "volume": { "value": 8.5, "unit": "L", "display": "8.5 L" },
    "count": { "value": 24, "unit": "units", "display": "24 units" },
    "changePercent": 22.1
  },
  "savedPercentage": 75,
  "activeDiscounts": 5,
  "profitFromDiscounts": {
    "current": 145.50,
    "changePercent": 22.0
  }
}
```

#### SQL Changes:
```sql
-- Old: Single SUM query
SELECT COALESCE(SUM(wl.quantity_wasted), 0) as total_wasted

-- New: GROUP BY unit_family
SELECT 
  u.unit_family,
  u.base_unit_code,
  COALESCE(SUM(wl.quantity_wasted), 0) AS total_wasted
FROM waste_logs wl
JOIN stock_ingredients si ON wl.ingredient_id = si.ingredient_id
JOIN units u ON si.base_unit_id = u.unit_id
WHERE DATE_TRUNC('month', wl.logged_at) = DATE_TRUNC('month', NOW())
GROUP BY u.unit_family, u.base_unit_code
```

---

### 3. Updated Endpoint 2: `GET /api/analytics/monthly-summary`

#### Changes:
- ✅ Queries now GROUP BY month AND unit_family
- ✅ Merges results by month in JavaScript
- ✅ Returns separate metrics for each family per month

#### New Response Structure:
```json
{
  "currentMonth": {
    "wasted": {
      "weight": { "value": 1.5, "unit": "kg", "display": "1.5 kg" },
      "volume": { "value": 1.2, "unit": "L", "display": "1.2 L" },
      "count": { "value": 8, "unit": "units", "display": "8 units" }
    },
    "saved": {
      "weight": { "value": 12.0, "unit": "kg", "display": "12.0 kg" },
      "volume": { "value": 8.5, "unit": "L", "display": "8.5 L" },
      "count": { "value": 24, "unit": "units", "display": "24 units" }
    },
    "savedPercentage": 75
  },
  "monthlyData": [
    {
      "month": "2025-10",
      "wasted": {
        "weight": { "value": 2.1, "unit": "kg", "display": "2.1 kg" },
        "volume": { "value": 0.8, "unit": "L", "display": "0.8 L" },
        "count": { "value": 5, "unit": "units", "display": "5 units" }
      },
      "saved": {
        "weight": { "value": 8.0, "unit": "kg", "display": "8.0 kg" },
        "volume": { "value": 4.2, "unit": "L", "display": "4.2 L" },
        "count": { "value": 12, "unit": "units", "display": "12 units" }
      }
    }
  ]
}
```

#### SQL Changes:
```sql
-- Old: Single GROUP BY month
SELECT DATE_TRUNC('month', wl.logged_at) as month,
       COALESCE(SUM(wl.quantity_wasted), 0) as total_wasted

-- New: GROUP BY month AND unit_family
SELECT 
  DATE_TRUNC('month', wl.logged_at) as month,
  u.unit_family,
  COALESCE(SUM(wl.quantity_wasted), 0) AS total_wasted
FROM waste_logs wl
JOIN stock_ingredients si ON wl.ingredient_id = si.ingredient_id
JOIN units u ON si.base_unit_id = u.unit_id
WHERE wl.logged_at >= NOW() - INTERVAL '[months] months'
GROUP BY DATE_TRUNC('month', wl.logged_at), u.unit_family
ORDER BY month ASC
```

---

### 4. Updated Endpoint 3: `GET /api/analytics/top-wasted`

#### Changes:
- ✅ Query now includes unit_family and base_unit_code
- ✅ Calculates percentage within each family (not across families)
- ✅ Returns quantity with proper unit conversion

#### New Response Structure:
```json
{
  "totalWaste": {
    "weight": { "value": 12.5, "unit": "kg", "display": "12.5 kg" },
    "volume": { "value": 8.2, "unit": "L", "display": "8.2 L" },
    "count": { "value": 15, "unit": "units", "display": "15 units" }
  },
  "changePercentage": -12.5,
  "topWasted": [
    {
      "ingredient_id": 5,
      "name": "Tomatoes",
      "unit_family": "weight",
      "quantity": { "value": 2.5, "unit": "kg", "display": "2.5 kg" },
      "percentage": 27.0
    },
    {
      "ingredient_id": 8,
      "name": "Fresh Milk",
      "unit_family": "volume",
      "quantity": { "value": 1.8, "unit": "L", "display": "1.8 L" },
      "percentage": 21.6
    },
    {
      "ingredient_id": 12,
      "name": "Eggs",
      "unit_family": "count",
      "quantity": { "value": 8, "unit": "units", "display": "8 units" },
      "percentage": 15.8
    }
  ]
}
```

#### Key Logic:
- Percentage is calculated **within each family** (not across families)
- Weight items show as % of total weight wasted
- Volume items show as % of total volume wasted
- Count items show as % of total count wasted
- This prevents comparing apples and oranges

#### SQL Changes:
```sql
-- Old: No unit_family
SELECT si.ingredient_id, si.name,
       COALESCE(SUM(wl.quantity_wasted), 0) as total_wasted

-- New: Include unit_family
SELECT 
  si.ingredient_id,
  si.name,
  u.unit_family,
  u.base_unit_code,
  COALESCE(SUM(wl.quantity_wasted), 0) AS total_wasted_base
FROM waste_logs wl
JOIN stock_ingredients si ON wl.ingredient_id = si.ingredient_id
JOIN units u ON si.base_unit_id = u.unit_id
WHERE wl.logged_at >= [dateFrom]
GROUP BY si.ingredient_id, si.name, u.unit_family, u.base_unit_code
ORDER BY total_wasted_base DESC
LIMIT [limit]
```

---

### 5. Endpoint 4: `GET /api/analytics/recent-activity`
**Status:** ✅ No changes needed (already correct)

---

### 6. Endpoint 5: `GET /api/analytics/nearing-expiry-list`
**Status:** ✅ No changes needed (already correct)

---

## File Changes Summary

| File | Change | Status |
|------|--------|--------|
| `backend/src/utils/quantityConverter.js` | Created | ✅ New |
| `backend/src/controllers/analyticsController.js` | Updated | ✅ Modified |
| `backend/src/routes/analyticsRoutes.js` | No changes | ✅ Unchanged |
| `backend/src/routes/index.js` | No changes | ✅ Unchanged |

---

## Testing Checklist

### Endpoint 1: Dashboard Stats
```bash
curl -X GET http://localhost:3000/api/analytics/dashboard-stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns weight, volume, count separately
- [ ] Each has value, unit, display fields
- [ ] changePercent calculated correctly
- [ ] savedPercentage is 0-100 integer

### Endpoint 2: Monthly Summary
```bash
curl -X GET "http://localhost:3000/api/analytics/monthly-summary?months=6" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] currentMonth has weight, volume, count
- [ ] monthlyData array has 6 items
- [ ] Each month has wasted and saved by family
- [ ] savedPercentage is 0-100 integer

### Endpoint 3: Top Wasted
```bash
curl -X GET "http://localhost:3000/api/analytics/top-wasted?date_range=last_30_days" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] totalWaste has weight, volume, count
- [ ] topWasted items include unit_family
- [ ] quantity has value, unit, display
- [ ] percentage is within family (not across families)

### Endpoint 4: Recent Activity
```bash
curl -X GET http://localhost:3000/api/analytics/recent-activity \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns 10 activities max
- [ ] time_ago format is correct

### Endpoint 5: Nearing Expiry
```bash
curl -X GET http://localhost:3000/api/analytics/nearing-expiry-list \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns 5 items max
- [ ] quantity_remaining and unit are correct

---

## Backend Restart Required

After deploying these changes, restart the backend:

```bash
docker-compose restart backend
```

Or if running locally:
```bash
npm run dev
```

---

## Next Steps

1. **Test all 5 endpoints** with Postman
2. **Update mobile app** to handle new response structure
3. **Update documentation** with new response formats
4. **Deploy to production** after testing

---

## Breaking Changes

⚠️ **These are breaking changes** - the response structure has changed significantly:

**Old Response:**
```json
{
  "foodWasted": {
    "current": 1.5,
    "change": -15.3
  }
}
```

**New Response:**
```json
{
  "foodWasted": {
    "weight": { "value": 1.5, "unit": "kg", "display": "1.5 kg" },
    "volume": { "value": 0.2, "unit": "L", "display": "0.2 L" },
    "count": { "value": 0, "unit": "units", "display": "0 units" },
    "changePercent": -15.3
  }
}
```

**Mobile app must be updated** to parse the new structure.

---

## Benefits of These Changes

✅ **Proper unit handling** - No more forcing everything to kg
✅ **Accurate conversions** - Weight, volume, and count handled separately
✅ **Better UX** - Display units match the data (500g not 0.5kg)
✅ **Prevents confusion** - Can't compare kg of milk with kg of eggs
✅ **Scalable** - Easy to add new unit families in future
✅ **Accurate percentages** - Calculated within families, not across

---

## Code Quality

- ✅ No syntax errors
- ✅ Proper error handling
- ✅ Consistent naming conventions
- ✅ Well-commented code
- ✅ Follows existing patterns
- ✅ All queries parameterized (SQL injection safe)
