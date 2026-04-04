class DashboardStats {
  final int nearExpiry;
  final double foodWastedCurrent;
  final double foodWastedChange;
  final double foodSavedCurrent;
  final double foodSavedChange;
  final int activeDiscounts;
  final double profitFromDiscounts;

  DashboardStats({
    required this.nearExpiry,
    required this.foodWastedCurrent,
    required this.foodWastedChange,
    required this.foodSavedCurrent,
    required this.foodSavedChange,
    required this.activeDiscounts,
    required this.profitFromDiscounts,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      nearExpiry: json['nearExpiry'] ?? 0,
      foodWastedCurrent: (json['foodWasted']?['current'] ?? 0).toDouble(),
      foodWastedChange: (json['foodWasted']?['change'] ?? 0).toDouble(),
      foodSavedCurrent: (json['foodSaved']?['current'] ?? 0).toDouble(),
      foodSavedChange: (json['foodSaved']?['change'] ?? 0).toDouble(),
      activeDiscounts: json['activeDiscounts'] ?? 0,
      profitFromDiscounts: (json['profitFromDiscounts'] ?? 0).toDouble(),
    );
  }
}
