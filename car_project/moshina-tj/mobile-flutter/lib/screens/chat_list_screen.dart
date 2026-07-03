import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import '../providers/auth_provider.dart';
import '../providers/badge_provider.dart';
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
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Divider(color: c.border, height: 1),
        ),
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
              separatorBuilder: (_, _) => Divider(
                height: 1,
                indent: 80,
                endIndent: 16,
                color: c.border,
              ),
              itemBuilder: (context, i) {
                final conv = items[i] as Map<String, dynamic>;
                final myUserId =
                    context.read<AuthProvider>().user?.id ?? '';
                return _ConversationTile(
                  conv: conv,
                  myUserId: myUserId,
                  lang: lang,
                  c: c,
                  onTap: () {
                    final badges = context.read<BadgeProvider>();
                    final api = context.read<ApiService>();
                    context.push('/chat/${conv['id']}', extra: conv).then((_) {
                      if (!mounted) return;
                      _load();
                      badges.refresh(api);
                    });
                  },
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
  final String myUserId;
  final String lang;
  final AppColors c;
  final VoidCallback onTap;

  const _ConversationTile({
    required this.conv,
    required this.myUserId,
    required this.lang,
    required this.c,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final listing = conv['listing'] as Map<String, dynamic>? ?? {};
    final otherUser = conv['other_participant'] as Map<String, dynamic>? ?? {};
    final lastMsg = conv['last_message'] as Map<String, dynamic>?;
    final unread = (conv['unread_count'] as int?) ?? 0;

    final brand = listing['brand'] as String? ?? '';
    final model = listing['model'] as String? ?? '';
    final userName = otherUser['name'] as String? ?? '';
    final lastContent = lastMsg?['content'] as String? ?? '';
    final createdAt = lastMsg?['created_at'] as String?;
    final lastSenderId = lastMsg?['sender_id'] as String?;
    final isLastMine = lastSenderId == myUserId;

    // Initials from user's full name
    final initials = userName.isNotEmpty
        ? userName.trim().split(' ').take(2).map((w) => w[0].toUpperCase()).join()
        : '?';

    // A stable color based on initials — picks from accent variants
    final avatarBg = c.accent.withValues(alpha: 0.15);

    return Dismissible(
      key: ValueKey(conv['id']),
      direction: DismissDirection.endToStart,
      // Swipe is visual only — no destructive action
      confirmDismiss: (_) async => false,
      background: Container(
        color: c.accent.withValues(alpha: 0.08),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        child: Icon(Icons.archive_outlined, color: c.accent),
      ),
      child: Material(
        color: c.card,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Avatar: initials circle + small car badge
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: avatarBg,
                      ),
                      child: Center(
                        child: Text(
                          initials,
                          style: AppTextStyles.bodyLg(
                            color: c.accent,
                            weight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                    // Car badge at bottom-right
                    Positioned(
                      bottom: -2,
                      right: -2,
                      child: Container(
                        width: 20,
                        height: 20,
                        decoration: BoxDecoration(
                          color: c.card,
                          shape: BoxShape.circle,
                          border: Border.all(color: c.border, width: 1.5),
                        ),
                        child: Center(
                          child: Icon(
                            Icons.directions_car_rounded,
                            size: 11,
                            color: c.textMuted,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 12),
                // Text column
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Name row + time
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              userName.isNotEmpty
                                  ? userName
                                  : '$brand $model',
                              style: AppTextStyles.bodyLg(
                                color: c.text,
                                weight: unread > 0
                                    ? FontWeight.w700
                                    : FontWeight.w600,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (createdAt != null)
                            Text(
                              _formatTime(createdAt, lang),
                              style: AppTextStyles.caption(
                                color: unread > 0 ? c.accent : c.textMuted,
                                weight: unread > 0
                                    ? FontWeight.w700
                                    : FontWeight.w400,
                              ),
                            ),
                        ],
                      ),
                      // Car name subtitle
                      if (userName.isNotEmpty && brand.isNotEmpty)
                        Text(
                          '$brand $model',
                          style: AppTextStyles.caption(
                              color: c.textSecondary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      const SizedBox(height: 2),
                      // Last message preview row + unread badge
                      Row(
                        children: [
                          Expanded(
                            child: lastContent.isNotEmpty
                                ? Text(
                                    isLastMine
                                        ? '${t('chat.you', lang)}: $lastContent'
                                        : lastContent,
                                    style: AppTextStyles.bodySm(
                                      color: unread > 0
                                          ? c.text
                                          : c.textMuted,
                                      weight: unread > 0
                                          ? FontWeight.w500
                                          : FontWeight.w400,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  )
                                : const SizedBox.shrink(),
                          ),
                          if (unread > 0) ...[
                            const SizedBox(width: 6),
                            _UnreadBadge(count: unread, c: c),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
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

class _UnreadBadge extends StatelessWidget {
  final int count;
  final AppColors c;

  const _UnreadBadge({required this.count, required this.c});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
      padding: const EdgeInsets.symmetric(horizontal: 6),
      decoration: BoxDecoration(
        color: c.accent,
        borderRadius: BorderRadius.circular(10),
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
        separatorBuilder: (_, _) => Divider(
          height: 1,
          indent: 80,
          endIndent: 16,
          color: c.border,
        ),
        itemBuilder: (_, _) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: c.card,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(width: 130, height: 14, color: c.card),
                        const Spacer(),
                        Container(width: 32, height: 10, color: c.card),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Container(width: 90, height: 11, color: c.card),
                    const SizedBox(height: 5),
                    Container(width: 180, height: 11, color: c.card),
                  ],
                ),
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
                Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: c.tagBg,
                  ),
                  child: Icon(Icons.chat_bubble_outline_rounded,
                      size: 44, color: c.accentDim),
                ),
                const SizedBox(height: 20),
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
  const _ErrorState(
      {required this.c, required this.lang, required this.onRetry});

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
