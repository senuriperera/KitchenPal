class NearingExpiryItem {
  final int ingredientId;
  final int batchId;
  final String name;
  final String? imageUrl;
  final double quantityRemaining;
  final String unit;
  final DateTime expiryDate;
  final int daysLeft;

  NearingExpiryItem({
    required this.ingredientId,
    required this.batchId,
    required this.name,
    this.imageUrl,
    required this.quantityRemaining,
    required this.unit,
    required this.expiryDate,
    required this.daysLeft,
  });

  factory NearingExpiryItem.fromJson(Map<String, dynamic> json) {
    return NearingExpiryItem(
      ingredientId: json['ingredient_id'] ?? 0,
      batchId: json['batch_id'] ?? 0,
      name: json['name'] ?? '',
      imageUrl: json['image_url'],
      quantityRemaining: (json['quantity_remaining'] ?? 0).toDouble(),
      unit: json['unit'] ?? '',
      expiryDate: DateTime.parse(json['expiry_date'] ?? DateTime.now().toIso8601String()),
      daysLeft: json['days_left'] ?? 0,
    );
  }
}
