import 'package:flutter_test/flutter_test.dart';
import 'package:kitchenpal_mobile/models/recipe.dart';

void main() {
  // ─── Helpers ──────────────────────────────────────────────────────────────
  Map<String, dynamic> validRecipeJson({List<dynamic>? ingredients}) {
    return {
      'recipe_id': 10,
      'recipe_name': 'Tomato Soup',
      'image_url': 'https://cdn.example.com/soup.jpg',
      'cooking_time_minutes': 30,
      'description': 'A classic tomato soup',
      'base_price': '250.00',
      'total_servings': 4,
      'serving_description': 'Serves 4 people',
      'created_at': '2024-01-01T10:00:00.000Z',
      'updated_at': '2024-01-15T12:00:00.000Z',
      'ingredients': ingredients ?? [],
    };
  }

  Map<String, dynamic> validIngredientJson() {
    return {
      'master_ingredient_id': 5,
      'name': 'Tomatoes',
      'quantity_required': '500',
      'unit_code': 'g',
      'unit_name': 'Gram',
      'unit_id': 3,
    };
  }

  // ─── Recipe.fromJson() Tests ──────────────────────────────────────────────
  group('Recipe.fromJson()', () {
    test('parses all basic fields correctly', () {
      final recipe = Recipe.fromJson(validRecipeJson());

      expect(recipe.recipeId, equals(10));
      expect(recipe.recipeName, equals('Tomato Soup'));
      expect(recipe.imageUrl, equals('https://cdn.example.com/soup.jpg'));
      expect(recipe.cookingTimeMinutes, equals(30));
      expect(recipe.description, equals('A classic tomato soup'));
      expect(recipe.basePrice, equals(250.0));
      expect(recipe.totalServings, equals(4));
      expect(recipe.servingDescription, equals('Serves 4 people'));
    });

    test('parses createdAt and updatedAt as DateTime', () {
      final recipe = Recipe.fromJson(validRecipeJson());
      expect(recipe.createdAt, isA<DateTime>());
      expect(recipe.updatedAt, isA<DateTime>());
      expect(recipe.createdAt.year, equals(2024));
      expect(recipe.updatedAt.month, equals(1));
    });

    test('basePrice parsed correctly from String', () {
      final recipe = Recipe.fromJson(validRecipeJson());
      expect(recipe.basePrice, isA<double>());
      expect(recipe.basePrice, equals(250.0));
    });

    test('imageUrl is null when not provided', () {
      final json = validRecipeJson();
      json['image_url'] = null;
      final recipe = Recipe.fromJson(json);
      expect(recipe.imageUrl, isNull);
    });

    test('cookingTimeMinutes is null when not provided', () {
      final json = validRecipeJson();
      json['cooking_time_minutes'] = null;
      final recipe = Recipe.fromJson(json);
      expect(recipe.cookingTimeMinutes, isNull);
    });

    test('defaults totalServings to 1 when missing', () {
      final json = validRecipeJson();
      json.remove('total_servings');
      final recipe = Recipe.fromJson(json);
      expect(recipe.totalServings, equals(1));
    });

    test('parses empty ingredients list', () {
      final recipe = Recipe.fromJson(validRecipeJson(ingredients: []));
      expect(recipe.ingredients, isEmpty);
    });

    test('parses ingredients list with items', () {
      final recipe = Recipe.fromJson(
        validRecipeJson(ingredients: [validIngredientJson()]),
      );
      expect(recipe.ingredients.length, equals(1));
      expect(recipe.ingredients.first.name, equals('Tomatoes'));
      expect(recipe.ingredients.first.quantityRequired, equals(500.0));
      expect(recipe.ingredients.first.unitCode, equals('g'));
    });
  });

  // ─── RecipeIngredient.fromJson() Tests ────────────────────────────────────
  group('RecipeIngredient.fromJson()', () {
    test('parses all fields correctly', () {
      final ri = RecipeIngredient.fromJson(validIngredientJson());
      expect(ri.masterIngredientId, equals(5));
      expect(ri.name, equals('Tomatoes'));
      expect(ri.quantityRequired, equals(500.0));
      expect(ri.unitCode, equals('g'));
      expect(ri.unitName, equals('Gram'));
      expect(ri.unitId, equals(3));
    });

    test('handles integer quantityRequired', () {
      final json = validIngredientJson();
      json['quantity_required'] = 100; // int, not String
      final ri = RecipeIngredient.fromJson(json);
      expect(ri.quantityRequired, equals(100.0));
      expect(ri.quantityRequired, isA<double>());
    });
  });

  // ─── Recipe.toJson() Tests ────────────────────────────────────────────────
  group('Recipe.toJson()', () {
    test('round-trips correctly through fromJson → toJson', () {
      final original = Recipe.fromJson(validRecipeJson());
      final json = original.toJson();

      expect(json['recipe_id'], equals(10));
      expect(json['recipe_name'], equals('Tomato Soup'));
      expect(json['base_price'], equals(250.0));
      expect(json['total_servings'], equals(4));
      expect(json['ingredients'], isA<List>());
    });
  });
}
