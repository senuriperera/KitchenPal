import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kitchenpal_mobile/shared/bottom_navbar.dart';

void main() {
  group('KitchenPalBottomNavBar Widget Tests', () {
    
    testWidgets('renders all navigation items', (WidgetTester tester) async {
      int tappedIndex = -1;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            bottomNavigationBar: KitchenPalBottomNavBar(
              currentIndex: 0,
              onTap: (index) {
                tappedIndex = index;
              },
            ),
          ),
        ),
      );

      // Check for navigation labels
      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Inventory'), findsOneWidget);
      expect(find.text('Recipes'), findsOneWidget);
      expect(find.text('Alerts'), findsOneWidget);
    });

    testWidgets('highlights selected item', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            bottomNavigationBar: KitchenPalBottomNavBar(
              currentIndex: 0,
              onTap: (index) {},
            ),
          ),
        ),
      );

      // Home should be selected (index 0)
      final homeText = tester.widget<Text>(find.text('Home'));
      expect(homeText.style?.color, equals(const Color(0xFFFF9500)));
    });

    testWidgets('calls onTap when item is tapped', (WidgetTester tester) async {
      int tappedIndex = -1;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            bottomNavigationBar: KitchenPalBottomNavBar(
              currentIndex: 0,
              onTap: (index) {
                tappedIndex = index;
              },
            ),
          ),
        ),
      );

      // Tap on Inventory
      await tester.tap(find.text('Inventory'));
      await tester.pump();

      expect(tappedIndex, equals(1));
    });

    testWidgets('center button has add icon', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            bottomNavigationBar: KitchenPalBottomNavBar(
              currentIndex: 0,
              onTap: (index) {},
            ),
          ),
        ),
      );

      // Find the add icon in the center button
      final addIcons = find.byIcon(Icons.add);
      expect(addIcons, findsOneWidget);
    });

    testWidgets('center button is tappable', (WidgetTester tester) async {
      int tappedIndex = -1;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            bottomNavigationBar: KitchenPalBottomNavBar(
              currentIndex: 0,
              onTap: (index) {
                tappedIndex = index;
              },
            ),
          ),
        ),
      );

      // Tap the center add button
      await tester.tap(find.byIcon(Icons.add));
      await tester.pump();

      expect(tappedIndex, equals(2));
    });

    testWidgets('changes selection when different index is provided', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            bottomNavigationBar: KitchenPalBottomNavBar(
              currentIndex: 3, // Recipes selected
              onTap: (index) {},
            ),
          ),
        ),
      );

      // Recipes should be highlighted
      final recipesText = tester.widget<Text>(find.text('Recipes'));
      expect(recipesText.style?.color, equals(const Color(0xFFFF9500)));

      // Home should not be highlighted
      final homeText = tester.widget<Text>(find.text('Home'));
      expect(homeText.style?.color, isNot(equals(const Color(0xFFFF9500))));
    });

    testWidgets('all items are tappable', (WidgetTester tester) async {
      final tappedIndices = <int>[];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            bottomNavigationBar: KitchenPalBottomNavBar(
              currentIndex: 0,
              onTap: (index) {
                tappedIndices.add(index);
              },
            ),
          ),
        ),
      );

      // Tap each item
      await tester.tap(find.text('Home'));
      await tester.pump();
      
      await tester.tap(find.text('Inventory'));
      await tester.pump();
      
      await tester.tap(find.byIcon(Icons.add));
      await tester.pump();
      
      await tester.tap(find.text('Recipes'));
      await tester.pump();
      
      await tester.tap(find.text('Alerts'));
      await tester.pump();

      expect(tappedIndices, equals([0, 1, 2, 3, 4]));
    });

    testWidgets('has correct number of navigation items', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            bottomNavigationBar: KitchenPalBottomNavBar(
              currentIndex: 0,
              onTap: (index) {},
            ),
          ),
        ),
      );

      // Should have 5 items total (4 labeled + 1 center button)
      expect(find.byType(GestureDetector), findsNWidgets(5));
    });
  });
}
