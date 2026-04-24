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
      final token = data['token'] as String?;
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
      final token = data['token'] as String?;
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

  Future<void> _cacheUser(AppUser user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(user.toJson()));
  }
}
