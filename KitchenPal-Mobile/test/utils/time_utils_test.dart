import 'package:flutter_test/flutter_test.dart';

// This is an example of a pure unit test for a utility function
// We'll extract the time logic from NotificationsDrawer to test it

String getTimeAgo(String createdAt) {
  final createdTime = DateTime.parse(createdAt);
  final now = DateTime.now();
  final difference = now.difference(createdTime);

  if (difference.inMinutes < 60) {
    return '${difference.inMinutes} minutes ago';
  } else if (difference.inHours < 24) {
    return '${difference.inHours} hours ago';
  } else if (difference.inDays == 1) {
    return 'Yesterday';
  } else {
    return '${difference.inDays} days ago';
  }
}

void main() {
  group('Time Utils Tests', () {
    
    test('returns minutes ago for recent times', () {
      // ARRANGE: Create a time 30 minutes ago
      final thirtyMinutesAgo = DateTime.now().subtract(const Duration(minutes: 30));
      final timeString = thirtyMinutesAgo.toIso8601String();

      // ACT: Call the function
      final result = getTimeAgo(timeString);

      // ASSERT: Check the result
      expect(result, contains('minutes ago'));
      expect(result, contains('30'));
    });

    test('returns hours ago for times within 24 hours', () {
      // ARRANGE
      final fiveHoursAgo = DateTime.now().subtract(const Duration(hours: 5));
      final timeString = fiveHoursAgo.toIso8601String();

      // ACT
      final result = getTimeAgo(timeString);

      // ASSERT
      expect(result, contains('hours ago'));
      expect(result, contains('5'));
    });

    test('returns Yesterday for 1 day ago', () {
      // ARRANGE
      final oneDayAgo = DateTime.now().subtract(const Duration(days: 1));
      final timeString = oneDayAgo.toIso8601String();

      // ACT
      final result = getTimeAgo(timeString);

      // ASSERT
      expect(result, equals('Yesterday'));
    });

    test('returns days ago for multiple days', () {
      // ARRANGE
      final threeDaysAgo = DateTime.now().subtract(const Duration(days: 3));
      final timeString = threeDaysAgo.toIso8601String();

      // ACT
      final result = getTimeAgo(timeString);

      // ASSERT
      expect(result, contains('days ago'));
      expect(result, contains('3'));
    });

    test('handles edge case of 0 minutes', () {
      // ARRANGE
      final now = DateTime.now();
      final timeString = now.toIso8601String();

      // ACT
      final result = getTimeAgo(timeString);

      // ASSERT
      expect(result, contains('minutes ago'));
      expect(result, contains('0'));
    });
  });
}
