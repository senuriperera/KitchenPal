class MonthlySummary {
  final double wastedCurrent;
  final double savedCurrent;
  final double savedPercentage;
  final List<MonthlyData> monthlyData;

  MonthlySummary({
    required this.wastedCurrent,
    required this.savedCurrent,
    required this.savedPercentage,
    required this.monthlyData,
  });

  factory MonthlySummary.fromJson(Map<String, dynamic> json) {
    final currentMonth = json['currentMonth'] ?? {};
    final monthlyList = (json['monthlyData'] as List<dynamic>?)
            ?.map((item) => MonthlyData.fromJson(item as Map<String, dynamic>))
            .toList() ??
        [];

    return MonthlySummary(
      wastedCurrent: (currentMonth['wasted'] ?? 0).toDouble(),
      savedCurrent: (currentMonth['saved'] ?? 0).toDouble(),
      savedPercentage: (currentMonth['savedPercentage'] ?? 0).toDouble(),
      monthlyData: monthlyList,
    );
  }
}

class MonthlyData {
  final String month; // Format: "2026-04"
  final double wasted;
  final double saved;

  MonthlyData({
    required this.month,
    required this.wasted,
    required this.saved,
  });

  factory MonthlyData.fromJson(Map<String, dynamic> json) {
    return MonthlyData(
      month: json['month'] ?? '',
      wasted: (json['wasted'] ?? 0).toDouble(),
      saved: (json['saved'] ?? 0).toDouble(),
    );
  }
}
