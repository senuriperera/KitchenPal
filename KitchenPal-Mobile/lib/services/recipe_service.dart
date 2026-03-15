import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_constants.dart';
import '../models/recipe.dart';
import '../models/recipe_suggestion.dart';
import 'storage_service.dart';

class RecipeService {
  static final String _baseUrl = '${ApiConstants.baseUrl}/recipes';
  static final String _suggestionsBaseUrl =
      '${ApiConstants.baseUrl}/suggestions';

  /// Get all standard recipes (is_generated = false)
  static Future<List<Recipe>> getAllRecipes() async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await http.get(
        Uri.parse(_baseUrl),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        final List<dynamic> recipesJson = jsonResponse['recipes'] ?? [];
        return recipesJson.map((json) => Recipe.fromJson(json)).toList();
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized: Please login again');
      } else {
        throw Exception('Failed to load recipes: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching recipes: $e');
    }
  }

  /// Get a single recipe by ID
  static Future<Recipe> getRecipeById(int recipeId) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await http.get(
        Uri.parse('$_baseUrl/$recipeId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        return Recipe.fromJson(jsonResponse['recipe']);
      } else if (response.statusCode == 404) {
        throw Exception('Recipe not found');
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized: Please login again');
      } else {
        throw Exception('Failed to load recipe: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching recipe: $e');
    }
  }

  /// Create a new recipe
  static Future<Recipe> createRecipe({
    required String name,
    String? imageUrl,
    int? cookingTimeMinutes,
    String? description,
    required double basePrice,
    required List<Map<String, dynamic>> ingredients,
  }) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final requestBody = {
        'name': name,
        'image_url': imageUrl,
        'cooking_time_minutes': cookingTimeMinutes,
        'description': description,
        'base_price': basePrice,
        'ingredients': ingredients,
      };

      final response = await http.post(
        Uri.parse(_baseUrl),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode(requestBody),
      );

      if (response.statusCode == 201) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        return Recipe.fromJson(jsonResponse['recipe']);
      } else if (response.statusCode == 400) {
        final Map<String, dynamic> errorResponse = json.decode(response.body);
        throw Exception(errorResponse['error'] ?? 'Invalid recipe data');
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized: Please login again');
      } else {
        throw Exception('Failed to create recipe: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error creating recipe: $e');
    }
  }

  /// Get generated recipe suggestions for a branch
  static Future<List<RecipeSuggestion>> getGeneratedRecipes(
    int branchId,
  ) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await http.get(
        Uri.parse('$_suggestionsBaseUrl/branch/$branchId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        final List<dynamic> suggestionsJson = jsonResponse['suggestions'] ?? [];
        return suggestionsJson
            .map((json) => RecipeSuggestion.fromJson(json))
            .toList();
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized: Please login again');
      } else {
        throw Exception(
          'Failed to load generated recipes: ${response.statusCode}',
        );
      }
    } catch (e) {
      throw Exception('Error fetching generated recipes: $e');
    }
  }

  /// Generate a recipe suggestion from selected ingredient IDs
  /// (legacy) Kept for backwards compatibility with old /suggestions flow.
  static Future<RecipeSuggestion> generateRecipeSuggestion(
    List<int> ingredientIds,
  ) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final branchId = await StorageService.getBranchId();
      if (branchId == null) {
        throw Exception('No branch assigned to your account');
      }

      final response = await http.post(
        Uri.parse('$_suggestionsBaseUrl/generate'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'branch_id': branchId,
          'ingredient_ids': ingredientIds,
        }),
      );

      if (response.statusCode == 201) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        return RecipeSuggestion.fromJson(jsonResponse['suggestion']);
      } else if (response.statusCode == 404) {
        final Map<String, dynamic> errorResponse = json.decode(response.body);
        throw Exception(errorResponse['error'] ?? 'No matching recipes found');
      } else if (response.statusCode == 400) {
        final Map<String, dynamic> errorResponse = json.decode(response.body);
        throw Exception(
          errorResponse['error'] ?? 'Invalid data for suggestion',
        );
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized: Please login again');
      } else {
        throw Exception(
          'Failed to generate recipe suggestion: ${response.statusCode}',
        );
      }
    } catch (e) {
      throw Exception('Error generating recipe suggestion: $e');
    }
  }

  /// Generate recipe suggestions using Jaccard similarity.
  /// Expects the exact payload described in the backend spec.
  static Future<List<Map<String, dynamic>>> generateRecipes(
    List<Map<String, dynamic>> selectedItems,
  ) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await http.post(
        Uri.parse('$_baseUrl/generate'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({'selected_items': selectedItems}),
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        final List<dynamic> list = jsonResponse['recipes'] ?? [];
        return list.cast<Map<String, dynamic>>();
      } else if (response.statusCode == 404) {
        final Map<String, dynamic> errorResponse = json.decode(response.body);
        throw Exception(errorResponse['error'] ?? 'No matching recipes found');
      } else if (response.statusCode == 400) {
        final Map<String, dynamic> errorResponse = json.decode(response.body);
        throw Exception(
          errorResponse['error'] ?? 'Invalid data for suggestion',
        );
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized: Please login again');
      } else {
        throw Exception('Failed to generate recipes: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error generating recipes: $e');
    }
  }

  /// Delete a recipe
  static Future<bool> deleteRecipe(int recipeId) async {
    try {
      final token = await StorageService.getToken();
      if (token == null) {
        throw Exception('No authentication token found');
      }

      final response = await http.delete(
        Uri.parse('$_baseUrl/$recipeId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        return true;
      } else if (response.statusCode == 404) {
        throw Exception('Recipe not found');
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized: Please login again');
      } else {
        throw Exception('Failed to delete recipe: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error deleting recipe: $e');
    }
  }
}
