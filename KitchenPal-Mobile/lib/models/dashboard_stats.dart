// Represents a single quantity with value, unit, and display format
class FamilyQuantity {
  final double value;
  final String unit;
  final String display;

  FamilyQuantity({
    required this.value,
    required this.unit,
    required this.display,
  });

  factory FamilyQuantity.fromJson(Map<String, dynamic> json) {
    return FamilyQuantity(
      value: (json['value'] ?? 0).toDouble(),
      unit: json['unit'] ?? '',
      display: json['display'] ?? '',
    );
  }
}

// Represents quantities grouped by unit family (weight/volume/count)
class DashboardFamilyTotals {
  final FamilyQuantity weight;
  final FamilyQuantity volume;
  final FamilyQuantity count;
  final double changePercent;

  DashboardFamilyTotals({
    required this.weight,
    required this.volume,
    required this.count,
    required this.changePercent,
  });

  factory DashboardFamilyTotals.fromJson(Map<String, dynamic> json) {
    return DashboardFamilyTotals(
      weight: FamilyQuantity.fromJson(json['weight'] ?? {}),
      volume: FamilyQuantity.fromJson(json['volume'] ?? {}),
      count: FamilyQuantity.fromJson(json['count'] ?? {}),
      changePercent: (json['changePercent'] ?? 0).toDouble(),
    );
  }
}

// Represents profit from discounts
class ProfitFromDiscounts {
  final double current;
  final double changePercent;

  ProfitFromDiscounts({
    required this.current,
    required this.changePercent,
  });

  factory ProfitFromDiscounts.fromJson(Map<String, dynamic> json) {
    return ProfitFromDiscounts(
      current: (json['current'] ?? 0).toDouble(),
      changePercent: (json['changePercent'] ?? 0).toDouble(),
    );
  }
}

// Main DashboardStats model
class DashboardStats {
  final int nearExpiry;
  final DashboardFamilyTotals foodWasted;
  final DashboardFamilyTotals foodSaved;
  final int savedPercentage;
  final int activeDiscounts;
  final ProfitFromDiscounts profitFromDiscounts;

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
      foodWasted: DashboardFamilyTotals.fromJson(json['foodWasted'] ?? {}),
      foodSaved: DashboardFamilyTotals.fromJson(json['foodSaved'] ?? {}),
      savedPercentage: json['savedPercentage'] ?? 0,
      activeDiscounts: json['activeDiscounts'] ?? 0,
      profitFromDiscounts: ProfitFromDiscounts.fromJson(json['profitFromDiscounts'] ?? {}),
    );
  }
}
