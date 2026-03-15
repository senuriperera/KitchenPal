import 'package:flutter/material.dart';
import '../services/recipe_service.dart';
import 'recipes_page.dart';

/// Displays a list of generated recipe suggestions returned from
/// the /api/recipes/generate endpoint.
class RecipeSuggestionsPage extends StatelessWidget {
  final List<Map<String, dynamic>> suggestions;
  final List<Map<String, dynamic>> selectedBatches;

  const RecipeSuggestionsPage({
    super.key,
    required this.suggestions,
    required this.selectedBatches,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: const Text('Recipe Suggestions'),
        backgroundColor: const Color(0xFFFF9500),
      ),
      body: suggestions.isEmpty
          ? const Center(child: Text('No matching recipes found.'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: suggestions.length,
              itemBuilder: (context, index) {
                final s = suggestions[index];
                final bool isBestMatch = index == 0;

                final int jaccard = (s['jaccard_score'] as int?) ?? 0;
                final double basePrice =
                    (s['base_price'] as num?)?.toDouble() ?? 0.0;
                final double suggestedPrice =
                    (s['suggested_discount_price'] as num?)?.toDouble() ??
                    basePrice;
                final int discountPercent =
                    (s['suggested_discount_percent'] as num?)?.toInt() ?? 0;
                final int available =
                    (s['ingredients_available'] as num?)?.toInt() ?? 0;
                final int total =
                    (s['ingredients_total'] as num?)?.toInt() ?? 0;

                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isBestMatch
                          ? const Color(0xFFFF9500)
                          : Colors.grey.shade300,
                      width: isBestMatch ? 2 : 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Image
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              width: 80,
                              height: 80,
                              color: Colors.grey[200],
                              child:
                                  (s['image_url'] != null &&
                                      (s['image_url'] as String).isNotEmpty)
                                  ? Image.network(
                                      s['image_url'] as String,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) =>
                                          _placeholderImage(),
                                    )
                                  : _placeholderImage(),
                            ),
                          ),
                          const SizedBox(width: 12),
                          // Details
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        (s['name'] as String?) ?? 'Recipe',
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    if (isBestMatch)
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFFFF3E0),
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                        ),
                                        child: const Text(
                                          'Best Match',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: Color(0xFFFF9500),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Match: $jaccard%',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey[700],
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Text(
                                      'Rs ${suggestedPrice.toStringAsFixed(2)}',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF16A34A),
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Rs ${basePrice.toStringAsFixed(2)}',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey[500],
                                        decoration: TextDecoration.lineThrough,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFFEBEE),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Text(
                                        '-$discountPercent%',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFFD32F2F),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Ingredients available: $available / $total',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey[700],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      // Ingredients availability bullets
                      if ((s['ingredients'] as List?) != null)
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          children: (s['ingredients'] as List)
                              .cast<Map<String, dynamic>>()
                              .map((ing) {
                                final bool ok =
                                    (ing['is_available'] as bool?) ?? false;
                                return Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: BoxDecoration(
                                        color: ok
                                            ? const Color(0xFF16A34A)
                                            : const Color(0xFFE53935),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      ing['name'] as String? ?? '',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey[800],
                                      ),
                                    ),
                                  ],
                                );
                              })
                              .toList(),
                        ),
                      const SizedBox(height: 12),
                      // Primary / secondary button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () async {
                            try {
                              final recipeId = s['recipe_id'] as int?;
                              final percent =
                                  (s['suggested_discount_percent'] as num?)
                                      ?.toDouble() ??
                                  0.0;
                              final price =
                                  (s['suggested_discount_price'] as num?)
                                      ?.toDouble() ??
                                  0.0;

                              if (recipeId == null) {
                                return;
                              }

                              await RecipeService.saveGeneratedRecipe(
                                recipeId: recipeId,
                                suggestedDiscountPercent: percent,
                                suggestedDiscountPrice: price,
                                selectedBatches: selectedBatches,
                              );

                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Recipe sent for discount approval',
                                    ),
                                    backgroundColor: Colors.green,
                                  ),
                                );

                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) =>
                                        const RecipesPage(initialTabIndex: 1),
                                  ),
                                );
                              }
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      'Failed to save generated recipe: $e',
                                    ),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              }
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isBestMatch
                                ? const Color(0xFFFF9500)
                                : Colors.grey[300],
                            foregroundColor: isBestMatch
                                ? Colors.white
                                : Colors.black87,
                          ),
                          child: Text(
                            'Add to Generated Recipes',
                            style: const TextStyle(fontSize: 14),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }

  Widget _placeholderImage() {
    return Container(
      color: Colors.grey[300],
      child: const Icon(Icons.restaurant, size: 40, color: Colors.white),
    );
  }
}
