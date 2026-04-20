import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/listing_provider.dart';
import '../providers/language_provider.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';
import '../widgets/car_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final p = context.read<ListingProvider>();
      if (p.featured.isEmpty && !p.featuredLoading) p.loadFeatured();
      if (p.fresh.isEmpty && !p.freshLoading) p.loadFresh();
      if (p.stats == null && !p.statsLoading) p.loadStats();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: c.accent,
          onRefresh: () async {
            final p = context.read<ListingProvider>();
            await Future.wait([p.loadFeatured(), p.loadFresh(refresh: true), p.loadStats()]);
          },
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _buildHeader(c, lang)),
              SliverToBoxAdapter(child: _buildSearchBar(c, lang)),
              SliverToBoxAdapter(child: _buildStats(c, lang)),
              SliverToBoxAdapter(child: _buildCategories(c, lang)),
              SliverToBoxAdapter(child: _buildFeaturedSection(c, lang)),
              SliverToBoxAdapter(child: _buildSectionHeader(c, lang, t('hero.latestListings', lang))),
              _buildFreshSliver(c, lang),
              SliverToBoxAdapter(child: _buildLoadMore(c, lang)),
              SliverToBoxAdapter(child: _buildSellBanner(c, lang)),
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(AppColors c, String lang) {
    return Container(
      color: c.navBg,
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
      child: Row(
        children: [
          Container(
            width: 34, height: 34,
            decoration: BoxDecoration(color: c.accent, borderRadius: BorderRadius.circular(10)),
            child: const Icon(Icons.directions_car_rounded, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 10),
          Text('TAJCAR',
            style: GoogleFonts.outfit(color: c.text, fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
          const Spacer(),
          GestureDetector(
            onTap: () => context.push('/login'),
            child: Container(
              width: 38, height: 38,
              decoration: BoxDecoration(color: c.tagBg, borderRadius: BorderRadius.circular(12),
                border: Border.all(color: c.border)),
              child: Icon(Icons.person_outline_rounded, color: c.textSecondary, size: 20),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(AppColors c, String lang) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Row(
        children: [
          Expanded(
            child: Container(
              height: 52,
              decoration: BoxDecoration(
                color: c.card, borderRadius: BorderRadius.circular(14),
                border: Border.all(color: c.border),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
              ),
              child: Row(
                children: [
                  const SizedBox(width: 14),
                  Icon(Icons.search_rounded, color: c.textMuted, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _searchCtrl,
                      style: TextStyle(color: c.text, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: t('hero.searchPlaceholder', lang),
                        hintStyle: TextStyle(color: c.textMuted, fontSize: 14),
                        border: InputBorder.none, enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none, contentPadding: EdgeInsets.zero, isDense: true,
                      ),
                      onSubmitted: (q) => _doSearch(q),
                      textInputAction: TextInputAction.search,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: () => _doSearch(_searchCtrl.text),
            child: Container(
              width: 52, height: 52,
              decoration: BoxDecoration(color: c.accent, borderRadius: BorderRadius.circular(14)),
              child: const Icon(Icons.search_rounded, color: Colors.white, size: 22),
            ),
          ),
        ],
      ),
    );
  }

  void _doSearch(String q) {
    if (q.trim().isNotEmpty) {
      context.go('/catalog?q=${Uri.encodeComponent(q.trim())}');
    } else {
      context.go('/catalog');
    }
  }

  Widget _buildStats(AppColors c, String lang) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, _) {
        final stats = provider.stats;
        return Container(
          margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
          decoration: BoxDecoration(
            color: c.card, borderRadius: BorderRadius.circular(16),
            border: Border.all(color: c.border),
          ),
          child: Row(
            children: [
              _StatItem(value: stats != null ? '${_fmt(stats.listingsCount)}+' : '—',
                label: t('stats.listings', lang), c: c),
              _Divider(c: c),
              _StatItem(value: stats != null ? '${stats.dealersCount}+' : '—',
                label: t('stats.dealers', lang), c: c),
              _Divider(c: c),
              _StatItem(value: stats != null ? '${stats.citiesCount}' : '—',
                label: t('stats.cities', lang), c: c),
            ],
          ),
        );
      },
    );
  }

  String _fmt(int n) {
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(0)}K';
    return n.toString();
  }

  Widget _buildCategories(AppColors c, String lang) {
    final cats = [
      {'slug': 'car', 'icon': Icons.directions_car_rounded, 'key': 'cat.car'},
      {'slug': 'suv', 'icon': Icons.directions_car_filled_rounded, 'key': 'cat.suv'},
      {'slug': 'electric', 'icon': Icons.electric_car_rounded, 'key': 'cat.electric'},
      {'slug': 'motorcycle', 'icon': Icons.two_wheeler_rounded, 'key': 'cat.motorcycle'},
      {'slug': 'truck', 'icon': Icons.local_shipping_rounded, 'key': 'cat.truck'},
      {'slug': 'parts', 'icon': Icons.settings_rounded, 'key': 'cat.parts'},
      {'slug': 'pickup', 'icon': Icons.airport_shuttle_rounded, 'key': 'cat.pickup'},
      {'slug': 'commercial', 'icon': Icons.business_rounded, 'key': 'cat.commercial'},
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
          child: Text(lang == 'ru' ? 'Категории' : 'Категорияҳо',
            style: GoogleFonts.outfit(color: c.text, fontSize: 20, fontWeight: FontWeight.w800)),
        ),
        SizedBox(
          height: 90,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: cats.length,
            itemBuilder: (ctx, i) {
              final cat = cats[i];
              return GestureDetector(
                onTap: () => context.go('/catalog?category=${cat['slug']}'),
                child: Container(
                  width: 76, margin: const EdgeInsets.only(right: 10),
                  decoration: BoxDecoration(
                    color: c.card, borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: c.border),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 44, height: 44,
                        decoration: BoxDecoration(
                          color: c.accentDim, borderRadius: BorderRadius.circular(12)),
                        child: Icon(cat['icon'] as IconData, color: c.accent, size: 22),
                      ),
                      const SizedBox(height: 6),
                      Text(t(cat['key'] as String, lang),
                        style: TextStyle(color: c.textSecondary, fontSize: 10, fontWeight: FontWeight.w600),
                        textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildFeaturedSection(AppColors c, String lang) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, _) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [Colors.amber.shade600, c.accent]),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text('TOP',
                      style: GoogleFonts.outfit(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
                  ),
                  const SizedBox(width: 8),
                  Text(t('hero.latestListings', lang).replaceFirst('Свежие', 'Топ').replaceFirst('нав', 'Топ'),
                    style: GoogleFonts.outfit(color: c.text, fontSize: 20, fontWeight: FontWeight.w800)),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => context.go('/catalog'),
                    child: Row(
                      children: [
                        Text(t('hero.viewAll', lang),
                          style: TextStyle(color: c.accent, fontSize: 13, fontWeight: FontWeight.w600)),
                        Icon(Icons.arrow_forward_ios_rounded, color: c.accent, size: 12),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (provider.featuredLoading)
              SizedBox(
                height: 240,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: 4,
                  itemBuilder: (ctx3, idx) => const Padding(
                    padding: EdgeInsets.only(right: 12),
                    child: SizedBox(width: 200, child: CarCardShimmer()),
                  ),
                ),
              )
            else if (provider.featured.isEmpty)
              const SizedBox.shrink()
            else
              SizedBox(
                height: 260,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: provider.featured.length,
                  itemBuilder: (ctx2, i) {
                    final listing = provider.featured[i];
                    return Padding(
                      padding: const EdgeInsets.only(right: 12),
                      child: SizedBox(
                        width: 210,
                        child: CarCard(
                          listing: listing,
                          onTap: () => ctx2.push('/car/${listing.id}'),
                        ),
                      ),
                    );
                  },
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildSectionHeader(AppColors c, String lang, String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
      child: Row(
        children: [
          Expanded(
            child: Text(title,
              style: GoogleFonts.outfit(color: c.text, fontSize: 20, fontWeight: FontWeight.w800)),
          ),
          GestureDetector(
            onTap: () => context.go('/catalog'),
            child: Row(
              children: [
                Text(t('hero.viewAll', lang),
                  style: TextStyle(color: c.accent, fontSize: 13, fontWeight: FontWeight.w600)),
                Icon(Icons.arrow_forward_ios_rounded, color: c.accent, size: 12),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFreshSliver(AppColors c, String lang) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, child) {
        if (provider.freshLoading && provider.fresh.isEmpty) {
          return SliverList(
            delegate: SliverChildBuilderDelegate(
              (context2, i) => const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: CarCardShimmer(),
              ),
              childCount: 6,
            ),
          );
        }
        if (provider.fresh.isEmpty) {
          return SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Text(t('catalog.noResults', lang),
                  style: TextStyle(color: c.textMuted, fontSize: 14)),
              ),
            ),
          );
        }
        return SliverList(
          delegate: SliverChildBuilderDelegate(
            (ctx2, i) {
              final listing = provider.fresh[i];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: CarCard(
                  listing: listing,
                  onTap: () => ctx2.push('/car/${listing.id}'),
                ),
              );
            },
            childCount: provider.fresh.length,
          ),
        );
      },
    );
  }

  Widget _buildLoadMore(AppColors c, String lang) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, child) {
        if (!provider.hasMoreFresh) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: OutlinedButton(
            onPressed: provider.freshLoadingMore ? null : () => provider.loadMoreFresh(),
            style: OutlinedButton.styleFrom(
              foregroundColor: c.accent,
              side: BorderSide(color: c.accent),
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: provider.freshLoadingMore
                ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: c.accent))
                : Text(t('catalog.loadMore', lang),
                    style: GoogleFonts.outfit(fontWeight: FontWeight.w700)),
          ),
        );
      },
    );
  }

  Widget _buildSellBanner(AppColors c, String lang) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: c.accent,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t('sell.title', lang),
                  style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800, height: 1.2)),
                const SizedBox(height: 6),
                Text(lang == 'ru' ? 'Бесплатно. Тысячи покупателей' : 'Ройгон. Ҳазорон харидор',
                  style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.4)),
                const SizedBox(height: 16),
                GestureDetector(
                  onTap: () => context.go('/post'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(lang == 'ru' ? 'Разместить' : 'Гузоштан',
                      style: GoogleFonts.outfit(color: c.accent, fontSize: 14, fontWeight: FontWeight.w800)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Icon(Icons.sell_rounded, color: Colors.white.withValues(alpha: 0.3), size: 64),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String value;
  final String label;
  final AppColors c;
  const _StatItem({required this.value, required this.label, required this.c});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value,
            style: GoogleFonts.outfit(color: c.accent, fontSize: 22, fontWeight: FontWeight.w900, height: 1)),
          const SizedBox(height: 3),
          Text(label,
            style: TextStyle(color: c.textMuted, fontSize: 11, fontWeight: FontWeight.w500),
            textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  final AppColors c;
  const _Divider({required this.c});

  @override
  Widget build(BuildContext context) {
    return Container(width: 1, height: 28, color: c.border);
  }
}
