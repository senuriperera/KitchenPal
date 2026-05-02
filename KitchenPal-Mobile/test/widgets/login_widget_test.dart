// login_widget_test.dart
//
// Widget tests for the LoginPage.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kitchenpal_mobile/pages/login.dart';

// ─── Helpers ──────────────────────────────────────────────────────────────────

Widget buildLoginPage() {
  return const MaterialApp(home: LoginPage());
}

/// Helper to ensure a widget is visible (scrolled into view) before interacting with it.
Future<void> scrollAndTap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

void main() {
  group('LoginPage — Rendering', () {
    testWidgets('renders key widgets', (WidgetTester tester) async {
      await tester.pumpWidget(buildLoginPage());
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('email_field')), findsOneWidget);
      expect(find.byKey(const Key('password_field')), findsOneWidget);
      
      final loginBtn = find.byKey(const Key('login_button'));
      await tester.ensureVisible(loginBtn);
      expect(loginBtn, findsOneWidget);
    });
  });

  group('LoginPage — Form Validation', () {
    testWidgets('shows error when email is empty', (WidgetTester tester) async {
      await tester.pumpWidget(buildLoginPage());
      await tester.pumpAndSettle();

      final loginBtn = find.byKey(const Key('login_button'));
      await scrollAndTap(tester, loginBtn);

      expect(find.text('Please enter your email'), findsOneWidget);
    });

    testWidgets('shows error when password is empty', (WidgetTester tester) async {
      await tester.pumpWidget(buildLoginPage());
      await tester.pumpAndSettle();

      await tester.enterText(
          find.byKey(const Key('email_field')), 'test@kitchen.com');
      await tester.pump();

      final loginBtn = find.byKey(const Key('login_button'));
      await scrollAndTap(tester, loginBtn);

      expect(find.text('Please enter your password'), findsOneWidget);
    });

    testWidgets('shows error for invalid email', (WidgetTester tester) async {
      await tester.pumpWidget(buildLoginPage());
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('email_field')), 'invalidemail');
      await tester.enterText(find.byKey(const Key('password_field')), 'password123');
      await tester.pump();

      final loginBtn = find.byKey(const Key('login_button'));
      await scrollAndTap(tester, loginBtn);

      expect(find.text('Please enter a valid email'), findsOneWidget);
    });

    testWidgets('shows error for short password', (WidgetTester tester) async {
      await tester.pumpWidget(buildLoginPage());
      await tester.pumpAndSettle();

      await tester.enterText(
          find.byKey(const Key('email_field')), 'test@kitchen.com');
      await tester.enterText(find.byKey(const Key('password_field')), '123');
      await tester.pump();

      final loginBtn = find.byKey(const Key('login_button'));
      await scrollAndTap(tester, loginBtn);

      expect(find.text('Password must be at least 6 characters'), findsOneWidget);
    });
  });

  group('LoginPage — Interactivity', () {
    testWidgets('email field accepts typed text', (WidgetTester tester) async {
      await tester.pumpWidget(buildLoginPage());
      await tester.pumpAndSettle();

      await tester.enterText(
          find.byKey(const Key('email_field')), 'staff@kitchen.com');
      await tester.pump();

      expect(find.text('staff@kitchen.com'), findsOneWidget);
    });

    testWidgets('password field is obscured by default', (WidgetTester tester) async {
      await tester.pumpWidget(buildLoginPage());
      await tester.pumpAndSettle();

      final editableTexts = tester.widgetList<EditableText>(
        find.descendant(
          of: find.byKey(const Key('password_field')),
          matching: find.byType(EditableText),
        ),
      );
      expect(editableTexts.first.obscureText, isTrue);
    });

    testWidgets('Forgot Password? button shows snackbar', (WidgetTester tester) async {
      await tester.pumpWidget(buildLoginPage());
      await tester.pumpAndSettle();

      final forgotBtn = find.text('Forgot Password?');
      await scrollAndTap(tester, forgotBtn);

      expect(find.text('Forgot password feature coming soon'), findsOneWidget);
    });

    testWidgets('Sign Up link shows snackbar', (WidgetTester tester) async {
      await tester.pumpWidget(buildLoginPage());
      await tester.pumpAndSettle();

      final signUpBtn = find.text('Sign Up');
      await scrollAndTap(tester, signUpBtn);

      expect(find.text('Sign up page coming soon'), findsOneWidget);
    });
  });
}
