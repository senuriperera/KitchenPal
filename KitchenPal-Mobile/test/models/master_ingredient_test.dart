import 'package:flutter_test/flutter_test.dart';
import 'package:kitchenpal_mobile/models/master_ingredient.dart';

void main() {
  group('MasterIngredient Model Tests', () {
    
    test('fromJson creates MasterIngredient correctly with all fields', () {
      final json = {
        'master_ingredient_id': 1,
        'name': 'Tomato',
        'unit_family': 'weight',
        'base_unit_id': 5,
        'default_unit_id': 10,
      };

      final ingredient = MasterIngredient.fromJson(json);

      expect(ingredient.masterIngredientId, equals(1));
      expect(ingredient.name, equals('Tomato'));
      expect(ingredient.unitFamily, equals('weight'));
      expect(ingredient.baseUnitId, equals(5));
      expect(ingredient.defaultUnitId, equals(10));
    });

    test('fromJson handles null optional fields', () {
      final json = {
        'master_ingredient_id': 2,
        'name': 'Onion',
        'unit_family': 'volume',
      };

      final ingredient = MasterIngredient.fromJson(json);

      expect(ingredient.masterIngredientId, equals(2));
      expect(ingredient.name, equals('Onion'));
      expect(ingredient.unitFamily, equals('volume'));
      expect(ingredient.baseUnitId, isNull);
      expect(ingredient.defaultUnitId, isNull);
    });

    test('fromJson handles missing fields with defaults', () {
      final json = <String, dynamic>{};

      final ingredient = MasterIngredient.fromJson(json);

      expect(ingredient.masterIngredientId, equals(0));
      expect(ingredient.name, equals(''));
      expect(ingredient.unitFamily, equals('weight')); // default
      expect(ingredient.baseUnitId, isNull);
      expect(ingredient.defaultUnitId, isNull);
    });

    test('fromJson handles weight unit family', () {
      final json = {
        'master_ingredient_id': 3,
        'name': 'Flour',
        'unit_family': 'weight',
      };

      final ingredient = MasterIngredient.fromJson(json);
      expect(ingredient.unitFamily, equals('weight'));
    });

    test('fromJson handles volume unit family', () {
      final json = {
        'master_ingredient_id': 4,
        'name': 'Milk',
        'unit_family': 'volume',
      };

      final ingredient = MasterIngredient.fromJson(json);
      expect(ingredient.unitFamily, equals('volume'));
    });

    test('fromJson handles count unit family', () {
      final json = {
        'master_ingredient_id': 5,
        'name': 'Eggs',
        'unit_family': 'count',
      };

      final ingredient = MasterIngredient.fromJson(json);
      expect(ingredient.unitFamily, equals('count'));
    });
  });
}
