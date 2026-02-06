class Ingredient {
  final int ingredientId;
  final int branchId;
  final String name;
  final double quantityInStock;
  final int unitId;
  final double costPerUnit;
  final DateTime expiryDate;
  final DateTime? manufactureDate;
  final int storageTypeId;
  final String? imageUrl;
  final double? weight;
  final int? weightUnitId;
  final DateTime createdAt;
  final DateTime updatedAt;

  // Joined data
  final String? unitCode;
  final String? unitName;
  final String? storageCode;
  final String? storageName;
  final String? weightUnitCode;
  final String? weightUnitName;

  Ingredient({
    required this.ingredientId,
    required this.branchId,
    required this.name,
    required this.quantityInStock,
    required this.unitId,
    required this.costPerUnit,
    required this.expiryDate,
    this.manufactureDate,
    required this.storageTypeId,
    this.imageUrl,
    this.weight,
    this.weightUnitId,
    required this.createdAt,
    required this.updatedAt,
    this.unitCode,
    this.unitName,
    this.storageCode,
    this.storageName,
    this.weightUnitCode,
    this.weightUnitName,
  });

  factory Ingredient.fromJson(Map<String, dynamic> json) {
    return Ingredient(
      ingredientId: json['ingredient_id'] ?? 0,
      branchId: json['branch_id'] ?? 0,
      name: json['name'] ?? '',
      quantityInStock: _parseDouble(json['quantity_in_stock']),
      unitId: json['unit_id'] ?? 0,
      costPerUnit: _parseDouble(json['cost_per_unit']),
      expiryDate: DateTime.parse(json['expiry_date']),
      manufactureDate: json['manufacture_date'] != null
          ? DateTime.parse(json['manufacture_date'])
          : null,
      storageTypeId: json['storage_type_id'] ?? 0,
      imageUrl: json['image_url'],
      weight: json['weight'] != null ? _parseDouble(json['weight']) : null,
      weightUnitId: json['weight_unit_id'],
      createdAt: DateTime.parse(
        json['created_at'] ?? DateTime.now().toIso8601String(),
      ),
      updatedAt: DateTime.parse(
        json['updated_at'] ?? DateTime.now().toIso8601String(),
      ),
      unitCode: json['unit']?['code'],
      unitName: json['unit']?['name'],
      storageCode: json['storageType']?['code'],
      storageName: json['storageType']?['name'],
      weightUnitCode: json['weightUnit']?['code'],
      weightUnitName: json['weightUnit']?['name'],
    );
  }

  // Helper method to safely parse doubles from various types
  static double _parseDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  Map<String, dynamic> toJson() {
    return {
      'ingredient_id': ingredientId,
      'branch_id': branchId,
      'name': name,
      'quantity_in_stock': quantityInStock,
      'unit_id': unitId,
      'cost_per_unit': costPerUnit,
      'expiry_date': expiryDate.toIso8601String(),
      'manufacture_date': manufactureDate?.toIso8601String(),
      'storage_type_id': storageTypeId,
      'image_url': imageUrl,
      'weight': weight,
      'weight_unit_id': weightUnitId,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  // Helper to get days until expiry
  int get daysUntilExpiry {
    final now = DateTime.now();
    final difference = expiryDate.difference(now);
    return difference.inDays;
  }

  // Helper to check if expired
  bool get isExpired {
    return DateTime.now().isAfter(expiryDate);
  }

  // Helper to format expiry date
  String get formattedExpiryDate {
    if (isExpired) {
      return 'Expired';
    } else if (daysUntilExpiry == 0) {
      return 'Expires Today';
    } else if (daysUntilExpiry == 1) {
      return 'Expires Tomorrow';
    } else if (daysUntilExpiry <= 7) {
      return 'Exp: $daysUntilExpiry Days';
    } else {
      return '${expiryDate.day}/${expiryDate.month}/${expiryDate.year}';
    }
  }
}
