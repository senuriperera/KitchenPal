# 🧪 Flutter Testing Guide for Beginners

## 📚 Table of Contents
1. [What is Testing?](#what-is-testing)
2. [Types of Tests](#types-of-tests)
3. [Setting Up](#setting-up)
4. [Running Tests](#running-tests)
5. [Writing Your First Test](#writing-your-first-test)
6. [Test Structure (AAA Pattern)](#test-structure-aaa-pattern)
7. [Common Testing Patterns](#common-testing-patterns)
8. [Best Practices](#best-practices)

---

## What is Testing?

Testing is writing code that checks if your app code works correctly. Think of it like a robot that automatically checks your app for bugs!

**Why test?**
- ✅ Catch bugs before users do
- ✅ Make sure new features don't break old ones
- ✅ Document how your code should work
- ✅ Refactor code with confidence

---

## Types of Tests

### 1. **Unit Tests** 🔬
Test individual functions or classes in isolation.

**Example:** Testing if a function that calculates discount works correctly.

```dart
test('calculateDiscount returns 10% off', () {
  expect(calculateDiscount(100, 10), equals(90));
});
```

### 2. **Widget Tests** 🎨
Test UI components (widgets) to make sure they display correctly.

**Example:** Testing if a button shows the right text.

```dart
testWidgets('Login button displays correctly', (tester) async {
  await tester.pumpWidget(MyLoginButton());
  expect(find.text('Login'), findsOneWidget);
});
```

### 3. **Integration Tests** 🔗
Test the entire app working together (we'll cover this later).

---

## Setting Up

### Step 1: Install Dependencies

Your `pubspec.yaml` already has the testing packages! Run:

```bash
flutter pub get
```

This installs:
- `flutter_test` - Core testing framework
- `mockito` - Create fake objects for testing
- `http_mock_adapter` - Mock API calls

### Step 2: Understand the Test Folder Structure

```
KitchenPal-Mobile/
├── lib/                    # Your app code
│   ├── services/
│   ├── widgets/
│   └── pages/
└── test/                   # Your test code (mirrors lib/)
    ├── services/
    │   └── auth_service_test.dart
    ├── widgets/
    │   └── notifications_drawer_test.dart
    └── utils/
        └── time_utils_test.dart
```

**Rule:** Test files should mirror your lib/ structure and end with `_test.dart`

---

## Running Tests

### Run All Tests
```bash
flutter test
```

### Run a Specific Test File
```bash
flutter test test/utils/time_utils_test.dart
```

### Run Tests with Coverage (see which code is tested)
```bash
flutter test --coverage
```

### Watch Mode (auto-run tests when files change)
```bash
flutter test --watch
```

---

## Writing Your First Test

Let's write a simple test step by step!

### Example: Testing a Simple Function

**1. Create the function** (in `lib/utils/calculator.dart`):
```dart
int add(int a, int b) {
  return a + b;
}
```

**2. Create the test** (in `test/utils/calculator_test.dart`):
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:kitchenpal_mobile/utils/calculator.dart';

void main() {
  test('add function adds two numbers', () {
    // Call the function
    final result = add(2, 3);
    
    // Check if result is correct
    expect(result, equals(5));
  });
}
```

**3. Run the test:**
```bash
flutter test test/utils/calculator_test.dart
```

You should see: ✅ **All tests passed!**

---

## Test Structure (AAA Pattern)

Every test follows the **AAA pattern**:

### 1. **ARRANGE** - Set up test data
```dart
final user = User(name: 'John', age: 25);
```

### 2. **ACT** - Call the function/action you're testing
```dart
final greeting = user.greet();
```

### 3. **ASSERT** - Check if the result is correct
```dart
expect(greeting, equals('Hello, John!'));
```

### Full Example:
```dart
test('User greet returns correct message', () {
  // ARRANGE
  final user = User(name: 'John', age: 25);
  
  // ACT
  final greeting = user.greet();
  
  // ASSERT
  expect(greeting, equals('Hello, John!'));
});
```

---

## Common Testing Patterns

### 1. Testing with `group()` - Organize Related Tests

```dart
void main() {
  group('Calculator Tests', () {
    test('addition works', () {
      expect(add(2, 3), equals(5));
    });
    
    test('subtraction works', () {
      expect(subtract(5, 3), equals(2));
    });
  });
}
```

### 2. Using `setUp()` and `tearDown()`

Run code before/after each test:

```dart
void main() {
  late Database db;
  
  setUp(() {
    // Runs before EACH test
    db = Database();
  });
  
  tearDown(() {
    // Runs after EACH test
    db.close();
  });
  
  test('can save data', () {
    db.save('key', 'value');
    expect(db.get('key'), equals('value'));
  });
}
```

### 3. Widget Testing Basics

```dart
testWidgets('Button shows correct text', (WidgetTester tester) async {
  // ARRANGE: Build the widget
  await tester.pumpWidget(
    MaterialApp(
      home: MyButton(text: 'Click Me'),
    ),
  );
  
  // ASSERT: Check if text is displayed
  expect(find.text('Click Me'), findsOneWidget);
  
  // ACT: Tap the button
  await tester.tap(find.byType(ElevatedButton));
  await tester.pump(); // Rebuild the widget
  
  // ASSERT: Check what happened after tap
  expect(find.text('Clicked!'), findsOneWidget);
});
```

### 4. Common Matchers (Assertions)

```dart
// Equality
expect(result, equals(5));
expect(result, 5); // Same as above

// Boolean
expect(isValid, isTrue);
expect(isValid, isFalse);

// Null checks
expect(value, isNull);
expect(value, isNotNull);

// Exceptions
expect(() => throwError(), throwsException);

// Widget finders
expect(find.text('Hello'), findsOneWidget);
expect(find.text('Hello'), findsNothing);
expect(find.byType(Button), findsNWidgets(3));
```

---

## Best Practices

### ✅ DO:
1. **Write tests for critical features first** (login, payment, data saving)
2. **Keep tests simple and focused** - One test = One thing
3. **Use descriptive test names** - `test('login fails with wrong password')`
4. **Test edge cases** - Empty strings, null values, large numbers
5. **Run tests before committing code**

### ❌ DON'T:
1. **Don't test Flutter framework code** - It's already tested!
2. **Don't make tests depend on each other** - Each test should be independent
3. **Don't test implementation details** - Test behavior, not how it's done
4. **Don't skip writing tests** - "I'll add tests later" = Never 😅

---

## Example Test Scenarios for KitchenPal

### Unit Tests to Write:
- ✅ `auth_service_test.dart` - Test login, register, logout
- ✅ `ingredient_service_test.dart` - Test fetching ingredients
- ✅ `time_utils_test.dart` - Test time formatting
- ✅ `discount_calculator_test.dart` - Test discount calculations

### Widget Tests to Write:
- ✅ `notifications_drawer_test.dart` - Test notification display
- ✅ `login_page_test.dart` - Test login form
- ✅ `bottom_navbar_test.dart` - Test navigation
- ✅ `ingredient_card_test.dart` - Test ingredient display

---

## Quick Reference Commands

```bash
# Install dependencies
flutter pub get

# Run all tests
flutter test

# Run specific test file
flutter test test/utils/time_utils_test.dart

# Run with coverage
flutter test --coverage

# Generate mocks (after adding @GenerateMocks)
flutter pub run build_runner build

# Watch mode
flutter test --watch

# Verbose output
flutter test --verbose
```

---

## Next Steps

1. ✅ Run the example tests we created
2. ✅ Write a test for one of your services
3. ✅ Write a widget test for a simple widget
4. ✅ Gradually add tests for critical features
5. ✅ Aim for 70%+ code coverage

---

## Need Help?

- 📖 [Flutter Testing Docs](https://docs.flutter.dev/testing)
- 📖 [Mockito Package](https://pub.dev/packages/mockito)
- 💡 **Pro Tip:** Start small! Even one test is better than no tests.

Happy Testing! 🎉
