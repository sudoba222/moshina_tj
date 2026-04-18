import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/listing_provider.dart';
import '../providers/language_provider.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';
import '../widgets/car_card.dart';
import '../widgets/search_bar_widget.dart';
import '../widgets/filter_bar.dart';

class CatalogScreen extends StatefulWidget {
  final String? initialQuery;

  const CatalogScreen({super.key, this.initialQuery});

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  final _searchCtrl = TextEditingController();
  Map<String, String> _filters = {};
  final _scrollCtrl = ScrollController();

  @override
  void initState() {
    super.initState();
    if (widget.initialQuery != null) {
      _searchCtrl.text = widget.initialQuery!;
    }
    _scrollCtrl.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _load(refresh: true);
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollCtrl.position.pixels >=
        _scrollCtrl.position.maxScrollExtent - 200) {
      context.read<ListingProvider>().loadMoreCatalog();
    }
  }

  void _load({bool refresh = false}) {
    final filters = Map<String, String>.from(_filters);
    if (_searchCtrl.text.isNotEmpty) {
      filters['q'] = _searchCtrl.text;
    }
    context
        .read<ListingProvider>()
        .loadCatalog(refresh: refresh, filters: filters);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final lang = context.watch<LanguageProvider>().lang;

    return Scaffold(
      backgroundColor: colors.bg,
      appBar: AppBar(
        title: Text(t('catalog', lang)),
        centerTitle: false,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: SearchBarWidget(
              lang: lang,
              controller: _searchCtrl,
              onSubmitted: (_) => _load(refresh: true),
            ),
          ),
          const SizedBox(height: 8),
          FilterBar(
            lang: lang,
            initialFilters: _filters,
            onApply: (filters) {
              setState(() => _filters = filters);
              _load(refresh: true);
            },
          ),
          const SizedBox(height: 4),
          Expanded(child: _buildList(context, lang, colors)),
        ],
      ),
    );
  }

  Widget _buildList(
      BuildContext context, String lang, AppColorExtension colors) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, _) {
        if (provider.catalogLoading) {
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: 6,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, __) => const CarCardShimmer(),
          );
        }

        if (provider.catalogError != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.wifi_off_outlined,
                    size: 48, color: colors.textMuted),
                const SizedBox(height: 12),
                Text(provider.catalogError!,
                    style: TextStyle(color: colors.textSecondary)),
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

        if (provider.catalogItems.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.search_off, size: 48, color: colors.textMuted),
                const SizedBox(height: 12),
                Text(t('no_listings', lang),
                    style: TextStyle(color: colors.textSecondary)),
              ],
            ),
          );
        }

        return RefreshIndicator(
          color: colors.accent,
          onRefresh: () => _load(refresh: true) as Future<void>,
          child: ListView.separated(
            controller: _scrollCtrl,
            padding: const EdgeInsets.all(16),
            itemCount: provider.catalogItems.length +
                (provider.hasMoreCatalog || provider.catalogLoadingMore
                    ? 1
                    : 0),
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (ctx2, i) {
              if (i >= provider.catalogItems.length) {
                if (provider.catalogLoadingMore) {
                  return Center(
                    child:
                        CircularProgressIndicator(color: colors.accent),
                  );
                }
                return const SizedBox.shrink();
              }
              final listing = provider.catalogItems[i];
              return CarCard(
                listing: listing,
                onTap: () => ctx2.push('/car/${listing.id}'),
              );
            },
          ),
        );
      },
    );
  }
}
