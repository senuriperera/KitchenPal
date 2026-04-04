import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/api_constants.dart';
import 'storage_service.dart';

class NotificationBellService {
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

  /// Fetch bell notifications (recipe_approved, recipe_rejected)
  static Future<Map<String, dynamic>> getBellNotifications() async {
    try {
      var token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final url = '${ApiConstants.baseUrl}/notifications/bell';
      print('Fetching notifications from: $url');
      
      var response = await http.get(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      // Retry once if token expired
      if (response.statusCode == 401) {
        await _refreshTokenIfExpired();
        token = await StorageService.getToken();
        response = await http.get(
          Uri.parse(url),
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        );
      }

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized');
      } else {
        throw Exception('Failed to fetch bell notifications: ${response.statusCode}');
      }
    } catch (e) {
      print('Exception in getBellNotifications: $e');
      rethrow;
    }
  }

  /// Mark a single notification as read
  static Future<void> markAsRead(int notificationId) async {
    try {
      var token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      var response = await http.patch(
        Uri.parse('${ApiConstants.baseUrl}/notifications/bell/$notificationId/read'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      // Retry once if token expired
      if (response.statusCode == 401) {
        await _refreshTokenIfExpired();
        token = await StorageService.getToken();
        response = await http.patch(
          Uri.parse('${ApiConstants.baseUrl}/notifications/bell/$notificationId/read'),
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        );
      }

      if (response.statusCode != 200) {
        throw Exception('Failed to mark notification as read');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Mark all bell notifications as read
  static Future<void> markAllAsRead() async {
    try {
      var token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      var response = await http.patch(
        Uri.parse('${ApiConstants.baseUrl}/notifications/bell/read-all'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      // Retry once if token expired
      if (response.statusCode == 401) {
        await _refreshTokenIfExpired();
        token = await StorageService.getToken();
        response = await http.patch(
          Uri.parse('${ApiConstants.baseUrl}/notifications/bell/read-all'),
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        );
      }

      if (response.statusCode != 200) {
        throw Exception('Failed to mark all notifications as read');
      }
    } catch (e) {
      rethrow;
    }
  }
}
