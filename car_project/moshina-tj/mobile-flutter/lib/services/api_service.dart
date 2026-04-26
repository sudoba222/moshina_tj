import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'https://api.tajcar.tj/api/v1';
  static const String _tokenKey = 'auth_token';

  late final Dio _dio;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_cachedToken != null) {
          options.headers['Authorization'] = 'Bearer $_cachedToken';
        }
        handler.next(options);
      },
      onError: (error, handler) {
        handler.next(error);
      },
    ));
  }

  // In-memory cache of the current token — populated by init() at startup.
  String? _cachedToken;

  /// Call once in main() before runApp to warm the token cache.
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _cachedToken = prefs.getString(_tokenKey);
  }

  /// Synchronous accessor for the token; null until init() has completed.
  String? get cachedToken => _cachedToken;

  Future<void> saveToken(String token) async {
    _cachedToken = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> clearToken() async {
    _cachedToken = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  Future<String?> getToken() async {
    if (_cachedToken != null) return _cachedToken;
    final prefs = await SharedPreferences.getInstance();
    _cachedToken = prefs.getString(_tokenKey);
    return _cachedToken;
  }

  Future<dynamic> getRaw(String path, {Map<String, dynamic>? queryParams}) async {
    final response = await _dio.get(path, queryParameters: queryParams);
    final data = response.data;
    if (data is Map<String, dynamic> && data.containsKey('success')) {
      return data['data'];
    }
    return data;
  }

  Future<dynamic> postRaw(String path, {required Map<String, dynamic> body}) async {
    final response = await _dio.post(path, data: body);
    final data = response.data;
    if (data is Map<String, dynamic> && data.containsKey('success')) {
      return data['data'];
    }
    return data;
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  Future<List<dynamic>> getConversations() async =>
      (await getRaw('/chat/conversations') as List<dynamic>?) ?? [];

  Future<Map<String, dynamic>> createOrGetConversation(String listingId) async =>
      await postRaw('/chat/conversations', body: {'listing_id': listingId});

  Future<List<dynamic>> getMessages(String convId, {int page = 1}) async =>
      (await getRaw('/chat/$convId/messages',
              queryParams: {'page': page}) as List<dynamic>?) ??
          [];

  Future<void> markConversationRead(String convId) async =>
      await _dio.put('/chat/$convId/read');

  Future<dynamic> putRaw(String path, {required Map<String, dynamic> body}) async {
    final response = await _dio.put(path, data: body);
    final data = response.data;
    if (data is Map<String, dynamic> && data.containsKey('success')) {
      return data['data'];
    }
    return data;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  Future<void> sendPhoneOtp(String phone) async {
    await postRaw('/auth/send-otp', body: {'phone': phone});
  }

  Future<dynamic> verifyOtp(String phone, String code, {String? name}) async {
    final body = <String, dynamic>{'phone': phone, 'code': code};
    if (name != null) body['name'] = name;
    return postRaw('/auth/verify-otp', body: body);
  }

  Future<dynamic> loginEmail(String email, String password) async {
    return postRaw('/auth/login-email', body: {'email': email, 'password': password});
  }

  Future<void> registerEmail(String email, String name) async {
    await postRaw('/auth/register-email', body: {'email': email, 'name': name});
  }

  Future<dynamic> verifyEmailOtp(String email, String code) async {
    return postRaw('/auth/verify-email-otp', body: {'email': email, 'code': code});
  }

  Future<String> sendTelegramOtp(String phone) async {
    final data = await postRaw('/auth/send-otp-telegram', body: {'phone': phone});
    if (data is Map<String, dynamic>) {
      return data['deep_link'] as String? ?? '';
    }
    return '';
  }

  Future<dynamic> updateProfile({String? name, String? email, String? whatsapp}) async {
    final body = <String, dynamic>{};
    if (name != null) body['full_name'] = name;
    if (email != null) body['email'] = email;
    if (whatsapp != null) body['whatsapp'] = whatsapp;
    return putRaw('/auth/profile', body: body);
  }

  Future<void> changePassword(String current, String newPass) async {
    await putRaw('/auth/change-password',
        body: {'current_password': current, 'new_password': newPass});
  }

  // ── Listings ──────────────────────────────────────────────────────────────

  Future<List<dynamic>> getMyListings(String userId,
      {int page = 1, String? status}) async {
    final params = <String, dynamic>{
      'user_id': userId,
      'page': page,
      'limit': 20,
    };
    if (status != null) params['status'] = status;
    final data = await getRaw('/listings', queryParams: params);
    if (data is Map<String, dynamic> && data.containsKey('items')) {
      return data['items'] as List<dynamic>? ?? [];
    }
    if (data is List<dynamic>) return data;
    return [];
  }

  Future<dynamic> createListing(Map<String, dynamic> data) async {
    return postRaw('/listings', body: data);
  }

  Future<void> deleteListing(String id) async {
    await _dio.delete('/listings/$id');
  }

  Future<dynamic> updateListing(String id, Map<String, dynamic> data) async {
    return putRaw('/listings/$id', body: data);
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  Future<List<dynamic>> getNotifications({int page = 1}) async {
    final data = await getRaw('/notifications', queryParams: {'page': page, 'limit': 20});
    if (data is Map<String, dynamic>) {
      return data['items'] as List<dynamic>? ?? [];
    }
    if (data is List<dynamic>) return data;
    return [];
  }

  Future<int> getUnreadNotificationCount() async {
    final data = await getRaw('/notifications/unread-count');
    if (data is Map<String, dynamic>) {
      return (data['count'] as num?)?.toInt() ?? 0;
    }
    return 0;
  }

  Future<void> markAllNotificationsRead() async {
    await _dio.put('/notifications/read-all');
  }

  Future<void> markNotificationRead(String id) async {
    await _dio.put('/notifications/$id/read');
  }

  // ── Support ───────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> createSupportTicket() async {
    final data = await postRaw('/support/tickets', body: {});
    if (data is Map<String, dynamic>) return data;
    return {};
  }

  // ── Search ────────────────────────────────────────────────────────────────

  Future<List<String>> getSearchSuggestions(String q) async {
    final data = await getRaw('/search/suggestions', queryParams: {'q': q, 'limit': 8});
    if (data is List<dynamic>) {
      return data.map((item) {
        if (item is String) return item;
        if (item is Map<String, dynamic>) {
          return (item['text'] ?? item['suggestion'] ?? '').toString();
        }
        return item.toString();
      }).where((s) => s.isNotEmpty).toList();
    }
    return [];
  }

  // ── Dealers ───────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getDealerDetail(String dealerId) async {
    final data = await getRaw('/dealers/$dealerId');
    if (data is Map<String, dynamic>) return data;
    return {};
  }
}
