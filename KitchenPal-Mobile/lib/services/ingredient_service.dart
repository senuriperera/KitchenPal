import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/ingredient.dart';
import 'storage_service.dart';

class IngredientService {
  static const String _baseUrl = 'http://192.168.1.61:3000/api/ingredients';

  // Get all ingredients for a branch
  static Future<List<Ingredient>> getAllIngredients(int branchId) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await http.get(
        Uri.parse('$_baseUrl/branch/$branchId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        final List<dynamic> ingredientsJson = jsonResponse['ingredients'] ?? [];
        return ingredientsJson
            .map((json) => Ingredient.fromJson(json))
            .toList();
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized: Please login again');
      } else {
        throw Exception('Failed to load ingredients: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching ingredients: $e');
    }
  }

  // Get expiring ingredients
  static Future<List<Ingredient>> getExpiringIngredients(
    int branchId,
    int days,
  ) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await http.get(
        Uri.parse('$_baseUrl/branch/$branchId/expiring?days=$days'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        final List<dynamic> ingredientsJson = jsonResponse['ingredients'] ?? [];
        return ingredientsJson
            .map((json) => Ingredient.fromJson(json))
            .toList();
      } else {
        throw Exception(
          'Failed to load expiring ingredients: ${response.statusCode}',
        );
      }
    } catch (e) {
      throw Exception('Error fetching expiring ingredients: $e');
    }
  }

  // Delete ingredient
  static Future<bool> deleteIngredient(int ingredientId) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await http.delete(
        Uri.parse('$_baseUrl/$ingredientId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        return true;
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized: Please login again');
      } else {
        throw Exception('Failed to delete ingredient: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error deleting ingredient: $e');
    }
  }

  // Update ingredient
  static Future<Ingredient> updateIngredient(
    int ingredientId,
    Map<String, dynamic> ingredientData,
  ) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await http.put(
        Uri.parse('$_baseUrl/$ingredientId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode(ingredientData),
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        return Ingredient.fromJson(jsonResponse['ingredient']);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized: Please login again');
      } else {
        throw Exception('Failed to update ingredient: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error updating ingredient: $e');
    }
  }

  // Search ingredients by name (client-side filtering)
  static List<Ingredient> searchIngredients(
    List<Ingredient> ingredients,
    String query,
  ) {
    if (query.isEmpty) return ingredients;

    final lowerQuery = query.toLowerCase();
    return ingredients.where((ingredient) {
      return ingredient.name.toLowerCase().contains(lowerQuery);
    }).toList();
  }

  // Filter ingredients by storage type (client-side filtering)
  static List<Ingredient> filterByStorageType(
    List<Ingredient> ingredients,
    String storageType,
  ) {
    if (storageType.isEmpty) return ingredients;

    return ingredients.where((ingredient) {
      return ingredient.storageName?.toLowerCase() ==
              storageType.toLowerCase() ||
          ingredient.storageCode?.toLowerCase() == storageType.toLowerCase();
    }).toList();
  }

  // Get unique storage types from ingredients list
  static List<String> getUniqueStorageTypes(List<Ingredient> ingredients) {
    final Set<String> storageTypes = {};
    for (var ingredient in ingredients) {
      if (ingredient.storageName != null &&
          ingredient.storageName!.isNotEmpty) {
        storageTypes.add(ingredient.storageName!);
      }
    }
    return storageTypes.toList()..sort();
  }

  // Get ingredient keywords/categories (based on name patterns)
  static List<String> extractKeywords(List<Ingredient> ingredients) {
    final Set<String> keywords = {};
    for (var ingredient in ingredients) {
      // Simple keyword extraction - can be enhanced
      final words = ingredient.name.split(' ');
      for (var word in words) {
        if (word.length > 3) {
          keywords.add(word);
        }
      }
    }
    return keywords.toList()..sort();
  }
}
