class GeneratedRecipe {
  final int generatedId;
  final int recipeId;
  final double suggestedDiscountPercent;
  final double suggestedDiscountPrice;
  final double? finalDiscountPercent;
  final double? finalDiscountPrice;
  final String status;
  final String? adminNote;
  final int generatedBy;
  final DateTime createdAt;
  final String name;
  final String? imageUrl;
  final int? cookingTimeMinutes;
  final String? description;
  final double basePrice;
  final String generatedByName;

  GeneratedRecipe({
    required this.generatedId,
    required this.recipeId,
    required this.suggestedDiscountPercent,
    required this.suggestedDiscountPrice,
    this.finalDiscountPercent,
    this.finalDiscountPrice,
    required this.status,
    this.adminNote,
    required this.generatedBy,
    required this.createdAt,
    required this.name,
    this.imageUrl,
    this.cookingTimeMinutes,
    this.description,
    required this.basePrice,
    required this.generatedByName,
  });

  factory GeneratedRecipe.fromJson(Map<String, dynamic> json) {
    return GeneratedRecipe(
      generatedId: json['generated_id'] ?? 0,
      recipeId: json['recipe_id'] ?? 0,
      suggestedDiscountPercent:
          double.tryParse(
            json['suggested_discount_percent']?.toString() ?? '0',
          ) ??
          0,
      suggestedDiscountPrice:
          double.tryParse(
            json['suggested_discount_price']?.toString() ?? '0',
          ) ??
          0,
      finalDiscountPercent: json['final_discount_percent'] != null
          ? double.tryParse(json['final_discount_percent'].toString())
          : null,
      finalDiscountPrice: json['final_discount_price'] != null
          ? double.tryParse(json['final_discount_price'].toString())
          : null,
      status: json['status'] ?? 'pending',
      adminNote: json['admin_note'],
      generatedBy: json['generated_by'] ?? 0,
      createdAt: DateTime.parse(
        json['created_at'] ?? DateTime.now().toIso8601String(),
      ),
      name: json['name'] ?? '',
      imageUrl: json['image_url'],
      cookingTimeMinutes: json['cooking_time_minutes'],
      description: json['description'],
      basePrice: double.tryParse(json['base_price']?.toString() ?? '0') ?? 0,
      generatedByName: json['generated_by_name'] ?? '',
    );
  }
}
