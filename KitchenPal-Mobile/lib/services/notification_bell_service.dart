import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/api_constants.dart';
import 'storage_service.dart';

class NotificationBellService {
  /// Fetch bell notifications (recipe_approved, recipe_rejected)
  static Future<Map<String, dynamic>> getBellNotifications() async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final url = '${ApiConstants.baseUrl}/notifications/bell';
      print('Fetching notifications from: $url');
      
      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

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
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await http.patch(
        Uri.parse('${ApiConstants.baseUrl}/notifications/bell/$notificationId/read'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

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
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await http.patch(
        Uri.parse('${ApiConstants.baseUrl}/notifications/bell/read-all'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to mark all notifications as read');
      }
    } catch (e) {
      rethrow;
    }
  }
}
