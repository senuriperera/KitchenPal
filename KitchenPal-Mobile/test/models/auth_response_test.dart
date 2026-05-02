import 'package:flutter_test/flutter_test.dart';
import 'package:kitchenpal_mobile/models/auth_response.dart';
import 'package:kitchenpal_mobile/models/user.dart';

void main() {
  group('AuthResponse Model Tests', () {
    
    test('fromJson creates AuthResponse correctly', () {
      // ARRANGE: Create mock JSON data (like what comes from API)
      final json = {
        'message': 'Login successful',
        'accessToken': 'abc123token',
        'refreshToken': 'refresh456',
        'user': {
          'user_id': 1,
          'name': 'John Doe',
          'email': 'john@example.com',
          'role': 'staff',
          'branch_id': 5,
        }
      };

      // ACT: Parse JSON into AuthResponse object
      final authResponse = AuthResponse.fromJson(json);

      // ASSERT: Check all fields are correct
      expect(authResponse.message, equals('Login successful'));
      expect(authResponse.token, equals('abc123token'));
      expect(authResponse.refreshToken, equals('refresh456'));
      expect(authResponse.user.userId, equals(1));
      expect(authResponse.user.name, equals('John Doe'));
      expect(authResponse.user.email, equals('john@example.com'));
      expect(authResponse.user.role, equals('staff'));
      expect(authResponse.user.branchId, equals(5));
    });

    test('fromJson handles null refreshToken', () {
      // ARRANGE: JSON without refreshToken
      final json = {
        'message': 'Login successful',
        'accessToken': 'abc123token',
        'user': {
          'user_id': 1,
          'name': 'John Doe',
          'email': 'john@example.com',
          'role': 'staff',
          'branch_id': null,
        }
      };

      // ACT
      final authResponse = AuthResponse.fromJson(json);

      // ASSERT
      expect(authResponse.refreshToken, isNull);
      expect(authResponse.user.branchId, isNull);
    });
  });

  group('LoginRequest Model Tests', () {
    
    test('toJson converts LoginRequest to JSON correctly', () {
      // ARRANGE
      final loginRequest = LoginRequest(
        email: 'test@example.com',
        password: 'password123',
      );

      // ACT
      final json = loginRequest.toJson();

      // ASSERT
      expect(json['email'], equals('test@example.com'));
      expect(json['password'], equals('password123'));
      expect(json.length, equals(2)); // Only 2 fields
    });

    test('LoginRequest stores email and password', () {
      // ARRANGE & ACT
      final loginRequest = LoginRequest(
        email: 'user@test.com',
        password: 'securepass',
      );

      // ASSERT
      expect(loginRequest.email, equals('user@test.com'));
      expect(loginRequest.password, equals('securepass'));
    });
  });

  group('RegisterRequest Model Tests', () {
    
    test('toJson converts RegisterRequest to JSON correctly', () {
      // ARRANGE
      final registerRequest = RegisterRequest(
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password456',
      );

      // ACT
      final json = registerRequest.toJson();

      // ASSERT
      expect(json['name'], equals('Jane Smith'));
      expect(json['email'], equals('jane@example.com'));
      expect(json['password'], equals('password456'));
      expect(json.length, equals(3)); // Only 3 fields
    });

    test('RegisterRequest stores all fields', () {
      // ARRANGE & ACT
      final registerRequest = RegisterRequest(
        name: 'Test User',
        email: 'test@example.com',
        password: 'testpass',
      );

      // ASSERT
      expect(registerRequest.name, equals('Test User'));
      expect(registerRequest.email, equals('test@example.com'));
      expect(registerRequest.password, equals('testpass'));
    });
  });

  group('User Model Tests', () {
    
    test('fromJson creates User correctly', () {
      // ARRANGE
      final json = {
        'user_id': 42,
        'name': 'Alice Johnson',
        'email': 'alice@example.com',
        'role': 'manager',
        'branch_id': 10,
      };

      // ACT
      final user = User.fromJson(json);

      // ASSERT
      expect(user.userId, equals(42));
      expect(user.name, equals('Alice Johnson'));
      expect(user.email, equals('alice@example.com'));
      expect(user.role, equals('manager'));
      expect(user.branchId, equals(10));
    });

    test('toJson converts User to JSON correctly', () {
      // ARRANGE
      final user = User(
        userId: 99,
        name: 'Bob Wilson',
        email: 'bob@example.com',
        role: 'staff',
        branchId: 3,
      );

      // ACT
      final json = user.toJson();

      // ASSERT
      expect(json['user_id'], equals(99));
      expect(json['name'], equals('Bob Wilson'));
      expect(json['email'], equals('bob@example.com'));
      expect(json['role'], equals('staff'));
      expect(json['branch_id'], equals(3));
    });

    test('User handles null branchId', () {
      // ARRANGE
      final json = {
        'user_id': 1,
        'name': 'Test User',
        'email': 'test@example.com',
        'role': 'admin',
        'branch_id': null,
      };

      // ACT
      final user = User.fromJson(json);

      // ASSERT
      expect(user.branchId, isNull);
    });

    test('User roundtrip (toJson -> fromJson) preserves data', () {
      // ARRANGE
      final originalUser = User(
        userId: 123,
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        role: 'staff',
        branchId: 7,
      );

      // ACT: Convert to JSON and back
      final json = originalUser.toJson();
      final reconstructedUser = User.fromJson(json);

      // ASSERT: All data should be the same
      expect(reconstructedUser.userId, equals(originalUser.userId));
      expect(reconstructedUser.name, equals(originalUser.name));
      expect(reconstructedUser.email, equals(originalUser.email));
      expect(reconstructedUser.role, equals(originalUser.role));
      expect(reconstructedUser.branchId, equals(originalUser.branchId));
    });
  });
}
