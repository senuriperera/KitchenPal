import 'package:flutter_test/flutter_test.dart';
import 'package:kitchenpal_mobile/models/recipe.dart';

void main() {
  group('RecipeIngredient Model Tests', () {
    
    test('fromJson creates RecipeIngredient correctly', () {
      final json = {
        'master_ingredient_id': 1,
        'name': 'Tomato',
        'quantity_required': 2.5,
        'unit_code': 'kg',
        'unit_name': 'Kilogram',
        'unit_id': 10,
      };

      final ingredient = RecipeIngredient.fromJson(json);

      expect(ingredient.masterIngredientId, equals(1));
      expect(ingredient.name, equals('Tomato'));
      expect(ingredient.quantityRequired, equals(2.5));
      expect(ingredient.unitCode, equals('kg'));
      expect(ingredient.unitName, equals('Kilogram'));
      expect(ingredient.unitId, equals(10));
    });

    test('fromJson handles missing fields with defaults', () {
      final json = <String, dynamic>{};

      final ingredient = RecipeIngredient.fromJson(json);

      expect(ingredient.masterIngredientId, equals(0));
      expect(ingredient.name, equals(''));
      expect(ingredient.quantityRequired, equals(0.0));
      expect(ingredient.unitCode, equals(''));
      expect(ingredient.unitName, equals(''));
      expect(ingredient.unitId, equals(0));
    });

    test('toJson converts RecipeIngredient correctly', () {
      final ingredient = RecipeIngredient(
        masterIngredientId: 5,
        name: 'Onion',
        quantityRequired: 3.0,
        unitCode: 'pcs',
        unitName: 'Pieces',
        unitId: 15,
      );

      final json = ingredient.toJson();

      expect(json['master_ingredient_id'], equals(5));
      expect(json['name'], equals('Onion'));
      expect(json['quantity_required'], equals(3.0));
      expect(json['unit_code'], equals('pcs'));
      expect(json['unit_name'], equals('Pieces'));
      expect(json['unit_id'], equals(15));
    });

    test('roundtrip conversion preserves data', () {
      final original = RecipeIngredient(
        masterIngredientId: 7,
        name: 'Garlic',
        quantityRequired: 0.5,
        unitCode: 'kg',
        unitName: 'Kilogram',
        unitId: 20,
      );

      final json = original.toJson();
      final reconstructed = RecipeIngredient.fromJson(json);

      expect(reconstructed.masterIngredientId, equals(original.masterIngredientId));
      expect(reconstructed.name, equals(original.name));
      expect(reconstructed.quantityRequired, equals(original.quantityRequired));
      expect(reconstructed.unitCode, equals(original.unitCode));
      expect(reconstructed.unitName, equals(original.unitName));
      expect(reconstructed.unitId, equals(original.unitId));
    });
  });

  group('Recipe Model Tests', () {
    
    test('fromJson creates Recipe correctly with all fields', () {
      final json = {
        'recipe_id': 1,
        'recipe_name': 'Tomato Soup',
        'image_url': 'https://example.com/soup.jpg',
        'cooking_time_minutes': 30,
        'description': 'Delicious tomato soup',
        'base_price': 12.50,
        'total_servings': 4,
        'serving_description': '4 bowls',
        'created_at': '2024-01-01T10:00:00Z',
        'updated_at': '2024-01-02T15:30:00Z',
        'ingredients': [
          {
            'master_ingredient_id': 1,
            'name': 'Tomato',
            'quantity_required': 2.0,
            'unit_code': 'kg',
            'unit_name': 'Kilogram',
            'unit_id': 10,
          },
          {
            'master_ingredient_id': 2,
            'name': 'Onion',
            'quantity_required': 0.5,
            'unit_code': 'kg',
            'unit_name': 'Kilogram',
            'unit_id': 10,
          },
        ],
      };

      final recipe = Recipe.fromJson(json);

      expect(recipe.recipeId, equals(1));
      expect(recipe.recipeName, equals('Tomato Soup'));
      expect(recipe.imageUrl, equals('https://example.com/soup.jpg'));
      expect(recipe.cookingTimeMinutes, equals(30));
      expect(recipe.description, equals('Delicious tomato soup'));
      expect(recipe.basePrice, equals(12.50));
      expect(recipe.totalServings, equals(4));
      expect(recipe.servingDescription, equals('4 bowls'));
      expect(recipe.createdAt, equals(DateTime.parse('2024-01-01T10:00:00Z')));
      expect(recipe.updatedAt, equals(DateTime.parse('2024-01-02T15:30:00Z')));
      expect(recipe.ingredients.length, equals(2));
      expect(recipe.ingredients[0].name, equals('Tomato'));
      expect(recipe.ingredients[1].name, equals('Onion'));
    });

    test('fromJson handles null optional fields', () {
      final json = {
        'recipe_id': 2,
        'recipe_name': 'Simple Salad',
        'base_price': 8.0,
        'created_at': '2024-01-01T10:00:00Z',
        'updated_at': '2024-01-01T10:00:00Z',
      };

      final recipe = Recipe.fromJson(json);

      expect(recipe.imageUrl, isNull);
      expect(recipe.cookingTimeMinutes, isNull);
      expect(recipe.description, isNull);
      expect(recipe.servingDescription, isNull);
      expect(recipe.totalServings, equals(1)); // default
      expect(recipe.ingredients, isEmpty);
    });

    test('fromJson handles missing fields with defaults', () {
      final json = {
        'created_at': '2024-01-01T10:00:00Z',
        'updated_at': '2024-01-01T10:00:00Z',
      };

      final recipe = Recipe.fromJson(json);

      expect(recipe.recipeId, equals(0));
      expect(recipe.recipeName, equals(''));
      expect(recipe.basePrice, equals(0.0));
      expect(recipe.totalServings, equals(1));
      expect(recipe.ingredients, isEmpty);
    });

    test('toJson converts Recipe correctly', () {
      final recipe = Recipe(
        recipeId: 3,
        recipeName: 'Pasta',
        imageUrl: 'https://example.com/pasta.jpg',
        cookingTimeMinutes: 20,
        description: 'Italian pasta',
        basePrice: 15.0,
        totalServings: 2,
        servingDescription: '2 plates',
        createdAt: DateTime.parse('2024-01-01T10:00:00Z'),
        updatedAt: DateTime.parse('2024-01-02T10:00:00Z'),
        ingredients: [
          RecipeIngredient(
            masterIngredientId: 5,
            name: 'Pasta',
            quantityRequired: 200.0,
            unitCode: 'g',
            unitName: 'Gram',
            unitId: 1,
          ),
        ],
      );

      final json = recipe.toJson();

      expect(json['recipe_id'], equals(3));
      expect(json['recipe_name'], equals('Pasta'));
      expect(json['image_url'], equals('https://example.com/pasta.jpg'));
      expect(json['cooking_time_minutes'], equals(20));
      expect(json['description'], equals('Italian pasta'));
      expect(json['base_price'], equals(15.0));
      expect(json['total_servings'], equals(2));
      expect(json['serving_description'], equals('2 plates'));
      expect(json['ingredients'], isA<List>());
      expect(json['ingredients'].length, equals(1));
    });

    test('roundtrip conversion preserves data', () {
      final original = Recipe(
        recipeId: 10,
        recipeName: 'Test Recipe',
        basePrice: 20.0,
        totalServings: 3,
        createdAt: DateTime.parse('2024-01-01T10:00:00Z'),
        updatedAt: DateTime.parse('2024-01-01T10:00:00Z'),
        ingredients: [
          RecipeIngredient(
            masterIngredientId: 1,
            name: 'Test Ingredient',
            quantityRequired: 1.5,
            unitCode: 'kg',
            unitName: 'Kilogram',
            unitId: 5,
          ),
        ],
      );

      final json = original.toJson();
      final reconstructed = Recipe.fromJson(json);

      expect(reconstructed.recipeId, equals(original.recipeId));
      expect(reconstructed.recipeName, equals(original.recipeName));
      expect(reconstructed.basePrice, equals(original.basePrice));
      expect(reconstructed.totalServings, equals(original.totalServings));
      expect(reconstructed.ingredients.length, equals(original.ingredients.length));
      expect(reconstructed.ingredients[0].name, equals(original.ingredients[0].name));
    });

    test('handles empty ingredients list', () {
      final json = {
        'recipe_id': 5,
        'recipe_name': 'Empty Recipe',
        'base_price': 0,
        'created_at': '2024-01-01T10:00:00Z',
        'updated_at': '2024-01-01T10:00:00Z',
        'ingredients': [],
      };

      final recipe = Recipe.fromJson(json);

      expect(recipe.ingredients, isEmpty);
    });

    test('handles numeric types for base_price', () {
      final jsonInt = {
        'recipe_id': 6,
        'recipe_name': 'Test',
        'base_price': 10, // int
        'created_at': '2024-01-01T10:00:00Z',
        'updated_at': '2024-01-01T10:00:00Z',
      };

      final recipe = Recipe.fromJson(jsonInt);
      expect(recipe.basePrice, equals(10.0));
    });
  });
}
