import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/io.dart';
import '../providers/auth_provider.dart';
import '../providers/badge_provider.dart';
import '../providers/language_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../theme/text_styles.dart';
import '../l10n/strings.dart';

class ChatScreen extends StatefulWidget {
  final String convId;
  final Map<String, dynamic> convData;

  const ChatScreen({
    super.key,
    required this.convId,
    required this.convData,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  static String get _wsUrl => '${ApiService.wsBase}/chat';

  // Exponential backoff delays (seconds), capped at 30s.
  static const _backoffDelays = [2, 4, 8, 16, 30];
  static const _nearBottomThreshold = 200.0;

  final _ctrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  WebSocketChannel? _channel;
  StreamSubscription? _sub;
  Timer? _reconnectTimer;
  _WsStatus _wsStatus = _WsStatus.connecting;
  bool _wsConnected = false;
  int _reconnectAttempts = 0;

  List<Map<String, dynamic>> _messages = [];
  bool _loadingHistory = true;
  bool _hasMore = true;
  int _page = 1;
  bool _loadingMore = false;

  bool _showScrollFab = false;
  int _unreadWhileScrolled = 0;

  String? _myUserId;

  @override
  void initState() {
    super.initState();
    _myUserId = context.read<AuthProvider>().user?.id;
    _loadHistory();
    _connectWs();
    _scrollCtrl.addListener(_onScroll);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _scrollCtrl.dispose();
    _sub?.cancel();
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    // Refresh badge counts so the nav tab reflects read messages.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final api = context.read<ApiService>();
      context.read<BadgeProvider>().refresh(api);
    });
    super.dispose();
  }

  // ── History ──────────────────────────────────────────────────────────────

  Future<void> _loadHistory({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _page = 1;
        _hasMore = true;
        _loadingHistory = true;
        _messages = [];
      });
    }
    try {
      final api = context.read<ApiService>();
      final raw = await api.getMessages(widget.convId, page: _page);
      if (!mounted) return;
      final msgs = raw.map((e) => e as Map<String, dynamic>).toList();
      setState(() {
        _messages = refresh ? msgs : [..._messages, ...msgs];
        _hasMore = msgs.length >= 20;
        _loadingHistory = false;
      });
      if (refresh) _scrollToBottom();
      try {
        await context.read<ApiService>().markConversationRead(widget.convId);
      } catch (_) {}
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingHistory = false);
    }
  }

  void _onScroll() {
    if (_scrollCtrl.position.pixels >=
            _scrollCtrl.position.maxScrollExtent - 150 &&
        _hasMore &&
        !_loadingMore) {
      _loadMore();
    }

    final nearBottom = _scrollCtrl.position.pixels <= _nearBottomThreshold;
    if (nearBottom && _showScrollFab) {
      setState(() {
        _showScrollFab = false;
        _unreadWhileScrolled = 0;
      });
    } else if (!nearBottom && !_showScrollFab) {
      setState(() => _showScrollFab = true);
    }
  }

  Future<void> _loadMore() async {
    setState(() {
      _loadingMore = true;
      _page++;
    });
    try {
      final api = context.read<ApiService>();
      final raw = await api.getMessages(widget.convId, page: _page);
      if (!mounted) return;
      final msgs = raw.map((e) => e as Map<String, dynamic>).toList();
      setState(() {
        _messages = [..._messages, ...msgs];
        _hasMore = msgs.length >= 20;
        _loadingMore = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadingMore = false;
        _page--;
      });
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          0,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  // ── WebSocket ────────────────────────────────────────────────────────────

  Future<void> _connectWs() async {
    final token = await context.read<ApiService>().getToken();
    if (!mounted) return;

    // Backend _ws_authenticate reads the Authorization header for native
    // mobile clients that cannot set cookies on WS connections.
    final uri = Uri.parse(_wsUrl);
    try {
      _channel = IOWebSocketChannel.connect(
        uri,
        headers: token != null ? {'Authorization': 'Bearer $token'} : {},
      );
      setState(() {
        _wsStatus = _WsStatus.connected;
        _wsConnected = true;
      });
      _sub = _channel!.stream.listen(
        _onWsMessage,
        onError: _onWsError,
        onDone: _onWsDone,
      );
      _reconnectAttempts = 0;
    } catch (e) {
      _scheduleReconnect();
    }
  }

  void _onWsMessage(dynamic raw) {
    try {
      final payload = jsonDecode(raw as String) as Map<String, dynamic>;
      if (payload['event'] != 'new_message') return;
      if (payload['conversation_id'].toString() != widget.convId.toString()) return;

      final msg = payload['message'] as Map<String, dynamic>;
      final senderId = msg['sender_id']?.toString();
      final isOwn = senderId == _myUserId;

      if (!mounted) return;

      final nearBottom = !_scrollCtrl.hasClients ||
          _scrollCtrl.position.pixels <= _nearBottomThreshold;

      setState(() {
        if (isOwn) {
          // WS echo of our own message — replace the optimistic pending entry.
          final content = msg['content'] as String?;
          final idx = _messages.indexWhere(
            (m) => m['_pending'] == true && m['content'] == content,
          );
          if (idx != -1) {
            _messages[idx] = msg;
          } else {
            // No matching pending — insert normally (e.g. sent from another device).
            _messages.insert(0, msg);
          }
        } else {
          _messages.insert(0, msg);
          if (!nearBottom) _unreadWhileScrolled++;
        }
      });

      if (nearBottom) _scrollToBottom();

      // Mark conversation read since the user is actively viewing it.
      if (!isOwn) {
        context.read<ApiService>().markConversationRead(widget.convId).catchError((_) {});
      }
    } catch (_) {}
  }

  void _onWsError(Object error) {
    if (!mounted) return;
    setState(() {
      _wsStatus = _WsStatus.connecting;
      _wsConnected = false;
    });
    _scheduleReconnect();
  }

  void _onWsDone() {
    if (!mounted) return;
    setState(() {
      _wsStatus = _WsStatus.connecting;
      _wsConnected = false;
    });
    _scheduleReconnect();
  }

  void _scheduleReconnect() {
    _reconnectAttempts++;
    final delaySecs = _reconnectAttempts <= _backoffDelays.length
        ? _backoffDelays[_reconnectAttempts - 1]
        : _backoffDelays.last;

    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(seconds: delaySecs), () {
      if (mounted) _connectWs();
    });

    if (_reconnectAttempts == 1 && mounted) {
      final lang = context.read<LanguageProvider>().lang;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(t('chat.noConnectionRetry', lang)),
          duration: const Duration(seconds: 6),
          action: SnackBarAction(
            label: t('error.retry', lang),
            onPressed: _retryNow,
          ),
        ),
      );
    }
  }

  void _retryNow() {
    _reconnectTimer?.cancel();
    _reconnectAttempts = 0;
    _connectWs();
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  void _sendMessage() {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;

    HapticFeedback.lightImpact();
    _ctrl.clear();

    // Optimistic insert — immediately visible, marked pending.
    final tempId = 'tmp_${DateTime.now().microsecondsSinceEpoch}';
    final optimistic = <String, dynamic>{
      'id': tempId,
      '_pending': true,
      'conversation_id': widget.convId,
      'sender_id': _myUserId,
      'content': text,
      'is_read': false,
      'created_at': DateTime.now().toUtc().toIso8601String(),
    };
    setState(() => _messages.insert(0, optimistic));
    _scrollToBottom();

    if (_wsConnected) {
      _channel!.sink.add(
        jsonEncode({'conversation_id': widget.convId, 'content': text}),
      );
    } else {
      _sendMessageRest(text, tempId);
    }
  }

  Future<void> _sendMessageRest(String text, String tempId) async {
    try {
      final msg = await context.read<ApiService>().sendMessage(widget.convId, text);
      if (!mounted) return;
      final idx = _messages.indexWhere((m) => m['id'] == tempId);
      setState(() {
        if (idx != -1) {
          _messages[idx] = msg;
        } else {
          _messages.insert(0, msg);
        }
      });
    } catch (_) {
      if (!mounted) return;
      final idx = _messages.indexWhere((m) => m['id'] == tempId);
      if (idx != -1) {
        setState(() => _messages[idx] = {
          ..._messages[idx],
          '_pending': false,
          '_failed': true,
        });
      }
    }
  }

  // Retry a failed message by resending via REST.
  void _retryFailedMessage(Map<String, dynamic> msg) {
    final content = msg['content'] as String? ?? '';
    if (content.isEmpty) return;
    final tempId = msg['id'] as String? ?? '';
    final idx = _messages.indexWhere((m) => m['id'] == tempId);
    if (idx != -1) {
      setState(() => _messages[idx] = {...msg, '_failed': false, '_pending': true});
    }
    _sendMessageRest(content, tempId);
  }

  // ── Build ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;
    final listing = widget.convData['listing'] as Map<String, dynamic>? ?? {};
    final otherUser = widget.convData['other_participant'] as Map<String, dynamic>? ?? {};
    final brand = listing['brand'] as String? ?? '';
    final model = listing['model'] as String? ?? '';
    final imageUrl = listing['image_url'] as String? ?? '';
    final otherName = otherUser['name'] as String? ?? '';

    return Scaffold(
      backgroundColor: c.bg,
      appBar: _buildAppBar(c, lang, brand, model, imageUrl, otherName),
      body: Column(
        children: [
          if (_wsStatus == _WsStatus.connecting)
            _ConnectingBanner(lang: lang, c: c),
          Expanded(
            child: Stack(
              children: [
                _loadingHistory
                    ? Center(child: CircularProgressIndicator(color: c.accent))
                    : _MessageList(
                        messages: _messages,
                        myUserId: _myUserId,
                        lang: lang,
                        c: c,
                        scrollCtrl: _scrollCtrl,
                        loadingMore: _loadingMore,
                        onRetryFailed: _retryFailedMessage,
                      ),
                if (_showScrollFab)
                  Positioned(
                    bottom: 12,
                    right: 12,
                    child: _ScrollToBottomFab(
                      unread: _unreadWhileScrolled,
                      c: c,
                      onTap: () {
                        _scrollToBottom();
                        setState(() {
                          _showScrollFab = false;
                          _unreadWhileScrolled = 0;
                        });
                      },
                    ),
                  ),
              ],
            ),
          ),
          _InputBar(
            ctrl: _ctrl,
            lang: lang,
            c: c,
            onSend: _sendMessage,
          ),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(
    AppColors c,
    String lang,
    String brand,
    String model,
    String imageUrl,
    String otherName,
  ) {
    final initials = otherName.isNotEmpty
        ? otherName.trim().split(' ').take(2).map((w) => w[0].toUpperCase()).join()
        : '?';

    return AppBar(
      backgroundColor: c.card,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1),
        child: Divider(color: c.border, height: 1),
      ),
      leading: IconButton(
        icon: Icon(Icons.arrow_back, color: c.text),
        onPressed: () => Navigator.of(context).pop(),
      ),
      titleSpacing: 0,
      title: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: c.accent.withValues(alpha: 0.15),
            ),
            child: Center(
              child: Text(
                initials,
                style: AppTextStyles.bodySm(
                  color: c.accent,
                  weight: FontWeight.w700,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  otherName.isNotEmpty ? otherName : '$brand $model',
                  style: AppTextStyles.bodyLg(color: c.text, weight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      margin: const EdgeInsets.only(right: 4),
                      decoration: BoxDecoration(
                        color: _wsStatus == _WsStatus.connected
                            ? AppColors.colorOnline
                            : AppColors.colorWarning,
                        shape: BoxShape.circle,
                      ),
                    ),
                    Text(
                      _wsStatus == _WsStatus.connected
                          ? t('chat.connected', lang)
                          : t('chat.connecting', lang),
                      style: AppTextStyles.caption(color: c.textSecondary),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (imageUrl.isNotEmpty || brand.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 36,
                  height: 36,
                  child: imageUrl.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: imageUrl,
                          fit: BoxFit.cover,
                          placeholder: (_, _) => Container(color: c.border),
                          errorWidget: (_, _, _) => Container(color: c.tagBg),
                        )
                      : Container(
                          color: c.tagBg,
                          child: Icon(Icons.directions_car_outlined,
                              size: 18, color: c.textMuted),
                        ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── WS status ────────────────────────────────────────────────────────────────

enum _WsStatus { connecting, connected }

class _ConnectingBanner extends StatelessWidget {
  final String lang;
  final AppColors c;
  const _ConnectingBanner({required this.lang, required this.c});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 28,
      color: AppColors.colorWarning.withValues(alpha: 0.14),
      alignment: Alignment.center,
      child: Text(
        t('chat.connecting', lang),
        style: AppTextStyles.caption(
            color: AppColors.colorWarning, weight: FontWeight.w600),
      ),
    );
  }
}

// ── Scroll to bottom FAB ─────────────────────────────────────────────────────

class _ScrollToBottomFab extends StatelessWidget {
  final int unread;
  final AppColors c;
  final VoidCallback onTap;

  const _ScrollToBottomFab({
    required this.unread,
    required this.c,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: c.card,
              shape: BoxShape.circle,
              border: Border.all(color: c.border),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.12),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Icon(Icons.keyboard_arrow_down_rounded,
                color: c.textSecondary, size: 22),
          ),
          if (unread > 0)
            Positioned(
              top: -4,
              right: -4,
              child: Container(
                constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                padding: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  color: c.accent,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(
                    unread > 99 ? '99+' : unread.toString(),
                    style: AppTextStyles.micro(
                        color: Colors.white, weight: FontWeight.w700),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Message list ─────────────────────────────────────────────────────────────

class _MessageList extends StatelessWidget {
  final List<Map<String, dynamic>> messages;
  final String? myUserId;
  final String lang;
  final AppColors c;
  final ScrollController scrollCtrl;
  final bool loadingMore;
  final void Function(Map<String, dynamic> msg) onRetryFailed;

  const _MessageList({
    required this.messages,
    required this.myUserId,
    required this.lang,
    required this.c,
    required this.scrollCtrl,
    required this.loadingMore,
    required this.onRetryFailed,
  });

  @override
  Widget build(BuildContext context) {
    if (messages.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.chat_bubble_outline_rounded, size: 64, color: c.border),
            const SizedBox(height: 12),
            Text(
              t('chat.empty', lang),
              style: AppTextStyles.body(color: c.textMuted),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      controller: scrollCtrl,
      reverse: true,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      itemCount: messages.length + (loadingMore ? 1 : 0),
      itemBuilder: (context, i) {
        if (i == messages.length) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: CircularProgressIndicator(color: c.accent),
            ),
          );
        }

        final msg = messages[i];
        final isOwn = msg['sender_id'] == myUserId;

        final prevMsg = i > 0 ? messages[i - 1] : null;
        final nextMsg = i < messages.length - 1 ? messages[i + 1] : null;

        final isFirstInGroup = _isFirstInGroup(msg, nextMsg);
        final isLastInGroup = _isLastInGroup(msg, prevMsg);

        // Date separator between this message and the older one below it.
        Widget? separator;
        if (nextMsg != null) {
          final currDate = _dateOf(msg['created_at'] as String?);
          final prevDate = _dateOf(nextMsg['created_at'] as String?);
          if (currDate != null && prevDate != null && currDate != prevDate) {
            separator = _DateSeparator(date: currDate, lang: lang, c: c);
          }
        }

        return Column(
          children: [
            ?separator,
            _MessageBubble(
              msg: msg,
              isOwn: isOwn,
              isFirstInGroup: isFirstInGroup,
              isLastInGroup: isLastInGroup,
              c: c,
              lang: lang,
              myUserId: myUserId,
              onRetryFailed: onRetryFailed,
            ),
          ],
        );
      },
    );
  }

  bool _isFirstInGroup(
      Map<String, dynamic> msg, Map<String, dynamic>? olderMsg) {
    if (olderMsg == null) return true;
    if (msg['sender_id'] != olderMsg['sender_id']) return true;
    final t1 = DateTime.tryParse(msg['created_at'] as String? ?? '');
    final t2 = DateTime.tryParse(olderMsg['created_at'] as String? ?? '');
    if (t1 == null || t2 == null) return true;
    return t1.difference(t2).abs().inMinutes >= 5;
  }

  bool _isLastInGroup(
      Map<String, dynamic> msg, Map<String, dynamic>? newerMsg) {
    if (newerMsg == null) return true;
    if (msg['sender_id'] != newerMsg['sender_id']) return true;
    final t1 = DateTime.tryParse(msg['created_at'] as String? ?? '');
    final t2 = DateTime.tryParse(newerMsg['created_at'] as String? ?? '');
    if (t1 == null || t2 == null) return true;
    return t2.difference(t1).abs().inMinutes >= 5;
  }

  String? _dateOf(String? iso) {
    if (iso == null) return null;
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.year}-${dt.month}-${dt.day}';
    } catch (_) {
      return null;
    }
  }
}

class _DateSeparator extends StatelessWidget {
  final String date;
  final String lang;
  final AppColors c;
  const _DateSeparator(
      {required this.date, required this.lang, required this.c});

  @override
  Widget build(BuildContext context) {
    final label = _label(lang);
    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 12),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
        decoration: BoxDecoration(
          color: c.tagBg.withValues(alpha: 0.85),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: c.border.withValues(alpha: 0.5)),
        ),
        child: Text(
          label,
          style: AppTextStyles.caption(
              color: c.textSecondary, weight: FontWeight.w600),
        ),
      ),
    );
  }

  String _label(String lang) {
    try {
      final parts = date.split('-');
      final dt = DateTime(
          int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final yesterday = today.subtract(const Duration(days: 1));
      final msgDay = DateTime(dt.year, dt.month, dt.day);
      if (msgDay == today) return t('chat.today', lang);
      if (msgDay == yesterday) return t('chat.yesterday', lang);
      return '${dt.day}.${dt.month.toString().padLeft(2, '0')}.${dt.year}';
    } catch (_) {
      return date;
    }
  }
}

class _MessageBubble extends StatelessWidget {
  final Map<String, dynamic> msg;
  final bool isOwn;
  final bool isFirstInGroup;
  final bool isLastInGroup;
  final AppColors c;
  final String lang;
  final String? myUserId;
  final void Function(Map<String, dynamic> msg) onRetryFailed;

  const _MessageBubble({
    required this.msg,
    required this.isOwn,
    required this.isFirstInGroup,
    required this.isLastInGroup,
    required this.c,
    required this.lang,
    required this.myUserId,
    required this.onRetryFailed,
  });

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final content = msg['content'] as String? ?? '';
    final createdAt = msg['created_at'] as String?;
    final senderName = msg['sender_name'] as String?;
    final isPending = msg['_pending'] as bool? ?? false;
    final isFailed = msg['_failed'] as bool? ?? false;
    final isRead = msg['is_read'] as bool? ?? false;
    final timeStr = _formatTime(createdAt);

    final initials = senderName != null && senderName.isNotEmpty
        ? senderName.trim().split(' ').take(2).map((w) => w[0].toUpperCase()).join()
        : '?';

    final bubbleRadius = isOwn
        ? BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: Radius.circular(isFirstInGroup ? 4 : 18),
            bottomLeft: const Radius.circular(18),
            bottomRight: const Radius.circular(18),
          )
        : BorderRadius.only(
            topLeft: Radius.circular(isFirstInGroup ? 4 : 18),
            topRight: const Radius.circular(18),
            bottomLeft: const Radius.circular(18),
            bottomRight: const Radius.circular(18),
          );

    final topMargin = isFirstInGroup ? 6.0 : 2.0;

    final bubble = GestureDetector(
      onLongPress: () => _copyText(context, content),
      onTap: isFailed ? () => onRetryFailed(msg) : null,
      child: Container(
        constraints: BoxConstraints(maxWidth: screenWidth * 0.72),
        padding: const EdgeInsets.fromLTRB(13, 9, 13, 9),
        decoration: BoxDecoration(
          color: isFailed
              ? (isOwn ? c.accent.withValues(alpha: 0.6) : c.card)
              : (isOwn ? c.accent : c.card),
          borderRadius: bubbleRadius,
          border: isOwn ? null : Border.all(color: c.border, width: 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              content,
              style: AppTextStyles.body(
                color: isOwn ? Colors.white : c.text,
              ),
            ),
            const SizedBox(height: 3),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isFailed)
                  Text(
                    t('chat.msgFailed', lang),
                    style: AppTextStyles.micro(
                      color: isOwn
                          ? Colors.white.withValues(alpha: 0.8)
                          : c.textMuted,
                    ),
                  )
                else if (timeStr.isNotEmpty)
                  Text(
                    timeStr,
                    style: AppTextStyles.micro(
                      color: isOwn
                          ? Colors.white.withValues(alpha: 0.65)
                          : c.textMuted,
                    ),
                  ),
                if (isOwn) ...[
                  const SizedBox(width: 3),
                  _buildStatusIcon(isPending, isFailed, isRead),
                ],
              ],
            ),
          ],
        ),
      ),
    );

    if (isOwn) {
      return Padding(
        padding: EdgeInsets.only(top: topMargin),
        child: Align(
          alignment: Alignment.centerRight,
          child: Padding(
            padding: const EdgeInsets.only(right: 8),
            child: bubble,
          ),
        ),
      );
    }

    return Padding(
      padding: EdgeInsets.only(top: topMargin),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          const SizedBox(width: 8),
          if (isLastInGroup)
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: c.accent.withValues(alpha: 0.12),
              ),
              child: Center(
                child: Text(
                  initials,
                  style: AppTextStyles.micro(
                    color: c.accent,
                    weight: FontWeight.w700,
                  ),
                ),
              ),
            )
          else
            const SizedBox(width: 28),
          const SizedBox(width: 6),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (isFirstInGroup && senderName != null && senderName.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(left: 2, bottom: 2),
                  child: Text(
                    senderName,
                    style: AppTextStyles.caption(
                      color: c.accent,
                      weight: FontWeight.w600,
                    ),
                  ),
                ),
              bubble,
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusIcon(bool isPending, bool isFailed, bool isRead) {
    if (isPending) {
      return SizedBox(
        width: 13,
        height: 13,
        child: CircularProgressIndicator(
          strokeWidth: 1.5,
          color: Colors.white.withValues(alpha: 0.65),
        ),
      );
    }
    if (isFailed) {
      return Icon(Icons.error_outline_rounded,
          size: 13, color: Colors.red[300]);
    }
    return Icon(
      isRead ? Icons.done_all_rounded : Icons.done_rounded,
      size: 13,
      color: isRead
          ? const Color(0xCC5BE7FF)   // light blue tint for read
          : Colors.white.withValues(alpha: 0.65),
    );
  }

  void _copyText(BuildContext context, String text) {
    Clipboard.setData(ClipboardData(text: text));
    HapticFeedback.mediumImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(t('chat.copied', context.read<LanguageProvider>().lang)),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      ),
    );
  }

  String _formatTime(String? iso) {
    if (iso == null) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }
}

// ── Input bar ────────────────────────────────────────────────────────────────

class _InputBar extends StatefulWidget {
  final TextEditingController ctrl;
  final String lang;
  final AppColors c;
  final VoidCallback onSend;

  const _InputBar({
    required this.ctrl,
    required this.lang,
    required this.c,
    required this.onSend,
  });

  @override
  State<_InputBar> createState() => _InputBarState();
}

class _InputBarState extends State<_InputBar> {
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    widget.ctrl.addListener(_onTextChange);
  }

  @override
  void dispose() {
    widget.ctrl.removeListener(_onTextChange);
    super.dispose();
  }

  void _onTextChange() {
    final has = widget.ctrl.text.trim().isNotEmpty;
    if (has != _hasText) setState(() => _hasText = has);
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.c;
    return SafeArea(
      child: Container(
        decoration: BoxDecoration(
          color: c.card,
          border: Border(top: BorderSide(color: c.border, width: 0.8)),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Icon(Icons.attach_file_rounded,
                  size: 22, color: c.textMuted),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Container(
                constraints: const BoxConstraints(maxHeight: 120),
                decoration: BoxDecoration(
                  color: c.bg,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: c.border),
                ),
                child: TextField(
                  controller: widget.ctrl,
                  minLines: 1,
                  maxLines: 5,
                  textInputAction: TextInputAction.newline,
                  style: AppTextStyles.body(color: c.text),
                  decoration: InputDecoration(
                    hintText: t('chat.inputHint', widget.lang),
                    hintStyle: AppTextStyles.body(color: c.textMuted),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                    filled: false,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 6),
            GestureDetector(
              onTap: _hasText ? widget.onSend : null,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: _hasText ? c.accent : c.tagBg,
                  shape: BoxShape.circle,
                ),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 150),
                  child: _hasText
                      ? const Icon(Icons.send_rounded,
                          size: 20, color: Colors.white, key: ValueKey('send'))
                      : Icon(Icons.mic_none_rounded,
                          size: 22, color: c.textMuted, key: const ValueKey('mic')),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
