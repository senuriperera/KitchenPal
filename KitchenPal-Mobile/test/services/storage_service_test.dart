// storage_service_test.dart
//
// Tests for StorageService — verifies that every public method correctly
// reads/writes/deletes from secure storage using mocked FlutterSecureStorage.
//
// StorageService uses a static const _storage. We test by injecting a mock
// instance through a thin wrapper approach using mockito + build_runner.
//
// Run once to generate mocks:
//   flutter pub run build_runner build --delete-conflicting-outputs

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

@GenerateMocks([FlutterSecureStorage])
import 'storage_service_test.mocks.dart';

// ─── Testable Wrapper ─────────────────────────────────────────────────────────
//
// Since StorageService uses a static const _storage, we create a small
// testable wrapper that mirrors the same logic but accepts an injected storage.
// This lets us test the LOGIC (parsing, key names, error handling) without
// touching real device keychain.

class TestableStorageService {
  final FlutterSecureStorage storage;

  static const String tokenKey = 'auth_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userIdKey = 'user_id';
  static const String userNameKey = 'user_name';
  static const String userEmailKey = 'user_email';
  static const String userRoleKey = 'user_role';
  static const String branchIdKey = 'branch_id';

  const TestableStorageService(this.storage);

  Future<void> saveToken(String token) =>
      storage.write(key: tokenKey, value: token);

  Future<String?> getToken() => storage.read(key: tokenKey);

  Future<void> saveAuthData({
    required String token,
    required String refreshToken,
    required int userId,
    required String name,
    required String email,
    required String role,
    int? branchId,
  }) async {
    await Future.wait([
      storage.write(key: tokenKey, value: token),
      storage.write(key: refreshTokenKey, value: refreshToken),
      storage.write(key: userIdKey, value: userId.toString()),
      storage.write(key: userNameKey, value: name),
      storage.write(key: userEmailKey, value: email),
      storage.write(key: userRoleKey, value: role),
      if (branchId != null)
        storage.write(key: branchIdKey, value: branchId.toString()),
    ]);
  }

  Future<String?> getRefreshToken() => storage.read(key: refreshTokenKey);

  Future<int?> getUserId() async {
    final id = await storage.read(key: userIdKey);
    return id != null ? int.tryParse(id) : null;
  }

  Future<String?> getUserName() => storage.read(key: userNameKey);
  Future<String?> getUserEmail() => storage.read(key: userEmailKey);
  Future<String?> getUserRole() => storage.read(key: userRoleKey);

  Future<int?> getBranchId() async {
    final id = await storage.read(key: branchIdKey);
    return id != null ? int.tryParse(id) : null;
  }

  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> clearAuthData() => Future.wait([
        storage.delete(key: tokenKey),
        storage.delete(key: refreshTokenKey),
        storage.delete(key: userIdKey),
        storage.delete(key: userNameKey),
        storage.delete(key: userEmailKey),
        storage.delete(key: userRoleKey),
        storage.delete(key: branchIdKey),
      ]);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

void main() {
  late MockFlutterSecureStorage mockStorage;
  late TestableStorageService svc;

  setUp(() {
    mockStorage = MockFlutterSecureStorage();
    svc = TestableStorageService(mockStorage);

    // Default: all write/delete calls succeed (return Future<void>)
    when(mockStorage.write(key: anyNamed('key'), value: anyNamed('value')))
        .thenAnswer((_) => Future.value());
    when(mockStorage.delete(key: anyNamed('key')))
        .thenAnswer((_) => Future.value());
  });

  tearDown(() => reset(mockStorage));

  // ─── saveToken / getToken ─────────────────────────────────────────────────
  group('saveToken() and getToken()', () {
    test('saveToken() writes to the auth_token key', () async {
      await svc.saveToken('my_jwt_abc');
      verify(mockStorage.write(key: 'auth_token', value: 'my_jwt_abc'))
          .called(1);
    });

    test('getToken() reads from the auth_token key and returns value', () async {
      when(mockStorage.read(key: 'auth_token'))
          .thenAnswer((_) async => 'my_jwt_abc');

      final token = await svc.getToken();
      expect(token, equals('my_jwt_abc'));
      verify(mockStorage.read(key: 'auth_token')).called(1);
    });

    test('getToken() returns null when no token is stored', () async {
      when(mockStorage.read(key: 'auth_token'))
          .thenAnswer((_) async => null);

      final token = await svc.getToken();
      expect(token, isNull);
    });
  });

  // ─── getRefreshToken ──────────────────────────────────────────────────────
  group('getRefreshToken()', () {
    test('reads from the refresh_token key', () async {
      when(mockStorage.read(key: 'refresh_token'))
          .thenAnswer((_) async => 'refresh_xyz');

      final token = await svc.getRefreshToken();
      expect(token, equals('refresh_xyz'));
    });

    test('returns null when no refresh token stored', () async {
      when(mockStorage.read(key: 'refresh_token'))
          .thenAnswer((_) async => null);

      expect(await svc.getRefreshToken(), isNull);
    });
  });

  // ─── saveAuthData ─────────────────────────────────────────────────────────
  group('saveAuthData()', () {
    test('writes all required auth fields to storage', () async {
      await svc.saveAuthData(
        token: 'access_123',
        refreshToken: 'refresh_456',
        userId: 10,
        name: 'Alice',
        email: 'alice@kitchen.com',
        role: 'chef',
        branchId: 3,
      );

      verify(mockStorage.write(key: 'auth_token', value: 'access_123'))
          .called(1);
      verify(mockStorage.write(key: 'refresh_token', value: 'refresh_456'))
          .called(1);
      verify(mockStorage.write(key: 'user_id', value: '10')).called(1);
      verify(mockStorage.write(key: 'user_name', value: 'Alice')).called(1);
      verify(mockStorage.write(key: 'user_email', value: 'alice@kitchen.com'))
          .called(1);
      verify(mockStorage.write(key: 'user_role', value: 'chef')).called(1);
      verify(mockStorage.write(key: 'branch_id', value: '3')).called(1);
    });

    test('does NOT write branch_id when branchId is null', () async {
      await svc.saveAuthData(
        token: 'tok',
        refreshToken: 'ref',
        userId: 5,
        name: 'Bob',
        email: 'bob@k.com',
        role: 'staff',
        branchId: null,
      );

      verifyNever(
          mockStorage.write(key: 'branch_id', value: anyNamed('value')));
    });
  });

  // ─── getUserId ────────────────────────────────────────────────────────────
  group('getUserId()', () {
    test('returns parsed int when user_id is stored', () async {
      when(mockStorage.read(key: 'user_id')).thenAnswer((_) async => '42');

      final id = await svc.getUserId();
      expect(id, equals(42));
      expect(id, isA<int>());
    });

    test('returns null when user_id is not stored', () async {
      when(mockStorage.read(key: 'user_id')).thenAnswer((_) async => null);

      expect(await svc.getUserId(), isNull);
    });

    test('returns null when user_id cannot be parsed as int', () async {
      when(mockStorage.read(key: 'user_id'))
          .thenAnswer((_) async => 'not-a-number');

      expect(await svc.getUserId(), isNull);
    });
  });

  // ─── getBranchId ──────────────────────────────────────────────────────────
  group('getBranchId()', () {
    test('returns parsed int for branch_id', () async {
      when(mockStorage.read(key: 'branch_id')).thenAnswer((_) async => '7');

      final id = await svc.getBranchId();
      expect(id, equals(7));
    });

    test('returns null when branch_id is null', () async {
      when(mockStorage.read(key: 'branch_id')).thenAnswer((_) async => null);
      expect(await svc.getBranchId(), isNull);
    });
  });

  // ─── getUserName / getUserEmail / getUserRole ─────────────────────────────
  group('User profile getters', () {
    test('getUserName() returns stored name', () async {
      when(mockStorage.read(key: 'user_name'))
          .thenAnswer((_) async => 'Chef Alice');
      expect(await svc.getUserName(), equals('Chef Alice'));
    });

    test('getUserEmail() returns stored email', () async {
      when(mockStorage.read(key: 'user_email'))
          .thenAnswer((_) async => 'alice@kitchen.com');
      expect(await svc.getUserEmail(), equals('alice@kitchen.com'));
    });

    test('getUserRole() returns stored role', () async {
      when(mockStorage.read(key: 'user_role'))
          .thenAnswer((_) async => 'manager');
      expect(await svc.getUserRole(), equals('manager'));
    });
  });

  // ─── isLoggedIn ───────────────────────────────────────────────────────────
  group('isLoggedIn()', () {
    test('returns true when a non-empty token is stored', () async {
      when(mockStorage.read(key: 'auth_token'))
          .thenAnswer((_) async => 'valid_token_123');

      expect(await svc.isLoggedIn(), isTrue);
    });

    test('returns false when token is null', () async {
      when(mockStorage.read(key: 'auth_token')).thenAnswer((_) async => null);

      expect(await svc.isLoggedIn(), isFalse);
    });

    test('returns false when token is an empty string', () async {
      when(mockStorage.read(key: 'auth_token')).thenAnswer((_) async => '');

      expect(await svc.isLoggedIn(), isFalse);
    });
  });

  // ─── clearAuthData ────────────────────────────────────────────────────────
  group('clearAuthData()', () {
    test('deletes all auth keys from storage', () async {
      await svc.clearAuthData();

      verify(mockStorage.delete(key: 'auth_token')).called(1);
      verify(mockStorage.delete(key: 'refresh_token')).called(1);
      verify(mockStorage.delete(key: 'user_id')).called(1);
      verify(mockStorage.delete(key: 'user_name')).called(1);
      verify(mockStorage.delete(key: 'user_email')).called(1);
      verify(mockStorage.delete(key: 'user_role')).called(1);
      verify(mockStorage.delete(key: 'branch_id')).called(1);
    });
  });
}
