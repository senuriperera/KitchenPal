class RecipeIngredient {
  final int masterIngredientId;
  final String name;
  final double quantityRequired;
  final String unitCode;
  final String unitName;
  final int unitId;

  RecipeIngredient({
    required this.masterIngredientId,
    required this.name,
    required this.quantityRequired,
    required this.unitCode,
    required this.unitName,
    required this.unitId,
  });

  factory RecipeIngredient.fromJson(Map<String, dynamic> json) {
    return RecipeIngredient(
      masterIngredientId: json['master_ingredient_id'] ?? 0,
      name: json['name'] ?? '',
      quantityRequired: double.parse((json['quantity_required'] ?? 0).toString()),
      unitCode: json['unit_code'] ?? '',
      unitName: json['unit_name'] ?? '',
      unitId: json['unit_id'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'master_ingredient_id': masterIngredientId,
      'name': name,
      'quantity_required': quantityRequired,
      'unit_code': unitCode,
      'unit_name': unitName,
      'unit_id': unitId,
    };
  }
}

class Recipe {
  final int recipeId;
  final String recipeName;
  final String? imageUrl;
  final int? cookingTimeMinutes;
  final String? description;
  final double basePrice;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<RecipeIngredient> ingredients;

  Recipe({
    required this.recipeId,
    required this.recipeName,
    this.imageUrl,
    this.cookingTimeMinutes,
    this.description,
    required this.basePrice,
    required this.createdAt,
    required this.updatedAt,
    required this.ingredients,
  });

  factory Recipe.fromJson(Map<String, dynamic> json) {
    final ingredientsList = json['ingredients'] as List<dynamic>? ?? [];

    return Recipe(
      recipeId: json['recipe_id'] ?? 0,
      recipeName: json['recipe_name'] ?? '',
      imageUrl: json['image_url'],
      cookingTimeMinutes: json['cooking_time_minutes'],
      description: json['description'],
      basePrice: double.parse((json['base_price'] ?? 0).toString()),
      createdAt: DateTime.parse(
        json['created_at'] ?? DateTime.now().toIso8601String(),
      ),
      updatedAt: DateTime.parse(
        json['updated_at'] ?? DateTime.now().toIso8601String(),
      ),
      ingredients: ingredientsList
          .map((ing) => RecipeIngredient.fromJson(ing as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'recipe_id': recipeId,
      'recipe_name': recipeName,
      'image_url': imageUrl,
      'cooking_time_minutes': cookingTimeMinutes,
      'description': description,
      'base_price': basePrice,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'ingredients': ingredients.map((ing) => ing.toJson()).toList(),
    };
  }
}
