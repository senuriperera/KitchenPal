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
class MonthlyFamilyTotals {
  final FamilyQuantity weight;
  final FamilyQuantity volume;
  final FamilyQuantity count;

  MonthlyFamilyTotals({
    required this.weight,
    required this.volume,
    required this.count,
  });

  factory MonthlyFamilyTotals.fromJson(Map<String, dynamic> json) {
    return MonthlyFamilyTotals(
      weight: FamilyQuantity.fromJson(json['weight'] ?? {}),
      volume: FamilyQuantity.fromJson(json['volume'] ?? {}),
      count: FamilyQuantity.fromJson(json['count'] ?? {}),
    );
  }
}

// Represents the current month summary
class CurrentMonthSummary {
  final MonthlyFamilyTotals wasted;
  final MonthlyFamilyTotals saved;
  final double savedPercentage;

  CurrentMonthSummary({
    required this.wasted,
    required this.saved,
    required this.savedPercentage,
  });

  factory CurrentMonthSummary.fromJson(Map<String, dynamic> json) {
    return CurrentMonthSummary(
      wasted: MonthlyFamilyTotals.fromJson(json['wasted'] ?? {}),
      saved: MonthlyFamilyTotals.fromJson(json['saved'] ?? {}),
      savedPercentage: (json['savedPercentage'] ?? 0).toDouble(),
    );
  }
}

// Main MonthlySummary model
class MonthlySummary {
  final CurrentMonthSummary currentMonth;
  final List<MonthlyData> monthlyData;

  MonthlySummary({
    required this.currentMonth,
    required this.monthlyData,
  });

  factory MonthlySummary.fromJson(Map<String, dynamic> json) {
    final monthlyList = (json['monthlyData'] as List<dynamic>?)
            ?.map((item) => MonthlyData.fromJson(item as Map<String, dynamic>))
            .toList() ??
        [];

    return MonthlySummary(
      currentMonth: CurrentMonthSummary.fromJson(json['currentMonth'] ?? {}),
      monthlyData: monthlyList,
    );
  }
}

// Individual month data
class MonthlyData {
  final String month; // Format: "2026-04"
  final MonthlyFamilyTotals wasted;
  final MonthlyFamilyTotals saved;

  MonthlyData({
    required this.month,
    required this.wasted,
    required this.saved,
  });

  factory MonthlyData.fromJson(Map<String, dynamic> json) {
    return MonthlyData(
      month: json['month'] ?? '',
      wasted: MonthlyFamilyTotals.fromJson(json['wasted'] ?? {}),
      saved: MonthlyFamilyTotals.fromJson(json['saved'] ?? {}),
    );
  }
}
