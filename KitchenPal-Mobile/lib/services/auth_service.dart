import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/auth_response.dart';
import 'storage_service.dart';
import '../config/api_constants.dart';

class AuthService {
  static String get baseUrl => '${ApiConstants.baseUrl}/auth';

  // Login
  static Future<AuthResponse> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (response.statusCode == 200) {
        final authResponse = AuthResponse.fromJson(jsonDecode(response.body));

        // Save auth data to secure storage
        await StorageService.saveAuthData(
          token: authResponse.token,
          refreshToken: authResponse.refreshToken ?? '',
          userId: authResponse.user.userId,
          name: authResponse.user.name,
          email: authResponse.user.email,
          role: authResponse.user.role,
          branchId: authResponse.user.branchId,
        );

        return authResponse;
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Login failed');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  // Register
  static Future<AuthResponse> register(
    String name,
    String email,
    String password,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'name': name, 'email': email, 'password': password}),
      );

      if (response.statusCode == 201) {
        final authResponse = AuthResponse.fromJson(jsonDecode(response.body));

        // Save auth data to secure storage
        await StorageService.saveAuthData(
          token: authResponse.token,
          refreshToken: authResponse.refreshToken ?? '',
          userId: authResponse.user.userId,
          name: authResponse.user.name,
          email: authResponse.user.email,
          role: authResponse.user.role,
          branchId: authResponse.user.branchId,
        );

        return authResponse;
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Registration failed');
      }
    } catch (e) {
      throw Exception('Network error: $e');
    }
  }

  // Logout
  static Future<void> logout() async {
    try {
      final token = await StorageService.getToken();

      if (token != null) {
        await http.post(
          Uri.parse('$baseUrl/logout'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
        );
      }
    } catch (e) {
      // Continue with logout even if API call fails
      print('Logout API error: $e');
    } finally {
      // Clear local storage
      await StorageService.clearAuthData();
    }
  }

  // Get current user profile
  static Future<Map<String, dynamic>?> getCurrentUser() async {
    final token = await StorageService.getToken();

    if (token == null) return null;

    try {
      final response = await http.get(
        Uri.parse('$baseUrl/me'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
      return null;
    } catch (e) {
      print('Get current user error: $e');
      return null;
    }
  }

  // Check if token is valid
  static Future<bool> isTokenValid() async {
    final user = await getCurrentUser();
    return user != null;
  }
}
