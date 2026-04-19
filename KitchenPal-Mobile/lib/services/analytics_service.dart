import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/dashboard_stats.dart';
import '../models/monthly_summary.dart';
import '../models/nearing_expiry_item.dart';
import '../models/top_wasted.dart';
import '../config/api_constants.dart';
import 'storage_service.dart';

class AnalyticsService {
  static Future<Map<String, String>> _authHeaders() async {
    final token = await StorageService.getToken();
    if (token == null) throw Exception('No authentication token found');
    return {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };
  }

  // Refresh token if expired
  static Future<void> _refreshTokenIfExpired() async {
    final refreshToken = await StorageService.getRefreshToken();
    if (refreshToken == null) throw Exception('No refresh token found');

    final response = await http.post(
      Uri.parse('${ApiConstants.baseUrl}/auth/refresh'),
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

  // GET /api/analytics/dashboard-stats
  static Future<DashboardStats> getDashboardStats({String? branchId}) async {
    final headers = await _authHeaders();
    final url = branchId != null
        ? '${ApiConstants.baseUrl}/analytics/dashboard-stats?branch_id=$branchId'
        : '${ApiConstants.baseUrl}/analytics/dashboard-stats';

    var response = await http.get(
      Uri.parse(url),
      headers: headers,
    );

    // Retry once if token expired
    if (response.statusCode == 401) {
      await _refreshTokenIfExpired();
      final newHeaders = await _authHeaders();
      response = await http.get(
        Uri.parse(url),
        headers: newHeaders,
      );
    }

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return DashboardStats.fromJson(json);
    } else if (response.statusCode == 401) {
      throw Exception('401');
    } else {
      throw Exception('Failed to load dashboard stats: ${response.statusCode}');
    }
  }

  // GET /api/analytics/monthly-summary
  static Future<MonthlySummary> getMonthlySummary({
    int months = 6,
    String? branchId,
  }) async {
    final headers = await _authHeaders();
    final url = branchId != null
        ? '${ApiConstants.baseUrl}/analytics/monthly-summary?months=$months&branch_id=$branchId'
        : '${ApiConstants.baseUrl}/analytics/monthly-summary?months=$months';

    var response = await http.get(
      Uri.parse(url),
      headers: headers,
    );

    // Retry once if token expired
    if (response.statusCode == 401) {
      await _refreshTokenIfExpired();
      final newHeaders = await _authHeaders();
      response = await http.get(
        Uri.parse(url),
        headers: newHeaders,
      );
    }

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return MonthlySummary.fromJson(json);
    } else if (response.statusCode == 401) {
      throw Exception('401');
    } else {
      throw Exception('Failed to load monthly summary: ${response.statusCode}');
    }
  }

  // GET /api/analytics/top-wasted
  static Future<TopWastedReport> getTopWasted({
    String dateRange = 'last_30_days',
    String? branchId,
  }) async {
    final headers = await _authHeaders();
    var urlStr =
        '${ApiConstants.baseUrl}/analytics/top-wasted?date_range=$dateRange';
    if (branchId != null) urlStr += '&branch_id=$branchId';

    var response = await http.get(Uri.parse(urlStr), headers: headers);

    if (response.statusCode == 401) {
      await _refreshTokenIfExpired();
      final newHeaders = await _authHeaders();
      response = await http.get(Uri.parse(urlStr), headers: newHeaders);
    }

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return TopWastedReport.fromJson(json);
    } else if (response.statusCode == 401) {
      throw Exception('401');
    } else {
      throw Exception('Failed to load top wasted: ${response.statusCode}');
    }
  }

  // GET /api/analytics/nearing-expiry-list
  static Future<List<NearingExpiryItem>> getNearingExpiryList({
    String? branchId,
  }) async {
    final headers = await _authHeaders();
    final url = branchId != null
        ? '${ApiConstants.baseUrl}/analytics/nearing-expiry-list?branch_id=$branchId'
        : '${ApiConstants.baseUrl}/analytics/nearing-expiry-list';

    var response = await http.get(
      Uri.parse(url),
      headers: headers,
    );

    // Retry once if token expired
    if (response.statusCode == 401) {
      await _refreshTokenIfExpired();
      final newHeaders = await _authHeaders();
      response = await http.get(
        Uri.parse(url),
        headers: newHeaders,
      );
    }

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final List<dynamic> list = json['nearingExpiry'] ?? [];
      return list
          .map((item) => NearingExpiryItem.fromJson(item as Map<String, dynamic>))
          .toList();
    } else if (response.statusCode == 401) {
      throw Exception('401');
    } else {
      throw Exception('Failed to load nearing expiry list: ${response.statusCode}');
    }
  }
}
