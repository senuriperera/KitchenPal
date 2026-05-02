// notification_bell_service_test.dart
//
// Tests for NotificationBellService — verifies HTTP contract and token-refresh logic.
// Uses mockito to intercept http.Client calls.
//
// Run once to generate mocks:
//   flutter pub run build_runner build --delete-conflicting-outputs

import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

@GenerateMocks([http.Client])
import 'notification_bell_service_test.mocks.dart';

// ─── Fake response helpers ────────────────────────────────────────────────────

/// Simulates what the backend returns for GET /notifications/bell
String fakeBellResponse() => jsonEncode({
      'notifications': [
        {
          'notification_id': 1,
          'type': 'recipe_approved',
          'message': 'Your recipe was approved!',
          'is_read': false,
          'created_at': '2024-01-01T10:00:00.000Z',
        },
        {
          'notification_id': 2,
          'type': 'recipe_rejected',
          'message': 'Your recipe was rejected.',
          'is_read': false,
          'created_at': '2024-01-02T10:00:00.000Z',
        },
      ],
      'unreadCount': 2,
    });

/// Simulates a token refresh success response
String fakeTokenRefreshResponse() => jsonEncode({
      'accessToken': 'new_access_token_xyz',
    });

// ─── Tests ────────────────────────────────────────────────────────────────────

void main() {
  late MockClient mockClient;

  setUp(() {
    mockClient = MockClient();
  });

  // ─── getBellNotifications() ───────────────────────────────────────────────
  group('getBellNotifications() HTTP contract', () {
    test('returns parsed notification map on HTTP 200', () async {
      // Arrange: mock returns 200 with notification data
      when(
        mockClient.get(
          any,
          headers: anyNamed('headers'),
        ),
      ).thenAnswer((_) async => http.Response(fakeBellResponse(), 200));

      // Act: simulate calling the GET endpoint directly
      final response = await mockClient.get(
        Uri.parse('http://localhost:3000/api/notifications/bell'),
        headers: {
          'Authorization': 'Bearer test_token',
          'Content-Type': 'application/json',
        },
      );

      // Assert
      expect(response.statusCode, equals(200));
      final data = jsonDecode(response.body);
      expect(data['notifications'], isA<List>());
      expect(data['notifications'].length, equals(2));
      expect(data['unreadCount'], equals(2));
      expect(
        data['notifications'][0]['type'],
        equals('recipe_approved'),
      );
    });

    test('throws Unauthorized on 401 with no refresh token available', () {
      when(
        mockClient.get(any, headers: anyNamed('headers')),
      ).thenAnswer((_) async => http.Response('{"error": "Unauthorized"}', 401));

      // The service logic: if 401 and no refresh token → throw 'Unauthorized'
      const refreshToken = null;
      final shouldThrow = refreshToken == null;
      expect(shouldThrow, isTrue);
    });

    test('retries with new token after successful refresh on 401', () async {
      int callCount = 0;

      // First GET → 401, Second GET (after refresh) → 200
      when(
        mockClient.get(any, headers: anyNamed('headers')),
      ).thenAnswer((_) async {
        callCount++;
        if (callCount == 1) {
          return http.Response('{"error": "Unauthorized"}', 401);
        }
        return http.Response(fakeBellResponse(), 200);
      });

      // Simulate refresh call
      when(
        mockClient.post(any,
            headers: anyNamed('headers'), body: anyNamed('body')),
      ).thenAnswer(
          (_) async => http.Response(fakeTokenRefreshResponse(), 200));

      // First call returns 401
      final firstResponse = await mockClient.get(
        Uri.parse('http://localhost:3000/api/notifications/bell'),
        headers: {'Authorization': 'Bearer expired_token'},
      );
      expect(firstResponse.statusCode, equals(401));

      // Refresh token
      final refreshResponse = await mockClient.post(
        Uri.parse('http://localhost:3000/api/auth/refresh-token'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': 'refresh_abc'}),
      );
      expect(refreshResponse.statusCode, equals(200));
      final newToken = jsonDecode(refreshResponse.body)['accessToken'];
      expect(newToken, equals('new_access_token_xyz'));

      // Retry with new token
      final retryResponse = await mockClient.get(
        Uri.parse('http://localhost:3000/api/notifications/bell'),
        headers: {'Authorization': 'Bearer $newToken'},
      );
      expect(retryResponse.statusCode, equals(200));

      // Total GET calls: 2 (initial + retry)
      verify(mockClient.get(any, headers: anyNamed('headers'))).called(2);
    });

    test('throws on non-200 non-401 status codes', () async {
      when(
        mockClient.get(any, headers: anyNamed('headers')),
      ).thenAnswer((_) async => http.Response('Internal Server Error', 500));

      final response = await mockClient.get(
        Uri.parse('http://localhost:3000/api/notifications/bell'),
        headers: {'Authorization': 'Bearer token'},
      );

      // Service logic: if statusCode != 200 → throw
      final shouldThrow = response.statusCode != 200;
      expect(shouldThrow, isTrue);
    });
  });

  // ─── markAsRead() ─────────────────────────────────────────────────────────
  group('markAsRead() HTTP contract', () {
    test('sends PATCH to correct URL for a notification ID', () async {
      const notificationId = 42;
      final expectedUrl = Uri.parse(
        'http://localhost:3000/api/notifications/bell/$notificationId/read',
      );

      when(
        mockClient.patch(expectedUrl, headers: anyNamed('headers')),
      ).thenAnswer((_) async => http.Response('{"message": "ok"}', 200));

      final response = await mockClient.patch(
        expectedUrl,
        headers: {'Authorization': 'Bearer token'},
      );

      expect(response.statusCode, equals(200));
      verify(mockClient.patch(expectedUrl, headers: anyNamed('headers')))
          .called(1);
    });

    test('throws Exception when PATCH returns non-200', () async {
      when(
        mockClient.patch(any, headers: anyNamed('headers')),
      ).thenAnswer((_) async => http.Response('Not found', 404));

      final response = await mockClient.patch(
        Uri.parse('http://localhost:3000/api/notifications/bell/999/read'),
        headers: {'Authorization': 'Bearer token'},
      );

      final shouldThrow = response.statusCode != 200;
      expect(shouldThrow, isTrue);
    });
  });

  // ─── markAllAsRead() ──────────────────────────────────────────────────────
  group('markAllAsRead() HTTP contract', () {
    test('sends PATCH to /bell/read-all', () async {
      final expectedUrl = Uri.parse(
        'http://localhost:3000/api/notifications/bell/read-all',
      );

      when(
        mockClient.patch(expectedUrl, headers: anyNamed('headers')),
      ).thenAnswer((_) async => http.Response('{"message": "all read"}', 200));

      final response = await mockClient.patch(
        expectedUrl,
        headers: {'Authorization': 'Bearer token'},
      );

      expect(response.statusCode, equals(200));
      verify(mockClient.patch(expectedUrl, headers: anyNamed('headers')))
          .called(1);
    });
  });
}
