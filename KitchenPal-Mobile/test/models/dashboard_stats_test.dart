import 'package:flutter_test/flutter_test.dart';
import 'package:kitchenpal_mobile/models/dashboard_stats.dart';

void main() {
  group('FamilyQuantity Model Tests', () {
    
    test('fromJson creates FamilyQuantity correctly', () {
      final json = {
        'value': 150.5,
        'unit': 'kg',
        'display': '150.5 kg',
      };

      final quantity = FamilyQuantity.fromJson(json);

      expect(quantity.value, equals(150.5));
      expect(quantity.unit, equals('kg'));
      expect(quantity.display, equals('150.5 kg'));
    });

    test('fromJson handles missing fields with defaults', () {
      final json = <String, dynamic>{};

      final quantity = FamilyQuantity.fromJson(json);

      expect(quantity.value, equals(0.0));
      expect(quantity.unit, equals(''));
      expect(quantity.display, equals(''));
    });

    test('fromJson converts int to double', () {
      final json = {
        'value': 100, // int
        'unit': 'g',
        'display': '100 g',
      };

      final quantity = FamilyQuantity.fromJson(json);

      expect(quantity.value, equals(100.0));
      expect(quantity.value, isA<double>());
    });
  });

  group('DashboardFamilyTotals Model Tests', () {
    
    test('fromJson creates DashboardFamilyTotals correctly', () {
      final json = {
        'weight': {
          'value': 50.0,
          'unit': 'kg',
          'display': '50 kg',
        },
        'volume': {
          'value': 30.0,
          'unit': 'L',
          'display': '30 L',
        },
        'count': {
          'value': 100.0,
          'unit': 'pcs',
          'display': '100 pcs',
        },
        'changePercent': 15.5,
      };

      final totals = DashboardFamilyTotals.fromJson(json);

      expect(totals.weight.value, equals(50.0));
      expect(totals.weight.unit, equals('kg'));
      expect(totals.volume.value, equals(30.0));
      expect(totals.volume.unit, equals('L'));
      expect(totals.count.value, equals(100.0));
      expect(totals.count.unit, equals('pcs'));
      expect(totals.changePercent, equals(15.5));
    });

    test('fromJson handles missing nested objects', () {
      final json = <String, dynamic>{};

      final totals = DashboardFamilyTotals.fromJson(json);

      expect(totals.weight.value, equals(0.0));
      expect(totals.volume.value, equals(0.0));
      expect(totals.count.value, equals(0.0));
      expect(totals.changePercent, equals(0.0));
    });

    test('fromJson handles negative changePercent', () {
      final json = {
        'weight': {'value': 10.0, 'unit': 'kg', 'display': '10 kg'},
        'volume': {'value': 5.0, 'unit': 'L', 'display': '5 L'},
        'count': {'value': 20.0, 'unit': 'pcs', 'display': '20 pcs'},
        'changePercent': -25.3,
      };

      final totals = DashboardFamilyTotals.fromJson(json);

      expect(totals.changePercent, equals(-25.3));
    });
  });

  group('ProfitFromDiscounts Model Tests', () {
    
    test('fromJson creates ProfitFromDiscounts correctly', () {
      final json = {
        'current': 1250.75,
        'changePercent': 12.5,
      };

      final profit = ProfitFromDiscounts.fromJson(json);

      expect(profit.current, equals(1250.75));
      expect(profit.changePercent, equals(12.5));
    });

    test('fromJson handles missing fields with defaults', () {
      final json = <String, dynamic>{};

      final profit = ProfitFromDiscounts.fromJson(json);

      expect(profit.current, equals(0.0));
      expect(profit.changePercent, equals(0.0));
    });

    test('fromJson converts int to double', () {
      final json = {
        'current': 1000, // int
        'changePercent': 10, // int
      };

      final profit = ProfitFromDiscounts.fromJson(json);

      expect(profit.current, equals(1000.0));
      expect(profit.changePercent, equals(10.0));
    });
  });

  group('DashboardStats Model Tests', () {
    
    test('fromJson creates DashboardStats correctly with all fields', () {
      final json = {
        'nearExpiry': 5,
        'foodWasted': {
          'weight': {'value': 20.0, 'unit': 'kg', 'display': '20 kg'},
          'volume': {'value': 10.0, 'unit': 'L', 'display': '10 L'},
          'count': {'value': 50.0, 'unit': 'pcs', 'display': '50 pcs'},
          'changePercent': -10.0,
        },
        'foodSaved': {
          'weight': {'value': 80.0, 'unit': 'kg', 'display': '80 kg'},
          'volume': {'value': 40.0, 'unit': 'L', 'display': '40 L'},
          'count': {'value': 200.0, 'unit': 'pcs', 'display': '200 pcs'},
          'changePercent': 25.0,
        },
        'savedPercentage': 80,
        'activeDiscounts': 12,
        'profitFromDiscounts': {
          'current': 5000.0,
          'changePercent': 15.0,
        },
      };

      final stats = DashboardStats.fromJson(json);

      expect(stats.nearExpiry, equals(5));
      expect(stats.foodWasted.weight.value, equals(20.0));
      expect(stats.foodWasted.changePercent, equals(-10.0));
      expect(stats.foodSaved.weight.value, equals(80.0));
      expect(stats.foodSaved.changePercent, equals(25.0));
      expect(stats.savedPercentage, equals(80));
      expect(stats.activeDiscounts, equals(12));
      expect(stats.profitFromDiscounts.current, equals(5000.0));
      expect(stats.profitFromDiscounts.changePercent, equals(15.0));
    });

    test('fromJson handles missing fields with defaults', () {
      final json = <String, dynamic>{};

      final stats = DashboardStats.fromJson(json);

      expect(stats.nearExpiry, equals(0));
      expect(stats.savedPercentage, equals(0));
      expect(stats.activeDiscounts, equals(0));
      expect(stats.foodWasted.weight.value, equals(0.0));
      expect(stats.foodSaved.weight.value, equals(0.0));
      expect(stats.profitFromDiscounts.current, equals(0.0));
    });

    test('fromJson handles zero values', () {
      final json = {
        'nearExpiry': 0,
        'foodWasted': {
          'weight': {'value': 0.0, 'unit': 'kg', 'display': '0 kg'},
          'volume': {'value': 0.0, 'unit': 'L', 'display': '0 L'},
          'count': {'value': 0.0, 'unit': 'pcs', 'display': '0 pcs'},
          'changePercent': 0.0,
        },
        'foodSaved': {
          'weight': {'value': 0.0, 'unit': 'kg', 'display': '0 kg'},
          'volume': {'value': 0.0, 'unit': 'L', 'display': '0 L'},
          'count': {'value': 0.0, 'unit': 'pcs', 'display': '0 pcs'},
          'changePercent': 0.0,
        },
        'savedPercentage': 0,
        'activeDiscounts': 0,
        'profitFromDiscounts': {
          'current': 0.0,
          'changePercent': 0.0,
        },
      };

      final stats = DashboardStats.fromJson(json);

      expect(stats.nearExpiry, equals(0));
      expect(stats.savedPercentage, equals(0));
      expect(stats.activeDiscounts, equals(0));
    });

    test('fromJson handles large numbers', () {
      final json = {
        'nearExpiry': 999,
        'foodWasted': {
          'weight': {'value': 9999.99, 'unit': 'kg', 'display': '9999.99 kg'},
          'volume': {'value': 8888.88, 'unit': 'L', 'display': '8888.88 L'},
          'count': {'value': 7777.0, 'unit': 'pcs', 'display': '7777 pcs'},
          'changePercent': 100.0,
        },
        'foodSaved': {
          'weight': {'value': 10000.0, 'unit': 'kg', 'display': '10000 kg'},
          'volume': {'value': 5000.0, 'unit': 'L', 'display': '5000 L'},
          'count': {'value': 15000.0, 'unit': 'pcs', 'display': '15000 pcs'},
          'changePercent': 200.0,
        },
        'savedPercentage': 95,
        'activeDiscounts': 100,
        'profitFromDiscounts': {
          'current': 999999.99,
          'changePercent': 500.0,
        },
      };

      final stats = DashboardStats.fromJson(json);

      expect(stats.nearExpiry, equals(999));
      expect(stats.profitFromDiscounts.current, equals(999999.99));
    });

    test('fromJson handles all unit families', () {
      final json = {
        'nearExpiry': 3,
        'foodWasted': {
          'weight': {'value': 100.0, 'unit': 'g', 'display': '100 g'},
          'volume': {'value': 50.0, 'unit': 'mL', 'display': '50 mL'},
          'count': {'value': 25.0, 'unit': 'items', 'display': '25 items'},
          'changePercent': 5.0,
        },
        'foodSaved': {
          'weight': {'value': 500.0, 'unit': 'kg', 'display': '500 kg'},
          'volume': {'value': 250.0, 'unit': 'L', 'display': '250 L'},
          'count': {'value': 1000.0, 'unit': 'pcs', 'display': '1000 pcs'},
          'changePercent': 10.0,
        },
        'savedPercentage': 85,
        'activeDiscounts': 8,
        'profitFromDiscounts': {
          'current': 3500.0,
          'changePercent': 8.5,
        },
      };

      final stats = DashboardStats.fromJson(json);

      expect(stats.foodWasted.weight.unit, equals('g'));
      expect(stats.foodWasted.volume.unit, equals('mL'));
      expect(stats.foodWasted.count.unit, equals('items'));
      expect(stats.foodSaved.weight.unit, equals('kg'));
      expect(stats.foodSaved.volume.unit, equals('L'));
      expect(stats.foodSaved.count.unit, equals('pcs'));
    });
  });
}
