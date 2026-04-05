# Mobile App Migration Guide — Phase 1 Changes

## Overview
The backend analytics endpoints now return quantities grouped by unit family (weight, volume, count) instead of a single kg value. The mobile app needs to be updated to handle this new structure.

## Changes Required

### 1. Update Models

#### `lib/models/dashboard_stats.dart`
```dart
class DashboardStats {
  final int nearExpiry;
  final QuantityByFamily foodWasted;
  final QuantityByFamily foodSaved;
  final int savedPercentage;
  final int activeDiscounts;
  final ProfitMetric profitFromDiscounts;

  DashboardStats({
    required this.nearExpiry,
    required this.foodWasted,
    required this.foodSaved,
    required this.savedPercentage,
    required this.activeDiscounts,
    required this.profitFromDiscounts,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      nearExpiry: json['nearExpiry'] ?? 0,
      foodWasted: QuantityByFamily.fromJson(json['foodWasted'] ?? {}),
      foodSaved: QuantityByFamily.fromJson(json['foodSaved'] ?? {}),
      savedPercentage: json['savedPercentage'] ?? 0,
      activeDiscounts: json['activeDiscounts'] ?? 0,
      profitFromDiscounts: ProfitMetric.fromJson(json['profitFromDiscounts'] ?? {}),
    );
  }
}

class QuantityByFamily {
  final QuantityDisplay weight;
  final QuantityDisplay volume;
  final QuantityDisplay count;
  final double changePercent;

  QuantityByFamily({
    required this.weight,
    required this.volume,
    required this.count,
    required this.changePercent,
  });

  factory QuantityByFamily.fromJson(Map<String, dynamic> json) {
    return QuantityByFamily(
      weight: QuantityDisplay.fromJson(json['weight'] ?? {}),
      volume: QuantityDisplay.fromJson(json['volume'] ?? {}),
      count: QuantityDisplay.fromJson(json['count'] ?? {}),
      changePercent: (json['changePercent'] ?? 0).toDouble(),
    );
  }
}

class QuantityDisplay {
  final double value;
  final String unit;
  final String display;

  QuantityDisplay({
    required this.value,
    required this.unit,
    required this.display,
  });

  factory QuantityDisplay.fromJson(Map<String, dynamic> json) {
    return QuantityDisplay(
      value: (json['value'] ?? 0).toDouble(),
      unit: json['unit'] ?? '',
      display: json['display'] ?? '',
    );
  }
}

class ProfitMetric {
  final double current;
  final double changePercent;

  ProfitMetric({
    required this.current,
    required this.changePercent,
  });

  factory ProfitMetric.fromJson(Map<String, dynamic> json) {
    return ProfitMetric(
      current: (json['current'] ?? 0).toDouble(),
      changePercent: (json['changePercent'] ?? 0).toDouble(),
    );
  }
}
```

#### `lib/models/monthly_summary.dart`
```dart
class MonthlySummary {
  final MonthlyMetrics currentMonth;
  final List<MonthlyData> monthlyData;

  MonthlySummary({
    required this.currentMonth,
    required this.monthlyData,
  });

  factory MonthlySummary.fromJson(Map<String, dynamic> json) {
    final currentMonth = json['currentMonth'] ?? {};
    final monthlyList = (json['monthlyData'] as List<dynamic>?)
            ?.map((item) => MonthlyData.fromJson(item as Map<String, dynamic>))
            .toList() ??
        [];

    return MonthlySummary(
      currentMonth: MonthlyMetrics.fromJson(currentMonth),
      monthlyData: monthlyList,
    );
  }
}

class MonthlyMetrics {
  final QuantityByFamily wasted;
  final QuantityByFamily saved;
  final int savedPercentage;

  MonthlyMetrics({
    required this.wasted,
    required this.saved,
    required this.savedPercentage,
  });

  factory MonthlyMetrics.fromJson(Map<String, dynamic> json) {
    return MonthlyMetrics(
      wasted: QuantityByFamily.fromJson(json['wasted'] ?? {}),
      saved: QuantityByFamily.fromJson(json['saved'] ?? {}),
      savedPercentage: json['savedPercentage'] ?? 0,
    );
  }
}

class MonthlyData {
  final String month;
  final QuantityByFamily wasted;
  final QuantityByFamily saved;

  MonthlyData({
    required this.month,
    required this.wasted,
    required this.saved,
  });

  factory MonthlyData.fromJson(Map<String, dynamic> json) {
    return MonthlyData(
      month: json['month'] ?? '',
      wasted: QuantityByFamily.fromJson(json['wasted'] ?? {}),
      saved: QuantityByFamily.fromJson(json['saved'] ?? {}),
    );
  }
}
```

### 2. Update Home Page

#### Display Donut Chart
```dart
// Old:
Text(
  '${summary.savedPercentage.toStringAsFixed(0)}% ',
  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
)

// New:
Text(
  '${_monthlySummary?.currentMonth.savedPercentage ?? 0}% ',
  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
)
```

#### Display Quantities
```dart
// Old:
Text(
  '${savedKg} kg',
  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
)

// New:
Text(
  _monthlySummary?.currentMonth.saved.weight.display ?? '0 kg',
  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
)
```

#### Display All Families
```dart
// Show weight, volume, and count separately
Column(
  children: [
    _buildQuantityRow(
      'Saved (Weight)',
      _monthlySummary?.currentMonth.saved.weight.display ?? '0 kg',
    ),
    _buildQuantityRow(
      'Saved (Volume)',
      _monthlySummary?.currentMonth.saved.volume.display ?? '0 L',
    ),
    _buildQuantityRow(
      'Saved (Count)',
      _monthlySummary?.currentMonth.saved.count.display ?? '0 units',
    ),
  ],
)
```

### 3. Update Analytics Service

No changes needed - the service already handles JSON parsing correctly. Just ensure models are updated.

---

## Response Structure Comparison

### Dashboard Stats

**Old:**
```json
{
  "foodWasted": {
    "current": 1.5,
    "change": -15.3
  }
}
```

**New:**
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

### Monthly Summary

**Old:**
```json
{
  "currentMonth": {
    "wasted": 1.5,
    "saved": 0.5,
    "savedPercentage": 25.0
  }
}
```

**New:**
```json
{
  "currentMonth": {
    "wasted": {
      "weight": { "value": 1.5, "unit": "kg", "display": "1.5 kg" },
      "volume": { "value": 0.2, "unit": "L", "display": "0.2 L" },
      "count": { "value": 0, "unit": "units", "display": "0 units" }
    },
    "saved": {
      "weight": { "value": 0.5, "unit": "kg", "display": "0.5 kg" },
      "volume": { "value": 0.1, "unit": "L", "display": "0.1 L" },
      "count": { "value": 0, "unit": "units", "display": "0 units" }
    },
    "savedPercentage": 25
  }
}
```

### Top Wasted

**Old:**
```json
{
  "topWasted": [
    {
      "name": "Tomatoes",
      "quantity_kg": 2.5,
      "percentage": 27.0
    }
  ]
}
```

**New:**
```json
{
  "topWasted": [
    {
      "name": "Tomatoes",
      "unit_family": "weight",
      "quantity": { "value": 2.5, "unit": "kg", "display": "2.5 kg" },
      "percentage": 27.0
    }
  ]
}
```

---

## UI Display Strategy

### Option 1: Show All Families (Recommended)
Display weight, volume, and count separately in the UI:
```
Saved Food:
├─ Weight: 12.5 kg
├─ Volume: 8.2 L
└─ Count: 15 units
```

### Option 2: Show Dominant Family
Show only the family with the most data:
```dart
QuantityDisplay getDominantQuantity(QuantityByFamily qty) {
  if (qty.weight.value > qty.volume.value && qty.weight.value > qty.count.value) {
    return qty.weight;
  } else if (qty.volume.value > qty.count.value) {
    return qty.volume;
  } else {
    return qty.count;
  }
}
```

### Option 3: Show Total with Breakdown
Show total and allow expanding to see breakdown:
```dart
// Display: "21.7 total (12.5 kg + 8.2 L + 15 units)"
String getTotalDisplay(QuantityByFamily qty) {
  final total = qty.weight.value + qty.volume.value + qty.count.value;
  return '$total total (${qty.weight.display} + ${qty.volume.display} + ${qty.count.display})';
}
```

---

## Testing Checklist

- [ ] Models parse new JSON structure correctly
- [ ] Home page displays quantities without errors
- [ ] Donut chart shows correct saved percentage
- [ ] Pull-to-refresh works
- [ ] Error handling still works
- [ ] No null pointer exceptions
- [ ] UI looks good with new data
- [ ] All 5 endpoints tested

---

## Rollback Plan

If issues occur:

1. **Revert backend** to old controller:
   ```bash
   mv backend/src/controllers/analyticsController_old.js backend/src/controllers/analyticsController.js
   docker-compose restart backend
   ```

2. **Revert mobile** to old models and home page from git

3. **Test old endpoints** to confirm they work

---

## Timeline

1. **Backend deployment** - Deploy new controller
2. **Mobile testing** - Test with new response structure
3. **Mobile deployment** - Deploy updated models and UI
4. **Monitor** - Watch for errors in production

---

## Support

If you encounter issues:
1. Check the error message in the console
2. Verify the JSON response structure matches the new format
3. Ensure all models are updated
4. Check that analytics service is calling correct endpoints
