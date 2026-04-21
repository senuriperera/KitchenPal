import 'dart:convert';
import '../models/recipe.dart';
import '../models/recipe_suggestion.dart';
import '../models/generated_recipe.dart';
import 'api_client.dart';
import 'storage_service.dart';

class RecipeService {

  /// Get all standard recipes (is_generated = false)
  static Future<List<Recipe>> getAllRecipes() async {
    try {
      final response = await ApiClient.get('/recipes');

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        final List<dynamic> recipesJson = jsonResponse['recipes'] ?? [];
        return recipesJson.map((json) => Recipe.fromJson(json)).toList();
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
      final response = await ApiClient.get('/recipes/$recipeId');

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        return Recipe.fromJson(jsonResponse['recipe']);
      } else if (response.statusCode == 404) {
        throw Exception('Recipe not found');
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
      final requestBody = {
        'name': name,
        'image_url': imageUrl,
        'cooking_time_minutes': cookingTimeMinutes,
        'description': description,
        'base_price': basePrice,
        'ingredients': ingredients,
      };

      final response = await ApiClient.post('/recipes', body: requestBody);

      if (response.statusCode == 201) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        return Recipe.fromJson(jsonResponse['recipe']);
      } else if (response.statusCode == 400) {
        final Map<String, dynamic> errorResponse = json.decode(response.body);
        throw Exception(errorResponse['error'] ?? 'Invalid recipe data');
      } else {
        throw Exception('Failed to create recipe: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error creating recipe: $e');
    }
  }

  /// Get generated recipes for the current branch (generated_recipes table)
  static Future<List<GeneratedRecipe>> getGeneratedRecipes() async {
    try {
      final response = await ApiClient.get('/generated-recipes');

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonResponse = json.decode(response.body);
        final List<dynamic> list = jsonResponse['recipes'] ?? [];
        return list.map((json) => GeneratedRecipe.fromJson(json)).toList();
      } else {
        throw Exception(
          'Failed to load generated recipes: ${response.statusCode}',
        );
      }
    } catch (e) {
      throw Exception('Error fetching generated recipes: $e');
    }
  }

  /// Save a chosen suggested recipe as a generated recipe (pending approval)
  static Future<void> saveGeneratedRecipe({
    required int recipeId,
    required double suggestedDiscountPercent,
    required double suggestedDiscountPrice,
    required List<Map<String, dynamic>> selectedBatches,
    required int suggestedServings,
  }) async {
    try {
      final response = await ApiClient.post(
        '/generated-recipes',
        body: {
          'recipe_id': recipeId,
          'suggested_discount_percent': suggestedDiscountPercent,
          'suggested_discount_price': suggestedDiscountPrice,
          'selected_batches': selectedBatches,
          'suggested_servings': suggestedServings,
        },
      );

      if (response.statusCode != 201) {
        final Map<String, dynamic> error = json.decode(response.body);
        throw Exception(error['error'] ?? 'Failed to save generated recipe');
      }
    } catch (e) {
      throw Exception('Error saving generated recipe: $e');
    }
  }

  /// Generate a recipe suggestion from selected ingredient IDs
  /// (legacy) Kept for backwards compatibility with old /suggestions flow.
  static Future<RecipeSuggestion> generateRecipeSuggestion(
    List<int> ingredientIds,
  ) async {
    try {
      final branchId = await StorageService.getBranchId();
      if (branchId == null) {
        throw Exception('No branch assigned to your account');
      }

      final response = await ApiClient.post(
        '/suggestions/generate',
        body: {
          'branch_id': branchId,
          'ingredient_ids': ingredientIds,
        },
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
      final response = await ApiClient.post(
        '/recipes/generate',
        body: {'selected_items': selectedItems},
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
      final response = await ApiClient.delete('/recipes/$recipeId');

      if (response.statusCode == 200) {
        return true;
      } else if (response.statusCode == 404) {
        throw Exception('Recipe not found');
      } else {
        throw Exception('Failed to delete recipe: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error deleting recipe: $e');
    }
  }
}
