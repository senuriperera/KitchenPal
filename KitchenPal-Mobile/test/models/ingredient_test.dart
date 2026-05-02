import 'package:flutter_test/flutter_test.dart';
import 'package:kitchenpal_mobile/models/ingredient.dart';

void main() {
  // ─── Helpers ──────────────────────────────────────────────────────────────
  /// Returns a complete, valid ingredient JSON matching the backend schema.
  Map<String, dynamic> validIngredientJson({
    String? expiryDate,
    String? manufactureDate,
  }) {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    return {
      'ingredient_id': 1,
      'name': 'Tomatoes',
      'image_url': 'https://cdn.example.com/tomatoes.jpg',
      'quantity_in_stock': 10,
      'unit_weight': 0.2,
      'unit_weight_unit_code': 'kg',
      'total_base_quantity': 2.0,
      'base_unit_code': 'kg',
      'price': '150.00',
      'manufacture_date': manufactureDate,
      'expiry_date':
          expiryDate ?? tomorrow.toIso8601String().substring(0, 10),
      'storage_type_id': 1,
      'storage_type_name': 'Refrigerator',
      'master_ingredient_id': 5,
      'unit_family': 'weight',
      'added_by_name': 'Jane Chef',
      'unit_weight_unit_id': 2,
      'base_unit_id': 2,
      'batches': [],
    };
  }

  // ─── fromJson() Parsing ───────────────────────────────────────────────────
  group('Ingredient.fromJson()', () {
    test('parses all basic fields correctly', () {
      final ingredient = Ingredient.fromJson(validIngredientJson());

      expect(ingredient.ingredientId, equals(1));
      expect(ingredient.name, equals('Tomatoes'));
      expect(ingredient.imageUrl, equals('https://cdn.example.com/tomatoes.jpg'));
      expect(ingredient.quantityInStock, equals(10.0));
      expect(ingredient.unitWeight, equals(0.2));
      expect(ingredient.unitWeightUnitCode, equals('kg'));
      expect(ingredient.totalBaseQuantity, equals(2.0));
      expect(ingredient.baseUnitCode, equals('kg'));
      expect(ingredient.price, equals(150.0));
      expect(ingredient.storageTypeId, equals(1));
      expect(ingredient.storageTypeName, equals('Refrigerator'));
      expect(ingredient.masterIngredientId, equals(5));
      expect(ingredient.unitFamily, equals('weight'));
      expect(ingredient.addedByName, equals('Jane Chef'));
    });

    test('price parsed correctly from String', () {
      final ingredient = Ingredient.fromJson(validIngredientJson());
      expect(ingredient.price, isA<double>());
      expect(ingredient.price, equals(150.0));
    });

    test('manufactureDate is null when not provided', () {
      final ingredient = Ingredient.fromJson(
        validIngredientJson(manufactureDate: null),
      );
      expect(ingredient.manufactureDate, isNull);
    });

    test('manufactureDate is parsed when provided', () {
      final ingredient = Ingredient.fromJson(
        validIngredientJson(manufactureDate: '2024-01-15'),
      );
      expect(ingredient.manufactureDate, isNotNull);
      expect(ingredient.manufactureDate!.month, equals(1));
    });

    test('batches defaults to empty list when missing', () {
      final json = validIngredientJson();
      json.remove('batches');
      final ingredient = Ingredient.fromJson(json);
      expect(ingredient.batches, isEmpty);
    });

    test('handles null/missing optional fields gracefully', () {
      final json = validIngredientJson();
      json['image_url'] = null;
      json['added_by_name'] = null;
      final ingredient = Ingredient.fromJson(json);
      expect(ingredient.imageUrl, isNull);
      expect(ingredient.addedByName, isNull);
    });
  });

  // ─── daysUntilExpiry Getter ───────────────────────────────────────────────
  group('Ingredient.daysUntilExpiry', () {
    test('returns positive number for future expiry', () {
      final futureDate = DateTime.now().add(const Duration(days: 5));
      final json = validIngredientJson(
        expiryDate: '${futureDate.year}-${futureDate.month.toString().padLeft(2, '0')}-${futureDate.day.toString().padLeft(2, '0')}',
      );
      final ingredient = Ingredient.fromJson(json);
      expect(ingredient.daysUntilExpiry, equals(5));
    });

    test('returns 0 for expiry today', () {
      final today = DateTime.now();
      final json = validIngredientJson(
        expiryDate: '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}',
      );
      final ingredient = Ingredient.fromJson(json);
      expect(ingredient.daysUntilExpiry, equals(0));
    });

    test('returns negative number for past expiry', () {
      final pastDate = DateTime.now().subtract(const Duration(days: 3));
      final json = validIngredientJson(
        expiryDate: '${pastDate.year}-${pastDate.month.toString().padLeft(2, '0')}-${pastDate.day.toString().padLeft(2, '0')}',
      );
      final ingredient = Ingredient.fromJson(json);
      expect(ingredient.daysUntilExpiry, equals(-3));
    });
  });

  // ─── isExpired Getter ─────────────────────────────────────────────────────
  group('Ingredient.isExpired', () {
    test('returns false for a future expiry date', () {
      final future = DateTime.now().add(const Duration(days: 2));
      final json = validIngredientJson(
        expiryDate: '${future.year}-${future.month.toString().padLeft(2, '0')}-${future.day.toString().padLeft(2, '0')}',
      );
      expect(Ingredient.fromJson(json).isExpired, isFalse);
    });

    test('returns true for a past expiry date', () {
      final past = DateTime.now().subtract(const Duration(days: 1));
      final json = validIngredientJson(
        expiryDate: '${past.year}-${past.month.toString().padLeft(2, '0')}-${past.day.toString().padLeft(2, '0')}',
      );
      expect(Ingredient.fromJson(json).isExpired, isTrue);
    });

    test('returns false for expiry today (not expired yet)', () {
      final today = DateTime.now();
      final json = validIngredientJson(
        expiryDate: '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}',
      );
      expect(Ingredient.fromJson(json).isExpired, isFalse);
    });
  });

  // ─── formattedExpiryDate Getter ───────────────────────────────────────────
  group('Ingredient.formattedExpiryDate', () {
    test('returns "Expired" for past date', () {
      final past = DateTime.now().subtract(const Duration(days: 2));
      final json = validIngredientJson(
        expiryDate: '${past.year}-${past.month.toString().padLeft(2, '0')}-${past.day.toString().padLeft(2, '0')}',
      );
      expect(Ingredient.fromJson(json).formattedExpiryDate, equals('Expired'));
    });

    test('returns "Expires Today" for today', () {
      final today = DateTime.now();
      final json = validIngredientJson(
        expiryDate: '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}',
      );
      expect(
        Ingredient.fromJson(json).formattedExpiryDate,
        equals('Expires Today'),
      );
    });

    test('returns "Expires Tomorrow" for tomorrow', () {
      final tomorrow = DateTime.now().add(const Duration(days: 1));
      final json = validIngredientJson(
        expiryDate: '${tomorrow.year}-${tomorrow.month.toString().padLeft(2, '0')}-${tomorrow.day.toString().padLeft(2, '0')}',
      );
      expect(
        Ingredient.fromJson(json).formattedExpiryDate,
        equals('Expires Tomorrow'),
      );
    });

    test('returns "Exp: X Days" for expiry within 7 days', () {
      final soon = DateTime.now().add(const Duration(days: 5));
      final json = validIngredientJson(
        expiryDate: '${soon.year}-${soon.month.toString().padLeft(2, '0')}-${soon.day.toString().padLeft(2, '0')}',
      );
      expect(
        Ingredient.fromJson(json).formattedExpiryDate,
        equals('Exp: 5 Days'),
      );
    });

    test('returns date string for expiry beyond 7 days', () {
      final future = DateTime.now().add(const Duration(days: 30));
      final json = validIngredientJson(
        expiryDate: '${future.year}-${future.month.toString().padLeft(2, '0')}-${future.day.toString().padLeft(2, '0')}',
      );
      final result = Ingredient.fromJson(json).formattedExpiryDate;
      // Should look like "30/5/2026" — just check it's not one of the special strings
      expect(result, isNot(equals('Expired')));
      expect(result, isNot(equals('Expires Today')));
      expect(result, contains('/'));
    });
  });

  // ─── displayTotalWeight Getter ────────────────────────────────────────────
  group('Ingredient.displayTotalWeight', () {
    test('returns formatted total weight string', () {
      final ingredient = Ingredient.fromJson(validIngredientJson());
      // totalBaseQuantity = 2.0, baseUnitCode = 'kg' → "2 kg"
      expect(ingredient.displayTotalWeight, equals('2 kg'));
    });
  });
}
