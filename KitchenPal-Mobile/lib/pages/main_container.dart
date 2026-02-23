import 'package:flutter/material.dart';
import '../shared/bottom_navbar.dart';
import 'home_page.dart';
import 'add_ingredient_page.dart';
import 'inventory_page.dart';
import 'notifications_page.dart';
import 'recipes_page.dart';

class MainContainer extends StatefulWidget {
  const MainContainer({super.key});

  @override
  State<MainContainer> createState() => _MainContainerState();
}

class _MainContainerState extends State<MainContainer> {
  int _currentIndex = 0;

  final List<Widget> _pages = [];

  @override
  void initState() {
    super.initState();
  }

  void _navigateToPage(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  List<Widget> _buildPages() {
    return [
      HomePageContent(onNavigate: _navigateToPage),
      const InventoryPageContent(),
      const AddIngredientPageContent(),
      const RecipesPageContent(),
      const NotificationsPageContent(),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _buildPages()),
      bottomNavigationBar: KitchenPalBottomNavBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
      ),
    );
  }
}
