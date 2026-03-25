import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/expiry_notification.dart';
import '../config/api_constants.dart';
import 'storage_service.dart';

class NotificationService {
  static Future<Map<String, String>> _authHeaders() async {
    final token = await StorageService.getToken();
    if (token == null) throw Exception('No authentication token found');
    return {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };
  }

  /// GET /api/notifications
  /// Returns expiry-nearing batch items with real batch_id and remaining_base_quantity.
  static Future<List<ExpiryNotification>> getExpiryNotifications() async {
    final headers = await _authHeaders();
    final response = await http.get(
      Uri.parse('${ApiConstants.baseUrl}/notifications'),
      headers: headers,
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final List<dynamic> items = json['items'] ?? [];
      return items
          .map((j) => ExpiryNotification.fromJson(j as Map<String, dynamic>))
          .toList();
    } else if (response.statusCode == 401) {
      throw Exception('Unauthorized: Please login again');
    } else {
      throw Exception(
          'Failed to load notifications: ${response.statusCode}');
    }
  }

  /// PATCH /api/notifications/:id/acknowledge
  static Future<void> acknowledgeNotification(int notificationId) async {
    final headers = await _authHeaders();
    await http.patch(
      Uri.parse('${ApiConstants.baseUrl}/notifications/$notificationId/acknowledge'),
      headers: headers,
    );
  }
}
