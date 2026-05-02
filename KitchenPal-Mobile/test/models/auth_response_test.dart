import 'package:flutter_test/flutter_test.dart';
import 'package:kitchenpal_mobile/models/auth_response.dart';

void main() {
  // ─── AuthResponse Tests ───────────────────────────────────────────────────
  group('AuthResponse.fromJson()', () {
    // A realistic JSON payload that the backend returns on successful login
    const validJson = {
      'message': 'Login successful',
      'accessToken': 'eyJhbGciOiJIUzI1NiJ9.test.sig',
      'refreshToken': 'refresh_abc123',
      'user': {
        'user_id': 42,
        'name': 'Jane Chef',
        'email': 'jane@kitchen.com',
        'role': 'chef',
        'branch_id': 3,
      },
    };

    test('parses message correctly', () {
      final result = AuthResponse.fromJson(validJson);
      expect(result.message, equals('Login successful'));
    });

    test('parses accessToken into token field', () {
      final result = AuthResponse.fromJson(validJson);
      expect(result.token, equals('eyJhbGciOiJIUzI1NiJ9.test.sig'));
    });

    test('parses refreshToken correctly', () {
      final result = AuthResponse.fromJson(validJson);
      expect(result.refreshToken, equals('refresh_abc123'));
    });

    test('parses nested user object correctly', () {
      final result = AuthResponse.fromJson(validJson);
      expect(result.user.userId, equals(42));
      expect(result.user.name, equals('Jane Chef'));
      expect(result.user.email, equals('jane@kitchen.com'));
      expect(result.user.role, equals('chef'));
    });

    test('refreshToken is null when missing from JSON', () {
      // Some responses (e.g. token refresh endpoint) may omit refreshToken
      final jsonWithoutRefresh = Map<String, dynamic>.from(validJson)
        ..remove('refreshToken');
      final result = AuthResponse.fromJson(jsonWithoutRefresh);
      expect(result.refreshToken, isNull);
    });
  });

  // ─── LoginRequest Tests ───────────────────────────────────────────────────
  group('LoginRequest.toJson()', () {
    test('serialises email and password correctly', () {
      final request = LoginRequest(
        email: 'staff@kitchen.com',
        password: 'secret123',
      );
      final json = request.toJson();
      expect(json['email'], equals('staff@kitchen.com'));
      expect(json['password'], equals('secret123'));
      expect(json.length, equals(2)); // no extra fields
    });
  });

  // ─── RegisterRequest Tests ────────────────────────────────────────────────
  group('RegisterRequest.toJson()', () {
    test('serialises name, email, and password correctly', () {
      final request = RegisterRequest(
        name: 'New Staff',
        email: 'new@kitchen.com',
        password: 'pass123',
      );
      final json = request.toJson();
      expect(json['name'], equals('New Staff'));
      expect(json['email'], equals('new@kitchen.com'));
      expect(json['password'], equals('pass123'));
    });
  });
}
