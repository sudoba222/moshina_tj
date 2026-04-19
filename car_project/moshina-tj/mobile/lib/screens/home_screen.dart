import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
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
            await Future.wait([
              p.loadFeatured(),
              p.loadFresh(refresh: true),
              p.loadStats(),
            ]);
          },
          child: CustomScrollView(
            slivers: [
              // App bar
              SliverToBoxAdapter(child: _AppHeader(c: c)),
              // Hero card
              SliverToBoxAdapter(
                  child: _HeroCard(lang: lang, c: c, searchCtrl: _searchCtrl)),
              // Categories
              SliverToBoxAdapter(child: _CategoriesSection(lang: lang, c: c)),
              // Featured
              SliverToBoxAdapter(
                  child: _FeaturedSection(lang: lang, c: c)),
              // Section title: fresh listings
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          t('hero.latestListings', lang),
                          style: GoogleFonts.outfit(
                            color: c.text,
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => context.go('/catalog'),
                        child: Text(
                          t('hero.viewAll', lang),
                          style: TextStyle(
                            color: c.accent,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // Fresh listing cards
              _FreshListSliver(lang: lang, c: c),
              // Load more
              SliverToBoxAdapter(
                  child: _LoadMoreButton(lang: lang, c: c)),
              // Sell banner
              SliverToBoxAdapter(
                  child: _SellBanner(lang: lang, c: c)),
              // Trust cards
              SliverToBoxAdapter(
                  child: _TrustSection(lang: lang, c: c)),
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
            ],
          ),
        ),
      ),
    );
  }
}

class _AppHeader extends StatelessWidget {
  final AppColors c;
  const _AppHeader({required this.c});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: c.navBg,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        children: [
          Icon(Icons.directions_car, color: c.accent, size: 22),
          const SizedBox(width: 8),
          Text(
            'TAJCAR',
            style: GoogleFonts.outfit(
              color: c.text,
              fontSize: 20,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.5,
            ),
          ),
          const Spacer(),
          GestureDetector(
            onTap: () => context.push('/login'),
            child: Icon(Icons.person_outline, color: c.textSecondary, size: 24),
          ),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  final String lang;
  final AppColors c;
  final TextEditingController searchCtrl;

  const _HeroCard(
      {required this.lang, required this.c, required this.searchCtrl});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: c.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t('hero.title', lang),
            style: GoogleFonts.outfit(
              color: c.text,
              fontSize: 28,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.8,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            t('hero.sub', lang),
            style: TextStyle(
              color: c.textSecondary,
              fontSize: 14,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 16),
          // Search bar
          Container(
            height: 52,
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: c.border),
            ),
            child: Row(
              children: [
                const SizedBox(width: 14),
                Icon(Icons.search, color: c.textMuted, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: searchCtrl,
                    style: TextStyle(color: c.text, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: t('hero.searchPlaceholder', lang),
                      hintStyle: TextStyle(color: c.textMuted, fontSize: 14),
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                      isDense: true,
                    ),
                    onSubmitted: (q) {
                      if (q.trim().isNotEmpty) {
                        context.go('/catalog?q=${Uri.encodeComponent(q)}');
                      }
                    },
                    textInputAction: TextInputAction.search,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Search button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: () {
                final q = searchCtrl.text.trim();
                if (q.isNotEmpty) {
                  context.go('/catalog?q=${Uri.encodeComponent(q)}');
                } else {
                  context.go('/catalog');
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: c.accent,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              child: Text(
                t('hero.searchBtn', lang),
                style: GoogleFonts.outfit(
                    fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ),
          ),
          const SizedBox(height: 20),
          // Stats row
          _StatsRow(lang: lang, c: c),
        ],
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  final String lang;
  final AppColors c;
  const _StatsRow({required this.lang, required this.c});

  @override
  Widget build(BuildContext context) {
    return Consumer<ListingProvider>(
      builder: (context, provider, _) {
        final stats = provider.stats;
        return Row(
          children: [
            _StatCell(
              value: stats != null ? _fmt(stats.listingsCount) : '—',
              label: t('stats.listings', lang),
              c: c,
            ),
            _Divider(c: c),
            _StatCell(
              value: stats != null ? _fmt(stats.dealersCount) : '—',
              label: t('stats.dealers', lang),
              c: c,
            ),
            _Divider(c: c),
            _StatCell(
              value: stats != null ? stats.citiesCount.toString() : '—',
              label: t('stats.cities', lang),
              c: c,
            ),
          ],
        );
      },
    );
  }

  String _fmt(int n) {
    if (n >= 1000) {
      return '${(n / 1000).toStringAsFixed(n % 1000 == 0 ? 0 : 1)}K';
    }
    return n.toString();
  }
}

class _StatCell extends StatelessWidget {
  final String value;
  final String label;
  final AppColors c;
  const _StatCell(
      {required this.value, required this.label, required this.c});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              color: c.accent,
              fontSize: 28,
              fontWeight: FontWeight.w900,
            ),
          ),
          Text(
            label,
            style: TextStyle(color: c.textMuted, fontSize: 12),
          ),
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
    return Container(
      width: 1,
      height: 40,
      color: c.border,
      margin: const EdgeInsets.symmetric(horizontal: 8),
    );
  }
}

const _categories = [
  ('cat.car', Icons.directions_car_outlined, 'car'),
  ('cat.suv', Icons.directions_car, 'suv'),
  ('cat.electric', Icons.bolt_outlined, 'electric'),
  ('cat.motorcycle', Icons.two_wheeler_outlined, 'motorcycle'),
  ('cat.truck', Icons.local_shipping_outlined, 'truck'),
  ('cat.parts', Icons.settings_outlined, 'parts'),
  ('cat.pickup', Icons.fire_truck_outlined, 'pickup'),
  ('cat.commercial', Icons.business_outlined, 'commercial'),
];

class _CategoriesSection extends StatelessWidget {
  final String lang;
  final AppColors c;
  const _CategoriesSection({required this.lang, required this.c});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: GridView.count(
        crossAxisCount: 4,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 0.85,
        children: _categories.map((cat) {
          return _CategoryCell(
            label: t(cat.$1, lang),
            icon: cat.$2,
            slug: cat.$3,
            c: c,
          );
        }).toList(),
      ),
    );
  }
}

class _CategoryCell extends StatelessWidget {
  final String label;
  final IconData icon;
  final String slug;
  final AppColors c;

  const _CategoryCell(
      {required this.label,
      required this.icon,
      required this.slug,
      required this.c});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go('/catalog?category=$slug'),
      child: Container(
        decoration: BoxDecoration(
          color: c.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: c.border, width: 1.5),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: c.accentDim,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: c.accent, size: 22),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Text(
                label,
                style: TextStyle(
                  color: c.textSecondary,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FeaturedSection extends StatelessWidget {
  final String lang;
  final AppColors c;
  const _FeaturedSection({required this.lang, required this.c});

  @override
  Widget build(BuildContext context) {
    return Consumer<ListingProvider>(
      builder: (context, provider, _) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
              child: Text(
                t('badges.featured', lang) == 'Топ'
                    ? 'Топ объявления'
                    : 'Топ эълонҳо',
                style: GoogleFonts.outfit(
                  color: c.text,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            SizedBox(
              height: 270,
              child: provider.featuredLoading
                  ? _FeaturedShimmer(c: c)
                  : provider.featured.isEmpty
                      ? const SizedBox.shrink()
                      : ListView.separated(
                          scrollDirection: Axis.horizontal,
                          padding:
                              const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: provider.featured.length,
                          separatorBuilder: (_, index) =>
                              const SizedBox(width: 12),
                          itemBuilder: (ctx, i) {
                            final listing = provider.featured[i];
                            return SizedBox(
                              width: 240,
                              child: CarCard(
                                listing: listing,
                                onTap: () =>
                                    ctx.push('/car/${listing.id}'),
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
}

class _FeaturedShimmer extends StatelessWidget {
  final AppColors c;
  const _FeaturedShimmer({required this.c});

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: 4,
      separatorBuilder: (_, index) => const SizedBox(width: 12),
      itemBuilder: (_, index) => SizedBox(
        width: 240,
        child: Shimmer.fromColors(
          baseColor: c.border,
          highlightColor: c.surface,
          child: Container(
            decoration: BoxDecoration(
              color: c.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: c.border),
            ),
          ),
        ),
      ),
    );
  }
}

class _FreshListSliver extends StatelessWidget {
  final String lang;
  final AppColors c;
  const _FreshListSliver({required this.lang, required this.c});

  @override
  Widget build(BuildContext context) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, _) {
        if (provider.freshLoading) {
          return SliverList(
            delegate: SliverChildBuilderDelegate(
              (context2, i) => Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: const CarCardShimmer(),
              ),
              childCount: 6,
            ),
          );
        }
        if (provider.freshError != null) {
          return SliverToBoxAdapter(
            child: _ErrorCard(
              message: provider.freshError!,
              onRetry: () => provider.loadFresh(refresh: true),
              c: c,
              lang: lang,
            ),
          );
        }
        if (provider.fresh.isEmpty) {
          return SliverToBoxAdapter(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text(t('common.noListings', lang),
                    style: TextStyle(color: c.textMuted)),
              ),
            ),
          );
        }
        return SliverList(
          delegate: SliverChildBuilderDelegate(
            (ctx2, i) {
              final listing = provider.fresh[i];
              return Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
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
}

class _LoadMoreButton extends StatelessWidget {
  final String lang;
  final AppColors c;
  const _LoadMoreButton({required this.lang, required this.c});

  @override
  Widget build(BuildContext context) {
    return Consumer<ListingProvider>(
      builder: (context2, provider, child) {
        if (provider.freshLoadingMore) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child:
                Center(child: CircularProgressIndicator(color: c.accent)),
          );
        }
        if (!provider.hasMoreFresh) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: OutlinedButton(
            onPressed: () => provider.loadMoreFresh(),
            style: OutlinedButton.styleFrom(
              foregroundColor: c.accent,
              side: BorderSide(color: c.border),
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: Text(
              t('catalog.loadMore', lang),
              style: TextStyle(color: c.textSecondary, fontWeight: FontWeight.w600),
            ),
          ),
        );
      },
    );
  }
}

class _SellBanner extends StatelessWidget {
  final String lang;
  final AppColors c;
  const _SellBanner({required this.lang, required this.c});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 24, 16, 0),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: c.accent,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t('sell.title', lang),
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            t('sell.sub', lang),
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 14,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () => context.go('/post'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: c.accent,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              child: Text(
                t('sell.cta', lang),
                style: GoogleFonts.outfit(
                    fontWeight: FontWeight.w700, fontSize: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

const _trustCards = [
  ('trust.safeTitle', 'trust.safeDesc', Icons.verified_user_outlined),
  ('trust.verifiedTitle', 'trust.verifiedDesc', Icons.fact_check_outlined),
  ('trust.supportTitle', 'trust.supportDesc', Icons.support_agent_outlined),
];

class _TrustSection extends StatelessWidget {
  final String lang;
  final AppColors c;
  const _TrustSection({required this.lang, required this.c});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t('trust.title', lang),
            style: GoogleFonts.outfit(
              color: c.text,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          ..._trustCards.map((card) => _TrustCard(
                title: t(card.$1, lang),
                desc: t(card.$2, lang),
                icon: card.$3,
                c: c,
              )),
        ],
      ),
    );
  }
}

class _TrustCard extends StatelessWidget {
  final String title;
  final String desc;
  final IconData icon;
  final AppColors c;

  const _TrustCard(
      {required this.title,
      required this.desc,
      required this.icon,
      required this.c});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.border),
      ),
      clipBehavior: Clip.hardEdge,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Accent left border
            Container(width: 3, color: c.accent),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: c.accentDim,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, color: c.accent, size: 22),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: TextStyle(
                            color: c.text,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          desc,
                          style: TextStyle(
                            color: c.textSecondary,
                            fontSize: 13,
                            height: 1.4,
                          ),
                        ),
                      ],
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
}

class _ErrorCard extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  final AppColors c;
  final String lang;

  const _ErrorCard(
      {required this.message,
      required this.onRetry,
      required this.c,
      required this.lang});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Icon(Icons.wifi_off_outlined, size: 48, color: c.textMuted),
          const SizedBox(height: 12),
          Text(message, style: TextStyle(color: c.textSecondary)),
          const SizedBox(height: 12),
          TextButton(
            onPressed: onRetry,
            child: Text(t('error.retry', lang),
                style: TextStyle(color: c.accent)),
          ),
        ],
      ),
    );
  }
}
