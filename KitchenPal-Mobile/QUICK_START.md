# KitchenPal Mobile - Testing & CI/CD Quick Start

## ✅ What I've Set Up For You

1. **pubspec.yaml** - Added testing dependencies
   - `mockito` - For mocking API calls and services
   - `integration_test` - For testing complete user flows

2. **Unit Tests Created**
   - `test/services/storage_service_test.dart` - Tests token storage logic
   - `test/services/auth_service_test.dart` - Tests login/register API calls

3. **Integration Test Example**
   - `integration_test/login_flow_test.dart` - Tests login flow end-to-end

4. **CI Pipeline Created**
   - `.github/workflows/mobile_pipeline.yml` - Automatically runs tests on push

5. **Documentation**
   - `TESTING_AND_CI_GUIDE.md` - Complete guide with explanations

---

## 🚀 Next Steps (Do These)

### Step 1: Download Dependencies

```bash
cd KitchenPal-Mobile
flutter pub get
```

### Step 2: Run Unit Tests Locally

```bash
# Run all tests
flutter test

# Run specific test file
flutter test test/services/storage_service_test.dart

# Run with verbose output
flutter test -v
```

**Expected Output:**
```
00:00 +4: StorageService - Token Management: saveToken() should write token to storage
00:00 +5: StorageService - Token Management: getToken() should retrieve token from storage
...
00:02 +14: All tests passed!
```

### Step 3: Run Tests with Coverage

```bash
flutter test --coverage
```

Then view the coverage report:
- **Windows**: `start coverage/html/index.html`
- **Mac**: `open coverage/html/index.html`
- **Linux**: `xdg-open coverage/html/index.html`

### Step 4: Update Your Login Screen (Important)

For the integration test to work, add Keys to your login screen widgets:

**Before:**
```dart
TextFormField(
  validator: (value) => value?.isEmpty ?? true ? 'Enter email' : null,
)
```

**After:**
```dart
TextFormField(
  key: const Key('email_input'),  // ← Add this
  validator: (value) => value?.isEmpty ?? true ? 'Enter email' : null,
)
```

Do the same for:
- Password field: `Key('password_input')`
- Login button: `Key('login_button')`

### Step 5: Push to GitHub

```bash
git add .
git commit -m "Add unit tests, integration tests, and CI pipeline"
git push origin main
```

**The CI pipeline will automatically:**
✓ Run all unit tests  
✓ Check code style  
✓ Build the APK  
✓ Generate coverage reports  
✓ Upload artifacts  

### Step 6: Check CI Results

1. Go to GitHub → Your repo
2. Click on **"Actions"** tab
3. See your workflow running
4. Wait for it to complete (2-3 minutes)
5. Download artifacts to see coverage reports and APK

---

## 📊 Understanding Test Results

### Green ✅ = All tests passed
```
00:05 +42: All tests passed!
```

### Red ❌ = Some tests failed
```
00:02 +10 -1: Some tests failed.
FAILED: test/services/auth_service_test.dart: login() should return AuthResponse
```

When tests fail:
1. Read the error message
2. Check what was expected vs what you got
3. Fix the code or the test
4. Run tests again

---

## 📝 Writing More Tests

### Pattern for Unit Tests

```dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Feature Name', () {
    setUp(() {
      // Setup before each test
    });

    test('Should do something when X happens', () async {
      // Arrange: Set up test data
      const input = 'test';
      
      // Act: Do the thing you're testing
      final result = myFunction(input);
      
      // Assert: Verify the result
      expect(result, equals('expected'));
    });
  });
}
```

### Create Tests For:
- ✅ Login/logout (auth_service_test.dart) - **Already done**
- ✅ Token storage (storage_service_test.dart) - **Already done**
- ⬜ Ingredient operations (needs test/services/ingredient_service_test.dart)
- ⬜ Notifications (needs test/services/notification_service_test.dart)
- ⬜ Recipe generation (needs test/services/recipe_service_test.dart)
- ⬜ Data models (needs test/models/ tests)

---

## 🔍 CI Pipeline Details

The pipeline runs **two jobs**:

### Job 1: `test` (Main job - 2 minutes)
- Checks out your code
- Sets up Flutter
- Installs dependencies
- Runs analyzer (linter)
- **Runs all unit tests** ← Most important
- Generates coverage report
- Builds APK

### Job 2: `lint_check` (Code quality - 1 minute)
- Runs `flutter format` check
- Checks for outdated packages

**What triggers the pipeline:**
- Push to `main` or `develop` branch
- Pull request to `main` or `develop`
- Only if files in `KitchenPal-Mobile/` changed

---

## 📚 Files You Now Have

```
KitchenPal-Mobile/
├── pubspec.yaml (UPDATED - added test dependencies)
├── test/
│   ├── services/
│   │   ├── storage_service_test.dart (NEW - 180 lines)
│   │   └── auth_service_test.dart (NEW - 200+ lines)
│   └── widget_test.dart (existing)
├── integration_test/
│   └── login_flow_test.dart (NEW - complete example)
└── coverage/ (generated when you run: flutter test --coverage)

.github/
└── workflows/
    └── mobile_pipeline.yml (NEW - CI pipeline)

TESTING_AND_CI_GUIDE.md (NEW - full documentation)
QUICK_START.md (this file)
```

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| `flutter: command not found` | Add Flutter to PATH or use full path |
| Tests timeout | Increase timeout: `testWidgets('...', (t) {}, timeout: Timeout(Duration(seconds: 60)))` |
| `MockHttpClient` not working | Check you're using `when()...thenAnswer()` correctly |
| CI pipeline shows red X | Click on pipeline → See which step failed → Fix code → Push again |
| Integration test fails | Make sure you added `Key('email_input')` etc to widgets |

---

## 📈 Coverage Goals

- **Current**: ~0% (we just started!)
- **Week 1 Goal**: 20%+ (focus on critical services)
- **Month 1 Goal**: 50%+ (most business logic tested)
- **Long-term**: 70%+ (industry standard)

To see coverage:
```bash
flutter test --coverage
# Then view coverage/html/index.html
```

---

## 🎯 Success Checklist

- [ ] Ran `flutter pub get` successfully
- [ ] Ran `flutter test` and saw tests pass
- [ ] Viewed coverage report in browser
- [ ] Added Keys to login screen widgets
- [ ] Pushed code to GitHub
- [ ] CI pipeline ran successfully (Actions tab shows ✅)
- [ ] Downloaded coverage artifact
- [ ] Read TESTING_AND_CI_GUIDE.md

---

## 💡 Pro Tips

1. **Run tests before committing:**
   ```bash
   flutter test && flutter analyze
   ```

2. **Use coverage to find what to test:**
   - Open coverage/html/index.html
   - Red lines = untested code
   - Focus there next

3. **Keep tests fast:**
   - Unit tests should run in < 1 second
   - If slow, check for real API calls (should be mocked)

4. **Test the happy path AND the sad path:**
   ```dart
   // Happy path
   test('login succeeds with valid credentials', () { ... });
   
   // Sad path
   test('login fails with invalid credentials', () { ... });
   ```

5. **Read error messages carefully:**
   They tell you exactly what went wrong!

---

## ❓ Questions?

Refer to:
1. **TESTING_AND_CI_GUIDE.md** - Full detailed guide with explanations
2. **test/services/** - Example tests in your repo
3. **integration_test/login_flow_test.dart** - Real example
4. Flutter official docs: https://flutter.dev/docs/testing

---

You've got this! Start with Step 1 and follow the checklist. 🚀
