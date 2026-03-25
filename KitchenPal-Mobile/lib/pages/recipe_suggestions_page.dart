import 'package:flutter/material.dart';
import '../services/recipe_service.dart';

class RecipeSuggestionsPage extends StatefulWidget {
  final List<Map<String, dynamic>> suggestions;
  final List<Map<String, dynamic>> selectedBatches;

  const RecipeSuggestionsPage({
    super.key,
    required this.suggestions,
    required this.selectedBatches,
  });

  @override
  State<RecipeSuggestionsPage> createState() => _RecipeSuggestionsPageState();
}

class _RecipeSuggestionsPageState extends State<RecipeSuggestionsPage> {
  bool _isSaving = false;

  Future<void> _saveRecipe(Map<String, dynamic> recipe) async {
    setState(() => _isSaving = true);

    try {
      await RecipeService.saveGeneratedRecipe(
        recipeId: recipe['recipe_id'] as int,
        suggestedDiscountPercent:
            (recipe['suggested_discount_percent'] as num).toDouble(),
        suggestedDiscountPrice:
            (recipe['suggested_discount_price'] as num).toDouble(),
        selectedBatches: widget.selectedBatches,
        suggestedServings: recipe['suggested_servings'] as int? ?? 1,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Recipe saved successfully'),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to save recipe: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (!mounted) return;
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: const Text('Recipe Suggestions'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: widget.suggestions.isEmpty
          ? const Center(child: Text('No suggestions found'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: widget.suggestions.length,
              itemBuilder: (context, index) {
                return _buildRecipeCard(widget.suggestions[index]);
              },
            ),
    );
  }

  Widget _buildRecipeCard(Map<String, dynamic> recipe) {
    final suggestedServings = recipe['suggested_servings'] as int? ?? 1;
    final totalServings = recipe['total_servings'] as int? ?? 1;
    final hasStockWarning = recipe['has_stock_warning'] as bool? ?? false;
    final warningMessage =
        recipe['warning_message'] as String? ?? 'Insufficient stock available';
    final coveragePercent = recipe['coverage_percent'] as int? ?? 0;
    final ingredients = recipe['ingredients'] as List<dynamic>? ?? [];
    final basePrice = (recipe['base_price'] as num?)?.toDouble() ?? 0.0;
    final discountPrice =
        (recipe['suggested_discount_price'] as num?)?.toDouble() ?? 0.0;
    final discountPercent =
        (recipe['suggested_discount_percent'] as num?)?.toDouble() ?? 0.0;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Recipe image
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: SizedBox(
              height: 180,
              width: double.infinity,
              child: recipe['image_url'] != null
                  ? Image.network(
                      recipe['image_url'] as String,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          color: const Color(0xFFFFE0B2),
                          child: const Icon(
                            Icons.restaurant,
                            size: 60,
                            color: Colors.grey,
                          ),
                        );
                      },
                    )
                  : Container(
                      color: const Color(0xFFFFE0B2),
                      child: const Icon(
                        Icons.restaurant,
                        size: 60,
                        color: Colors.grey,
                      ),
                    ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Recipe name
                Text(
                  recipe['name'] as String? ?? 'Unknown Recipe',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 4),

                // Cooking time
                if (recipe['cooking_time_minutes'] != null)
                  Text(
                    '${recipe['cooking_time_minutes']} mins',
                    style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                  ),

                const SizedBox(height: 12),

                // Price section
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      Text(
                        'Rs ${basePrice.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 13,
                          color: Colors.grey,
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Rs ${discountPrice.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF4CAF50),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE8F5E9),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${discountPercent.toStringAsFixed(0)}% off',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF4CAF50),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 10),

                // Suggested servings row
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.restaurant_menu,
                          size: 16,
                          color: Color(0xFFF59E0B),
                        ),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            'Suggested: make $suggestedServings serving${suggestedServings == 1 ? '' : 's'}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFFF59E0B),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (totalServings > 1) ...[
                      const SizedBox(height: 4),
                      Text(
                        '($coveragePercent% of expiring stock)',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ],
                ),

                // Stock warning chip
                if (hasStockWarning) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF3E0),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFF9800), width: 1),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.warning_amber_rounded,
                          size: 14,
                          color: Color(0xFFFF9800),
                        ),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            warningMessage,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFFE65100),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 12),

                // Ingredients list
                if (ingredients.isNotEmpty) ...[
                  const Text(
                    'Ingredients:',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 6),
                  ...ingredients.map(
                    (ing) {
                      final ingMap = ing as Map<String, dynamic>;
                      final available = ingMap['available'] as bool? ?? false;
                      final name = ingMap['name'] as String? ?? '';
                      final qty = ingMap['quantity_required'] as num? ?? 0;
                      final unit = ingMap['unit_code'] as String? ?? '';
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          children: [
                            Icon(
                              available
                                  ? Icons.circle
                                  : Icons.circle_outlined,
                              size: 10,
                              color: available
                                  ? const Color(0xFF4CAF50)
                                  : Colors.red[400],
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '$name — ${qty.toStringAsFixed(qty.truncateToDouble() == qty ? 0 : 2)} $unit',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: available
                                      ? Colors.black87
                                      : Colors.red[400],
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],

                const SizedBox(height: 16),

                // Save button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isSaving ? null : () => _saveRecipe(recipe),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF59E0B),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: _isSaving
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Text(
                            'Add to Generated Recipe',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
