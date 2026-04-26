import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import '../models/user.dart';

class AuthService {
  final ApiService _api;
  static const String _userKey = 'cached_user';

  AuthService(this._api);

  Future<AppUser> login({required String phone, required String password}) async {
    final data = await _api.postRaw('/auth/login', body: {'phone': phone, 'password': password});
    if (data is Map<String, dynamic>) {
      final token = _extractToken(data['token']);
      if (token != null) {
        await _api.saveToken(token);
        final userMap = data['user'] as Map<String, dynamic>? ?? data;
        final user = AppUser.fromJson(userMap);
        await _cacheUser(user);
        return user;
      }
    }
    throw Exception('Неверный телефон или пароль');
  }

  Future<AppUser> register({
    required String phone,
    required String password,
    required String fullName,
  }) async {
    final data = await _api.postRaw('/auth/register', body: {
      'phone': phone,
      'password': password,
      'full_name': fullName,
    });
    if (data is Map<String, dynamic>) {
      final token = _extractToken(data['token']);
      if (token != null) {
        await _api.saveToken(token);
        final userMap = data['user'] as Map<String, dynamic>? ?? data;
        final user = AppUser.fromJson(userMap);
        await _cacheUser(user);
        return user;
      }
    }
    throw Exception('Ошибка регистрации');
  }

  // Backend returns token as {"access_token": "...", "token_type": "bearer"} — extract the string.
  String? _extractToken(dynamic tokenField) {
    if (tokenField is String) return tokenField;
    if (tokenField is Map) return tokenField['access_token'] as String?;
    return null;
  }

  Future<AppUser?> getCurrentUser() async {
    final token = await _api.getToken();
    if (token == null) return null;
    try {
      final data = await _api.getRaw('/auth/me');
      if (data is Map<String, dynamic>) {
        final userMap = data.containsKey('user') ? data['user'] as Map<String, dynamic> : data;
        final user = AppUser.fromJson(userMap);
        await _cacheUser(user);
        return user;
      }
    } catch (_) {
      await _api.clearToken();
    }
    return null;
  }

  Future<AppUser?> getCachedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_userKey);
    if (raw == null) return null;
    try {
      return AppUser.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    await _api.clearToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
  }

  Future<bool> isLoggedIn() async => (await _api.getToken()) != null;

  Future<AppUser> loginWithOtp(String phone, String code, {String? name}) async {
    final data = await _api.verifyOtp(phone, code, name: name);
    if (data is Map<String, dynamic>) {
      final token = _extractToken(data['token'] ?? data['access_token']);
      if (token != null) {
        await _api.saveToken(token);
        final userMap = data['user'] as Map<String, dynamic>? ?? data;
        final user = AppUser.fromJson(userMap);
        await _cacheUser(user);
        return user;
      }
    }
    throw Exception('Неверный код');
  }

  Future<AppUser> loginWithEmail(String email, String password) async {
    final data = await _api.loginEmail(email, password);
    if (data is Map<String, dynamic>) {
      final token = _extractToken(data['token'] ?? data['access_token']);
      if (token != null) {
        await _api.saveToken(token);
        final userMap = data['user'] as Map<String, dynamic>? ?? data;
        final user = AppUser.fromJson(userMap);
        await _cacheUser(user);
        return user;
      }
    }
    throw Exception('Неверный email или пароль');
  }

  Future<void> registerWithEmail(String email, String name) async {
    await _api.registerEmail(email, name);
  }

  Future<AppUser> verifyEmailOtp(String email, String code) async {
    final data = await _api.verifyEmailOtp(email, code);
    if (data is Map<String, dynamic>) {
      final token = _extractToken(data['token'] ?? data['access_token']);
      if (token != null) {
        await _api.saveToken(token);
        final userMap = data['user'] as Map<String, dynamic>? ?? data;
        final user = AppUser.fromJson(userMap);
        await _cacheUser(user);
        return user;
      }
    }
    throw Exception('Неверный код');
  }

  Future<void> _cacheUser(AppUser user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(user.toJson()));
  }
}
