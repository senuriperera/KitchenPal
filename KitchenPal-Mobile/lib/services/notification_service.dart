import 'dart:convert';
import '../models/expiry_notification.dart';
import 'api_client.dart';

class NotificationService {
  /// GET /api/notifications
  /// Returns expiry-nearing batch items with real batch_id and remaining_base_quantity.
  static Future<List<ExpiryNotification>> getExpiryNotifications() async {
    final response = await ApiClient.get('/notifications');

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final List<dynamic> items = json['items'] ?? [];
      return items
          .map((j) => ExpiryNotification.fromJson(j as Map<String, dynamic>))
          .toList();
    } else {
      throw Exception('Failed to load notifications: ${response.statusCode}');
    }
  }

  /// PATCH /api/notifications/:id/acknowledge
  static Future<void> acknowledgeNotification(int notificationId) async {
    await ApiClient.patch('/notifications/$notificationId/acknowledge');
  }
}
