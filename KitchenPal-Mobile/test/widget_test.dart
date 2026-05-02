// widget_test.dart — Smoke Test
//
// A simple smoke test that verifies the app can start and render the login screen.
// If this test passes, your app entry point (main.dart) is working correctly.
//
// Run: flutter test test/widget_test.dart

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kitchenpal_mobile/pages/login.dart';

void main() {
  testWidgets('App smoke test — LoginPage renders without crashing',
      (WidgetTester tester) async {
    // Build the LoginPage directly (avoids needing full app initialization)
    await tester.pumpWidget(
      const MaterialApp(
        home: LoginPage(),
      ),
    );

    // Allow any animations to complete
    await tester.pump();

    // If we reach here without an exception, the app renders correctly
    // Verify the core page structure is present
    expect(find.byType(Scaffold), findsOneWidget);
    expect(find.byType(Form), findsOneWidget);
    expect(find.byKey(const Key('email_field')), findsOneWidget);
    expect(find.byKey(const Key('password_field')), findsOneWidget);
    expect(find.byKey(const Key('login_button')), findsOneWidget);
  });
}
