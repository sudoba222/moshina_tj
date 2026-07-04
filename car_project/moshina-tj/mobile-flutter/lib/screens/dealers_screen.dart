import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import '../models/dealer.dart';
import '../providers/language_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';

class DealersScreen extends StatefulWidget {
  const DealersScreen({super.key});

  @override
  State<DealersScreen> createState() => _DealersScreenState();
}

class _DealersScreenState extends State<DealersScreen> {
  List<Dealer> _dealers = [];
  bool _loading = true;
  String? _error;
  int _page = 1;
  int _totalPages = 1;
  bool _loadingMore = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        _page = 1;
        _dealers = [];
        _loading = true;
        _error = null;
      });
    }
    try {
      final api = context.read<ApiService>();
      final data = await api.getRaw(
        '/dealers',
        queryParams: {'page': _page, 'limit': 20},
      );
      final List<dynamic> items;
      int pages = 1;
      if (data is Map) {
        items = data['items'] as List<dynamic>? ?? [];
        pages = (data['pages'] as num?)?.toInt() ?? 1;
      } else if (data is List<dynamic>) {
        items = data;
      } else {
        items = [];
      }
      final newDealers = items
          .map((e) => Dealer.fromJson(e as Map<String, dynamic>))
          .toList();
      setState(() {
        if (refresh || _page == 1 && !_loadingMore) {
          _dealers = newDealers;
        } else {
          _dealers.addAll(newDealers);
        }
        _totalPages = pages;
        _loading = false;
        _loadingMore = false;
      });
    } catch (_) {
      setState(() {
        _loading = false;
        _loadingMore = false;
        _error = t('error.loadDealers', context.read<LanguageProvider>().lang);
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || _page >= _totalPages) return;
    setState(() {
      _loadingMore = true;
      _page++;
    });
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: Text(t('nav.dealers', lang)),
      ),
      body: _buildBody(context, c, lang),
    );
  }

  Widget _buildBody(BuildContext context, AppColors c, String lang) {
    if (_loading) {
      return GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 0.85,
        ),
        itemCount: 6,
        itemBuilder: (_, index) => Shimmer.fromColors(
          baseColor: c.border,
          highlightColor: c.surface,
          child: Container(
            decoration: BoxDecoration(
              color: c.card,
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.wifi_off_outlined, size: 48, color: c.textMuted),
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: c.textSecondary)),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => _load(refresh: true),
              child: Text(
                t('error.retry', lang),
                style: TextStyle(color: c.accent),
              ),
            ),
          ],
        ),
      );
    }

    if (_dealers.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.store_outlined, size: 48, color: c.textMuted),
            const SizedBox(height: 12),
            Text(
              t('common.noListings', lang),
              style: TextStyle(color: c.textSecondary),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: c.accent,
      onRefresh: () => _load(refresh: true),
      child: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 0.85,
        ),
        itemCount: _dealers.length + (_page < _totalPages ? 1 : 0),
        itemBuilder: (ctx, i) {
          if (i >= _dealers.length) {
            if (!_loadingMore) _loadMore();
            return Center(
              child: CircularProgressIndicator(color: c.accent),
            );
          }
          return _DealerCard(
            dealer: _dealers[i],
            c: c,
            lang: lang,
            onTap: () => context.push('/dealers/${_dealers[i].id}'),
          );
        },
      ),
    );
  }
}

class _DealerCard extends StatelessWidget {
  final Dealer dealer;
  final AppColors c;
  final String lang;
  final VoidCallback? onTap;

  const _DealerCard({
    required this.dealer,
    required this.c,
    required this.lang,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: c.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: c.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Logo area with gradient bg
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    c.accent.withValues(alpha: 0.08),
                    c.accent.withValues(alpha: 0.03),
                  ],
                ),
              ),
              child: Center(child: _buildLogo()),
            ),
            // Info section
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 10, 10, 12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Name + verified
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Flexible(
                        child: Text(
                          dealer.name,
                          style: TextStyle(
                            color: c.text,
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                            height: 1.2,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (dealer.isVerified) ...[
                        const SizedBox(width: 4),
                        Icon(Icons.verified_rounded, size: 15, color: c.accent),
                      ],
                    ],
                  ),
                  if (dealer.city != null) ...[
                    const SizedBox(height: 5),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.location_on_outlined, size: 11, color: c.textMuted),
                        const SizedBox(width: 2),
                        Flexible(
                          child: Text(
                            dealer.city!,
                            style: TextStyle(color: c.textMuted, fontSize: 11),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 8),
                  // Listing count pill
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: c.tagBg,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: c.border, width: 0.5),
                    ),
                    child: Text(
                      '${dealer.listingCount} ${t('dealers.listings', lang)}',
                      style: TextStyle(
                        color: c.textSecondary,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLogo() {
    if (dealer.logoUrl != null && dealer.logoUrl!.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: CachedNetworkImage(
          imageUrl: dealer.logoUrl!,
          width: 72,
          height: 72,
          fit: BoxFit.contain,
          errorWidget: (ctx, url, err) => _placeholder(),
        ),
      );
    }
    return _placeholder();
  }

  Widget _placeholder() {
    return Container(
      width: 72,
      height: 72,
      decoration: BoxDecoration(
        color: c.border,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(Icons.store_rounded, size: 34, color: c.textMuted),
    );
  }
}
