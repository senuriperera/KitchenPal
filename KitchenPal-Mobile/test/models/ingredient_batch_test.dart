import 'package:flutter_test/flutter_test.dart';
import 'package:kitchenpal_mobile/models/ingredient_batch.dart';

void main() {
  group('IngredientBatch Model Tests', () {
    
    test('fromJson creates IngredientBatch correctly with all fields', () {
      final json = {
        'batch_id': 1,
        'remaining_base_quantity': 500.5,
        'base_unit_code': 'g',
        'expiry_date': '2024-12-31',
        'is_depleted': false,
      };

      final batch = IngredientBatch.fromJson(json);

      expect(batch.batchId, equals(1));
      expect(batch.remainingBaseQuantity, equals(500.5));
      expect(batch.baseUnitCode, equals('g'));
      expect(batch.expiryDate, equals(DateTime.parse('2024-12-31')));
      expect(batch.isDepleted, isFalse);
    });

    test('fromJson handles missing fields with defaults', () {
      final json = {
        'expiry_date': '2024-12-31',
      };

      final batch = IngredientBatch.fromJson(json);

      expect(batch.batchId, equals(0));
      expect(batch.remainingBaseQuantity, equals(0.0));
      expect(batch.baseUnitCode, equals(''));
      expect(batch.isDepleted, isFalse); // default
    });

    test('fromJson handles depleted batch', () {
      final json = {
        'batch_id': 2,
        'remaining_base_quantity': 0.0,
        'base_unit_code': 'kg',
        'expiry_date': '2024-06-30',
        'is_depleted': true,
      };

      final batch = IngredientBatch.fromJson(json);

      expect(batch.isDepleted, isTrue);
      expect(batch.remainingBaseQuantity, equals(0.0));
    });

    test('parseDouble handles int values', () {
      final json = {
        'batch_id': 3,
        'remaining_base_quantity': 100, // int
        'base_unit_code': 'mL',
        'expiry_date': '2024-08-15',
        'is_depleted': false,
      };

      final batch = IngredientBatch.fromJson(json);

      expect(batch.remainingBaseQuantity, equals(100.0));
      expect(batch.remainingBaseQuantity, isA<double>());
    });

    test('parseDouble handles string numbers', () {
      final json = {
        'batch_id': 4,
        'remaining_base_quantity': '250.75', // string
        'base_unit_code': 'L',
        'expiry_date': '2024-09-20',
        'is_depleted': false,
      };

      final batch = IngredientBatch.fromJson(json);

      expect(batch.remainingBaseQuantity, equals(250.75));
    });

    test('parseDouble handles null values', () {
      final json = {
        'batch_id': 5,
        'remaining_base_quantity': null,
        'base_unit_code': 'pcs',
        'expiry_date': '2024-10-10',
        'is_depleted': false,
      };

      final batch = IngredientBatch.fromJson(json);

      expect(batch.remainingBaseQuantity, equals(0.0));
    });

    test('parseDouble handles invalid string', () {
      final json = {
        'batch_id': 6,
        'remaining_base_quantity': 'invalid',
        'base_unit_code': 'g',
        'expiry_date': '2024-11-11',
        'is_depleted': false,
      };

      final batch = IngredientBatch.fromJson(json);

      expect(batch.remainingBaseQuantity, equals(0.0));
    });

    test('fromJson handles different unit codes', () {
      final unitCodes = ['g', 'kg', 'mL', 'L', 'pcs', 'oz', 'lb'];

      for (final unitCode in unitCodes) {
        final json = {
          'batch_id': 1,
          'remaining_base_quantity': 100.0,
          'base_unit_code': unitCode,
          'expiry_date': '2024-12-31',
          'is_depleted': false,
        };

        final batch = IngredientBatch.fromJson(json);
        expect(batch.baseUnitCode, equals(unitCode));
      }
    });

    test('fromJson handles past expiry date', () {
      final json = {
        'batch_id': 7,
        'remaining_base_quantity': 50.0,
        'base_unit_code': 'g',
        'expiry_date': '2020-01-01',
        'is_depleted': false,
      };

      final batch = IngredientBatch.fromJson(json);

      expect(batch.expiryDate, equals(DateTime.parse('2020-01-01')));
      expect(batch.expiryDate.isBefore(DateTime.now()), isTrue);
    });

    test('fromJson handles future expiry date', () {
      final json = {
        'batch_id': 8,
        'remaining_base_quantity': 200.0,
        'base_unit_code': 'kg',
        'expiry_date': '2030-12-31',
        'is_depleted': false,
      };

      final batch = IngredientBatch.fromJson(json);

      expect(batch.expiryDate, equals(DateTime.parse('2030-12-31')));
      expect(batch.expiryDate.isAfter(DateTime.now()), isTrue);
    });

    test('fromJson handles large quantities', () {
      final json = {
        'batch_id': 9,
        'remaining_base_quantity': 99999.99,
        'base_unit_code': 'g',
        'expiry_date': '2024-12-31',
        'is_depleted': false,
      };

      final batch = IngredientBatch.fromJson(json);

      expect(batch.remainingBaseQuantity, equals(99999.99));
    });

    test('fromJson handles decimal quantities', () {
      final json = {
        'batch_id': 10,
        'remaining_base_quantity': 0.001,
        'base_unit_code': 'kg',
        'expiry_date': '2024-12-31',
        'is_depleted': false,
      };

      final batch = IngredientBatch.fromJson(json);

      expect(batch.remainingBaseQuantity, equals(0.001));
    });
  });
}
