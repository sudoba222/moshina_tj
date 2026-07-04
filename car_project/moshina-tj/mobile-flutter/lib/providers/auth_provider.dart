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
    // Wire the 401 interceptor so any revoked token immediately logs out.
    _authService.api.setUnauthorizedHandler(_onForceLogout);
    _init();
  }

  void _onForceLogout() {
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  Future<void> _init() async {
    // Show cached user instantly, then verify with server.
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
      // No cached user AND server returned null → definitely not logged in.
      _status = AuthStatus.unauthenticated;
    }
    // If cached != null but live == null, the network may be down.
    // Keep the authenticated state; the 401 interceptor handles actual revocation.
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

  Future<bool> loginWithOtp(String phone, String code, {String? name}) async {
    _error = null;
    notifyListeners();
    try {
      final user = await _authService.loginWithOtp(phone, code, name: name);
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

  Future<bool> loginWithEmail(String email, String password) async {
    _error = null;
    notifyListeners();
    try {
      final user = await _authService.loginWithEmail(email, password);
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

  Future<bool> registerWithEmail(String email, String name, String password) async {
    _error = null;
    notifyListeners();
    try {
      await _authService.registerWithEmail(email, name, password);
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> verifyEmailOtp(String email, String code) async {
    _error = null;
    notifyListeners();
    try {
      final user = await _authService.verifyEmailOtp(email, code);
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

  void updateUserFromJson(Map<String, dynamic> json) {
    _user = AppUser.fromJson(json);
    notifyListeners();
  }
}
