import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/master_ingredient.dart';
import '../config/api_constants.dart';
import 'storage_service.dart';

class MasterIngredientService {
  // GET /api/master-ingredients  — returns all master ingredients with unit_family
  static Future<List<MasterIngredient>> getAll() async {
    final token = await StorageService.getToken();
    if (token == null) throw Exception('No authentication token found');

    final response = await http.get(
      Uri.parse('${ApiConstants.baseUrl}/master-ingredients'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      final List<dynamic> list = json['ingredients'] ?? [];
      return list.map((j) => MasterIngredient.fromJson(j)).toList();
    } else if (response.statusCode == 401) {
      throw Exception('401');
    } else {
      throw Exception('Failed to load master ingredients: ${response.statusCode}');
    }
  }
}
