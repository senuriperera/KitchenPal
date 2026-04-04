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

  /// Refresh token if expired
  static Future<void> _refreshTokenIfExpired() async {
    final refreshToken = await StorageService.getRefreshToken();
    if (refreshToken == null) throw Exception('No refresh token found');

    final response = await http.post(
      Uri.parse('${ApiConstants.baseUrl}/auth/refresh-token'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': refreshToken}),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final newAccessToken = json['accessToken'];
      await StorageService.saveToken(newAccessToken);
    } else {
      throw Exception('Failed to refresh token');
    }
  }

  /// GET /api/notifications
  /// Returns expiry-nearing batch items with real batch_id and remaining_base_quantity.
  static Future<List<ExpiryNotification>> getExpiryNotifications() async {
    var headers = await _authHeaders();
    var response = await http.get(
      Uri.parse('${ApiConstants.baseUrl}/notifications'),
      headers: headers,
    );

    // Retry once if token expired
    if (response.statusCode == 401) {
      await _refreshTokenIfExpired();
      headers = await _authHeaders();
      response = await http.get(
        Uri.parse('${ApiConstants.baseUrl}/notifications'),
        headers: headers,
      );
    }

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
    var headers = await _authHeaders();
    var response = await http.patch(
      Uri.parse('${ApiConstants.baseUrl}/notifications/$notificationId/acknowledge'),
      headers: headers,
    );

    // Retry once if token expired
    if (response.statusCode == 401) {
      await _refreshTokenIfExpired();
      headers = await _authHeaders();
      response = await http.patch(
        Uri.parse('${ApiConstants.baseUrl}/notifications/$notificationId/acknowledge'),
        headers: headers,
      );
    }
  }
}
