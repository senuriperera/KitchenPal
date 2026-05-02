import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/recipe.dart';
import '../models/ingredient.dart';
import '../services/api_client.dart';

class RecipeDetailPage extends StatefulWidget {
  final Recipe recipe;

  const RecipeDetailPage({super.key, required this.recipe});

  @override
  State<RecipeDetailPage> createState() => _RecipeDetailPageState();
}

class _RecipeDetailPageState extends State<RecipeDetailPage> {
  bool _isLoading = true;
  Map<int, bool> _ingredientAvailability = {};

  @override
  void initState() {
    super.initState();
    _loadAvailability();
  }

  Future<void> _loadAvailability() async {
    try {
      // Fetch recipe availability from the same endpoint used by recipes page
      final response = await ApiClient.get('/recipes/availability');
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        final Map<String, dynamic> availability = data['availability'] ?? {};
        
        // Get availability for this specific recipe
        final recipeAvailability = availability[widget.recipe.recipeId.toString()];
        
        if (recipeAvailability != null) {
          final shortIngredients = (recipeAvailability['short_ingredients'] as List<dynamic>?)
              ?.cast<String>() ?? [];
          
          // Build a map of ingredient availability
          final Map<int, bool> availabilityMap = {};
          for (final ingredient in widget.recipe.ingredients) {
            // Ingredient is available if it's NOT in the short_ingredients list
            availabilityMap[ingredient.masterIngredientId] = 
                !shortIngredients.contains(ingredient.name);
          }
          
          setState(() {
            _ingredientAvailability = availabilityMap;
            _isLoading = false;
          });
        } else {
          setState(() {
            _isLoading = false;
          });
        }
      } else {
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      print('Error loading availability: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  bool _isIngredientAvailable(int masterIngredientId) {
    return _ingredientAvailability[masterIngredientId] ?? true;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: CustomScrollView(
        slivers: [
          // App Bar with Image
          SliverAppBar(
            expandedHeight: 250,
            pinned: true,
            backgroundColor: const Color(0xFFFF6B35),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: widget.recipe.imageUrl != null && widget.recipe.imageUrl!.isNotEmpty
                  ? Image.network(
                      widget.recipe.imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return _buildPlaceholderImage();
                      },
                    )
                  : _buildPlaceholderImage(),
            ),
          ),

          // Content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Recipe Name
                  Text(
                    widget.recipe.recipeName,
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF333333),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Recipe Metadata
                  Row(
                    children: [
                      _buildInfoChip(
                        icon: Icons.access_time,
                        label: widget.recipe.cookingTimeMinutes != null
                            ? '${widget.recipe.cookingTimeMinutes} min'
                            : 'N/A',
                        color: const Color(0xFFFF6B35),
                      ),
                      const SizedBox(width: 12),
                      _buildInfoChip(
                        icon: Icons.attach_money,
                        label: 'Rs ${widget.recipe.basePrice.toStringAsFixed(2)}',
                        color: const Color(0xFF4CAF50),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Description/Steps
                  if (widget.recipe.description != null &&
                      widget.recipe.description!.isNotEmpty) ...[
                    const Text(
                      'Description',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF333333),
                      ),
                    ),
                    const SizedBox(height: 12),
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
                      child: Text(
                        widget.recipe.description!,
                        style: const TextStyle(
                          fontSize: 16,
                          height: 1.5,
                          color: Color(0xFF666666),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Ingredients Section
                  const Text(
                    'Ingredients',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF333333),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Ingredients List
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
                    child: widget.recipe.ingredients.isEmpty
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
                        : _isLoading
                            ? const Padding(
                                padding: EdgeInsets.all(16.0),
                                child: Center(
                                  child: CircularProgressIndicator(
                                    color: Color(0xFFFF6B35),
                                  ),
                                ),
                              )
                            : ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: widget.recipe.ingredients.length,
                                separatorBuilder: (context, index) =>
                                    Divider(height: 1, color: Colors.grey[200]),
                                itemBuilder: (context, index) {
                                  final ingredient = widget.recipe.ingredients[index];
                                  final isAvailable = _isIngredientAvailable(
                                    ingredient.masterIngredientId,
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

  Widget _buildPlaceholderImage() {
    return Container(
      height: 250,
      color: Colors.grey[300],
      child: const Center(
        child: Icon(Icons.restaurant, size: 80, color: Colors.white),
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
    // Remove unnecessary decimal places
    if (quantity == quantity.roundToDouble()) {
      return quantity.round().toString();
    }
    return quantity
        .toStringAsFixed(2)
        .replaceAll(RegExp(r'0*$'), '')
        .replaceAll(RegExp(r'\.$'), '');
  }
}
