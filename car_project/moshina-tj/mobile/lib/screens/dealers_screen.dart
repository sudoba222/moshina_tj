import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
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
      final List items;
      int pages = 1;
      if (data is Map) {
        items = data['items'] as List? ?? [];
        pages = data['pages'] as int? ?? 1;
      } else if (data is List) {
        items = data;
      } else {
        items = [];
      }
      final newDealers =
          items.map((e) => Dealer.fromJson(e as Map<String, dynamic>)).toList();
      setState(() {
        if (refresh) {
          _dealers = newDealers;
        } else {
          _dealers.addAll(newDealers);
        }
        _totalPages = pages;
        _loading = false;
        _loadingMore = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _loadingMore = false;
        _error = 'Ошибка загрузки дилеров';
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
    final colors = context.appColors;
    final lang = context.watch<LanguageProvider>().lang;

    return Scaffold(
      backgroundColor: colors.bg,
      appBar: AppBar(
        title: Text(t('dealers', lang)),
      ),
      body: _buildBody(context, colors, lang),
    );
  }

  Widget _buildBody(
      BuildContext context, AppColorExtension colors, String lang) {
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
        itemBuilder: (_, __) => Shimmer.fromColors(
          baseColor: colors.border,
          highlightColor: colors.surface,
          child: Container(
            decoration: BoxDecoration(
              color: colors.card,
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
            Icon(Icons.wifi_off_outlined, size: 48, color: colors.textMuted),
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: colors.textSecondary)),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => _load(refresh: true),
              child: Text(t('retry', lang),
                  style: TextStyle(color: colors.accent)),
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
            Icon(Icons.store_outlined, size: 48, color: colors.textMuted),
            const SizedBox(height: 12),
            Text(t('no_listings', lang),
                style: TextStyle(color: colors.textSecondary)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: colors.accent,
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
                child: CircularProgressIndicator(color: colors.accent));
          }
          return _DealerCard(dealer: _dealers[i], colors: colors, lang: lang);
        },
      ),
    );
  }
}

class _DealerCard extends StatelessWidget {
  final Dealer dealer;
  final AppColorExtension colors;
  final String lang;

  const _DealerCard({
    required this.dealer,
    required this.colors,
    required this.lang,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: colors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildLogo(),
          const SizedBox(height: 10),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Text(
              dealer.name,
              style: TextStyle(
                color: colors.text,
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (dealer.city != null) ...[
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.location_on_outlined,
                    size: 12, color: colors.textMuted),
                const SizedBox(width: 2),
                Text(
                  dealer.city!,
                  style: TextStyle(color: colors.textMuted, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ],
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '${dealer.listingCount} ${t('dealer_listings', lang)}',
                style: TextStyle(color: colors.textSecondary, fontSize: 12),
              ),
              if (dealer.isVerified) ...[
                const SizedBox(width: 4),
                Icon(Icons.verified, size: 14, color: colors.accent),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLogo() {
    if (dealer.logoUrl != null && dealer.logoUrl!.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: CachedNetworkImage(
          imageUrl: dealer.logoUrl!,
          width: 64,
          height: 64,
          fit: BoxFit.contain,
          errorWidget: (_, __, ___) => _placeholder(),
        ),
      );
    }
    return _placeholder();
  }

  Widget _placeholder() {
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        color: colors.border,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(Icons.store, size: 32, color: colors.textMuted),
    );
  }
}
