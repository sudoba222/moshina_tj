import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/listing_provider.dart';
import '../providers/language_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../theme/text_styles.dart';
import '../l10n/strings.dart';
import '../models/listing.dart';
import '../widgets/car_card.dart';
import '../widgets/filter_bottom_sheet.dart';
import 'package:cached_network_image/cached_network_image.dart';

class CatalogScreen extends StatefulWidget {
  final String? initialQuery;
  final String? initialType;
  final String? initialCategory;

  const CatalogScreen({
    super.key,
    this.initialQuery,
    this.initialType,
    this.initialCategory,
  });

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  final _searchCtrl = TextEditingController();
  Map<String, String> _filters = {};
  final _scrollCtrl = ScrollController();
  String _listingType = '';
  bool _gridMode = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialQuery != null) {
      _searchCtrl.text = widget.initialQuery!;
    }
    if (widget.initialType != null) {
      _listingType = widget.initialType!;
    }
    if (widget.initialCategory != null) {
      _filters = {'category_slug': widget.initialCategory!};
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
      filters['type'] = _listingType;
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
        actions: [
          // Grid / List toggle
          IconButton(
            tooltip: _gridMode
                ? t('catalog.listView', lang)
                : t('catalog.gridView', lang),
            icon: Icon(
              _gridMode ? Icons.view_list_outlined : Icons.grid_view_outlined,
              color: c.text,
            ),
            onPressed: () => setState(() => _gridMode = !_gridMode),
          ),
        ],
      ),
      body: Column(
        children: [
          // Pill search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: _PillSearchBar(
              lang: lang,
              controller: _searchCtrl,
              c: c,
              onSubmitted: (_) => _load(refresh: true),
            ),
          ),
          const SizedBox(height: 8),
          // Filter chips
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
          Expanded(child: _buildBody(context, lang, c)),
        ],
      ),
    );
  }

  Widget _buildBody(BuildContext context, String lang, AppColors c) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, _) {
        if (provider.catalogLoading) {
          return _gridMode
              ? _GridShimmer(c: c)
              : ListView.builder(
                  padding: EdgeInsets.zero,
                  itemCount: 6,
                  itemBuilder: (_, _) => const CarCardShimmer(horizontal: true),
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
                  style: AppTextStyles.body(color: c.textSecondary),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () => _load(refresh: true),
                  child: Text(
                    t('error.retry', lang),
                    style: AppTextStyles.body(color: c.accent),
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
                  style: AppTextStyles.body(color: c.textSecondary),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          color: c.accent,
          onRefresh: () async => _load(refresh: true),
          child: CustomScrollView(
            controller: _scrollCtrl,
            slivers: [
              // Results count row
              SliverToBoxAdapter(
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Text(
                    _resultsText(provider.catalogItems.length, lang),
                    style: AppTextStyles.bodySm(color: c.textSecondary),
                  ),
                ),
              ),
              // List or Grid
              if (_gridMode)
                _GridView(
                  items: provider.catalogItems,
                  c: c,
                  lang: lang,
                  onTap: (id) => context.push('/car/$id'),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.only(bottom: 16),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (ctx2, i) {
                        if (i >= provider.catalogItems.length) {
                          if (provider.catalogLoadingMore) {
                            return Center(
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: CircularProgressIndicator(
                                    color: c.accent),
                              ),
                            );
                          }
                          return const SizedBox.shrink();
                        }
                        final listing = provider.catalogItems[i];
                        return CarCard(
                          listing: listing,
                          horizontal: true,
                          onTap: () => ctx2.push('/car/${listing.id}'),
                        );
                      },
                      childCount: provider.catalogItems.length +
                          (provider.hasMoreCatalog ||
                                  provider.catalogLoadingMore
                              ? 1
                              : 0),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  String _resultsText(int count, String lang) {
    final template = t('catalog.results', lang);
    return template.replaceAll('{count}', count.toString());
  }
}

// ── Pill search bar with suggestions overlay ──────────────────────────────────

class _PillSearchBar extends StatefulWidget {
  final String lang;
  final TextEditingController controller;
  final AppColors c;
  final ValueChanged<String> onSubmitted;

  const _PillSearchBar({
    required this.lang,
    required this.controller,
    required this.c,
    required this.onSubmitted,
  });

  @override
  State<_PillSearchBar> createState() => _PillSearchBarState();
}

class _PillSearchBarState extends State<_PillSearchBar> {
  OverlayEntry? _overlay;
  final _layerLink = LayerLink();
  List<String> _suggestions = [];
  bool _showSuggestions = false;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    _removeOverlay();
    super.dispose();
  }

  void _onTextChanged() {
    final text = widget.controller.text;
    if (text.length >= 2) {
      _fetchSuggestions(text);
    } else {
      _removeOverlay();
      setState(() => _showSuggestions = false);
    }
  }

  Future<void> _fetchSuggestions(String q) async {
    try {
      final api = context.read<ApiService>();
      final results = await api.getSearchSuggestions(q);
      if (!mounted) return;
      setState(() {
        _suggestions = results.take(6).toList();
        _showSuggestions = _suggestions.isNotEmpty;
      });
      if (_showSuggestions) {
        _updateOverlay();
      } else {
        _removeOverlay();
      }
    } catch (_) {}
  }

  void _updateOverlay() {
    _removeOverlay();
    _overlay = OverlayEntry(builder: (ctx) => _SuggestionsOverlay(
      link: _layerLink,
      suggestions: _suggestions,
      c: widget.c,
      onSelect: _onSelect,
    ));
    Overlay.of(context).insert(_overlay!);
  }

  void _removeOverlay() {
    _overlay?.remove();
    _overlay = null;
  }

  void _onSelect(String suggestion) {
    widget.controller.text = suggestion;
    _removeOverlay();
    setState(() => _showSuggestions = false);
    widget.onSubmitted(suggestion);
  }

  @override
  Widget build(BuildContext context) {
    return CompositedTransformTarget(
      link: _layerLink,
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: widget.c.card,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: widget.c.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.07),
              blurRadius: 12,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: TextField(
          controller: widget.controller,
          onSubmitted: (v) {
            _removeOverlay();
            widget.onSubmitted(v);
          },
          onTapOutside: (_) => _removeOverlay(),
          style: AppTextStyles.body(color: widget.c.text),
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            hintText: t('hero.searchPlaceholder', widget.lang),
            hintStyle: AppTextStyles.body(color: widget.c.textMuted),
            prefixIcon: Icon(Icons.search, color: widget.c.accent, size: 20),
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 13),
          ),
        ),
      ),
    );
  }
}

class _SuggestionsOverlay extends StatelessWidget {
  final LayerLink link;
  final List<String> suggestions;
  final AppColors c;
  final ValueChanged<String> onSelect;

  const _SuggestionsOverlay({
    required this.link,
    required this.suggestions,
    required this.c,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned(
      width: MediaQuery.of(context).size.width - 32,
      child: CompositedTransformFollower(
        link: link,
        showWhenUnlinked: false,
        offset: const Offset(0, 52),
        child: Material(
          elevation: 8,
          color: c.card,
          borderRadius: BorderRadius.circular(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: suggestions.map((s) {
              return InkWell(
                onTap: () => onSelect(s),
                borderRadius: BorderRadius.circular(16),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                  child: Row(
                    children: [
                      Icon(Icons.search, size: 16, color: c.textMuted),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(s, style: TextStyle(color: c.text, fontSize: 14)),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}

// ── Filter strip ──────────────────────────────────────────────────────────────

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
            _FilterChip(
              label: t('filters.all', lang),
              selected: listingType.isEmpty,
              activeColor: c.accent,
              c: c,
              icon: Icons.grid_view_rounded,
              onTap: () => onTypeChanged(''),
            ),
            const SizedBox(width: 8),
            _FilterChip(
              label: t('filters.sale', lang),
              selected: listingType == 'sale',
              activeColor: c.accent,
              c: c,
              icon: Icons.sell_outlined,
              onTap: () => onTypeChanged('sale'),
            ),
            const SizedBox(width: 8),
            _FilterChip(
              label: t('filters.rent', lang),
              selected: listingType == 'rent',
              activeColor: AppColors.colorInfo,
              c: c,
              icon: Icons.key_outlined,
              onTap: () => onTypeChanged('rent'),
            ),
            const SizedBox(width: 8),
            _FilterChip(
              label: t('filters.installment', lang),
              selected: listingType == 'installment',
              activeColor: AppColors.colorWarning,
              c: c,
              icon: Icons.credit_card_outlined,
              onTap: () => onTypeChanged('installment'),
            ),
            const SizedBox(width: 12),
            // Advanced filter button
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
                      color: filters.isNotEmpty ? c.accent : c.textSecondary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      t('catalog.filters', lang),
                      style: AppTextStyles.bodySm(
                        color: filters.isNotEmpty ? c.accent : c.textSecondary,
                        weight: FontWeight.w500,
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
                            style: AppTextStyles.micro(
                              color: Colors.white,
                              weight: FontWeight.w700,
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

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final Color activeColor;
  final AppColors c;
  final VoidCallback onTap;
  final IconData? icon;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.activeColor,
    required this.c,
    required this.onTap,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: EdgeInsets.symmetric(horizontal: icon != null ? 10 : 14, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? activeColor : c.bg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: selected ? activeColor : c.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 14, color: selected ? Colors.white : c.textSecondary),
              const SizedBox(width: 5),
            ],
            Text(
              label,
              style: AppTextStyles.bodySm(
                color: selected ? Colors.white : c.textSecondary,
                weight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Grid view ─────────────────────────────────────────────────────────────────

class _GridView extends StatelessWidget {
  final List<Listing> items;
  final AppColors c;
  final String lang;
  final void Function(String id) onTap;

  const _GridView({
    required this.items,
    required this.c,
    required this.lang,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 0.78,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, i) {
            final listing = items[i];
            return _CompactCard(
              listing: listing,
              c: c,
              lang: lang,
              onTap: () => onTap(listing.id),
            );
          },
          childCount: items.length,
        ),
      ),
    );
  }
}

class _CompactCard extends StatelessWidget {
  final Listing listing;
  final AppColors c;
  final String lang;
  final VoidCallback onTap;

  const _CompactCard({
    required this.listing,
    required this.c,
    required this.lang,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final imageUrl = listing.firstImageUrl;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: c.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: c.border, width: 1),
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image — 130px height
            SizedBox(
              height: 130,
              width: double.infinity,
              child: imageUrl.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: imageUrl,
                      fit: BoxFit.cover,
                      placeholder: (_, _) => Container(color: c.border),
                      errorWidget: (_, _, _) => Container(
                        color: c.tagBg,
                        child: Center(
                          child: Icon(Icons.directions_car_outlined,
                              size: 32, color: c.textMuted),
                        ),
                      ),
                    )
                  : Container(
                      color: c.tagBg,
                      child: Center(
                        child: Icon(Icons.directions_car_outlined,
                            size: 32, color: c.textMuted),
                      ),
                    ),
            ),
            // Price + title
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 7, 8, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    listing.formattedPrice(lang),
                    style: AppTextStyles.bodyLg(
                      color: c.accent,
                      weight: FontWeight.w900,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${listing.brand} ${listing.model}',
                    style: AppTextStyles.bodySm(
                      color: c.text,
                      weight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${listing.year}',
                    style: AppTextStyles.caption(color: c.textMuted),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Grid shimmer ──────────────────────────────────────────────────────────────

class _GridShimmer extends StatelessWidget {
  final AppColors c;
  const _GridShimmer({required this.c});

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        childAspectRatio: 0.78,
      ),
      itemCount: 6,
      itemBuilder: (_, _) => Container(
        decoration: BoxDecoration(
          color: c.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: c.border),
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(height: 130, color: c.border),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(height: 16, width: 80, color: c.border),
                  const SizedBox(height: 5),
                  Container(height: 13, width: 110, color: c.border),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
