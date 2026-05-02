import 'package:flutter_test/flutter_test.dart';
import 'package:kitchenpal_mobile/models/ingredient.dart';

void main() {
  group('Ingredient Model Tests', () {
    
    test('fromJson creates Ingredient correctly with all fields', () {
      final json = {
        'ingredient_id': 1,
        'name': 'Tomato',
        'image_url': 'https://example.com/tomato.jpg',
        'quantity_in_stock': 10.5,
        'unit_weight': 200.0,
        'unit_weight_unit_code': 'g',
        'total_base_quantity': 2100.0,
        'base_unit_code': 'g',
        'price': 5.99,
        'manufacture_date': '2024-01-01',
        'expiry_date': '2024-12-31',
        'storage_type_id': 1,
        'storage_type_name': 'Refrigerated',
        'master_ingredient_id': 10,
        'unit_family': 'weight',
        'added_by_name': 'John Doe',
        'unit_weight_unit_id': 5,
        'base_unit_id': 5,
        'batches': [],
      };

      final ingredient = Ingredient.fromJson(json);

      expect(ingredient.ingredientId, equals(1));
      expect(ingredient.name, equals('Tomato'));
      expect(ingredient.imageUrl, equals('https://example.com/tomato.jpg'));
      expect(ingredient.quantityInStock, equals(10.5));
      expect(ingredient.unitWeight, equals(200.0));
      expect(ingredient.unitWeightUnitCode, equals('g'));
      expect(ingredient.totalBaseQuantity, equals(2100.0));
      expect(ingredient.baseUnitCode, equals('g'));
      expect(ingredient.price, equals(5.99));
      expect(ingredient.manufactureDate, equals(DateTime.parse('2024-01-01')));
      expect(ingredient.expiryDate, equals(DateTime.parse('2024-12-31')));
      expect(ingredient.storageTypeId, equals(1));
      expect(ingredient.storageTypeName, equals('Refrigerated'));
      expect(ingredient.masterIngredientId, equals(10));
      expect(ingredient.unitFamily, equals('weight'));
      expect(ingredient.addedByName, equals('John Doe'));
      expect(ingredient.batches, isEmpty);
    });

    test('fromJson handles null optional fields', () {
      final json = {
        'ingredient_id': 2,
        'name': 'Onion',
        'quantity_in_stock': 5,
        'unit_weight': 150,
        'unit_weight_unit_code': 'g',
        'total_base_quantity': 750,
        'base_unit_code': 'g',
        'price': 3.50,
        'expiry_date': '2024-06-30',
        'storage_type_id': 2,
        'storage_type_name': 'Dry',
        'master_ingredient_id': 20,
      };

      final ingredient = Ingredient.fromJson(json);

      expect(ingredient.imageUrl, isNull);
      expect(ingredient.manufactureDate, isNull);
      expect(ingredient.addedByName, isNull);
      expect(ingredient.unitFamily, equals('weight')); // default
    });

    test('parseDouble handles different numeric types', () {
      final jsonInt = {
        'ingredient_id': 1,
        'name': 'Test',
        'quantity_in_stock': 10, // int
        'unit_weight': 200, // int
        'unit_weight_unit_code': 'g',
        'total_base_quantity': 2000, // int
        'base_unit_code': 'g',
        'price': 5, // int
        'expiry_date': '2024-12-31',
        'storage_type_id': 1,
        'storage_type_name': 'Test',
        'master_ingredient_id': 1,
      };

      final ingredient = Ingredient.fromJson(jsonInt);

      expect(ingredient.quantityInStock, equals(10.0));
      expect(ingredient.unitWeight, equals(200.0));
      expect(ingredient.price, equals(5.0));
    });

    test('parseDouble handles string numbers', () {
      final jsonString = {
        'ingredient_id': 1,
        'name': 'Test',
        'quantity_in_stock': '10.5', // string
        'unit_weight': '200.0', // string
        'unit_weight_unit_code': 'g',
        'total_base_quantity': '2100.0', // string
        'base_unit_code': 'g',
        'price': '5.99', // string
        'expiry_date': '2024-12-31',
        'storage_type_id': 1,
        'storage_type_name': 'Test',
        'master_ingredient_id': 1,
      };

      final ingredient = Ingredient.fromJson(jsonString);

      expect(ingredient.quantityInStock, equals(10.5));
      expect(ingredient.unitWeight, equals(200.0));
      expect(ingredient.price, equals(5.99));
    });

    test('displayTotalWeight formats correctly', () {
      final ingredient = Ingredient(
        ingredientId: 1,
        name: 'Test',
        quantityInStock: 10,
        unitWeight: 200,
        unitWeightUnitCode: 'g',
        totalBaseQuantity: 2500.75,
        baseUnitCode: 'g',
        price: 5.0,
        expiryDate: DateTime.parse('2024-12-31'),
        storageTypeId: 1,
        storageTypeName: 'Test',
        masterIngredientId: 1,
        unitFamily: 'weight',
      );

      expect(ingredient.displayTotalWeight, equals('2501 g'));
    });

    test('daysUntilExpiry calculates correctly for future date', () {
      final tomorrow = DateTime.now().add(const Duration(days: 5));
      final ingredient = Ingredient(
        ingredientId: 1,
        name: 'Test',
        quantityInStock: 10,
        unitWeight: 200,
        unitWeightUnitCode: 'g',
        totalBaseQuantity: 2000,
        baseUnitCode: 'g',
        price: 5.0,
        expiryDate: tomorrow,
        storageTypeId: 1,
        storageTypeName: 'Test',
        masterIngredientId: 1,
        unitFamily: 'weight',
      );

      expect(ingredient.daysUntilExpiry, equals(5));
    });

    test('isExpired returns true for past date', () {
      final yesterday = DateTime.now().subtract(const Duration(days: 1));
      final ingredient = Ingredient(
        ingredientId: 1,
        name: 'Test',
        quantityInStock: 10,
        unitWeight: 200,
        unitWeightUnitCode: 'g',
        totalBaseQuantity: 2000,
        baseUnitCode: 'g',
        price: 5.0,
        expiryDate: yesterday,
        storageTypeId: 1,
        storageTypeName: 'Test',
        masterIngredientId: 1,
        unitFamily: 'weight',
      );

      expect(ingredient.isExpired, isTrue);
    });

    test('isExpired returns false for future date', () {
      final tomorrow = DateTime.now().add(const Duration(days: 1));
      final ingredient = Ingredient(
        ingredientId: 1,
        name: 'Test',
        quantityInStock: 10,
        unitWeight: 200,
        unitWeightUnitCode: 'g',
        totalBaseQuantity: 2000,
        baseUnitCode: 'g',
        price: 5.0,
        expiryDate: tomorrow,
        storageTypeId: 1,
        storageTypeName: 'Test',
        masterIngredientId: 1,
        unitFamily: 'weight',
      );

      expect(ingredient.isExpired, isFalse);
    });

    test('formattedExpiryDate shows "Expired" for past date', () {
      final yesterday = DateTime.now().subtract(const Duration(days: 1));
      final ingredient = Ingredient(
        ingredientId: 1,
        name: 'Test',
        quantityInStock: 10,
        unitWeight: 200,
        unitWeightUnitCode: 'g',
        totalBaseQuantity: 2000,
        baseUnitCode: 'g',
        price: 5.0,
        expiryDate: yesterday,
        storageTypeId: 1,
        storageTypeName: 'Test',
        masterIngredientId: 1,
        unitFamily: 'weight',
      );

      expect(ingredient.formattedExpiryDate, equals('Expired'));
    });

    test('formattedExpiryDate shows "Expires Today" for today', () {
      final today = DateTime.now();
      final ingredient = Ingredient(
        ingredientId: 1,
        name: 'Test',
        quantityInStock: 10,
        unitWeight: 200,
        unitWeightUnitCode: 'g',
        totalBaseQuantity: 2000,
        baseUnitCode: 'g',
        price: 5.0,
        expiryDate: today,
        storageTypeId: 1,
        storageTypeName: 'Test',
        masterIngredientId: 1,
        unitFamily: 'weight',
      );

      expect(ingredient.formattedExpiryDate, equals('Expires Today'));
    });

    test('formattedExpiryDate shows "Expires Tomorrow" for tomorrow', () {
      final tomorrow = DateTime.now().add(const Duration(days: 1));
      final ingredient = Ingredient(
        ingredientId: 1,
        name: 'Test',
        quantityInStock: 10,
        unitWeight: 200,
        unitWeightUnitCode: 'g',
        totalBaseQuantity: 2000,
        baseUnitCode: 'g',
        price: 5.0,
        expiryDate: tomorrow,
        storageTypeId: 1,
        storageTypeName: 'Test',
        masterIngredientId: 1,
        unitFamily: 'weight',
      );

      expect(ingredient.formattedExpiryDate, equals('Expires Tomorrow'));
    });

    test('formattedExpiryDate shows days for 2-7 days', () {
      final fiveDays = DateTime.now().add(const Duration(days: 5));
      final ingredient = Ingredient(
        ingredientId: 1,
        name: 'Test',
        quantityInStock: 10,
        unitWeight: 200,
        unitWeightUnitCode: 'g',
        totalBaseQuantity: 2000,
        baseUnitCode: 'g',
        price: 5.0,
        expiryDate: fiveDays,
        storageTypeId: 1,
        storageTypeName: 'Test',
        masterIngredientId: 1,
        unitFamily: 'weight',
      );

      expect(ingredient.formattedExpiryDate, equals('Exp: 5 Days'));
    });

    test('formattedExpiryDate shows full date for >7 days', () {
      // Use a date far in the future to ensure it's >7 days away
      final farFuture = DateTime.now().add(const Duration(days: 365));
      final ingredient = Ingredient(
        ingredientId: 1,
        name: 'Test',
        quantityInStock: 10,
        unitWeight: 200,
        unitWeightUnitCode: 'g',
        totalBaseQuantity: 2000,
        baseUnitCode: 'g',
        price: 5.0,
        expiryDate: farFuture,
        storageTypeId: 1,
        storageTypeName: 'Test',
        masterIngredientId: 1,
        unitFamily: 'weight',
      );

      // Check that it shows the full date format (day/month/year)
      expect(ingredient.formattedExpiryDate, contains('/'));
      expect(ingredient.formattedExpiryDate.split('/').length, equals(3));
    });
  });
}
