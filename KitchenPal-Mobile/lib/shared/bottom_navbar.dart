import 'package:flutter/material.dart';

class KitchenPalBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;

  const KitchenPalBottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF2C2C54), // Dark purple background from image
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildNavItem(0, Icons.home_outlined, Icons.home),
              _buildNavItem(1, Icons.list_alt_outlined, Icons.list_alt),
              _buildNavItem(2, Icons.add_box_outlined, Icons.add_box),
              _buildNavItem(3, Icons.menu_book_outlined, Icons.menu_book),
              _buildNavItem(
                4,
                Icons.notifications_outlined,
                Icons.notifications,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, IconData activeIcon) {
    final isSelected = currentIndex == index;
    return GestureDetector(
      onTap: () => onTap(index),
      child: Container(
        padding: const EdgeInsets.all(8),
        child: Icon(
          isSelected ? activeIcon : icon,
          color: isSelected ? const Color(0xFF00C853) : Colors.white70,
          size: 28,
        ),
      ),
    );
  }
}
