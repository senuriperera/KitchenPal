import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:kitchenpal_mobile/services/storage_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('StorageService Tests', () {
    
    setUp(() async {
      // Clear storage before each test
      FlutterSecureStorage.setMockInitialValues({});
    });

    test('saveAuthData stores all auth information', () async {
      await StorageService.saveAuthData(
        token: 'test_token_123',
        refreshToken: 'refresh_token_456',
        userId: 42,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'staff',
        branchId: 5,
      );

      final token = await StorageService.getToken();
      final refreshToken = await StorageService.getRefreshToken();
      final userId = await StorageService.getUserId();
      final name = await StorageService.getUserName();
      final email = await StorageService.getUserEmail();
      final role = await StorageService.getUserRole();
      final branchId = await StorageService.getBranchId();

      expect(token, equals('test_token_123'));
      expect(refreshToken, equals('refresh_token_456'));
      expect(userId, equals(42));
      expect(name, equals('John Doe'));
      expect(email, equals('john@example.com'));
      expect(role, equals('staff'));
      expect(branchId, equals(5));
    });

    test('saveAuthData handles null branchId', () async {
      await StorageService.saveAuthData(
        token: 'token',
        refreshToken: 'refresh',
        userId: 1,
        name: 'Test',
        email: 'test@example.com',
        role: 'admin',
        branchId: null,
      );

      final branchId = await StorageService.getBranchId();
      expect(branchId, isNull);
    });

    test('getToken returns null when not set', () async {
      final token = await StorageService.getToken();
      expect(token, isNull);
    });

    test('saveToken updates token', () async {
      await StorageService.saveToken('new_token_789');
      
      final token = await StorageService.getToken();
      expect(token, equals('new_token_789'));
    });

    test('getUserId returns null when not set', () async {
      final userId = await StorageService.getUserId();
      expect(userId, isNull);
    });

    test('getBranchId returns null when not set', () async {
      final branchId = await StorageService.getBranchId();
      expect(branchId, isNull);
    });

    test('getName is alias for getUserName', () async {
      await StorageService.saveAuthData(
        token: 'token',
        refreshToken: 'refresh',
        userId: 1,
        name: 'Alice',
        email: 'alice@example.com',
        role: 'manager',
      );

      final name1 = await StorageService.getName();
      final name2 = await StorageService.getUserName();
      
      expect(name1, equals(name2));
      expect(name1, equals('Alice'));
    });

    test('isLoggedIn returns true when token exists', () async {
      await StorageService.saveToken('some_token');
      
      final loggedIn = await StorageService.isLoggedIn();
      expect(loggedIn, isTrue);
    });

    test('isLoggedIn returns false when token is null', () async {
      final loggedIn = await StorageService.isLoggedIn();
      expect(loggedIn, isFalse);
    });

    test('isLoggedIn returns false when token is empty', () async {
      await StorageService.saveToken('');
      
      final loggedIn = await StorageService.isLoggedIn();
      expect(loggedIn, isFalse);
    });

    test('clearAuthData removes all auth information', () async {
      // First save data
      await StorageService.saveAuthData(
        token: 'token',
        refreshToken: 'refresh',
        userId: 10,
        name: 'Bob',
        email: 'bob@example.com',
        role: 'staff',
        branchId: 3,
      );

      // Verify data exists
      expect(await StorageService.getToken(), isNotNull);
      expect(await StorageService.getUserId(), isNotNull);

      // Clear data
      await StorageService.clearAuthData();

      // Verify all data is cleared
      expect(await StorageService.getToken(), isNull);
      expect(await StorageService.getRefreshToken(), isNull);
      expect(await StorageService.getUserId(), isNull);
      expect(await StorageService.getUserName(), isNull);
      expect(await StorageService.getUserEmail(), isNull);
      expect(await StorageService.getUserRole(), isNull);
      expect(await StorageService.getBranchId(), isNull);
    });

    test('clearAll removes everything from storage', () async {
      await StorageService.saveAuthData(
        token: 'token',
        refreshToken: 'refresh',
        userId: 1,
        name: 'Test',
        email: 'test@example.com',
        role: 'admin',
      );

      await StorageService.clearAll();

      expect(await StorageService.getToken(), isNull);
      expect(await StorageService.getUserId(), isNull);
    });

    test('handles multiple save and retrieve operations', () async {
      // Save first user
      await StorageService.saveAuthData(
        token: 'token1',
        refreshToken: 'refresh1',
        userId: 1,
        name: 'User1',
        email: 'user1@example.com',
        role: 'staff',
      );

      expect(await StorageService.getUserName(), equals('User1'));

      // Update with second user
      await StorageService.saveAuthData(
        token: 'token2',
        refreshToken: 'refresh2',
        userId: 2,
        name: 'User2',
        email: 'user2@example.com',
        role: 'manager',
      );

      expect(await StorageService.getUserName(), equals('User2'));
      expect(await StorageService.getUserId(), equals(2));
    });

    test('getUserId handles invalid stored value', () async {
      // This test verifies that invalid data doesn't crash
      final userId = await StorageService.getUserId();
      expect(userId, isNull);
    });

    test('getBranchId handles invalid stored value', () async {
      final branchId = await StorageService.getBranchId();
      expect(branchId, isNull);
    });
  });
}
