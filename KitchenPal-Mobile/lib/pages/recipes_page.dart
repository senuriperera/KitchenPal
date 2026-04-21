import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/recipe.dart';
import '../models/generated_recipe.dart';
import '../services/recipe_service.dart';
import '../services/api_client.dart';
import '../services/websocket_service.dart';
import 'recipe_detail_page.dart';
import 'generated_recipe_detail_page.dart';

class RecipesPage extends StatelessWidget {
  final int initialTabIndex;

  const RecipesPage({super.key, this.initialTabIndex = 0});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: RecipesPageContent(initialTabIndex: initialTabIndex),
    );
  }
}

class RecipesPageContent extends StatefulWidget {
  final int initialTabIndex;

  const RecipesPageContent({super.key, this.initialTabIndex = 0});

  @override
  State<RecipesPageContent> createState() => _RecipesPageContentState();
}

class _RecipesPageContentState extends State<RecipesPageContent>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  // Standard recipes
  List<Recipe> _allStandardRecipes = [];
  List<Recipe> _filteredStandardRecipes = [];
  bool _isLoadingStandard = true;
  String? _standardError;

  // Generated recipes
  List<GeneratedRecipe> _allGeneratedRecipes = [];
  List<GeneratedRecipe> _filteredGeneratedRecipes = [];
  bool _isLoadingGenerated = true;
  String? _generatedError;
  bool _generatedLoaded = false;

  // Availability tracking
  Map<int, Map<String, dynamic>> _recipeAvailability = {};
  bool _isLoadingAvailability = false;

  // WebSocket subscriptions (store them to cancel later)
  StreamSubscription? _recipeCreatedSub;
  StreamSubscription? _recipeUpdatedSub;
  StreamSubscription? _recipeDeletedSub;
  StreamSubscription? _recipeGeneratedSub;
  StreamSubscription? _recipeApprovedSub;
  StreamSubscription? _recipeRejectedSub;
  StreamSubscription? _inventoryChangedSub;
  bool _wsListenersSetup = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTabIndex,
    );
    _tabController.addListener(_onTabChanged);
    _loadStandardRecipes();

    if (widget.initialTabIndex == 1) {
      _loadGeneratedRecipes();
    }

    _setupWebSocketListeners();
  }

  void _setupWebSocketListeners() {
    if (_wsListenersSetup) {
      print('[RecipesPage] WebSocket listeners already setup, skipping');
      return;
    }

    print('[RecipesPage] Connecting WebSocket and setting up listeners...');
    WebSocketService.instance
        .connect()
        .then((_) {
          if (!mounted) return;
          print(
            '[RecipesPage] WebSocket connected, registering stream listeners',
          );

          _recipeCreatedSub = WebSocketService.instance.recipeCreated.listen(
            (_) {
              if (mounted) {
                print('[RecipesPage] recipeCreated event received');
                _loadStandardRecipes();
              }
            },
            onError: (e) =>
                print('[RecipesPage] ERROR: recipeCreated error: $e'),
          );

          _recipeUpdatedSub = WebSocketService.instance.recipeUpdated.listen(
            (_) {
              if (mounted) {
                print('[RecipesPage] recipeUpdated event received');
                _loadStandardRecipes();
              }
            },
            onError: (e) =>
                print('[RecipesPage] ERROR: recipeUpdated error: $e'),
          );

          _recipeDeletedSub = WebSocketService.instance.recipeDeleted.listen(
            (_) {
              if (mounted) {
                print('[RecipesPage] recipeDeleted event received');
                _loadStandardRecipes();
              }
            },
            onError: (e) =>
                print('[RecipesPage] ERROR: recipeDeleted error: $e'),
          );

          _recipeGeneratedSub = WebSocketService.instance.recipeGenerated
              .listen(
                (_) {
                  if (_generatedLoaded && mounted) {
                    print('[RecipesPage] recipeGenerated event received');
                    _loadGeneratedRecipes();
                  }
                },
                onError: (e) =>
                    print('[RecipesPage] ERROR: recipeGenerated error: $e'),
              );

          _recipeApprovedSub = WebSocketService.instance.recipeApproved.listen(
            (_) {
              if (_generatedLoaded && mounted) {
                print('[RecipesPage] recipeApproved event received');
                _loadGeneratedRecipes();
              }
            },
            onError: (e) =>
                print('[RecipesPage] ERROR: recipeApproved error: $e'),
          );

          _recipeRejectedSub = WebSocketService.instance.recipeRejected.listen(
            (_) {
              if (_generatedLoaded && mounted) {
                print('[RecipesPage] recipeRejected event received');
                _loadGeneratedRecipes();
              }
            },
            onError: (e) =>
                print('[RecipesPage] ERROR: recipeRejected error: $e'),
          );

          _inventoryChangedSub = WebSocketService.instance.inventoryChanged.listen(
            (_) {
              if (mounted) {
                print('[RecipesPage] inventoryChanged event received');
                _loadAvailability();
              }
            },
            onError: (e) =>
                print('[RecipesPage] ERROR: inventoryChanged error: $e'),
          );

          print('[RecipesPage] All stream listeners registered');
        })
        .catchError((e) {
          print('[RecipesPage] ERROR: Failed to connect WebSocket: $e');
        });

    _wsListenersSetup = true;
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    _searchController.dispose();
    _recipeCreatedSub?.cancel();
    _recipeUpdatedSub?.cancel();
    _recipeDeletedSub?.cancel();
    _recipeGeneratedSub?.cancel();
    _recipeApprovedSub?.cancel();
    _recipeRejectedSub?.cancel();
    _inventoryChangedSub?.cancel();
    super.dispose();
  }

  void _onTabChanged() {
    // Clear search when switching tabs
    if (_tabController.indexIsChanging) {
      _searchController.clear();
      setState(() => _searchQuery = '');
      _applyFilter('');
    }
    // Lazy-load generated recipes on first visit
    if (_tabController.index == 1 && !_generatedLoaded) {
      _loadGeneratedRecipes();
    }
  }

  Future<void> _loadStandardRecipes() async {
    setState(() {
      _isLoadingStandard = true;
      _standardError = null;
    });
    try {
      final recipes = await RecipeService.getAllRecipes();
      setState(() {
        _allStandardRecipes = recipes;
        _filteredStandardRecipes = recipes;
        _isLoadingStandard = false;
      });
      // Load availability after recipes are loaded
      _loadAvailability();
    } catch (e) {
      setState(() {
        _standardError = e.toString();
        _isLoadingStandard = false;
      });
    }
  }

  Future<void> _loadGeneratedRecipes() async {
    setState(() {
      _isLoadingGenerated = true;
      _generatedError = null;
      _generatedLoaded = true;
    });
    try {
      final suggestions = await RecipeService.getGeneratedRecipes();
      setState(() {
        _allGeneratedRecipes = suggestions;
        _filteredGeneratedRecipes = suggestions;
        _isLoadingGenerated = false;
      });
    } catch (e) {
      setState(() {
        _generatedError = e.toString();
        _isLoadingGenerated = false;
      });
    }
  }

  Future<void> _loadAvailability() async {
    setState(() => _isLoadingAvailability = true);
    try {
      final response = await ApiClient.get('/recipes/availability');

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        final Map<String, dynamic> availability = data['availability'] ?? {};

        // Convert string keys to int keys
        final Map<int, Map<String, dynamic>> parsedAvailability = {};
        availability.forEach((key, value) {
          final recipeId = int.tryParse(key);
          if (recipeId != null) {
            parsedAvailability[recipeId] = value as Map<String, dynamic>;
          }
        });

        setState(() {
          _recipeAvailability = parsedAvailability;
          _isLoadingAvailability = false;
        });
      }
    } catch (e) {
      print('Failed to load availability: $e');
      setState(() => _isLoadingAvailability = false);
    }
  }

  void _onSearchChanged(String q) {
    setState(() => _searchQuery = q);
    _applyFilter(q);
  }

  void _applyFilter(String q) {
    final lower = q.toLowerCase();
    if (_tabController.index == 0) {
      setState(() {
        _filteredStandardRecipes = q.isEmpty
            ? _allStandardRecipes
            : _allStandardRecipes
                  .where((r) => r.recipeName.toLowerCase().contains(lower))
                  .toList();
      });
    } else {
      setState(() {
        _filteredGeneratedRecipes = q.isEmpty
            ? _allGeneratedRecipes
            : _allGeneratedRecipes
                  .where((s) => s.name.toLowerCase().contains(lower))
                  .toList();
      });
    }
  }

  // ─── Header ───────────────────────────────────────────────────────────────

  Widget _buildHeader() {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(color: Color(0xFFFF9500)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 8, 24, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Recipes',
                  style: TextStyle(
                    fontSize: 23,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: _onSearchChanged,
                    decoration: InputDecoration(
                      hintText: 'Search recipes...',
                      hintStyle: TextStyle(
                        color: Colors.grey[400],
                        fontSize: 15,
                      ),
                      prefixIcon: Icon(Icons.search, color: Colors.grey[400]),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, color: Colors.grey),
                              onPressed: () {
                                _searchController.clear();
                                _onSearchChanged('');
                              },
                            )
                          : null,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          TabBar(
            controller: _tabController,
            indicatorColor: Colors.white,
            indicatorWeight: 3,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            labelStyle: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
            unselectedLabelStyle: const TextStyle(
              fontWeight: FontWeight.normal,
              fontSize: 14,
            ),
            tabs: const [
              Tab(text: 'Standard Recipes'),
              Tab(text: 'Generated Recipes'),
            ],
          ),
        ],
      ),
    );
  }

  // ─── Standard Recipes Tab ─────────────────────────────────────────────────

  Widget _buildStandardTab() {
    if (_isLoadingStandard) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_standardError != null) {
      return _buildError(
        message: _standardError!,
        onRetry: _loadStandardRecipes,
      );
    }
    if (_filteredStandardRecipes.isEmpty) {
      return _buildEmpty(
        icon: Icons.restaurant_menu,
        message: _searchQuery.isNotEmpty
            ? 'No recipes match your search'
            : 'No recipes available',
      );
    }
    return RefreshIndicator(
      onRefresh: _loadStandardRecipes,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _filteredStandardRecipes.length,
        itemBuilder: (context, index) =>
            _buildStandardCard(_filteredStandardRecipes[index]),
      ),
    );
  }

  Widget _buildStandardCard(Recipe recipe) {
    // Check availability
    final availabilityInfo = _recipeAvailability[recipe.recipeId];
    final isAvailable = availabilityInfo?['available'] ?? true;
    final shortIngredients =
        (availabilityInfo?['short_ingredients'] as List<dynamic>?)
            ?.cast<String>() ??
        [];

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => RecipeDetailPage(recipe: recipe)),
        ),
        borderRadius: BorderRadius.circular(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
              child: recipe.imageUrl != null && recipe.imageUrl!.isNotEmpty
                  ? Image.network(
                      recipe.imageUrl!,
                      height: 180,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _buildPlaceholderImage(),
                    )
                  : _buildPlaceholderImage(),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    recipe.recipeName,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF333333),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(
                        Icons.access_time,
                        size: 16,
                        color: Color(0xFFFF9500),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        recipe.cookingTimeMinutes != null
                            ? '${recipe.cookingTimeMinutes} min'
                            : 'N/A',
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF666666),
                        ),
                      ),
                      const SizedBox(width: 16),
                      const Icon(
                        Icons.attach_money,
                        size: 18,
                        color: Color(0xFF4CAF50),
                      ),
                      Text(
                        'Rs ${recipe.basePrice.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF4CAF50),
                        ),
                      ),
                    ],
                  ),
                  if (!isAvailable && shortIngredients.isNotEmpty) ...[
                    const SizedBox(height: 7),
                    RichText(
                      text: TextSpan(
                        children: [
                          WidgetSpan(
                            child: Icon(
                              Icons.warning,
                              size: 12,
                              color: Colors.red[700],
                            ),
                            alignment: PlaceholderAlignment.middle,
                          ),

                          TextSpan(
                            text: ' Insufficient stock',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.red[700],
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: isAvailable
                          ? () => _processSale(
                              recipeId: recipe.recipeId,
                              recipeName: recipe.recipeName,
                              totalServings: recipe.totalServings,
                              servingDescription: recipe.servingDescription,
                              generatedId: null,
                            )
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isAvailable
                            ? const Color(0xFFFF9500)
                            : Colors.grey,
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('New Sale'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Generated Recipes Tab ────────────────────────────────────────────────

  Widget _buildGeneratedTab() {
    if (_isLoadingGenerated) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_generatedError != null) {
      return _buildError(
        message: _generatedError!,
        onRetry: () {
          _generatedLoaded = false;
          _loadGeneratedRecipes();
        },
      );
    }
    if (_filteredGeneratedRecipes.isEmpty) {
      return _buildEmpty(
        icon: Icons.auto_awesome,
        message: _searchQuery.isNotEmpty
            ? 'No generated recipes match your search'
            : 'No generated recipes yet',
      );
    }
    final approved = _filteredGeneratedRecipes
        .where((r) => r.status == 'approved')
        .toList();
    final pending = _filteredGeneratedRecipes
        .where((r) => r.status == 'pending')
        .toList();

    return RefreshIndicator(
      onRefresh: () async {
        _generatedLoaded = false;
        await _loadGeneratedRecipes();
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (approved.isNotEmpty) ...[
            const Text(
              'Approved',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ...approved.map(_buildApprovedGeneratedCard).toList(),
            const SizedBox(height: 24),
          ],
          if (pending.isNotEmpty) ...[
            const Text(
              'Awaiting Approval',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ...pending.map(_buildPendingGeneratedCard).toList(),
          ],
        ],
      ),
    );
  }

  Widget _buildApprovedGeneratedCard(GeneratedRecipe recipe) {
    const statusColor = Color(0xFF43A047);

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: Colors.white,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () async {
          try {
            final fullRecipe = await RecipeService.getRecipeById(
              recipe.recipeId,
            );
            if (!mounted) return;
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => RecipeDetailPage(recipe: fullRecipe),
              ),
            );
          } catch (e) {
            if (!mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Failed to load recipe details')),
            );
          }
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(12),
                    topRight: Radius.circular(12),
                  ),
                  child: recipe.imageUrl != null && recipe.imageUrl!.isNotEmpty
                      ? Image.network(
                          recipe.imageUrl!,
                          height: 180,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) =>
                              _buildSuggestionPlaceholder(),
                        )
                      : _buildSuggestionPlaceholder(),
                ),
                Positioned(
                  top: 10,
                  left: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.check_circle, size: 12, color: Colors.white),
                        SizedBox(width: 4),
                        Text(
                          'Approved',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          recipe.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF333333),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      if (recipe.cookingTimeMinutes != null) ...[
                        const Icon(
                          Icons.access_time,
                          size: 16,
                          color: Color(0xFFFF9500),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${recipe.cookingTimeMinutes} min',
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF666666),
                          ),
                        ),
                        const SizedBox(width: 12),
                      ],
                      const Icon(
                        Icons.attach_money,
                        size: 16,
                        color: Color(0xFF4CAF50),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Rs ${(recipe.finalDiscountPrice ?? recipe.basePrice).toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF4CAF50),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Generated by ${recipe.generatedByName}',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => _processSale(
                        recipeId: recipe.recipeId,
                        recipeName: recipe.name,
                        totalServings: recipe.totalServings,
                        servingDescription: recipe.servingDescription,
                        generatedId: recipe.generatedId,
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFF9500),
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('New Sale'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPendingGeneratedCard(GeneratedRecipe recipe) {
    const statusColor = Color(0xFFFFB300);

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  topRight: Radius.circular(12),
                ),
                child: recipe.imageUrl != null && recipe.imageUrl!.isNotEmpty
                    ? Image.network(
                        recipe.imageUrl!,
                        height: 180,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) =>
                            _buildSuggestionPlaceholder(),
                      )
                    : _buildSuggestionPlaceholder(),
              ),
              Positioned(
                top: 10,
                left: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: statusColor,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      SizedBox(
                        width: 12,
                        height: 12,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Colors.white,
                          ),
                        ),
                      ),
                      SizedBox(width: 4),
                      Text(
                        'Awaiting Approval',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  recipe.name,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF333333),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(
                      Icons.local_offer,
                      size: 16,
                      color: Color(0xFF4CAF50),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Suggested: ${recipe.suggestedDiscountPercent.toStringAsFixed(0)}% (Rs ${recipe.suggestedDiscountPrice.toStringAsFixed(2)})',
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF4CAF50),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Generated by ${recipe.generatedByName}',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Sent to admin for discount approval. You will be notified once reviewed.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF666666)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Shared helpers ───────────────────────────────────────────────────────

  Widget _buildPlaceholderImage() {
    return Container(
      height: 180,
      width: double.infinity,
      color: Colors.grey[300],
      child: const Icon(Icons.restaurant, size: 56, color: Colors.white),
    );
  }

  Widget _buildSuggestionPlaceholder() {
    return Container(
      height: 180,
      width: double.infinity,
      color: Colors.grey[300],
      child: const Icon(Icons.auto_awesome, size: 56, color: Colors.white),
    );
  }

  Widget _buildError({required String message, required VoidCallback onRetry}) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 64),
            const SizedBox(height: 16),
            Text(
              'Failed to load recipes',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.grey[800],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Colors.grey[600]),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: onRetry,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFF9500),
                foregroundColor: Colors.white,
              ),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmpty({required IconData icon, required String message}) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            message,
            style: TextStyle(fontSize: 18, color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  // ─── Sale Processing ──────────────────────────────────────────────────────

  Future<void> _processSale({
    required int recipeId,
    required String recipeName,
    required int totalServings,
    String? servingDescription,
    int? generatedId,
  }) async {
    print('[_processSale] START');
    print('[_processSale] recipeId=$recipeId');
    print('[_processSale] recipeName=$recipeName');
    print('[_processSale] totalServings=$totalServings');
    print('[_processSale] servingDescription=$servingDescription');
    print('[_processSale] generatedId=$generatedId');

    // Safeguard: ensure totalServings is at least 1
    final servings = totalServings > 0 ? totalServings : 1;
    int quantitySold = 1;

    print('[_processSale] Servings after safeguard: $servings');

    // If multi-serve recipe, show dialog to ask for quantity
    if (servings > 1) {
      print('[_processSale] Multi-serve recipe detected, showing dialog...');
      try {
        final result = await showDialog<int>(
          context: context,
          builder: (context) {
            print('[_processSale] Building dialog...');
            return _buildSaleQuantityDialog(
              recipeName: recipeName,
              totalServings: servings,
              servingDescription: servingDescription,
            );
          },
        );
        print('[_processSale] Dialog closed, result: $result');
        if (result == null) {
          print('[_processSale] User canceled dialog, returning');
          return;
        }
        quantitySold = result;
        print('[_processSale] User selected quantity: $quantitySold');
      } catch (e) {
        print('[_processSale] ERROR in dialog: $e');
        print('[_processSale] Stack trace: ${StackTrace.current}');
        rethrow;
      }
    } else {
      print('[_processSale] Single-serve recipe, skipping dialog');
    }

    print('[_processSale] Final quantity to sell: $quantitySold');

    // Show loading indicator
    if (!mounted) {
      print('[_processSale] Widget not mounted after dialog, returning');
      return;
    }

    print('[_processSale] Showing loading dialog...');
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      print('[_processSale] Preparing request...');

      final requestBody = {
        'recipe_id': recipeId,
        'generated_id': generatedId,
        'quantity_sold': quantitySold,
      };
      print('[_processSale] Request body: $requestBody');
      print('[_processSale] Sending POST to: /sales');

      final response = await ApiClient.post('/sales', body: requestBody);

      print('[_processSale] Response received!');
      print('[_processSale] Status code: ${response.statusCode}');
      print('[_processSale] Response body: ${response.body}');

      if (!mounted) {
        print('[_processSale] Widget not mounted after request');
        return;
      }

      print('[_processSale] Closing loading dialog...');
      Navigator.of(context).pop(); // Close loading dialog

      if (response.statusCode == 201) {
        print('[_processSale] SUCCESS! Showing success message');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Sale recorded: $quantitySold serving${quantitySold > 1 ? 's' : ''}',
            ),
            backgroundColor: Colors.green,
          ),
        );
        print('[_processSale] Refreshing availability...');
        _loadAvailability();
      } else {
        print('[_processSale] Error response: ${response.statusCode}');
        final error = json.decode(response.body);
        final errorMsg = error['error'] ?? 'Failed to create sale';

        String errorDisplay = errorMsg;

        // Handle insufficient stock error
        if (errorMsg == 'insufficient_stock') {
          final details = error['details'] as List<dynamic>? ?? [];
          final ingredientsList = details
              .map((d) => d['ingredient'] as String? ?? '')
              .join(', ');
          print('[_processSale] Insufficient stock: $ingredientsList');
          errorDisplay = 'Insufficient stock for: $ingredientsList';
        }

        print('[_processSale] Showing error: $errorDisplay');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorDisplay),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } catch (e, stackTrace) {
      print('[_processSale] EXCEPTION CAUGHT: $e');
      print('[_processSale] Stack trace: $stackTrace');

      if (!mounted) {
        print('[_processSale] Widget not mounted in catch block');
        return;
      }

      print('[_processSale] Closing loading dialog after error...');
      if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop(); // Close loading dialog only if it exists
      }

      print('[_processSale] Showing error snackbar...');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error creating sale: $e'),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 4),
        ),
      );
    }
    print('[_processSale] END');
  }

  Widget _buildSaleQuantityDialog({
    required String recipeName,
    required int totalServings,
    String? servingDescription,
  }) {
    int quantity = 1;

    return StatefulBuilder(
      builder: (context, setState) {
        return AlertDialog(
          title: const Text('How many servings?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                recipeName,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              if (servingDescription != null)
                Text(
                  'Serving: $servingDescription',
                  style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    onPressed: () {
                      if (quantity > 1) {
                        setState(() => quantity--);
                      }
                    },
                    icon: const Icon(Icons.remove_circle_outline),
                  ),
                  Container(
                    width: 60,
                    alignment: Alignment.center,
                    child: Text(
                      '$quantity',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () {
                      if (quantity < totalServings) {
                        setState(() => quantity++);
                      }
                    },
                    icon: const Icon(Icons.add_circle_outline),
                  ),
                ],
              ),
              Center(
                child: Text(
                  'Max: $totalServings servings',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(quantity),
              child: const Text('Confirm'),
            ),
          ],
        );
      },
    );
  }

  // ─── Build ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          _buildHeader(),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [_buildStandardTab(), _buildGeneratedTab()],
            ),
          ),
        ],
      ),
    );
  }
}
