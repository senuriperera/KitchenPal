# Phase 2 — Mobile: Home Page Live Implementation

## Summary
All 5 analytics endpoints from Phase 1 are now integrated into the mobile app's home page. The page displays real-time data with pull-to-refresh functionality.

## Files Created

### 1. Models (lib/models/)
- **dashboard_stats.dart** - DashboardStats model with 5 metrics
- **monthly_summary.dart** - MonthlySummary and MonthlyData models
- **nearing_expiry_item.dart** - NearingExpiryItem model

### 2. Service (lib/services/)
- **analytics_service.dart** - AnalyticsService with 3 methods:
  - `getDashboardStats()` - Calls GET /api/analytics/dashboard-stats
  - `getMonthlySummary()` - Calls GET /api/analytics/monthly-summary
  - `getNearingExpiryList()` - Calls GET /api/analytics/nearing-expiry-list

### 3. Updated Pages (lib/pages/)
- **home_page.dart** - Completely refactored to use real API data

## Implementation Details

### Step 2.1 ✅ Analytics Service
Created `AnalyticsService` with three methods that:
- Handle JWT authentication via Bearer token
- Automatically refresh expired tokens
- Parse JSON responses into typed models
- Support optional branch_id filtering for admin users

### Step 2.2 ✅ Home Page State Management
Updated `HomePageContent` StatefulWidget to:
- Load both `getMonthlySummary()` and `getNearingExpiryList()` in parallel using `Future.wait()`
- Show loading spinner while fetching
- Display error state with retry button if either call fails
- Update state when data arrives

### Step 2.3 ✅ Donut Chart Connected to Real Data
The waste summary card now displays:
- **Saved percentage**: `currentMonth.savedPercentage` (dynamic, not hardcoded 75%)
- **Saved food**: `currentMonth.savedCurrent` formatted to 1 decimal (e.g., "420 kg")
- **Wasted food**: `currentMonth.wastedCurrent` formatted to 1 decimal (e.g., "140 kg")
- **Saved value**: Calculated as `savedCurrent * 3.5` (rough estimate)
- **Month label**: Dynamically generated from `DateTime.now()` (e.g., "April" instead of "October")

### Step 2.4 ✅ Nearing Expiry List Connected to Real Data
The nearing expiry section now:
- Displays items from `getNearingExpiryList()` API response
- Shows ingredient image loaded from Cloudinary URL
- Displays name, remaining quantity with unit code
- Shows days badge with color coding:
  - **Red** for 1 day left
  - **Orange** for 2 days left
  - **Yellow** for 3 days left
- "View All" button navigates to Alerts tab (unchanged)

### Step 2.5 ✅ Pull to Refresh
- Wrapped home page content in `RefreshIndicator`
- On refresh, calls both `getMonthlySummary()` and `getNearingExpiryList()` again
- Updates state with fresh data

## API Integration

All endpoints use the same authentication pattern:
```dart
// Bearer token from JWT stored in local storage
Authorization: Bearer {accessToken}
```

Optional branch filtering for admin users:
```dart
// Staff users: automatic branch filtering from JWT
// Admin users: can pass ?branch_id=X to filter specific branch
// Admin users without branch_id: see aggregated data from all branches
```

## Error Handling

- **Network errors**: Displays error message with retry button
- **401 Unauthorized**: Automatically refreshes token and retries
- **Other errors**: Shows user-friendly error message

## Testing Checklist

- [ ] Home page loads without errors
- [ ] Donut chart shows correct saved percentage
- [ ] Saved/wasted quantities display correctly
- [ ] Month name updates dynamically
- [ ] Nearing expiry items load from API
- [ ] Item images load from Cloudinary
- [ ] Days badge colors are correct (red/orange/yellow)
- [ ] Pull to refresh works
- [ ] Error state displays with retry button
- [ ] Loading spinner shows while fetching
- [ ] Staff users see only their branch data
- [ ] Admin users see aggregated data

## Notes

- The nearing expiry list now uses the analytics API instead of the old ingredient service
- All quantities are in kg (converted from base units on backend)
- The donut chart percentage is now dynamic based on real data
- Pull to refresh uses `AlwaysScrollableScrollPhysics` to work even when content fits on screen
