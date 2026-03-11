class MasterIngredient {
  final int masterIngredientId;
  final String name;
  final String unitFamily; // 'weight' | 'volume' | 'count'
  final int? baseUnitId;
  final int? defaultUnitId;

  MasterIngredient({
    required this.masterIngredientId,
    required this.name,
    required this.unitFamily,
    this.baseUnitId,
    this.defaultUnitId,
  });

  factory MasterIngredient.fromJson(Map<String, dynamic> json) {
    return MasterIngredient(
      masterIngredientId: json['master_ingredient_id'] ?? 0,
      name: json['name'] ?? '',
      unitFamily: json['unit_family'] ?? 'weight',
      baseUnitId: json['base_unit_id'],
      defaultUnitId: json['default_unit_id'],
    );
  }
}
