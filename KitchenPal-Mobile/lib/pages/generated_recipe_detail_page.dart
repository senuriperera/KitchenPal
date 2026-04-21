import 'package:flutter/material.dart';
import '../models/recipe.dart';
import '../models/recipe_suggestion.dart';
import '../models/ingredient.dart';
import '../services/recipe_service.dart';
import '../services/ingredient_service.dart';

class GeneratedRecipeDetailPage extends StatefulWidget {
  final RecipeSuggestion suggestion;

  const GeneratedRecipeDetailPage({super.key, required this.suggestion});

  @override
  State<GeneratedRecipeDetailPage> createState() =>
      _GeneratedRecipeDetailPageState();
}

class _GeneratedRecipeDetailPageState
    extends State<GeneratedRecipeDetailPage> {
  Recipe? _recipe;
  bool _isLoading = true;
  String? _errorMessage;
  List<Ingredient> _availableIngredients = [];

  @override
  void initState() {
    super.initState();
    _loadRecipe();
    _loadAvailableIngredients();
  }

  Future<void> _loadRecipe() async {
    try {
      final recipe = await RecipeService.getRecipeById(widget.suggestion.recipeId);
      setState(() {
        _recipe = recipe;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _loadAvailableIngredients() async {
    try {
      final ingredients = await IngredientService.getAllIngredients();
      setState(() {
        _availableIngredients = ingredients;
      });
      
      // Debug: Print available ingredients
      print('Available ingredients count: ${ingredients.length}');
      for (var ing in ingredients) {
        print('Ingredient: ${ing.name}, MasterID: ${ing.masterIngredientId}, Stock: ${ing.quantityInStock}');
      }
    } catch (e) {
      print('Error loading ingredients: $e');
      // Silently fail - ingredients will just show as unavailable
    }
  }

  bool _isIngredientAvailable(int masterIngredientId, String ingredientName) {
    // Try matching by master_ingredient_id first
    final matchById = _availableIngredients.any(
      (ing) => ing.masterIngredientId == masterIngredientId && ing.quantityInStock > 0,
    );
    
    if (matchById) return true;
    
    // Fallback: Try matching by name (case-insensitive)
    final matchByName = _availableIngredients.any(
      (ing) => ing.name.toLowerCase() == ingredientName.toLowerCase() && ing.quantityInStock > 0,
    );
    
    // Debug
    if (!matchById && !matchByName) {
      print('Ingredient not found: $ingredientName (ID: $masterIngredientId)');
    }
    
    return matchByName;
  }

  Color get _urgencyColor {
    switch (widget.suggestion.urgencyLevel?.toLowerCase()) {
      case 'high':
        return const Color(0xFFE53935);
      case 'medium':
        return const Color(0xFFFB8C00);
      default:
        return const Color(0xFF43A047);
    }
  }

  Color get _statusColor {
    switch (widget.suggestion.status.toLowerCase()) {
      case 'approved':
        return const Color(0xFF43A047);
      case 'rejected':
        return const Color(0xFFE53935);
      default:
        return const Color(0xFFFB8C00);
    }
  }

  Widget _buildPlaceholderImage() {
    return Container(
      height: 250,
      color: Colors.grey[300],
      child: const Center(
        child: Icon(Icons.auto_awesome, size: 80, color: Colors.white),
      ),
    );
  }

  Widget _buildInfoChip({
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIngredientItem(RecipeIngredient ingredient, bool isAvailable) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              color: isAvailable ? const Color(0xFF4CAF50) : const Color(0xFFF44336),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              ingredient.name,
              style: const TextStyle(fontSize: 16, color: Color(0xFF333333)),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            '${_formatQuantity(ingredient.quantityRequired)} ${ingredient.unitCode}',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF666666),
            ),
          ),
        ],
      ),
    );
  }

  String _formatQuantity(double quantity) {
    if (quantity == quantity.roundToDouble()) {
      return quantity.round().toString();
    }
    return quantity
        .toStringAsFixed(2)
        .replaceAll(RegExp(r'0*$'), '')
        .replaceAll(RegExp(r'\.$'), '');
  }

  @override
  Widget build(BuildContext context) {
    final suggestion = widget.suggestion;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 250,
            pinned: true,
            backgroundColor: const Color(0xFFFF9500),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: suggestion.imageUrl != null &&
                      suggestion.imageUrl!.isNotEmpty
                  ? Image.network(
                      suggestion.imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          _buildPlaceholderImage(),
                    )
                  : _buildPlaceholderImage(),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Recipe name + status badge
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          suggestion.recipeName,
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF333333),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: _statusColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: _statusColor, width: 1),
                        ),
                        child: Text(
                          suggestion.status[0].toUpperCase() +
                              suggestion.status.substring(1),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: _statusColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Time and urgency chips
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (suggestion.cookingTimeMinutes != null)
                        _buildInfoChip(
                          icon: Icons.access_time,
                          label: '${suggestion.cookingTimeMinutes} min',
                          color: const Color(0xFFFF9500),
                        ),
                      if (suggestion.urgencyLevel != null)
                        _buildInfoChip(
                          icon: Icons.warning_amber_rounded,
                          label:
                              '${suggestion.urgencyLevel![0].toUpperCase()}${suggestion.urgencyLevel!.substring(1)} Urgency',
                          color: _urgencyColor,
                        ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Pricing section
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
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
                        const Text(
                          'Pricing',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF333333),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Original Price',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey[600],
                              ),
                            ),
                            Text(
                              'Rs ${suggestion.basePrice.toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontSize: 14,
                                color: Color(0xFF333333),
                              ),
                            ),
                          ],
                        ),
                        if (suggestion.suggestedDiscountPercentage != null) ...[
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Discount',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey[600],
                                ),
                              ),
                              Text(
                                '${suggestion.suggestedDiscountPercentage!.toStringAsFixed(1)}%',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFFE53935),
                                ),
                              ),
                            ],
                          ),
                        ],
                        if (suggestion.calculatedDiscountedPrice != null) ...[
                          const Divider(height: 20),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'Discounted Price',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF333333),
                                ),
                              ),
                              Text(
                                'Rs ${suggestion.calculatedDiscountedPrice!.toStringAsFixed(2)}',
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF43A047),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Ingredients section
                  const Text(
                    'Ingredients',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF333333),
                    ),
                  ),
                  const SizedBox(height: 12),

                  if (_isLoading)
                    const Center(child: CircularProgressIndicator())
                  else if (_errorMessage != null)
                    Text(
                      'Could not load ingredients',
                      style: TextStyle(color: Colors.grey[600]),
                    )
                  else
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: _recipe == null || _recipe!.ingredients.isEmpty
                          ? Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Text(
                                'No ingredients listed',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey[600],
                                ),
                              ),
                            )
                          : ListView.separated(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: _recipe!.ingredients.length,
                              separatorBuilder: (context, index) =>
                                  Divider(height: 1, color: Colors.grey[200]),
                              itemBuilder: (context, index) {
                                final ingredient = _recipe!.ingredients[index];
                                final isAvailable = _isIngredientAvailable(
                                  ingredient.masterIngredientId,
                                  ingredient.name,
                                );
                                return _buildIngredientItem(ingredient, isAvailable);
                              },
                            ),
                    ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
