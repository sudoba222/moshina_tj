import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../providers/auth_provider.dart';
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
  static const _wsBase = 'wss://api.tajcar.tj/api/v1/chat/ws';
  static const _maxReconnects = 3;
  static const _reconnectDelay = Duration(seconds: 2);

  final _ctrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  WebSocketChannel? _channel;
  StreamSubscription? _sub;
  _WsStatus _wsStatus = _WsStatus.connecting;
  int _reconnectAttempts = 0;

  List<Map<String, dynamic>> _messages = [];
  bool _loadingHistory = true;
  bool _hasMore = true;
  int _page = 1;
  bool _loadingMore = false;

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
    _channel?.sink.close();
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
    final uri = Uri.parse('$_wsBase/${widget.convId}?token=$token');
    try {
      _channel = WebSocketChannel.connect(uri);
      setState(() => _wsStatus = _WsStatus.connected);
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
      if (payload['type'] == 'message') {
        final msg = payload['data'] as Map<String, dynamic>;
        if (!mounted) return;
        setState(() => _messages.insert(0, msg));
        _scrollToBottom();
      }
    } catch (_) {}
  }

  void _onWsError(Object error) {
    if (!mounted) return;
    setState(() => _wsStatus = _WsStatus.connecting);
    _scheduleReconnect();
  }

  void _onWsDone() {
    if (!mounted) return;
    setState(() => _wsStatus = _WsStatus.connecting);
    _scheduleReconnect();
  }

  void _scheduleReconnect() {
    if (_reconnectAttempts >= _maxReconnects) return;
    _reconnectAttempts++;
    Future.delayed(_reconnectDelay, () {
      if (mounted) _connectWs();
    });
  }

  void _sendMessage() {
    final text = _ctrl.text.trim();
    if (text.isEmpty || _channel == null) return;
    _channel!.sink.add(jsonEncode({'type': 'message', 'content': text}));
    _ctrl.clear();
  }

  // ── Build ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;
    final listing = widget.convData['listing'] as Map<String, dynamic>? ?? {};
    final otherUser = widget.convData['other_user'] as Map<String, dynamic>? ?? {};
    final brand = listing['brand'] as String? ?? '';
    final model = listing['model'] as String? ?? '';
    final images = listing['images'] as List<dynamic>? ?? [];
    final imageUrl = images.isNotEmpty
        ? (images.first as Map<String, dynamic>)['url'] as String? ?? ''
        : '';
    final otherName = otherUser['full_name'] as String? ?? '';

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.card,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: c.text),
          onPressed: () => Navigator.of(context).pop(),
        ),
        titleSpacing: 0,
        title: Row(
          children: [
            // Car thumbnail
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                width: 36,
                height: 36,
                child: imageUrl.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: imageUrl,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => Container(color: c.border),
                        errorWidget: (_, __, ___) =>
                            Container(color: c.tagBg),
                      )
                    : Container(
                        color: c.tagBg,
                        child: Icon(Icons.directions_car_outlined,
                            size: 18, color: c.textMuted),
                      ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$brand $model',
                    style: AppTextStyles.bodyLg(
                        color: c.text, weight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (otherName.isNotEmpty)
                    Text(
                      otherName,
                      style: AppTextStyles.caption(color: c.textSecondary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
            // Connection indicator
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: _ConnectionDot(status: _wsStatus, lang: lang),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Status banner
          if (_wsStatus == _WsStatus.connecting)
            _StatusBanner(lang: lang, c: c),
          // Messages
          Expanded(
            child: _loadingHistory
                ? Center(child: CircularProgressIndicator(color: c.accent))
                : _MessageList(
                    messages: _messages,
                    myUserId: _myUserId,
                    lang: lang,
                    c: c,
                    scrollCtrl: _scrollCtrl,
                    loadingMore: _loadingMore,
                  ),
          ),
          // Input bar
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
}

// ── WS status ────────────────────────────────────────────────────────────────

enum _WsStatus { connecting, connected }

class _ConnectionDot extends StatelessWidget {
  final _WsStatus status;
  final String lang;
  const _ConnectionDot({required this.status, required this.lang});

  @override
  Widget build(BuildContext context) {
    final connected = status == _WsStatus.connected;
    return Tooltip(
      message: connected
          ? t('chat.connected', lang)
          : t('chat.connecting', lang),
      child: Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
          color: connected ? AppColors.colorOnline : AppColors.colorWarning,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  final String lang;
  final AppColors c;
  const _StatusBanner({required this.lang, required this.c});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: AppColors.colorWarning.withValues(alpha: 0.12),
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Text(
        t('chat.connecting', lang),
        style: AppTextStyles.caption(
            color: AppColors.colorWarning, weight: FontWeight.w600),
        textAlign: TextAlign.center,
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

  const _MessageList({
    required this.messages,
    required this.myUserId,
    required this.lang,
    required this.c,
    required this.scrollCtrl,
    required this.loadingMore,
  });

  @override
  Widget build(BuildContext context) {
    if (messages.isEmpty) {
      return Center(
        child: Text(
          t('chat.empty', lang),
          style: AppTextStyles.body(color: c.textMuted),
        ),
      );
    }

    return ListView.builder(
      controller: scrollCtrl,
      reverse: true,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      itemCount: messages.length + (loadingMore ? 1 : 0),
      itemBuilder: (context, i) {
        // Load-more spinner at the bottom of the reversed list
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

        // Date separator — compare with next message
        Widget? separator;
        if (i < messages.length - 1) {
          final currDate = _dateOf(msg['created_at'] as String?);
          final prevDate = _dateOf(messages[i + 1]['created_at'] as String?);
          if (currDate != null && prevDate != null && currDate != prevDate) {
            separator = _DateSeparator(date: currDate, lang: lang, c: c);
          }
        }

        return Column(
          children: [
            if (separator != null) separator,
            _MessageBubble(
              msg: msg,
              isOwn: isOwn,
              c: c,
              lang: lang,
            ),
          ],
        );
      },
    );
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
        margin: const EdgeInsets.symmetric(vertical: 10),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: c.tagBg,
          borderRadius: BorderRadius.circular(12),
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
  final AppColors c;
  final String lang;

  const _MessageBubble({
    required this.msg,
    required this.isOwn,
    required this.c,
    required this.lang,
  });

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final content = msg['content'] as String? ?? '';
    final createdAt = msg['created_at'] as String?;

    final bubble = Container(
      constraints: BoxConstraints(maxWidth: screenWidth * 0.75),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isOwn ? c.accent : c.card,
        borderRadius: isOwn
            ? const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(4),
                bottomLeft: Radius.circular(16),
                bottomRight: Radius.circular(16),
              )
            : const BorderRadius.only(
                topLeft: Radius.circular(4),
                topRight: Radius.circular(16),
                bottomLeft: Radius.circular(16),
                bottomRight: Radius.circular(16),
              ),
        border: isOwn ? null : Border.all(color: c.border, width: 1),
      ),
      child: Text(
        content,
        style: AppTextStyles.body(
          color: isOwn ? Colors.white : c.text,
        ),
      ),
    );

    final timeStr = _formatTime(createdAt);

    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Column(
        crossAxisAlignment:
            isOwn ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          bubble,
          if (timeStr.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              timeStr,
              style: AppTextStyles.micro(color: c.textMuted),
            ),
          ],
        ],
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
    return SafeArea(
      child: Container(
        decoration: BoxDecoration(
          color: widget.c.card,
          border: Border(top: BorderSide(color: widget.c.border, width: 1)),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Container(
                constraints: const BoxConstraints(maxHeight: 120),
                decoration: BoxDecoration(
                  color: widget.c.bg,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: TextField(
                  controller: widget.ctrl,
                  minLines: 1,
                  maxLines: 5,
                  textInputAction: TextInputAction.newline,
                  style: AppTextStyles.body(color: widget.c.text),
                  decoration: InputDecoration(
                    hintText: t('chat.inputHint', widget.lang),
                    hintStyle: AppTextStyles.body(color: widget.c.textMuted),
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
            const SizedBox(width: 8),
            // Send button
            GestureDetector(
              onTap: _hasText ? widget.onSend : null,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: _hasText
                      ? widget.c.accent
                      : widget.c.accent.withValues(alpha: 0.35),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.send,
                  size: 20,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
