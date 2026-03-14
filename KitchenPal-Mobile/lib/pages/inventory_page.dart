import 'package:flutter/material.dart';
import '../models/ingredient.dart';
import '../services/ingredient_service.dart';
import '../services/storage_service.dart';
import 'login.dart';
import 'ingredient_detail_page.dart';

// Main InventoryPage wrapper for backward compatibility
class InventoryPage extends StatelessWidget {
  const InventoryPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFFF5F5F5),
      body: InventoryPageContent(),
    );
  }
}

// Extracted content widget for use in MainContainer
class InventoryPageContent extends StatefulWidget {
  const InventoryPageContent({super.key});

  @override
  State<InventoryPageContent> createState() => _InventoryPageContentState();
}

class _InventoryPageContentState extends State<InventoryPageContent> {
  List<Ingredient> _allIngredients = [];
  List<Ingredient> _filteredIngredients = [];
  List<String> _keywords = [];
  String? _selectedKeyword;
  String _searchQuery = '';
  bool _isLoading = true;
  String? _errorMessage;

  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadIngredients();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadIngredients() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // branch_id is now carried by the JWT — no param needed
      final ingredients = await IngredientService.getAllIngredients();
      final keywords = IngredientService.extractKeywords(ingredients);

      setState(() {
        _allIngredients = ingredients;
        _filteredIngredients = ingredients;
        _keywords = keywords.take(10).toList();
        _isLoading = false;
      });
    } catch (e) {
      final msg = e.toString();
      if (msg.contains('401')) {
        await StorageService.clearAuthData();
        if (mounted) {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const LoginPage()),
            (route) => false,
          );
        }
      } else {
        setState(() {
          _errorMessage = msg;
          _isLoading = false;
        });
      }
    }
  }

  void _filterIngredients() {
    List<Ingredient> filtered = _allIngredients;
    if (_searchQuery.isNotEmpty) {
      filtered = IngredientService.searchIngredients(filtered, _searchQuery);
    }
    if (_selectedKeyword != null) {
      filtered = filtered
          .where(
            (i) =>
                i.name.toLowerCase().contains(_selectedKeyword!.toLowerCase()),
          )
          .toList();
    }
    setState(() => _filteredIngredients = filtered);
  }

  void _onSearchChanged(String q) {
    setState(() => _searchQuery = q);
    _filterIngredients();
  }

  void _onKeywordTapped(String keyword) {
    setState(() {
      _selectedKeyword = _selectedKeyword == keyword ? null : keyword;
    });
    _filterIngredients();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        children: [
          _buildHeader(),
          if (_keywords.isNotEmpty) _buildKeywordFilters(),
          Expanded(child: _buildContent()),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 8, 24, 12),
      decoration: const BoxDecoration(
        color: Color(0xFFFF9500),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'My Ingredients',
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
                hintText: 'Search ingredients...',
                hintStyle: TextStyle(color: Colors.grey[400], fontSize: 15),
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
                errorBorder: InputBorder.none,
                focusedErrorBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKeywordFilters() {
    // Add "All" option at the beginning
    final allKeywords = ['All', ..._keywords];

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 16, bottom: 8),
            child: Text(
              '${_filteredIngredients.length} items found',
              style: TextStyle(fontSize: 13, color: Colors.grey[600]),
            ),
          ),
          SizedBox(
            height: 40,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: allKeywords.length,
              itemBuilder: (context, index) {
                final keyword = allKeywords[index];
                final isAll = keyword == 'All';
                final isSelected = isAll
                    ? _selectedKeyword == null
                    : _selectedKeyword == keyword;

                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () {
                      if (isAll) {
                        setState(() {
                          _selectedKeyword = null;
                        });
                        _filterIngredients();
                      } else {
                        _onKeywordTapped(keyword);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? const Color(0xFFFF9500)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected
                              ? const Color(0xFFFF9500)
                              : Colors.grey.shade300,
                          width: 1,
                        ),
                      ),
                      child: Text(
                        keyword,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: isSelected
                              ? FontWeight.w600
                              : FontWeight.normal,
                          color: isSelected ? Colors.white : Colors.grey[700],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF2C2C54)),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'Failed to load ingredients',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[600]),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadIngredients,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2C2C54),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
      );
    }

    if (_filteredIngredients.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No ingredients found',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _searchQuery.isNotEmpty || _selectedKeyword != null
                  ? 'Try adjusting your search or filters'
                  : 'Add ingredients to get started',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadIngredients,
      color: const Color(0xFF2C2C54),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _filteredIngredients.length,
        itemBuilder: (context, index) =>
            _buildIngredientCard(_filteredIngredients[index]),
      ),
    );
  }

  Widget _buildIngredientCard(Ingredient ingredient) {
    return GestureDetector(
      onTap: () async {
        final result = await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) =>
                IngredientDetailPage(ingredientId: ingredient.ingredientId),
          ),
        );
        if (result == true) _loadIngredients();
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Image
            ClipRRect(
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                bottomLeft: Radius.circular(16),
              ),
              child: Container(
                width: 80,
                height: 80,
                color: Colors.grey[200],
                child:
                    ingredient.imageUrl != null &&
                        ingredient.imageUrl!.isNotEmpty
                    ? Image.network(
                        ingredient.imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _buildPlaceholder(),
                      )
                    : _buildPlaceholder(),
              ),
            ),
            // Details
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ingredient.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF2C2C54),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      ingredient.formattedExpiryDate,
                      style: TextStyle(
                        fontSize: 14,
                        color: ingredient.daysUntilExpiry <= 3
                            ? Colors.red
                            : Colors.grey[600],
                        fontWeight: ingredient.daysUntilExpiry <= 3
                            ? FontWeight.w600
                            : FontWeight.normal,
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Display total weight — Flutter-side calculation, never stored
                    Text(
                      ingredient.displayTotalWeight,
                      style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                    ),
                  ],
                ),
              ),
            ),
            // Arrow
            Padding(
              padding: const EdgeInsets.only(right: 12.0),
              child: Icon(
                Icons.chevron_right,
                color: Colors.grey[400],
                size: 28,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: Colors.grey[300],
      child: const Icon(Icons.restaurant, size: 40, color: Colors.grey),
    );
  }
}
