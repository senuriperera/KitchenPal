import 'package:flutter/material.dart';
import '../shared/bottom_navbar.dart';
import 'home_page.dart';
import 'add_ingredient_page.dart';

class MainContainer extends StatefulWidget {
  const MainContainer({super.key});

  @override
  State<MainContainer> createState() => _MainContainerState();
}

class _MainContainerState extends State<MainContainer> {
  int _currentIndex = 0;

  final List<Widget> _pages = [
    const HomePageContent(),
    const Center(child: Text('Stock')), // Placeholder for Stock page
    const AddIngredientPageContent(),
    const Center(child: Text('Recipes')), // Placeholder for Recipes page
    const Center(child: Text('Analytics')), // Placeholder for Analytics page
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _pages),
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
