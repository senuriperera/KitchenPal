import 'package:flutter/material.dart';
import 'dart:async';
import '../models/expiry_notification.dart';
import '../services/notification_service.dart';
import '../services/ingredient_service.dart';
import '../services/recipe_service.dart';
import '../services/websocket_service.dart';
import 'recipe_suggestions_page.dart';

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

class _NotificationsPageContentState extends State<NotificationsPageContent>
    with WidgetsBindingObserver {
  List<Map<String, dynamic>> _availableIngredients = [];
  Set<int> _selectedBatchIds = {};
  bool _isLoading = true;
  String? _errorMessage;
  late StreamSubscription<dynamic> _inventoryChangedSubscription;
  late StreamSubscription<dynamic> _recipeGeneratedSubscription;
  late StreamSubscription<dynamic> _recipeApprovedSubscription;
  late StreamSubscription<dynamic> _recipeRejectedSubscription;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadAvailableIngredients();

    // Keep ingredients in sync with inventory changes
    WebSocketService.instance.connect();
    _inventoryChangedSubscription =
        WebSocketService.instance.inventoryChanged.listen((_) {
      _loadAvailableIngredients();
    });

    // Listen to recipe status changes for real-time updates
    _recipeGeneratedSubscription =
        WebSocketService.instance.recipeGenerated.listen((event) {
      _updateIngredientStatus(
        event['ingredient_ids'] as List<dynamic>,
        'awaiting_approval',
        recipeName: event['recipe_name'] as String?,
      );
    });

    _recipeApprovedSubscription =
        WebSocketService.instance.recipeApproved.listen((event) {
      _updateIngredientStatus(
        event['ingredient_ids'] as List<dynamic>,
        'approved',
      );
    });

    _recipeRejectedSubscription =
        WebSocketService.instance.recipeRejected.listen((event) {
      _updateIngredientStatus(
        event['ingredient_ids'] as List<dynamic>,
        'available',
      );
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Reload ingredients when app comes back to foreground
      _loadAvailableIngredients();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _inventoryChangedSubscription.cancel();
    _recipeGeneratedSubscription.cancel();
    _recipeApprovedSubscription.cancel();
    _recipeRejectedSubscription.cancel();
    super.dispose();
  }

  void _updateIngredientStatus(
    List<dynamic> ingredientIds,
    String newStatus,
    {String? recipeName}
  ) {
    setState(() {
      for (var ingredient in _availableIngredients) {
        if (ingredientIds.contains(ingredient['ingredient_id'])) {
          ingredient['status'] = newStatus;

          if (newStatus == 'awaiting_approval') {
            ingredient['message'] = recipeName != null
                ? 'Awaiting approval (Selected for $recipeName)'
                : 'Awaiting approval';
          } else if (newStatus == 'approved') {
            ingredient['message'] = 'Already used in approved recipe';
          } else {
            ingredient['message'] = null;
          }
        }
      }

      // Clear selections if ingredients were just locked
      if (newStatus == 'awaiting_approval') {
        for (var ingredientId in ingredientIds) {
          // Find batch_id for this ingredient_id and deselect
          for (var ingredient in _availableIngredients) {
            if (ingredient['ingredient_id'] == ingredientId) {
              _selectedBatchIds.remove(ingredient['batch_id']);
            }
          }
        }
      }
    });
  }

  Future<void> _loadAvailableIngredients() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final ingredients =
          await IngredientService.getAvailableIngredientsForRecipeGeneration();

      setState(() {
        _availableIngredients = ingredients;
        _selectedBatchIds.clear(); // Clear selections on reload
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  void _toggleSelection(int batchId, String status) {
    // Only allow selection of available ingredients
    if (status != 'available') return;

    setState(() {
      if (_selectedBatchIds.contains(batchId)) {
        _selectedBatchIds.remove(batchId);
      } else {
        _selectedBatchIds.add(batchId);
      }
    });
  }

  Future<void> _generateRecipe() async {
    if (_selectedBatchIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select at least one ingredient'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Build selected_items payload using selected batch_ids
      final selectedItems = _availableIngredients
          .where((ing) => _selectedBatchIds.contains(ing['batch_id']))
          .map(
            (ing) => {
              'batch_id': ing['batch_id'],
              'ingredient_id': ing['ingredient_id'],
              'name': ing['name'],
              'days_until_expiry': ing['days_until_expiry'],
              'expiry_date': ing['expiry_date'].toString().split(' ').first,
              'remaining_base_quantity': ing['remaining_quantity'],
            },
          )
          .toList();

      final recipes = await RecipeService.generateRecipes(selectedItems);

      // Immediately update local state to show ingredients as awaiting approval
      final selectedIngredientIds = selectedItems
          .map((item) => item['ingredient_id'] as int)
          .toList();

      if (!mounted) return;

      setState(() {
        for (var ingredient in _availableIngredients) {
          if (selectedIngredientIds.contains(ingredient['ingredient_id'])) {
            ingredient['status'] = 'awaiting_approval';
          }
        }
      });

      final selectedBatches = selectedItems
          .map(
            (item) => {
              'batch_id': item['batch_id'],
              'ingredient_id': item['ingredient_id'],
              'expiry_date': item['expiry_date'],
            },
          )
          .toList();

      if (!mounted) return;

      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => RecipeSuggestionsPage(
            suggestions: recipes,
            selectedBatches: selectedBatches,
          ),
        ),
      );

      // After returning from RecipeSuggestionsPage, reload ingredients to sync with backend
      if (mounted) {
        _loadAvailableIngredients();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to generate recipe: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
    }
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
                            onPressed: _loadAvailableIngredients,
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  )
                : _availableIngredients.isEmpty
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
                    onRefresh: _loadAvailableIngredients,
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16.0,
                        vertical: 8.0,
                      ),
                      itemCount: _availableIngredients.length,
                      itemBuilder: (context, index) {
                        final ingredient = _availableIngredients[index];
                        return _buildIngredientCard(ingredient);
                      },
                    ),
                  ),
          ),

          // Generate Recipe Button
          if (_availableIngredients.isNotEmpty &&
              _availableIngredients
                  .any((ing) => ing['status'] == 'available'))
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed:
                      _selectedBatchIds.isEmpty ? null : _generateRecipe,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _selectedBatchIds.isEmpty
                        ? Colors.grey[400]
                        : const Color(0xFFF59E0B),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text(
                    'Generate Recipe',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${months[date.month - 1]} ${date.day}, ${date.year}';
    } catch (e) {
      return dateString;
    }
  }

  Widget _buildIngredientCard(Map<String, dynamic> ingredient) {
    final batchId = ingredient['batch_id'] as int;
    final status = ingredient['status'] as String;
    final message = ingredient['message'] as String?;
    final isSelected = _selectedBatchIds.contains(batchId);
    final isAvailable = status == 'available';

    // Safely parse daysUntilExpiry - could be int or String
    final daysUntilExpiry = ingredient['days_until_expiry'] is int
        ? ingredient['days_until_expiry'] as int
        : int.tryParse(ingredient['days_until_expiry'].toString()) ?? 0;

    // Format the quantity display
    final qty = ingredient['remaining_quantity'];
    final qtyNum = qty is num
        ? qty
        : (double.tryParse(qty.toString()) ?? 0.0);
    final qtyStr = qtyNum == qtyNum.toInt()
        ? qtyNum.toInt().toString()
        : qtyNum.toStringAsFixed(1);

    Color statusColor;
    IconData statusIcon;
    if (status == 'available') {
      statusColor = Colors.green;
      statusIcon = Icons.check_circle;
    } else if (status == 'awaiting_approval') {
      statusColor = Colors.orange;
      statusIcon = Icons.schedule;
    } else {
      statusColor = Colors.grey;
      statusIcon = Icons.lock;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: isAvailable && isSelected
            ? Border.all(color: const Color(0xFFF59E0B), width: 2)
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Checkbox (only enabled for available)
              GestureDetector(
                onTap: () => _toggleSelection(batchId, status),
                child: Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: isAvailable
                          ? (isSelected
                              ? const Color(0xFFF59E0B)
                              : Colors.grey[400]!)
                          : Colors.grey[300]!,
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(6),
                    color: isAvailable && isSelected
                        ? const Color(0xFFF59E0B)
                        : Colors.white,
                  ),
                  child: isAvailable && isSelected
                      ? const Icon(Icons.check, size: 16, color: Colors.white)
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
                  child: ingredient['image_url'] != null &&
                          (ingredient['image_url'] as String).isNotEmpty
                      ? Image.network(
                          ingredient['image_url'] as String,
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
                      ingredient['name'] as String,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Expires: ${_formatDate(ingredient['expiry_date'].toString())}',
                      style:
                          TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$qtyStr ${ingredient['unit_name']}',
                      style:
                          TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),

              // Days until expiry badge
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: daysUntilExpiry <= 3
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
                        color: daysUntilExpiry <= 3
                            ? Colors.red
                            : const Color(0xFFFF9800),
                      ),
                    ),
                    Text(
                      daysUntilExpiry == 1 ? 'day' : 'days',
                      style: TextStyle(
                        fontSize: 10,
                        color: daysUntilExpiry <= 3
                            ? Colors.red
                            : const Color(0xFFFF9800),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          // Status message if ingredient is locked
          if (!isAvailable && message != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: status == 'awaiting_approval'
                    ? const Color(0xFFFFF3E0)
                    : const Color(0xFFF5F5F5),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: statusColor.withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  Icon(statusIcon, size: 16, color: statusColor),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      message,
                      style: TextStyle(
                        fontSize: 12,
                        color: statusColor,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
