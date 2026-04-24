import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/auth_service.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  final AuthService _authService;

  AuthStatus _status = AuthStatus.unknown;
  AppUser? _user;
  String? _error;

  AuthStatus get status => _status;
  AppUser? get user => _user;
  String? get error => _error;
  bool get isAuthenticated => _status == AuthStatus.authenticated;

  AuthProvider(this._authService) {
    _init();
  }

  Future<void> _init() async {
    // Show cached user instantly, then verify with server
    final cached = await _authService.getCachedUser();
    if (cached != null) {
      _user = cached;
      _status = AuthStatus.authenticated;
      notifyListeners();
    }
    final live = await _authService.getCurrentUser();
    if (live != null) {
      _user = live;
      _status = AuthStatus.authenticated;
    } else if (cached == null) {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> login({required String phone, required String password}) async {
    _error = null;
    notifyListeners();
    try {
      final user = await _authService.login(phone: phone, password: password);
      _user = user;
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String phone,
    required String password,
    required String fullName,
  }) async {
    _error = null;
    notifyListeners();
    try {
      final user = await _authService.register(
        phone: phone,
        password: password,
        fullName: fullName,
      );
      _user = user;
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
