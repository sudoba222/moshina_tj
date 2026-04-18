import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/user.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _api;
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'auth_token';

  AuthService(this._api);

  Future<String?> getToken() => _storage.read(key: _tokenKey);

  Future<void> saveToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  Future<void> clearToken() => _storage.delete(key: _tokenKey);

  Future<({User user, String token})> login({
    required String phone,
    required String password,
  }) async {
    try {
      final data = await _api.post(
        '/auth/login',
        body: {'phone': phone, 'password': password},
      );
      final token = data['token'] as String;
      final user = User.fromJson(data['user'] as Map<String, dynamic>);
      await saveToken(token);
      return (user: user, token: token);
    } on DioException catch (e) {
      throw _mapError(e);
    }
  }

  Future<User> register({
    required String phone,
    required String password,
    required String fullName,
  }) async {
    try {
      final data = await _api.post(
        '/auth/register',
        body: {
          'phone': phone,
          'password': password,
          'full_name': fullName,
        },
      );
      return User.fromJson(data);
    } on DioException catch (e) {
      throw _mapError(e);
    }
  }

  Future<User?> getCurrentUser() async {
    try {
      final token = await getToken();
      if (token == null) return null;
      final data = await _api.get('/auth/me');
      // /auth/me returns token + user per CLAUDE.md
      if (data.containsKey('user')) {
        return User.fromJson(data['user'] as Map<String, dynamic>);
      }
      return User.fromJson(data);
    } catch (_) {
      return null;
    }
  }

  String _mapError(DioException e) {
    final statusCode = e.response?.statusCode;
    final message =
        (e.response?.data as Map<String, dynamic>?)?['message'] as String?;
    if (statusCode == 401) return message ?? 'Неверный телефон или пароль';
    if (statusCode == 422) return message ?? 'Проверьте введённые данные';
    if (statusCode == 409) return message ?? 'Пользователь уже существует';
    return message ?? 'Ошибка соединения с сервером';
  }
}
