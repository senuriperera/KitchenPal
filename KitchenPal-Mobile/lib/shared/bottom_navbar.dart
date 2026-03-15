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
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(0, Icons.home_outlined, Icons.home, 'Home'),
              _buildNavItem(
                1,
                Icons.inventory_2_outlined,
                Icons.inventory_2,
                'Inventory',
              ),
              _buildNavItem(
                2,
                Icons.add_circle,
                Icons.add_circle,
                null,
                isCenter: true,
              ),
              _buildNavItem(
                3,
                Icons.restaurant_menu_outlined,
                Icons.restaurant_menu,
                'Recipes',
              ),
              _buildNavItem(
                4,
                Icons.notifications_outlined,
                Icons.notifications,
                'Alerts',
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(
    int index,
    IconData icon,
    IconData activeIcon,
    String? label, {
    bool isCenter = false,
  }) {
    final isSelected = currentIndex == index;

    if (isCenter) {
      return GestureDetector(
        onTap: () => onTap(index),
        child: Container(
          width: 56,
          height: 56,
          decoration: const BoxDecoration(
            color: Color(0xFFFF9500),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.add, color: Colors.white, size: 32),
        ),
      );
    }

    return GestureDetector(
      onTap: () => onTap(index),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isSelected ? activeIcon : icon,
            color: isSelected ? const Color(0xFFFF9500) : Colors.grey[400],
            size: 26,
          ),
          const SizedBox(height: 4),
          if (label != null)
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: isSelected ? const Color(0xFFFF9500) : Colors.grey[400],
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
        ],
      ),
    );
  }
}
