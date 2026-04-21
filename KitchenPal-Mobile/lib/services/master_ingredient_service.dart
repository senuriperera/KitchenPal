import 'dart:convert';
import '../models/master_ingredient.dart';
import 'api_client.dart';

class MasterIngredientService {
  // GET /api/master-ingredients  — returns all master ingredients with unit_family
  static Future<List<MasterIngredient>> getAll() async {
    final response = await ApiClient.get('/master-ingredients');

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final List<dynamic> list = json['ingredients'] ?? [];
      return list.map((j) => MasterIngredient.fromJson(j)).toList();
    } else {
      throw Exception('Failed to load master ingredients: ${response.statusCode}');
    }
  }
}
