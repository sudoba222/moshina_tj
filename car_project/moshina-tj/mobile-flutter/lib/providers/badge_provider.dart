import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class BadgeProvider extends ChangeNotifier {
  int unreadMessages = 0;
  int unreadNotifications = 0;
  Timer? _timer;
  bool _fetching = false;

  void start(ApiService api) {
    _fetch(api);
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _fetch(api));
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  Future<void> _fetch(ApiService api) async {
    if (_fetching) return;
    _fetching = true;
    try {
      final results = await Future.wait([
        _fetchUnreadMessages(api),
        api.getUnreadNotificationCount(),
      ]);
      unreadMessages = results[0];
      unreadNotifications = results[1];
      notifyListeners();
    } catch (_) {
      // Network errors are silent — badge stays stale until next poll.
    } finally {
      _fetching = false;
    }
  }

  Future<int> _fetchUnreadMessages(ApiService api) async {
    try {
      final convs = await api.getConversations();
      return convs.fold<int>(0, (sum, c) {
        final unread = (c['unread_count'] as num?)?.toInt() ?? 0;
        return sum + unread;
      });
    } catch (_) {
      return 0;
    }
  }

  void refresh(ApiService api) => _fetch(api);

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
