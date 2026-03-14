import 'package:flutter/material.dart';
import '../models/recipe.dart';
import '../models/recipe_suggestion.dart';
import '../services/recipe_service.dart';
import '../services/storage_service.dart';
import 'recipe_detail_page.dart';
import 'generated_recipe_detail_page.dart';

class RecipesPage extends StatelessWidget {
  const RecipesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFFF5F5F5),
      body: RecipesPageContent(),
    );
  }
}

class RecipesPageContent extends StatefulWidget {
  const RecipesPageContent({super.key});

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
  List<RecipeSuggestion> _allGeneratedRecipes = [];
  List<RecipeSuggestion> _filteredGeneratedRecipes = [];
  bool _isLoadingGenerated = true;
  String? _generatedError;
  bool _generatedLoaded = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(_onTabChanged);
    _loadStandardRecipes();
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    _searchController.dispose();
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
      final branchId = await StorageService.getBranchId();
      if (branchId == null) {
        setState(() {
          _generatedError = 'No branch assigned to your account.';
          _isLoadingGenerated = false;
        });
        return;
      }
      final suggestions = await RecipeService.getGeneratedRecipes(branchId);
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
                .where((s) => s.recipeName.toLowerCase().contains(lower))
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
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => RecipeDetailPage(recipe: recipe),
          ),
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
    return RefreshIndicator(
      onRefresh: () async {
        _generatedLoaded = false;
        await _loadGeneratedRecipes();
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _filteredGeneratedRecipes.length,
        itemBuilder: (context, index) =>
            _buildGeneratedCard(_filteredGeneratedRecipes[index]),
      ),
    );
  }

  Widget _buildGeneratedCard(RecipeSuggestion suggestion) {
    Color urgencyColor;
    switch (suggestion.urgencyLevel?.toLowerCase()) {
      case 'high':
        urgencyColor = const Color(0xFFE53935);
        break;
      case 'medium':
        urgencyColor = const Color(0xFFFB8C00);
        break;
      default:
        urgencyColor = const Color(0xFF43A047);
    }

    Color statusColor;
    switch (suggestion.status.toLowerCase()) {
      case 'approved':
        statusColor = const Color(0xFF43A047);
        break;
      case 'rejected':
        statusColor = const Color(0xFFE53935);
        break;
      default:
        statusColor = const Color(0xFFFB8C00);
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: Colors.white,
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) =>
                GeneratedRecipeDetailPage(suggestion: suggestion),
          ),
        ),
        borderRadius: BorderRadius.circular(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image with auto-generated badge
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(12),
                    topRight: Radius.circular(12),
                  ),
                  child:
                      suggestion.imageUrl != null &&
                          suggestion.imageUrl!.isNotEmpty
                      ? Image.network(
                          suggestion.imageUrl!,
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
                      color: const Color(0xFFFF9500),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.auto_awesome,
                          size: 12,
                          color: Colors.white,
                        ),
                        SizedBox(width: 4),
                        Text(
                          'AI Generated',
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
                  // Name + status
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          suggestion.recipeName,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF333333),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: statusColor, width: 1),
                        ),
                        child: Text(
                          suggestion.status[0].toUpperCase() +
                              suggestion.status.substring(1),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: statusColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Price row
                  Row(
                    children: [
                      if (suggestion.cookingTimeMinutes != null) ...[
                        const Icon(
                          Icons.access_time,
                          size: 16,
                          color: Color(0xFFFF9500),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${suggestion.cookingTimeMinutes} min',
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF666666),
                          ),
                        ),
                        const SizedBox(width: 12),
                      ],
                      if (suggestion.calculatedDiscountedPrice != null) ...[
                        const Icon(
                          Icons.local_offer,
                          size: 16,
                          color: Color(0xFF4CAF50),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Rs ${suggestion.calculatedDiscountedPrice!.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF4CAF50),
                          ),
                        ),
                      ] else ...[
                        const Icon(
                          Icons.attach_money,
                          size: 16,
                          color: Color(0xFF4CAF50),
                        ),
                        Text(
                          'Rs ${suggestion.basePrice.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF4CAF50),
                          ),
                        ),
                      ],
                      if (suggestion.urgencyLevel != null) ...[
                        const SizedBox(width: 12),
                        Icon(
                          Icons.warning_amber_rounded,
                          size: 16,
                          color: urgencyColor,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${suggestion.urgencyLevel![0].toUpperCase()}${suggestion.urgencyLevel!.substring(1)}',
                          style: TextStyle(
                            fontSize: 13,
                            color: urgencyColor,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
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

  Widget _buildError({
    required String message,
    required VoidCallback onRetry,
  }) {
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
              children: [
                _buildStandardTab(),
                _buildGeneratedTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
