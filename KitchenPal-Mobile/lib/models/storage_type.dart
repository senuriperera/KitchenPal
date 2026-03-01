class StorageType {
  final int storageTypeId;
  final String code;
  final String name;

  StorageType({
    required this.storageTypeId,
    required this.code,
    required this.name,
  });

  factory StorageType.fromJson(Map<String, dynamic> json) {
    return StorageType(
      storageTypeId: json['storage_type_id'] ?? 0,
      code: json['code'] ?? '',
      name: json['name'] ?? '',
    );
  }
}
