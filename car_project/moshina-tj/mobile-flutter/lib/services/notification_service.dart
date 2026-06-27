import 'dart:async';
import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// Top-level background message handler — must be a top-level function (FCM requirement).
/// The isolate has no UI access; FCM will show the system notification automatically.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // No-op: FCM SDK displays the system notification from the data payload automatically.
}

class NotificationService {
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  static const _androidChannel = AndroidNotificationChannel(
    'moshina_tj_high',
    'Moshina.TJ Notifications',
    importance: Importance.high,
  );

  // Bug #3 fix: store subscriptions so they can be cancelled on re-init.
  static StreamSubscription<RemoteMessage>? _onMessageSub;
  static StreamSubscription<RemoteMessage>? _onOpenedSub;
  static StreamSubscription<String>? _onTokenRefreshSub;

  /// Call once after the user is authenticated and a valid [BuildContext] is available.
  /// Safe to call multiple times — cancels previous listeners before re-subscribing.
  static Future<void> initialize(ApiService api, BuildContext context) async {
    final messaging = FirebaseMessaging.instance;

    // Bug #3 fix: cancel any existing subscriptions before re-subscribing.
    // Without this, each login stacks an additional listener causing duplicate
    // notifications and token refreshes.
    await _onMessageSub?.cancel();
    await _onOpenedSub?.cancel();
    await _onTokenRefreshSub?.cancel();

    // --- Permission ---
    await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // --- Android local notification channel ---
    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_androidChannel);

    await _localNotifications.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
      onDidReceiveNotificationResponse: (details) {
        _handleTap(details.payload, context);
      },
    );

    // Note: FirebaseMessaging.onBackgroundMessage() is registered in main()
    // before runApp(), as required by Firebase. It must be called before any
    // other Firebase initialization to work correctly on all platforms.

    // --- Foreground messages ---
    _onMessageSub = FirebaseMessaging.onMessage.listen(_showLocalNotification);

    // --- Notification tapped while app was in background (not terminated) ---
    _onOpenedSub = FirebaseMessaging.onMessageOpenedApp.listen((message) {
      final route = _routeForMessage(message);
      _handleTap(route, context);
    });

    // --- Notification tapped while app was terminated ---
    final initial = await messaging.getInitialMessage();
    if (initial != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final route = _routeForMessage(initial);
        _handleTap(route, context);
      });
    }

    // --- Register current token ---
    await _registerToken(api);

    // --- Keep token fresh ---
    _onTokenRefreshSub = messaging.onTokenRefresh.listen(
      (token) => _postToken(api, token),
    );
  }

  static Future<void> _registerToken(ApiService api) async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await _postToken(api, token);
    } catch (_) {
      // Token unavailable (e.g. no Google Play Services). Silently skip.
    }
  }

  static Future<void> _postToken(ApiService api, String token) async {
    try {
      await api.postRaw(
        '/users/me/fcm-token',
        // Bug #1 fix: send the correct platform string instead of hardcoding 'android'.
        body: {'token': token, 'platform': Platform.isIOS ? 'ios' : 'android'},
      );
    } catch (_) {
      // Non-critical: FCM will still deliver; retry on next app launch.
    }
  }

  static String _routeForMessage(RemoteMessage message) {
    final type = message.data['type'];
    final conversationId = message.data['conversation_id'];
    if (type == 'chat' && conversationId != null) {
      return '/chat/$conversationId';
    }
    return '/notifications';
  }

  static void _showLocalNotification(RemoteMessage message) {
    final n = message.notification;
    if (n == null) return;

    _localNotifications.show(
      message.hashCode,
      n.title,
      n.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _androidChannel.id,
          _androidChannel.name,
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: const DarwinNotificationDetails(),
      ),
      payload: _routeForMessage(message),
    );
  }

  static void _handleTap(String? route, BuildContext context) {
    if (route == null) return;
    try {
      GoRouter.of(context).push(route);
    } catch (_) {
      // Context may be stale on cold launch; router will handle navigation on next frame.
    }
  }
}
