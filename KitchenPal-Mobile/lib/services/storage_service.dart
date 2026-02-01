import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StorageService {
  static const _storage = FlutterSecureStorage();

  // Keys
  static const String _tokenKey = 'auth_token';
  static const String _userIdKey = 'user_id';
  static const String _userNameKey = 'user_name';
  static const String _userEmailKey = 'user_email';
  static const String _userRoleKey = 'user_role';
  static const String _branchIdKey = 'branch_id';

  // Save auth data
  static Future<void> saveAuthData({
    required String token,
    required int userId,
    required String name,
    required String email,
    required String role,
    int? branchId,
  }) async {
    await Future.wait([
      _storage.write(key: _tokenKey, value: token),
      _storage.write(key: _userIdKey, value: userId.toString()),
      _storage.write(key: _userNameKey, value: name),
      _storage.write(key: _userEmailKey, value: email),
      _storage.write(key: _userRoleKey, value: role),
      if (branchId != null)
        _storage.write(key: _branchIdKey, value: branchId.toString()),
    ]);
  }

  // Get token
  static Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  // Get user ID
  static Future<int?> getUserId() async {
    final id = await _storage.read(key: _userIdKey);
    return id != null ? int.tryParse(id) : null;
  }

  // Get user name
  static Future<String?> getUserName() async {
    return await _storage.read(key: _userNameKey);
  }

  // Get user email
  static Future<String?> getUserEmail() async {
    return await _storage.read(key: _userEmailKey);
  }

  // Get user role
  static Future<String?> getUserRole() async {
    return await _storage.read(key: _userRoleKey);
  }

  // Get branch ID
  static Future<int?> getBranchId() async {
    final id = await _storage.read(key: _branchIdKey);
    return id != null ? int.tryParse(id) : null;
  }

  // Get name (alias for getUserName)
  static Future<String?> getName() async {
    return await getUserName();
  }

  // Check if user is logged in
  static Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  // Clear all auth data (logout)
  static Future<void> clearAuthData() async {
    await Future.wait([
      _storage.delete(key: _tokenKey),
      _storage.delete(key: _userIdKey),
      _storage.delete(key: _userNameKey),
      _storage.delete(key: _userEmailKey),
      _storage.delete(key: _userRoleKey),
      _storage.delete(key: _branchIdKey),
    ]);
  }

  // Clear all storage
  static Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
