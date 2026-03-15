import 'ingredient_batch.dart';

class Ingredient {
  final int ingredientId;
  final String name;
  final String? imageUrl;
  final double quantityInStock;
  final double unitWeight;
  final String unitWeightUnitCode;
  final double totalBaseQuantity;
  final String baseUnitCode;
  final double price;
  final DateTime? manufactureDate;
  final DateTime expiryDate;
  final int storageTypeId;
  final String storageTypeName;
  final int masterIngredientId;
  final String unitFamily;
  final String? addedByName;

  // Full detail — only populated on the detail screen
  final int? unitWeightUnitId;
  final int? baseUnitId;
  final List<IngredientBatch> batches;

  Ingredient({
    required this.ingredientId,
    required this.name,
    this.imageUrl,
    required this.quantityInStock,
    required this.unitWeight,
    required this.unitWeightUnitCode,
    required this.totalBaseQuantity,
    required this.baseUnitCode,
    required this.price,
    this.manufactureDate,
    required this.expiryDate,
    required this.storageTypeId,
    required this.storageTypeName,
    required this.masterIngredientId,
    required this.unitFamily,
    this.addedByName,
    this.unitWeightUnitId,
    this.baseUnitId,
    this.batches = const [],
  });

  factory Ingredient.fromJson(Map<String, dynamic> json) {
    final batchesJson = json['batches'] as List<dynamic>? ?? [];
    return Ingredient(
      ingredientId: json['ingredient_id'] ?? 0,
      name: json['name'] ?? '',
      imageUrl: json['image_url'],
      quantityInStock: _parseDouble(json['quantity_in_stock']),
      unitWeight: _parseDouble(json['unit_weight']),
      unitWeightUnitCode: json['unit_weight_unit_code'] ?? '',
      totalBaseQuantity: _parseDouble(json['total_base_quantity']),
      baseUnitCode: json['base_unit_code'] ?? '',
      price: _parseDouble(json['price']),
      manufactureDate: json['manufacture_date'] != null
          ? DateTime.tryParse(json['manufacture_date'])
          : null,
      expiryDate: DateTime.parse(json['expiry_date']),
      storageTypeId: json['storage_type_id'] ?? 0,
      storageTypeName: json['storage_type_name'] ?? '',
      masterIngredientId: json['master_ingredient_id'] ?? 0,
      unitFamily: json['unit_family'] ?? 'weight',
      addedByName: json['added_by_name'],
      unitWeightUnitId: json['unit_weight_unit_id'],
      baseUnitId: json['base_unit_id'],
      batches: batchesJson.map((b) => IngredientBatch.fromJson(b)).toList(),
    );
  }

  static double _parseDouble(dynamic v) {
    if (v == null) return 0.0;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    if (v is String) return double.tryParse(v) ?? 0.0;
    return 0.0;
  }

  // Display total weight using base quantity from database
  String get displayTotalWeight {
    return '${totalBaseQuantity.toStringAsFixed(0)} $baseUnitCode';
  }

  int get daysUntilExpiry {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final expiry = DateTime(expiryDate.year, expiryDate.month, expiryDate.day);
    return expiry.difference(today).inDays;
  }

  bool get isExpired {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final expiry = DateTime(expiryDate.year, expiryDate.month, expiryDate.day);
    return expiry.isBefore(today);
  }

  String get formattedExpiryDate {
    if (isExpired) return 'Expired';
    if (daysUntilExpiry == 0) return 'Expires Today';
    if (daysUntilExpiry == 1) return 'Expires Tomorrow';
    if (daysUntilExpiry <= 7) return 'Exp: $daysUntilExpiry Days';
    return '${expiryDate.day}/${expiryDate.month}/${expiryDate.year}';
  }
}
