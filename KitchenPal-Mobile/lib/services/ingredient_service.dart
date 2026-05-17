import 'dart:convert';
import '../models/ingredient.dart';
import 'api_client.dart';

class IngredientService {
  // GET /api/ingredients  (branch_id from JWT — no URL param)
  static Future<List<Ingredient>> getAllIngredients() async {
    final response = await ApiClient.get('/ingredients');

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final List<dynamic> list = json['ingredients'] ?? [];
      print('[IngredientService] Got ${list.length} ingredients from API');
      for (var item in list) {
        print('[IngredientService] Ingredient: ${item['name']}, expiry: ${item['expiry_date']}, batch_count: ${item['batch_count']}');
      }
      return list.map((j) => Ingredient.fromJson(j)).toList();
    } else {
      throw Exception('Failed to load ingredients: ${response.statusCode}');
    }
  }

  // GET /api/ingredients/:id  (full detail with batches)
  static Future<Ingredient> getIngredientById(int id) async {
    final response = await ApiClient.get('/ingredients/$id');

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return Ingredient.fromJson(json['ingredient']);
    } else {
      throw Exception('Failed to load ingredient: ${response.statusCode}');
    }
  }

  // POST /api/ingredients
  static Future<Ingredient> createIngredient(Map<String, dynamic> data) async {
    final response = await ApiClient.post('/ingredients', body: data);

    if (response.statusCode == 201) {
      final json = jsonDecode(response.body);
      return Ingredient.fromJson(json['ingredient']);
    } else {
      final body = jsonDecode(response.body);
      throw Exception(body['error'] ?? 'Failed to create ingredient');
    }
  }

  // DELETE /api/ingredients/:id
  static Future<void> deleteIngredient(int id) async {
    final response = await ApiClient.delete('/ingredients/$id');

    if (response.statusCode != 200) {
      throw Exception('Failed to delete ingredient: ${response.statusCode}');
    }
  }

  // GET /api/ingredients/expiring?days=N
  static Future<List<Ingredient>> getExpiringIngredients({int days = 7}) async {
    final response = await ApiClient.get('/ingredients/expiring?days=$days');

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final List<dynamic> list = json['ingredients'] ?? [];
      return list.map((j) => Ingredient.fromJson(j)).toList();
    } else {
      throw Exception('Failed to load expiring: ${response.statusCode}');
    }
  }

  // GET /api/ingredients/available-for-generation
  // Returns ingredients with lock status (available, awaiting_approval, approved)
  static Future<List<Map<String, dynamic>>>
  getAvailableIngredientsForRecipeGeneration() async {
    final response = await ApiClient.get('/ingredients/available-for-generation');

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final List<dynamic> list = json['ingredients'] ?? [];
      return list.cast<Map<String, dynamic>>();
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
