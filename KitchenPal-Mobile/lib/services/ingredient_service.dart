import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/ingredient.dart';
import '../config/api_constants.dart';
import 'storage_service.dart';

class IngredientService {
  static Future<Map<String, String>> _authHeaders() async {
    final token = await StorageService.getToken();
    if (token == null) throw Exception('No authentication token found');
    return {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };
  }

  // GET /api/ingredients  (branch_id from JWT — no URL param)
  static Future<List<Ingredient>> getAllIngredients() async {
    final headers = await _authHeaders();
    var response = await http.get(
      Uri.parse('${ApiConstants.baseUrl}/ingredients'),
      headers: headers,
    );

    // Retry once if token expired
    if (response.statusCode == 401) {
      await _refreshTokenIfExpired();
      final newHeaders = await _authHeaders();
      response = await http.get(
        Uri.parse('${ApiConstants.baseUrl}/ingredients'),
        headers: newHeaders,
      );
    }

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final List<dynamic> list = json['ingredients'] ?? [];
      return list.map((j) => Ingredient.fromJson(j)).toList();
    } else if (response.statusCode == 401) {
      throw Exception('401');
    } else {
      throw Exception('Failed to load ingredients: ${response.statusCode}');
    }
  }

  // GET /api/ingredients/:id  (full detail with batches)
  static Future<Ingredient> getIngredientById(int id) async {
    final headers = await _authHeaders();
    var response = await http.get(
      Uri.parse('${ApiConstants.baseUrl}/ingredients/$id'),
      headers: headers,
    );

    // Retry once if token expired
    if (response.statusCode == 401) {
      await _refreshTokenIfExpired();
      final newHeaders = await _authHeaders();
      response = await http.get(
        Uri.parse('${ApiConstants.baseUrl}/ingredients/$id'),
        headers: newHeaders,
      );
    }

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return Ingredient.fromJson(json['ingredient']);
    } else if (response.statusCode == 401) {
      throw Exception('401');
    } else {
      throw Exception('Failed to load ingredient: ${response.statusCode}');
    }
  }

  // POST /api/ingredients
  static Future<Ingredient> createIngredient(Map<String, dynamic> data) async {
    final headers = await _authHeaders();
    var response = await http.post(
      Uri.parse('${ApiConstants.baseUrl}/ingredients'),
      headers: headers,
      body: jsonEncode(data),
    );

    // Retry once if token expired
    if (response.statusCode == 401) {
      await _refreshTokenIfExpired();
      final newHeaders = await _authHeaders();
      response = await http.post(
        Uri.parse('${ApiConstants.baseUrl}/ingredients'),
        headers: newHeaders,
        body: jsonEncode(data),
      );
    }

    if (response.statusCode == 201) {
      final json = jsonDecode(response.body);
      return Ingredient.fromJson(json['ingredient']);
    } else if (response.statusCode == 401) {
      throw Exception('401');
    } else {
      final body = jsonDecode(response.body);
      throw Exception(body['error'] ?? 'Failed to create ingredient');
    }
  }

  // DELETE /api/ingredients/:id
  static Future<void> deleteIngredient(int id) async {
    final headers = await _authHeaders();
    var response = await http.delete(
      Uri.parse('${ApiConstants.baseUrl}/ingredients/$id'),
      headers: headers,
    );

    // Retry once if token expired
    if (response.statusCode == 401) {
      await _refreshTokenIfExpired();
      final newHeaders = await _authHeaders();
      response = await http.delete(
        Uri.parse('${ApiConstants.baseUrl}/ingredients/$id'),
        headers: newHeaders,
      );
    }

    if (response.statusCode == 401) throw Exception('401');
    if (response.statusCode != 200) {
      throw Exception('Failed to delete ingredient: ${response.statusCode}');
    }
  }

  // Refresh token if expired
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

  // GET /api/ingredients/expiring?days=N
  static Future<List<Ingredient>> getExpiringIngredients({int days = 7}) async {
    final headers = await _authHeaders();
    var response = await http.get(
      Uri.parse('${ApiConstants.baseUrl}/ingredients/expiring?days=$days'),
      headers: headers,
    );

    // Retry once if token expired
    if (response.statusCode == 401) {
      await _refreshTokenIfExpired();
      final newHeaders = await _authHeaders();
      response = await http.get(
        Uri.parse('${ApiConstants.baseUrl}/ingredients/expiring?days=$days'),
        headers: newHeaders,
      );
    }

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final List<dynamic> list = json['ingredients'] ?? [];
      return list.map((j) => Ingredient.fromJson(j)).toList();
    } else if (response.statusCode == 401) {
      throw Exception('401');
    } else {
      throw Exception('Failed to load expiring: ${response.statusCode}');
    }
  }

  // GET /api/ingredients/available-for-generation
  // Returns ingredients with lock status (available, awaiting_approval, approved)
  static Future<List<Map<String, dynamic>>>
  getAvailableIngredientsForRecipeGeneration() async {
    final headers = await _authHeaders();
    var response = await http.get(
      Uri.parse('${ApiConstants.baseUrl}/ingredients/available-for-generation'),
      headers: headers,
    );

    // Retry once if token expired
    if (response.statusCode == 401) {
      await _refreshTokenIfExpired();
      final newHeaders = await _authHeaders();
      response = await http.get(
        Uri.parse(
          '${ApiConstants.baseUrl}/ingredients/available-for-generation',
        ),
        headers: newHeaders,
      );
    }

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final List<dynamic> list = json['ingredients'] ?? [];
      return list.cast<Map<String, dynamic>>();
    } else if (response.statusCode == 401) {
      throw Exception('401');
    } else {
      throw Exception(
        'Failed to load available ingredients: ${response.statusCode}',
      );
    }
  }

  // Client-side helpers
  static List<Ingredient> searchIngredients(List<Ingredient> list, String q) {
    if (q.isEmpty) return list;
    final lower = q.toLowerCase();
    return list.where((i) => i.name.toLowerCase().contains(lower)).toList();
  }

  static List<String> extractKeywords(List<Ingredient> list) {
    final Set<String> kw = {};
    for (final i in list) {
      // Use full ingredient names as keywords instead of splitting words
      kw.add(i.name);
    }
    return kw.toList()..sort();
  }
}
