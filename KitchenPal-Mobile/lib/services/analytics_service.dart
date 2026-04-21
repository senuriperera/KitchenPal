import 'dart:convert';
import '../models/dashboard_stats.dart';
import '../models/monthly_summary.dart';
import '../models/nearing_expiry_item.dart';
import '../models/top_wasted.dart';
import 'api_client.dart';

class AnalyticsService {

  // GET /api/analytics/dashboard-stats
  static Future<DashboardStats> getDashboardStats({String? branchId}) async {
    final endpoint = branchId != null
        ? '/analytics/dashboard-stats?branch_id=$branchId'
        : '/analytics/dashboard-stats';

    final response = await ApiClient.get(endpoint);

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return DashboardStats.fromJson(json);
    } else {
      throw Exception('Failed to load dashboard stats: ${response.statusCode}');
    }
  }

  // GET /api/analytics/monthly-summary
  static Future<MonthlySummary> getMonthlySummary({
    int months = 6,
    String? branchId,
  }) async {
    final endpoint = branchId != null
        ? '/analytics/monthly-summary?months=$months&branch_id=$branchId'
        : '/analytics/monthly-summary?months=$months';

    final response = await ApiClient.get(endpoint);

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return MonthlySummary.fromJson(json);
    } else {
      throw Exception('Failed to load monthly summary: ${response.statusCode}');
    }
  }

  // GET /api/analytics/top-wasted
  static Future<TopWastedReport> getTopWasted({
    String dateRange = 'last_30_days',
    String? branchId,
  }) async {
    var endpoint = '/analytics/top-wasted?date_range=$dateRange';
    if (branchId != null) endpoint += '&branch_id=$branchId';

    final response = await ApiClient.get(endpoint);

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return TopWastedReport.fromJson(json);
    } else {
      throw Exception('Failed to load top wasted: ${response.statusCode}');
    }
  }

  // GET /api/analytics/nearing-expiry-list
  static Future<List<NearingExpiryItem>> getNearingExpiryList({
    String? branchId,
  }) async {
    final endpoint = branchId != null
        ? '/analytics/nearing-expiry-list?branch_id=$branchId'
        : '/analytics/nearing-expiry-list';

    final response = await ApiClient.get(endpoint);

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final List<dynamic> list = json['nearingExpiry'] ?? [];
      return list
          .map((item) => NearingExpiryItem.fromJson(item as Map<String, dynamic>))
          .toList();
    } else {
      throw Exception('Failed to load nearing expiry list: ${response.statusCode}');
    }
  }
}
