class UnitModel {
  final int unitId;
  final String code;
  final String name;
  final String unitFamily; // 'weight' | 'volume' | 'count'

  UnitModel({
    required this.unitId,
    required this.code,
    required this.name,
    required this.unitFamily,
  });

  factory UnitModel.fromJson(Map<String, dynamic> json) {
    return UnitModel(
      unitId: json['unit_id'] ?? 0,
      code: json['code'] ?? '',
      name: json['name'] ?? '',
      unitFamily: json['unit_family'] ?? 'weight',
    );
  }
}
