import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/listing_provider.dart';
import '../providers/language_provider.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';
import '../widgets/car_card.dart';
import '../widgets/filter_bottom_sheet.dart';

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
  String _listingType = '';

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
    if (_searchCtrl.text.trim().isNotEmpty) {
      filters['q'] = _searchCtrl.text.trim();
    }
    if (_listingType.isNotEmpty) {
      filters['listing_type'] = _listingType;
    }
    context
        .read<ListingProvider>()
        .loadCatalog(refresh: refresh, filters: filters);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: Text(t('nav.catalog', lang)),
        centerTitle: false,
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: _SearchBar(
              lang: lang,
              controller: _searchCtrl,
              c: c,
              onSubmitted: (_) => _load(refresh: true),
            ),
          ),
          const SizedBox(height: 8),
          // Type filter chips + filter button
          _FilterStrip(
            lang: lang,
            c: c,
            listingType: _listingType,
            filters: _filters,
            onTypeChanged: (type) {
              setState(() => _listingType = type);
              _load(refresh: true);
            },
            onFiltersApplied: (filters) {
              setState(() => _filters = filters);
              _load(refresh: true);
            },
          ),
          const SizedBox(height: 4),
          Expanded(child: _buildList(context, lang, c)),
        ],
      ),
    );
  }

  Widget _buildList(BuildContext context, String lang, AppColors c) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, _) {
        if (provider.catalogLoading) {
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: 6,
            separatorBuilder: (_, index) => const SizedBox(height: 12),
            itemBuilder: (_, index) => const CarCardShimmer(),
          );
        }

        if (provider.catalogError != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.wifi_off_outlined, size: 48, color: c.textMuted),
                const SizedBox(height: 12),
                Text(
                  provider.catalogError!,
                  style: TextStyle(color: c.textSecondary),
                ),
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

        if (provider.catalogItems.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.search_off, size: 48, color: c.textMuted),
                const SizedBox(height: 12),
                Text(
                  t('catalog.noResults', lang),
                  style: TextStyle(color: c.textSecondary),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          color: c.accent,
          onRefresh: () async => _load(refresh: true),
          child: ListView.separated(
            controller: _scrollCtrl,
            padding: const EdgeInsets.all(16),
            itemCount: provider.catalogItems.length +
                (provider.hasMoreCatalog || provider.catalogLoadingMore ? 1 : 0),
            separatorBuilder: (_, index) => const SizedBox(height: 12),
            itemBuilder: (ctx2, i) {
              if (i >= provider.catalogItems.length) {
                if (provider.catalogLoadingMore) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: CircularProgressIndicator(color: c.accent),
                    ),
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

class _SearchBar extends StatelessWidget {
  final String lang;
  final TextEditingController controller;
  final AppColors c;
  final ValueChanged<String> onSubmitted;

  const _SearchBar({
    required this.lang,
    required this.controller,
    required this.c,
    required this.onSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 46,
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.border),
      ),
      child: TextField(
        controller: controller,
        onSubmitted: onSubmitted,
        style: TextStyle(color: c.text, fontSize: 14),
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: t('hero.searchPlaceholder', lang),
          hintStyle: TextStyle(color: c.textMuted, fontSize: 14),
          prefixIcon: Icon(Icons.search, color: c.textMuted, size: 20),
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 0, vertical: 12),
        ),
      ),
    );
  }
}

class _FilterStrip extends StatelessWidget {
  final String lang;
  final AppColors c;
  final String listingType;
  final Map<String, String> filters;
  final ValueChanged<String> onTypeChanged;
  final void Function(Map<String, String>) onFiltersApplied;

  const _FilterStrip({
    required this.lang,
    required this.c,
    required this.listingType,
    required this.filters,
    required this.onTypeChanged,
    required this.onFiltersApplied,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: c.surface,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            _TypeChip(
              label: t('filters.all', lang),
              selected: listingType.isEmpty,
              color: c.accent,
              onTap: () => onTypeChanged(''),
            ),
            const SizedBox(width: 8),
            _TypeChip(
              label: t('filters.sale', lang),
              selected: listingType == 'sale',
              color: c.accent,
              onTap: () => onTypeChanged('sale'),
            ),
            const SizedBox(width: 8),
            _TypeChip(
              label: t('filters.rent', lang),
              selected: listingType == 'rent',
              color: AppColors.colorInfo,
              onTap: () => onTypeChanged('rent'),
            ),
            const SizedBox(width: 8),
            _TypeChip(
              label: t('filters.installment', lang),
              selected: listingType == 'installment',
              color: AppColors.colorWarning,
              onTap: () => onTypeChanged('installment'),
            ),
            const SizedBox(width: 12),
            // Filter button
            GestureDetector(
              onTap: () {
                showFilterSheet(
                  context: context,
                  lang: lang,
                  initialFilters: filters,
                  onApply: onFiltersApplied,
                );
              },
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: filters.isNotEmpty
                      ? c.accent.withValues(alpha: 0.1)
                      : c.bg,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: filters.isNotEmpty ? c.accent : c.border,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.tune,
                      size: 16,
                      color:
                          filters.isNotEmpty ? c.accent : c.textSecondary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      t('catalog.filters', lang),
                      style: TextStyle(
                        color: filters.isNotEmpty
                            ? c.accent
                            : c.textSecondary,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    if (filters.isNotEmpty) ...[
                      const SizedBox(width: 4),
                      Container(
                        width: 16,
                        height: 16,
                        decoration: BoxDecoration(
                          color: c.accent,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            filters.length.toString(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _TypeChip({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? color : c.bg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected ? color : c.border),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : c.textSecondary,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}
