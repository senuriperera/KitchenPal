import 'dart:convert';
import 'api_client.dart';

class OcrService {
  /// Scans an already-uploaded Cloudinary image URL using Google Vision via backend.
  /// Returns `{'manufactureDate': DateTime?, 'expiryDate': DateTime?}` or null.
  static Future<Map<String, DateTime?>?> scanImageUrl(String imageUrl) async {
    final response = await ApiClient.post(
      '/ingredients/scan',
      body: {'imageUrl': imageUrl},
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
    } else {
      final body = jsonDecode(response.body);
      throw Exception(body['error'] ?? 'Scan failed: ${response.statusCode}');
    }
  }
}
