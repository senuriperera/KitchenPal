class ExpiryNotification {
  final int batchId;
  final int ingredientId;
  final String name;
  final String? imageUrl;
  final double remainingBaseQuantity;
  final String baseUnitCode;
  final DateTime expiryDate;
  final int daysUntilExpiry;
  final String storageTypeName;
  final int notificationId;

  ExpiryNotification({
    required this.batchId,
    required this.ingredientId,
    required this.name,
    this.imageUrl,
    required this.remainingBaseQuantity,
    required this.baseUnitCode,
    required this.expiryDate,
    required this.daysUntilExpiry,
    required this.storageTypeName,
    required this.notificationId,
  });

  factory ExpiryNotification.fromJson(Map<String, dynamic> json) {
    return ExpiryNotification(
      batchId: json['batch_id'] as int? ?? 0,
      ingredientId: json['ingredient_id'] as int? ?? 0,
      name: json['name'] as String? ?? '',
      imageUrl: json['image_url'] as String?,
      remainingBaseQuantity:
          double.tryParse(json['remaining_base_quantity']?.toString() ?? '0') ??
          0.0,
      baseUnitCode: json['base_unit_code'] as String? ?? 'g',
      expiryDate: json['expiry_date'] != null
          ? DateTime.parse(json['expiry_date'].toString())
          : DateTime.now(),
      daysUntilExpiry: (json['days_until_expiry'] as num?)?.toInt() ?? 0,
      storageTypeName: json['storage_type_name'] as String? ?? '',
      notificationId: json['notification_id'] as int? ?? 0,
    );
  }
}
