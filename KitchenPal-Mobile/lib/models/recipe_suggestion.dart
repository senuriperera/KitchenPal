class RecipeSuggestion {
  final int suggestionId;
  final int recipeId;
  final String recipeName;
  final String? imageUrl;
  final int? cookingTimeMinutes;
  final double basePrice;
  final double? suggestedDiscountPercentage;
  final double? calculatedDiscountedPrice;
  final String? urgencyLevel;
  final String status;
  final DateTime suggestedAt;

  RecipeSuggestion({
    required this.suggestionId,
    required this.recipeId,
    required this.recipeName,
    this.imageUrl,
    this.cookingTimeMinutes,
    required this.basePrice,
    this.suggestedDiscountPercentage,
    this.calculatedDiscountedPrice,
    this.urgencyLevel,
    required this.status,
    required this.suggestedAt,
  });

  factory RecipeSuggestion.fromJson(Map<String, dynamic> json) {
    return RecipeSuggestion(
      suggestionId: json['suggestion_id'] ?? 0,
      recipeId: json['recipe_id'] ?? 0,
      recipeName: json['recipe_name'] ?? '',
      imageUrl: json['image_url'],
      cookingTimeMinutes: json['cooking_time_minutes'],
      basePrice: double.parse((json['base_price'] ?? 0).toString()),
      suggestedDiscountPercentage:
          json['suggested_discount_percentage'] != null
              ? double.parse(json['suggested_discount_percentage'].toString())
              : null,
      calculatedDiscountedPrice:
          json['calculated_discounted_price'] != null
              ? double.parse(json['calculated_discounted_price'].toString())
              : null,
      urgencyLevel: json['urgency_level'],
      status: json['status'] ?? 'pending',
      suggestedAt: DateTime.parse(
        json['suggested_at'] ?? DateTime.now().toIso8601String(),
      ),
    );
  }
}
