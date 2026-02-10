import 'package:flutter/material.dart';
import '../models/ingredient.dart';
import '../services/ingredient_service.dart';
import '../services/storage_service.dart';

class NotificationsPage extends StatelessWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFFF5F5F5),
      body: NotificationsPageContent(),
    );
  }
}

class NotificationsPageContent extends StatefulWidget {
  const NotificationsPageContent({super.key});

  @override
  State<NotificationsPageContent> createState() =>
      _NotificationsPageContentState();
}

class _NotificationsPageContentState extends State<NotificationsPageContent> {
  List<Ingredient> _expiringIngredients = [];
  Set<int> _selectedIngredients = {};
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadExpiringIngredients();
  }

  Future<void> _loadExpiringIngredients() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Load branch ID from storage (can be null for admin)
      final branchId = await StorageService.getBranchId();

      // Fetch ingredients expiring within 7 days
      // Admin with null branch_id will get expiring ingredients from all branches
      final ingredients =
          await IngredientService.getExpiringIngredients(branchId, 7);

      setState(() {
        _expiringIngredients = ingredients;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  void _toggleSelection(int ingredientId) {
    setState(() {
      if (_selectedIngredients.contains(ingredientId)) {
        _selectedIngredients.remove(ingredientId);
      } else {
        _selectedIngredients.add(ingredientId);
      }
    });
  }

  void _generateRecipe() {
    if (_selectedIngredients.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select at least one ingredient'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // TODO: Implement recipe generation functionality
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Generating recipe with ${_selectedIngredients.length} ingredient(s)...',
        ),
        backgroundColor: const Color(0xFF00C853),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: const [
                Text(
                  'Expiry Nearing Items',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
          ),

          // Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Icons.error_outline,
                                size: 64,
                                color: Colors.red,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'Error loading ingredients',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey[800],
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _errorMessage!,
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Colors.grey[600]),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: _loadExpiringIngredients,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        ),
                      )
                    : _expiringIngredients.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.check_circle_outline,
                                  size: 64,
                                  color: Colors.green[400],
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'No items nearing expiry',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.grey[800],
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'All your ingredients are fresh!',
                                  style: TextStyle(color: Colors.grey[600]),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _loadExpiringIngredients,
                            child: ListView.builder(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16.0,
                                vertical: 8.0,
                              ),
                              itemCount: _expiringIngredients.length,
                              itemBuilder: (context, index) {
                                final ingredient = _expiringIngredients[index];
                                return _buildExpiryItem(ingredient);
                              },
                            ),
                          ),
          ),

          // Generate Recipe Button
          if (_expiringIngredients.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(16.0),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: SafeArea(
                top: false,
                child: SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _generateRecipe,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF59E0B),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Generate Recipe',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildExpiryItem(Ingredient ingredient) {
    final isSelected = _selectedIngredients.contains(ingredient.ingredientId);
    final daysUntilExpiry = ingredient.daysUntilExpiry;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Checkbox
          GestureDetector(
            onTap: () => _toggleSelection(ingredient.ingredientId),
            child: Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                border: Border.all(
                  color: isSelected
                      ? const Color(0xFFF59E0B)
                      : Colors.grey[400]!,
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(6),
                color: isSelected ? const Color(0xFFF59E0B) : Colors.white,
              ),
              child: isSelected
                  ? const Icon(
                      Icons.check,
                      size: 16,
                      color: Colors.white,
                    )
                  : null,
            ),
          ),
          const SizedBox(width: 12),

          // Ingredient Image
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: 70,
              height: 70,
              color: Colors.grey[200],
              child: ingredient.imageUrl != null &&
                      ingredient.imageUrl!.isNotEmpty
                  ? Image.network(
                      ingredient.imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          color: const Color(0xFFFFE0B2),
                          child: const Icon(
                            Icons.fastfood,
                            size: 30,
                            color: Colors.grey,
                          ),
                        );
                      },
                    )
                  : Container(
                      color: const Color(0xFFFFE0B2),
                      child: const Icon(
                        Icons.fastfood,
                        size: 30,
                        color: Colors.grey,
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 12),

          // Ingredient Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ingredient.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Expires: ${ingredient.expiryDate.year}-${ingredient.expiryDate.month.toString().padLeft(2, '0')}-${ingredient.expiryDate.day.toString().padLeft(2, '0')}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${ingredient.quantityInStock} ${ingredient.unitName ?? 'units'}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  ingredient.storageName ?? 'Storage',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),

          // Days until expiry badge
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 6,
            ),
            decoration: BoxDecoration(
              color: daysUntilExpiry <= 1
                  ? const Color(0xFFFFEBEE)
                  : const Color(0xFFFFF3E0),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                Text(
                  daysUntilExpiry.toString(),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: daysUntilExpiry <= 1
                        ? Colors.red
                        : const Color(0xFFFF9800),
                  ),
                ),
                Text(
                  daysUntilExpiry == 1 ? 'day' : 'days',
                  style: TextStyle(
                    fontSize: 10,
                    color: daysUntilExpiry <= 1
                        ? Colors.red
                        : const Color(0xFFFF9800),
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
