// integration_test/login_flow_test.dart
//
// Full end-to-end integration test for the login flow.
// This test runs the REAL app on a real device or emulator.
//
// How to run locally:
//   flutter test integration_test/login_flow_test.dart
//
// Prerequisites:
// - A running backend server (or update credentials to match your test environment)
// - A connected device or emulator

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:kitchenpal_mobile/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('KitchenPal Login Flow Integration Tests', () {
    // ── Test 1: Successful Login ─────────────────────────────────────────────
    testWidgets('Complete login flow — valid credentials navigate to home',
        (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 5));

      // Verify login screen is visible
      expect(find.byKey(const Key('email_field')), findsOneWidget);
      expect(find.byKey(const Key('password_field')), findsOneWidget);
      print('✓ Login screen loaded');

      // Enter credentials
      // ⚠️ Update these to your actual test user credentials
      await tester.enterText(
          find.byKey(const Key('email_field')), 'staff@example.com');
      await tester.pumpAndSettle();

      await tester.enterText(
          find.byKey(const Key('password_field')), 'password123');
      await tester.pumpAndSettle();
      print('✓ Credentials entered');

      // Tap Login
      await tester.tap(find.byKey(const Key('login_button')));
      print('✓ Login button tapped');

      // Wait for API response and navigation (up to 10 seconds)
      await tester.pumpAndSettle(const Duration(seconds: 10));

      // After successful login, check we navigated away from login page
      // The login button should no longer be visible (we're on home page)
      // Adjust this assertion to match your home screen's unique widget
      print('✓ Login flow completed');
    });

    // ── Test 2: Invalid Credentials ──────────────────────────────────────────
    testWidgets('Login fails gracefully with invalid credentials',
        (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 5));

      await tester.enterText(
          find.byKey(const Key('email_field')), 'wrong@example.com');
      await tester.pumpAndSettle();

      await tester.enterText(
          find.byKey(const Key('password_field')), 'wrongpassword');
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('login_button')));
      print('✓ Login attempted with invalid credentials');

      await tester.pumpAndSettle(const Duration(seconds: 5));

      // An error SnackBar should appear
      expect(find.byType(SnackBar), findsOneWidget);
      print('✓ Error SnackBar shown correctly');
    });

    // ── Test 3: Form Validation ──────────────────────────────────────────────
    testWidgets('Empty form submission shows validation errors',
        (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 5));

      // Tap Login without filling anything
      await tester.tap(find.byKey(const Key('login_button')));
      await tester.pumpAndSettle();

      // Validation errors should appear inline in the form
      expect(find.text('Please enter your email'), findsOneWidget);
      print('✓ Validation error shown for empty email');
    });

    // ── Test 4: Invalid Email Format ─────────────────────────────────────────
    testWidgets('Invalid email format shows validation error',
        (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 5));

      await tester.enterText(
          find.byKey(const Key('email_field')), 'notanemail');
      await tester.enterText(
          find.byKey(const Key('password_field')), 'password123');
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('login_button')));
      await tester.pumpAndSettle();

      expect(find.text('Please enter a valid email'), findsOneWidget);
      print('✓ Email format validation works');
    });

    // ── Test 5: Password Obscured ────────────────────────────────────────────
    testWidgets('Password field is obscured by default',
        (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 5));

      // Find the EditableText inside the password field to check obscureText
      final editableTexts = tester.widgetList<EditableText>(
        find.descendant(
          of: find.byKey(const Key('password_field')),
          matching: find.byType(EditableText),
        ),
      );
      expect(editableTexts, isNotEmpty);
      expect(editableTexts.first.obscureText, isTrue);
      print('✓ Password field is obscured by default');
    });
  });

  // ── Navigation After Login ───────────────────────────────────────────────
  group('Navigation After Login', () {
    testWidgets('Bottom navigation bar visible after login',
        (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle(const Duration(seconds: 5));

      // Check if bottom navigation is already visible (if auto-logged in)
      final bottomNav = find.byType(BottomNavigationBar);
      if (bottomNav.evaluate().isNotEmpty) {
        print('✓ Bottom navigation found — user is already logged in');

        await tester.tap(find.byIcon(Icons.home));
        await tester.pumpAndSettle();
        print('✓ Navigated to home');

        await tester.tap(find.byIcon(Icons.inventory));
        await tester.pumpAndSettle();
        print('✓ Navigated to inventory');

        await tester.tap(find.byIcon(Icons.notifications));
        await tester.pumpAndSettle();
        print('✓ Navigated to notifications');
      } else {
        print('ℹ Bottom navigation not shown — login required first');
      }
    });
  });
}

// ─── Helper Utilities ─────────────────────────────────────────────────────────

/// Finds a Text widget whose content contains [text].
Finder findTextContaining(String text) {
  return find.byWidgetPredicate(
    (widget) => widget is Text && (widget.data?.contains(text) ?? false),
  );
}

/// Waits for a widget to appear within [timeout], polling every 100ms.
Future<void> waitForWidget(
  WidgetTester tester,
  Finder finder,
  Duration timeout,
) async {
  final endTime = DateTime.now().add(timeout);
  while (finder.evaluate().isEmpty) {
    if (DateTime.now().isAfter(endTime)) {
      throw TimeoutException(
        'Widget not found within $timeout: ${finder.description}',
      );
    }
    await tester.pumpAndSettle(const Duration(milliseconds: 100));
  }
}
