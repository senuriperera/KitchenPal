class IngredientBatch {
  final int batchId;
  final double remainingBaseQuantity;
  final String baseUnitCode;
  final DateTime expiryDate;
  final bool isDepleted;

  IngredientBatch({
    required this.batchId,
    required this.remainingBaseQuantity,
    required this.baseUnitCode,
    required this.expiryDate,
    required this.isDepleted,
  });

  factory IngredientBatch.fromJson(Map<String, dynamic> json) {
    return IngredientBatch(
      batchId: json['batch_id'] ?? 0,
      remainingBaseQuantity: _parseDouble(json['remaining_base_quantity']),
      baseUnitCode: json['base_unit_code'] ?? '',
      expiryDate: DateTime.parse(json['expiry_date']),
      isDepleted: json['is_depleted'] ?? false,
    );
  }

  static double _parseDouble(dynamic v) {
    if (v == null) return 0.0;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    if (v is String) return double.tryParse(v) ?? 0.0;
    return 0.0;
  }
}
