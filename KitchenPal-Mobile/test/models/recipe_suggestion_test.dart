import 'package:flutter_test/flutter_test.dart';
import 'package:kitchenpal_mobile/models/recipe_suggestion.dart';

void main() {
  group('RecipeSuggestion Model Tests', () {
    
    test('fromJson creates RecipeSuggestion correctly with all fields', () {
      final json = {
        'suggestion_id': 1,
        'recipe_id': 10,
        'recipe_name': 'Tomato Pasta',
        'image_url': 'https://example.com/pasta.jpg',
        'cooking_time_minutes': 25,
        'base_price': 15.50,
        'suggested_discount_percentage': 20.0,
        'calculated_discounted_price': 12.40,
        'urgency_level': 'high',
        'status': 'pending',
        'suggested_at': '2024-01-15T10:30:00Z',
      };

      final suggestion = RecipeSuggestion.fromJson(json);

      expect(suggestion.suggestionId, equals(1));
      expect(suggestion.recipeId, equals(10));
      expect(suggestion.recipeName, equals('Tomato Pasta'));
      expect(suggestion.imageUrl, equals('https://example.com/pasta.jpg'));
      expect(suggestion.cookingTimeMinutes, equals(25));
      expect(suggestion.basePrice, equals(15.50));
      expect(suggestion.suggestedDiscountPercentage, equals(20.0));
      expect(suggestion.calculatedDiscountedPrice, equals(12.40));
      expect(suggestion.urgencyLevel, equals('high'));
      expect(suggestion.status, equals('pending'));
      expect(suggestion.suggestedAt, equals(DateTime.parse('2024-01-15T10:30:00Z')));
    });

    test('fromJson handles null optional fields', () {
      final json = {
        'suggestion_id': 2,
        'recipe_id': 20,
        'recipe_name': 'Simple Salad',
        'base_price': 8.0,
        'status': 'approved',
        'suggested_at': '2024-01-16T12:00:00Z',
      };

      final suggestion = RecipeSuggestion.fromJson(json);

      expect(suggestion.imageUrl, isNull);
      expect(suggestion.cookingTimeMinutes, isNull);
      expect(suggestion.suggestedDiscountPercentage, isNull);
      expect(suggestion.calculatedDiscountedPrice, isNull);
      expect(suggestion.urgencyLevel, isNull);
    });

    test('fromJson handles missing fields with defaults', () {
      final json = {
        'suggested_at': '2024-01-01T10:00:00Z',
      };

      final suggestion = RecipeSuggestion.fromJson(json);

      expect(suggestion.suggestionId, equals(0));
      expect(suggestion.recipeId, equals(0));
      expect(suggestion.recipeName, equals(''));
      expect(suggestion.basePrice, equals(0.0));
      expect(suggestion.status, equals('pending')); // default
    });

    test('fromJson handles different status values', () {
      final statuses = ['pending', 'approved', 'rejected'];

      for (final status in statuses) {
        final json = {
          'suggestion_id': 1,
          'recipe_id': 1,
          'recipe_name': 'Test',
          'base_price': 10.0,
          'status': status,
          'suggested_at': '2024-01-01T10:00:00Z',
        };

        final suggestion = RecipeSuggestion.fromJson(json);
        expect(suggestion.status, equals(status));
      }
    });

    test('fromJson handles different urgency levels', () {
      final urgencyLevels = ['low', 'medium', 'high'];

      for (final level in urgencyLevels) {
        final json = {
          'suggestion_id': 1,
          'recipe_id': 1,
          'recipe_name': 'Test',
          'base_price': 10.0,
          'urgency_level': level,
          'status': 'pending',
          'suggested_at': '2024-01-01T10:00:00Z',
        };

        final suggestion = RecipeSuggestion.fromJson(json);
        expect(suggestion.urgencyLevel, equals(level));
      }
    });

    test('fromJson handles numeric types for prices', () {
      final jsonInt = {
        'suggestion_id': 1,
        'recipe_id': 1,
        'recipe_name': 'Test',
        'base_price': 10, // int
        'suggested_discount_percentage': 15, // int
        'calculated_discounted_price': 8, // int
        'status': 'pending',
        'suggested_at': '2024-01-01T10:00:00Z',
      };

      final suggestion = RecipeSuggestion.fromJson(jsonInt);

      expect(suggestion.basePrice, equals(10.0));
      expect(suggestion.suggestedDiscountPercentage, equals(15.0));
      expect(suggestion.calculatedDiscountedPrice, equals(8.0));
    });

    test('fromJson handles string numbers for prices', () {
      final jsonString = {
        'suggestion_id': 1,
        'recipe_id': 1,
        'recipe_name': 'Test',
        'base_price': '12.50', // string
        'suggested_discount_percentage': '20.0', // string
        'calculated_discounted_price': '10.00', // string
        'status': 'pending',
        'suggested_at': '2024-01-01T10:00:00Z',
      };

      final suggestion = RecipeSuggestion.fromJson(jsonString);

      expect(suggestion.basePrice, equals(12.50));
      expect(suggestion.suggestedDiscountPercentage, equals(20.0));
      expect(suggestion.calculatedDiscountedPrice, equals(10.00));
    });

    test('fromJson handles zero discount', () {
      final json = {
        'suggestion_id': 1,
        'recipe_id': 1,
        'recipe_name': 'Test',
        'base_price': 10.0,
        'suggested_discount_percentage': 0.0,
        'calculated_discounted_price': 10.0,
        'status': 'pending',
        'suggested_at': '2024-01-01T10:00:00Z',
      };

      final suggestion = RecipeSuggestion.fromJson(json);

      expect(suggestion.suggestedDiscountPercentage, equals(0.0));
      expect(suggestion.calculatedDiscountedPrice, equals(10.0));
    });

    test('fromJson handles high discount percentage', () {
      final json = {
        'suggestion_id': 1,
        'recipe_id': 1,
        'recipe_name': 'Test',
        'base_price': 20.0,
        'suggested_discount_percentage': 50.0,
        'calculated_discounted_price': 10.0,
        'status': 'pending',
        'suggested_at': '2024-01-01T10:00:00Z',
      };

      final suggestion = RecipeSuggestion.fromJson(json);

      expect(suggestion.suggestedDiscountPercentage, equals(50.0));
      expect(suggestion.calculatedDiscountedPrice, equals(10.0));
    });
  });
}
