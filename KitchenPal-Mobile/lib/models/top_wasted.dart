import 'monthly_summary.dart';

class TopWastedItem {
  final int ingredientId;
  final String name;
  final String unitFamily;
  final FamilyQuantity quantity;
  final double percentage;

  TopWastedItem({
    required this.ingredientId,
    required this.name,
    required this.unitFamily,
    required this.quantity,
    required this.percentage,
  });

  factory TopWastedItem.fromJson(Map<String, dynamic> json) {
    return TopWastedItem(
      ingredientId: json['ingredient_id'] ?? 0,
      name: json['name'] ?? '',
      unitFamily: json['unit_family'] ?? '',
      quantity: FamilyQuantity.fromJson(json['quantity'] ?? {}),
      percentage: (json['percentage'] ?? 0).toDouble(),
    );
  }
}

class TopWastedReport {
  final MonthlyFamilyTotals totalWaste;
  final double changePercentage;
  final List<TopWastedItem> topWasted;

  TopWastedReport({
    required this.totalWaste,
    required this.changePercentage,
    required this.topWasted,
  });

  factory TopWastedReport.fromJson(Map<String, dynamic> json) {
    final items = (json['topWasted'] as List<dynamic>?)
            ?.map((item) => TopWastedItem.fromJson(item as Map<String, dynamic>))
            .toList() ??
        [];

    return TopWastedReport(
      totalWaste: MonthlyFamilyTotals.fromJson(json['totalWaste'] ?? {}),
      changePercentage: (json['changePercentage'] ?? 0).toDouble(),
      topWasted: items,
    );
  }
}
