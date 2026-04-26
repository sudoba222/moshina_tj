import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import '../providers/language_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _items = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<ApiService>();
      final items = await api.getNotifications();
      if (mounted) setState(() => _items = items);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAllRead() async {
    try {
      final api = context.read<ApiService>();
      await api.markAllNotificationsRead();
      await _load();
    } catch (_) {}
  }

  Future<void> _markRead(String id) async {
    try {
      final api = context.read<ApiService>();
      await api.markNotificationRead(id);
    } catch (_) {}
  }

  void _onTap(Map<String, dynamic> item) {
    final id = (item['id'] ?? '').toString();
    _markRead(id);
    // Mark locally as read
    setState(() {
      final idx = _items.indexWhere((i) => (i['id'] ?? '').toString() == id);
      if (idx >= 0) {
        final updated = Map<String, dynamic>.from(_items[idx] as Map<String, dynamic>);
        updated['is_read'] = true;
        _items[idx] = updated;
      }
    });

    final listingId = item['listing_id']?.toString();
    final convId = item['conversation_id']?.toString();

    if (listingId != null && listingId.isNotEmpty) {
      context.push('/car/$listingId');
    } else if (convId != null && convId.isNotEmpty) {
      context.push('/chat/$convId');
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.card,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded, color: c.text),
          onPressed: () => context.pop(),
        ),
        title: Text(
          t('notifications.title', lang),
          style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: c.text),
        ),
        actions: [
          TextButton(
            onPressed: _markAllRead,
            child: Text(
              t('notifications.markAllRead', lang),
              style: TextStyle(color: c.accent, fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Divider(color: c.border, height: 1),
        ),
      ),
      body: _buildBody(c, lang),
    );
  }

  Widget _buildBody(AppColors c, String lang) {
    if (_loading) return _buildShimmer(c);

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.wifi_off_outlined, size: 48, color: c.textMuted),
            const SizedBox(height: 12),
            Text(t('error.generic', lang), style: TextStyle(color: c.textSecondary)),
            const SizedBox(height: 12),
            TextButton(
              onPressed: _load,
              child: Text(t('error.retry', lang), style: TextStyle(color: c.accent)),
            ),
          ],
        ),
      );
    }

    if (_items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.notifications_none_outlined, size: 64, color: c.textMuted),
            const SizedBox(height: 16),
            Text(
              t('notifications.empty', lang),
              style: GoogleFonts.outfit(color: c.textMuted, fontSize: 16, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: c.accent,
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: _items.length,
        separatorBuilder: (_, __) => Divider(color: c.border, height: 1),
        itemBuilder: (ctx, i) {
          final item = _items[i] as Map<String, dynamic>;
          return _NotificationTile(
            item: item,
            c: c,
            lang: lang,
            onTap: () => _onTap(item),
          );
        },
      ),
    );
  }

  Widget _buildShimmer(AppColors c) {
    return Shimmer.fromColors(
      baseColor: c.border,
      highlightColor: c.surface,
      child: ListView.builder(
        padding: const EdgeInsets.all(0),
        itemCount: 6,
        itemBuilder: (_, __) => Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          height: 70,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final Map<String, dynamic> item;
  final AppColors c;
  final String lang;
  final VoidCallback onTap;

  const _NotificationTile({
    required this.item,
    required this.c,
    required this.lang,
    required this.onTap,
  });

  IconData _iconForType(String type) {
    if (type.contains('chat') || type.contains('message')) {
      return Icons.chat_bubble_outline_rounded;
    }
    if (type.contains('listing') || type.contains('sell')) {
      return Icons.sell_outlined;
    }
    if (type.contains('verif')) {
      return Icons.verified_outlined;
    }
    return Icons.notifications_none_rounded;
  }

  String _relativeTime(String? dateStr, String lang) {
    if (dateStr == null) return '';
    try {
      final date = DateTime.parse(dateStr).toLocal();
      final now = DateTime.now();
      final diff = now.difference(date);
      if (diff.inDays == 0) return t('common.today', lang);
      if (diff.inDays == 1) return t('common.yesterday', lang);
      return '${diff.inDays} ${t('common.daysAgo', lang)}';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = item['type'] as String? ?? '';
    final title = item['title'] as String? ?? '';
    final body = item['body'] as String? ?? item['message'] as String? ?? '';
    final isRead = item['is_read'] as bool? ?? false;
    final createdAt = item['created_at'] as String?;

    return InkWell(
      onTap: onTap,
      child: Container(
        color: isRead ? Colors.transparent : c.accent.withValues(alpha: 0.05),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: c.accent.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(_iconForType(type), color: c.accent, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: GoogleFonts.outfit(
                            color: c.text,
                            fontSize: 14,
                            fontWeight: isRead ? FontWeight.w500 : FontWeight.w700,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _relativeTime(createdAt, lang),
                        style: TextStyle(color: c.textMuted, fontSize: 11),
                      ),
                    ],
                  ),
                  if (body.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(
                      body,
                      style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.4),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            if (!isRead) ...[
              const SizedBox(width: 8),
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 6),
                decoration: BoxDecoration(color: c.accent, shape: BoxShape.circle),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
