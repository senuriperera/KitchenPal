# 🧪 KitchenPal Mobile - Test Suite

## Quick Start

### 1️⃣ Install Dependencies
```bash
cd KitchenPal-Mobile
flutter pub get
```

### 2️⃣ Run All Tests
```bash
flutter test
```

### 3️⃣ Run Specific Test
```bash
# Run model tests
flutter test test/models/auth_response_test.dart

# Run widget tests
flutter test test/widgets/notifications_drawer_test.dart

# Run utility tests
flutter test test/utils/time_utils_test.dart
```

---

## 📁 Test Structure

```
test/
├── models/                    # Unit tests for data models
│   └── auth_response_test.dart
├── services/                  # Unit tests for services
│   └── auth_service_test.dart
├── widgets/                   # Widget tests for UI components
│   └── notifications_drawer_test.dart
├── utils/                     # Unit tests for utility functions
│   └── time_utils_test.dart
└── widget_test.dart          # Main app smoke test
```

---

## 🎯 What Each Test Does

### ✅ Model Tests (`test/models/`)
**Purpose:** Test data parsing and serialization

**Example:** `auth_response_test.dart`
- ✓ Parses JSON from API correctly
- ✓ Handles null values properly
- ✓ Converts objects back to JSON
- ✓ Roundtrip conversion preserves data

**Why it matters:** Ensures your app doesn't crash when receiving data from the backend.

---

### ✅ Service Tests (`test/services/`)
**Purpose:** Test business logic and API calls

**Example:** `auth_service_test.dart`
- ✓ Login with correct credentials succeeds
- ✓ Login with wrong credentials fails
- ✓ Network errors are handled gracefully
- ✓ Tokens are stored correctly

**Why it matters:** Ensures your app communicates with the backend correctly.

**Note:** These tests use mocks (fake API responses) so they run fast and don't need internet.

---

### ✅ Widget Tests (`test/widgets/`)
**Purpose:** Test UI components display correctly

**Example:** `notifications_drawer_test.dart`
- ✓ Widget builds without crashing
- ✓ Shows loading indicator while loading
- ✓ Displays notifications correctly
- ✓ Buttons are tappable
- ✓ Empty state shows correct message

**Why it matters:** Ensures your UI looks and behaves as expected.

---

### ✅ Utility Tests (`test/utils/`)
**Purpose:** Test helper functions

**Example:** `time_utils_test.dart`
- ✓ Formats "5 minutes ago" correctly
- ✓ Formats "3 hours ago" correctly
- ✓ Shows "Yesterday" for 1 day ago
- ✓ Handles edge cases (0 minutes, etc.)

**Why it matters:** Ensures small utility functions work correctly.

---

## 🚀 Running Tests - Step by Step

### Step 1: Run the Simplest Test First
```bash
flutter test test/utils/time_utils_test.dart
```

**Expected output:**
```
✓ returns minutes ago for recent times
✓ returns hours ago for times within 24 hours
✓ returns Yesterday for 1 day ago
✓ returns days ago for multiple days
✓ handles edge case of 0 minutes

All tests passed!
```

### Step 2: Run Model Tests
```bash
flutter test test/models/auth_response_test.dart
```

**Expected output:**
```
✓ fromJson creates AuthResponse correctly
✓ fromJson handles null refreshToken
✓ toJson converts LoginRequest to JSON correctly
... (more tests)

All tests passed!
```

### Step 3: Run Widget Tests
```bash
flutter test test/widgets/notifications_drawer_test.dart
```

**Note:** Widget tests might fail if they try to make real API calls. We'll need to add mocks for those.

### Step 4: Run All Tests
```bash
flutter test
```

---

## 📊 Understanding Test Output

### ✅ Success
```
✓ test name here
```
Means the test passed!

### ❌ Failure
```
✗ test name here
  Expected: 5
  Actual: 3
```
Means the test found a bug! The expected value didn't match the actual value.

### ⏭️ Skipped
```
⊘ test name here
```
Means the test was skipped (using `skip: true`).

---

## 🐛 Common Issues & Solutions

### Issue 1: "Package not found"
```
Error: Could not find package 'kitchenpal_mobile'
```

**Solution:**
```bash
flutter pub get
```

### Issue 2: "MissingPluginException"
```
MissingPluginException(No implementation found for method...)
```

**Solution:** This happens when testing code that uses platform channels (like camera, storage). You need to mock these services.

### Issue 3: Tests timeout
```
Test timed out after 30 seconds
```

**Solution:** The test is waiting for something that never happens. Check for:
- Infinite loops
- Waiting for real API calls (use mocks instead)
- Missing `await tester.pump()` in widget tests

---

## 🎓 Learning Path

### Week 1: Understand the Basics
1. Read `TESTING_GUIDE.md`
2. Run `flutter test test/utils/time_utils_test.dart`
3. Modify the test and see it fail
4. Fix it and see it pass

### Week 2: Write Your First Test
1. Pick a simple utility function
2. Write a test for it
3. Run the test
4. Celebrate! 🎉

### Week 3: Test a Model
1. Look at `test/models/auth_response_test.dart`
2. Pick another model (like Recipe or Ingredient)
3. Write similar tests for it

### Week 4: Test a Widget
1. Look at `test/widgets/notifications_drawer_test.dart`
2. Pick a simple widget (like a button or card)
3. Write tests for it

---

## 📈 Coverage Report

To see how much of your code is tested:

```bash
flutter test --coverage
```

This creates a `coverage/lcov.info` file. To view it nicely:

```bash
# Install lcov (one time)
# On Mac: brew install lcov
# On Windows: Use WSL or skip this step

# Generate HTML report
genhtml coverage/lcov.info -o coverage/html

# Open in browser
open coverage/html/index.html
```

**Goal:** Aim for 70%+ coverage on critical features (auth, data models, core business logic).

---

## 🎯 Next Steps

1. ✅ Run all existing tests
2. ✅ Read `TESTING_GUIDE.md` for detailed explanations
3. ✅ Write tests for your Recipe model
4. ✅ Write tests for your Ingredient service
5. ✅ Add tests before adding new features

---

## 💡 Pro Tips

1. **Write tests for bugs:** When you find a bug, write a test that reproduces it first, then fix it.
2. **Test edge cases:** Empty strings, null values, very large numbers, etc.
3. **Keep tests fast:** Use mocks for API calls and database operations.
4. **Run tests before committing:** Make it a habit!
5. **Don't aim for 100% coverage:** Focus on critical features first.

---

## 📚 Resources

- [Flutter Testing Docs](https://docs.flutter.dev/testing)
- [Mockito Package](https://pub.dev/packages/mockito)
- [Widget Testing Guide](https://docs.flutter.dev/cookbook/testing/widget/introduction)
- Main Guide: `TESTING_GUIDE.md` in this folder

---

## ❓ Questions?

If you're stuck:
1. Check the error message carefully
2. Read the test that's failing
3. Look at similar tests that are passing
4. Google the error message
5. Ask for help!

Happy Testing! 🚀
