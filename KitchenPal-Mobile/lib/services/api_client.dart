import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_constants.dart';
import 'storage_service.dart';

/// A centralized HTTP client that automatically handles token refresh
/// when receiving 401 responses. This eliminates the need for manual
/// token refresh logic in every service.
class ApiClient {
  static bool _isRefreshing = false;

  /// Makes an authenticated HTTP request with automatic token refresh
  /// 
  /// If the request fails with 401, it will:
  /// 1. Attempt to refresh the access token using the refresh token
  /// 2. Retry the original request with the new token
  /// 3. If refresh fails, throw an exception (user needs to login again)
  static Future<http.Response> request({
    required String method,
    required String endpoint,
    Map<String, String>? headers,
    dynamic body,
    bool requiresAuth = true,
  }) async {
    // Build headers
    final requestHeaders = <String, String>{
      'Content-Type': 'application/json',
      ...?headers,
    };

    // Add auth token if required
    if (requiresAuth) {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }
      requestHeaders['Authorization'] = 'Bearer $token';
    }

    // Build URI
    final uri = Uri.parse('${ApiConstants.baseUrl}$endpoint');

    // Make the request
    http.Response response;
    switch (method.toUpperCase()) {
      case 'GET':
        response = await http.get(uri, headers: requestHeaders);
        break;
      case 'POST':
        response = await http.post(
          uri,
          headers: requestHeaders,
          body: body != null ? jsonEncode(body) : null,
        );
        break;
      case 'PUT':
        response = await http.put(
          uri,
          headers: requestHeaders,
          body: body != null ? jsonEncode(body) : null,
        );
        break;
      case 'PATCH':
        response = await http.patch(
          uri,
          headers: requestHeaders,
          body: body != null ? jsonEncode(body) : null,
        );
        break;
      case 'DELETE':
        response = await http.delete(uri, headers: requestHeaders);
        break;
      default:
        throw Exception('Unsupported HTTP method: $method');
    }

    // Handle 401 - Token expired
    if (response.statusCode == 401 && requiresAuth) {
      // Try to refresh the token
      final refreshed = await _refreshToken();
      
      if (refreshed) {
        // Retry the original request with new token
        final newToken = await StorageService.getToken();
        requestHeaders['Authorization'] = 'Bearer $newToken';

        switch (method.toUpperCase()) {
          case 'GET':
            response = await http.get(uri, headers: requestHeaders);
            break;
          case 'POST':
            response = await http.post(
              uri,
              headers: requestHeaders,
              body: body != null ? jsonEncode(body) : null,
            );
            break;
          case 'PUT':
            response = await http.put(
              uri,
              headers: requestHeaders,
              body: body != null ? jsonEncode(body) : null,
            );
            break;
          case 'PATCH':
            response = await http.patch(
              uri,
              headers: requestHeaders,
              body: body != null ? jsonEncode(body) : null,
            );
            break;
          case 'DELETE':
            response = await http.delete(uri, headers: requestHeaders);
            break;
        }
      } else {
        // Refresh failed - user needs to login again
        throw Exception('SESSION_EXPIRED');
      }
    }

    return response;
  }

  /// Convenience method for GET requests
  static Future<http.Response> get(
    String endpoint, {
    Map<String, String>? headers,
    bool requiresAuth = true,
  }) {
    return request(
      method: 'GET',
      endpoint: endpoint,
      headers: headers,
      requiresAuth: requiresAuth,
    );
  }

  /// Convenience method for POST requests
  static Future<http.Response> post(
    String endpoint, {
    dynamic body,
    Map<String, String>? headers,
    bool requiresAuth = true,
  }) {
    return request(
      method: 'POST',
      endpoint: endpoint,
      body: body,
      headers: headers,
      requiresAuth: requiresAuth,
    );
  }

  /// Convenience method for PUT requests
  static Future<http.Response> put(
    String endpoint, {
    dynamic body,
    Map<String, String>? headers,
    bool requiresAuth = true,
  }) {
    return request(
      method: 'PUT',
      endpoint: endpoint,
      body: body,
      headers: headers,
      requiresAuth: requiresAuth,
    );
  }

  /// Convenience method for PATCH requests
  static Future<http.Response> patch(
    String endpoint, {
    dynamic body,
    Map<String, String>? headers,
    bool requiresAuth = true,
  }) {
    return request(
      method: 'PATCH',
      endpoint: endpoint,
      body: body,
      headers: headers,
      requiresAuth: requiresAuth,
    );
  }

  /// Convenience method for DELETE requests
  static Future<http.Response> delete(
    String endpoint, {
    Map<String, String>? headers,
    bool requiresAuth = true,
  }) {
    return request(
      method: 'DELETE',
      endpoint: endpoint,
      headers: headers,
      requiresAuth: requiresAuth,
    );
  }

  /// Refreshes the access token using the refresh token
  /// Returns true if successful, false otherwise
  static Future<bool> _refreshToken() async {
    // Prevent multiple simultaneous refresh attempts
    if (_isRefreshing) {
      // Wait for the ongoing refresh to complete
      int attempts = 0;
      while (_isRefreshing && attempts < 50) {
        await Future.delayed(const Duration(milliseconds: 100));
        attempts++;
      }
      return await StorageService.getToken() != null;
    }

    _isRefreshing = true;

    try {
      final refreshToken = await StorageService.getRefreshToken();
      
      if (refreshToken == null || refreshToken.isEmpty) {
        return false;
      }

      final response = await http.post(
        Uri.parse('${ApiConstants.baseUrl}/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final newAccessToken = data['accessToken'];
        
        if (newAccessToken != null) {
          await StorageService.saveToken(newAccessToken);
          return true;
        }
      }

      return false;
    } catch (e) {
      return false;
    } finally {
      _isRefreshing = false;
    }
  }
}
