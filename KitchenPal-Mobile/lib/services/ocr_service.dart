import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_constants.dart';
import 'storage_service.dart';

class OcrService {
  /// Scans an already-uploaded Cloudinary image URL using Google Vision via backend.
  /// Returns `{'manufactureDate': DateTime?, 'expiryDate': DateTime?}` or null.
  static Future<Map<String, DateTime?>?> scanImageUrl(String imageUrl) async {
    final token = await StorageService.getToken();
    if (token == null) throw Exception('No authentication token found');

    final response = await http.post(
      Uri.parse('${ApiConstants.baseUrl}/ingredients/scan'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'imageUrl': imageUrl}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return {
        'manufactureDate': data['manufactureDate'] != null
            ? DateTime.tryParse(data['manufactureDate'])
            : null,
        'expiryDate': data['expiryDate'] != null
            ? DateTime.tryParse(data['expiryDate'])
            : null,
      };
    } else if (response.statusCode == 401) {
      throw Exception('401');
    } else {
      final body = jsonDecode(response.body);
      throw Exception(body['error'] ?? 'Scan failed: ${response.statusCode}');
    }
  }
}
