import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import '../providers/language_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../theme/text_styles.dart';
import '../l10n/strings.dart';

class ChatListScreen extends StatefulWidget {
  const ChatListScreen({super.key});

  @override
  State<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen> {
  late Future<List<dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    setState(() {
      _future = context.read<ApiService>().getConversations();
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.card,
        title: Text(
          t('chat.title', lang),
          style: AppTextStyles.h2(color: c.text),
        ),
        centerTitle: false,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      body: RefreshIndicator(
        color: c.accent,
        onRefresh: () async => _load(),
        child: FutureBuilder<List<dynamic>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return _ShimmerList(c: c);
            }
            if (snap.hasError) {
              return _ErrorState(c: c, lang: lang, onRetry: _load);
            }
            final items = snap.data ?? [];
            if (items.isEmpty) {
              return _EmptyState(c: c, lang: lang);
            }
            return ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              itemCount: items.length,
              separatorBuilder: (_, __) => Divider(
                height: 1,
                indent: 80,
                endIndent: 16,
                color: c.border,
              ),
              itemBuilder: (context, i) {
                final conv = items[i] as Map<String, dynamic>;
                return _ConversationTile(
                  conv: conv,
                  lang: lang,
                  c: c,
                  onTap: () => context.push(
                    '/chat/${conv['id']}',
                    extra: conv,
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

// ── Conversation tile ────────────────────────────────────────────────────────

class _ConversationTile extends StatelessWidget {
  final Map<String, dynamic> conv;
  final String lang;
  final AppColors c;
  final VoidCallback onTap;

  const _ConversationTile({
    required this.conv,
    required this.lang,
    required this.c,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final listing = conv['listing'] as Map<String, dynamic>? ?? {};
    final otherUser = conv['other_user'] as Map<String, dynamic>? ?? {};
    final lastMsg = conv['last_message'] as Map<String, dynamic>?;
    final unread = (conv['unread_count'] as int?) ?? 0;

    final brand = listing['brand'] as String? ?? '';
    final model = listing['model'] as String? ?? '';
    final images = listing['images'] as List<dynamic>? ?? [];
    final imageUrl = images.isNotEmpty
        ? (images.first as Map<String, dynamic>)['url'] as String? ?? ''
        : '';
    final userName = otherUser['full_name'] as String? ?? '';
    final lastContent = lastMsg?['content'] as String? ?? '';
    final createdAt = lastMsg?['created_at'] as String?;

    return Material(
      color: c.card,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Thumbnail + unread badge
              Stack(
                clipBehavior: Clip.none,
                children: [
                  _CarThumbnail(imageUrl: imageUrl, c: c),
                  if (unread > 0)
                    Positioned(
                      top: -4,
                      right: -4,
                      child: _UnreadBadge(count: unread, c: c),
                    ),
                ],
              ),
              const SizedBox(width: 12),
              // Title + subtitle
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$brand $model',
                      style: AppTextStyles.bodyLg(
                        color: c.text,
                        weight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (userName.isNotEmpty) ...[
                      const SizedBox(height: 1),
                      Text(
                        userName,
                        style: AppTextStyles.caption(color: c.textSecondary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    if (lastContent.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        lastContent,
                        style: AppTextStyles.bodySm(color: c.textMuted),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              // Time + unread count
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (createdAt != null)
                    Text(
                      _formatTime(createdAt, lang),
                      style: AppTextStyles.caption(color: c.textMuted),
                    ),
                  if (unread > 0) ...[
                    const SizedBox(height: 4),
                    _UnreadBadge(count: unread, c: c),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTime(String iso, String lang) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      final now = DateTime.now();
      final diff = now.difference(dt);
      if (diff.inDays == 0) {
        return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
      }
      if (diff.inDays == 1) return t('common.yesterday', lang);
      return '${dt.day}.${dt.month.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }
}

class _CarThumbnail extends StatelessWidget {
  final String imageUrl;
  final AppColors c;

  const _CarThumbnail({required this.imageUrl, required this.c});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: SizedBox(
        width: 52,
        height: 52,
        child: imageUrl.isNotEmpty
            ? CachedNetworkImage(
                imageUrl: imageUrl,
                fit: BoxFit.cover,
                placeholder: (_, __) => Container(color: c.border),
                errorWidget: (_, __, ___) => _PlaceholderIcon(c: c),
              )
            : _PlaceholderIcon(c: c),
      ),
    );
  }
}

class _PlaceholderIcon extends StatelessWidget {
  final AppColors c;
  const _PlaceholderIcon({required this.c});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: c.tagBg,
      child: Icon(Icons.directions_car_outlined, size: 24, color: c.textMuted),
    );
  }
}

class _UnreadBadge extends StatelessWidget {
  final int count;
  final AppColors c;

  const _UnreadBadge({required this.count, required this.c});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
      padding: const EdgeInsets.symmetric(horizontal: 5),
      decoration: BoxDecoration(
        color: c.accent,
        borderRadius: BorderRadius.circular(9),
      ),
      child: Center(
        child: Text(
          count > 99 ? '99+' : count.toString(),
          style: AppTextStyles.micro(
            color: Colors.white,
            weight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

// ── Shimmer loading ──────────────────────────────────────────────────────────

class _ShimmerList extends StatelessWidget {
  final AppColors c;
  const _ShimmerList({required this.c});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: c.border,
      highlightColor: c.surface,
      child: ListView.separated(
        physics: const NeverScrollableScrollPhysics(),
        itemCount: 6,
        separatorBuilder: (_, __) => Divider(
          height: 1,
          indent: 80,
          endIndent: 16,
          color: c.border,
        ),
        itemBuilder: (_, __) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: c.card,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(width: 140, height: 14, color: c.card),
                  const SizedBox(height: 6),
                  Container(width: 90, height: 12, color: c.card),
                  const SizedBox(height: 6),
                  Container(width: 180, height: 12, color: c.card),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Empty state ──────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  final AppColors c;
  final String lang;
  const _EmptyState({required this.c, required this.lang});

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        SliverFillRemaining(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.chat_bubble_outline,
                    size: 64, color: c.accentDim),
                const SizedBox(height: 16),
                Text(
                  t('chat.empty', lang),
                  style: AppTextStyles.h3(color: c.text),
                ),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 40),
                  child: Text(
                    t('chat.emptyHint', lang),
                    style: AppTextStyles.body(color: c.textSecondary),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// ── Error state ──────────────────────────────────────────────────────────────

class _ErrorState extends StatelessWidget {
  final AppColors c;
  final String lang;
  final VoidCallback onRetry;
  const _ErrorState({required this.c, required this.lang, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        SliverFillRemaining(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.wifi_off_outlined, size: 48, color: c.textMuted),
                const SizedBox(height: 12),
                Text(
                  t('error.generic', lang),
                  style: AppTextStyles.body(color: c.textSecondary),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: onRetry,
                  child: Text(
                    t('error.retry', lang),
                    style: AppTextStyles.body(color: c.accent),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
