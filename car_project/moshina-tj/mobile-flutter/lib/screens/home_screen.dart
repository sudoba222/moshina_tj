import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import '../providers/auth_provider.dart';
import '../providers/listing_provider.dart';
import '../providers/language_provider.dart';
import '../theme/app_theme.dart';
import '../theme/text_styles.dart';
import '../l10n/strings.dart';
import '../widgets/car_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _featuredPage = 0;
  final PageController _featuredPageCtrl =
      PageController(viewportFraction: 0.88);

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
    _featuredPageCtrl.dispose();
    super.dispose();
  }

  double _hPad(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    if (w < 360) return 14;
    if (w < 400) return 16;
    return 20;
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;
    final hp = _hPad(context);

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
              SliverToBoxAdapter(child: _Header(c: c, lang: lang, hp: hp)),
              SliverToBoxAdapter(child: _SearchBar(c: c, lang: lang, hp: hp)),
              SliverToBoxAdapter(child: _StatsRow(c: c, lang: lang, hp: hp)),
              SliverToBoxAdapter(child: _CategoryRow(c: c, lang: lang, hp: hp)),
              SliverToBoxAdapter(
                child: _FeaturedSection(
                  c: c,
                  lang: lang,
                  hp: hp,
                  pageCtrl: _featuredPageCtrl,
                  currentPage: _featuredPage,
                  onPageChanged: (p) => setState(() => _featuredPage = p),
                ),
              ),
              SliverToBoxAdapter(
                child: _SectionHeader(
                  c: c,
                  lang: lang,
                  hp: hp,
                  title: t('hero.latestListings', lang),
                  onViewAll: () => context.go('/catalog'),
                ),
              ),
              _FreshSliver(c: c, lang: lang, hp: hp),
              SliverToBoxAdapter(child: _LoadMoreBtn(c: c, lang: lang, hp: hp)),
              SliverToBoxAdapter(child: _SellBanner(c: c, lang: lang, hp: hp)),
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Header — polished with drop shadow
// ---------------------------------------------------------------------------

class _Header extends StatelessWidget {
  final AppColors c;
  final String lang;
  final double hp;

  const _Header({required this.c, required this.lang, required this.hp});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isAuthenticated = auth.isAuthenticated;
    final initials = isAuthenticated && auth.user != null
        ? auth.user!.initials
        : '';

    return Container(
      decoration: BoxDecoration(
        color: c.navBg,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: EdgeInsets.fromLTRB(hp, 14, hp, 14),
      child: Row(
        children: [
          // Wordmark
          RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: 'Taj',
                  style: GoogleFonts.outfit(
                    color: c.text,
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.8,
                  ),
                ),
                TextSpan(
                  text: 'Car',
                  style: GoogleFonts.outfit(
                    color: c.accent,
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.8,
                  ),
                ),
              ],
            ),
          ),
          const Spacer(),
          _IconCircle(
            icon: Icons.notifications_none_rounded,
            colors: c,
            onTap: () => context.push('/notifications'),
          ),
          const SizedBox(width: 8),
          // Profile: initials circle if authenticated, person icon otherwise
          GestureDetector(
            onTap: () => isAuthenticated
                ? context.go('/profile')
                : context.push('/login'),
            child: isAuthenticated && initials.isNotEmpty
                ? Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: c.accent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        initials,
                        style: GoogleFonts.outfit(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  )
                : Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: c.tagBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: c.border),
                    ),
                    child: Icon(Icons.person_outline_rounded,
                        color: c.textSecondary, size: 20),
                  ),
          ),
        ],
      ),
    );
  }
}

class _IconCircle extends StatelessWidget {
  final IconData icon;
  final AppColors colors;
  final VoidCallback onTap;

  const _IconCircle({
    required this.icon,
    required this.colors,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: colors.tagBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: colors.border),
        ),
        child: Icon(icon, color: colors.textSecondary, size: 20),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Search bar — pill style with prominent shadow
// ---------------------------------------------------------------------------

class _SearchBar extends StatelessWidget {
  final AppColors c;
  final String lang;
  final double hp;

  const _SearchBar({required this.c, required this.lang, required this.hp});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(hp, 16, hp, 0),
      child: GestureDetector(
        onTap: () => context.go('/catalog'),
        child: Container(
          height: 54,
          decoration: BoxDecoration(
            color: c.card,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: c.border, width: 1.2),
            boxShadow: [
              BoxShadow(
                color: c.accent.withValues(alpha: 0.10),
                blurRadius: 20,
                offset: const Offset(0, 6),
              ),
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              const SizedBox(width: 18),
              Icon(Icons.search_rounded, color: c.accent, size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  t('hero.searchPlaceholder', lang),
                  style: GoogleFonts.outfit(
                    color: c.textMuted,
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ),
              Container(
                margin: const EdgeInsets.all(6),
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: c.accent,
                  borderRadius: BorderRadius.circular(22),
                ),
                child: Text(
                  t('hero.searchBtn', lang),
                  style: GoogleFonts.outfit(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Stats band — bigger numbers, cleaner labels
// ---------------------------------------------------------------------------

class _StatsRow extends StatelessWidget {
  final AppColors c;
  final String lang;
  final double hp;

  const _StatsRow({required this.c, required this.lang, required this.hp});

  @override
  Widget build(BuildContext context) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, _) {
        final stats = provider.stats;
        final isLoading = provider.statsLoading && stats == null;
        return Container(
          margin: EdgeInsets.fromLTRB(hp, 14, hp, 0),
          decoration: BoxDecoration(
            color: c.card,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: c.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: isLoading
              ? _StatsShimmer(c: c)
              : Row(
                  children: [
                    _StatItem(
                      value: stats != null ? '${_fmt(stats.listingsCount)}+' : '—',
                      label: t('stats.listings', lang),
                      c: c,
                    ),
                    _StatDivider(c: c),
                    _StatItem(
                      value: stats != null ? '${stats.dealersCount}+' : '—',
                      label: t('stats.dealers', lang),
                      c: c,
                    ),
                    _StatDivider(c: c),
                    _StatItem(
                      value: stats != null ? '${stats.citiesCount}' : '—',
                      label: t('stats.cities', lang),
                      c: c,
                    ),
                  ],
                ),
        );
      },
    );
  }

  static String _fmt(int n) {
    if (n >= 1000) return '${(n / 1000).toStringAsFixed(0)}K';
    return n.toString();
  }
}

class _StatsShimmer extends StatelessWidget {
  final AppColors c;
  const _StatsShimmer({required this.c});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: c.border,
      highlightColor: c.surface,
      child: Row(
        children: List.generate(3, (i) {
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
              child: Column(
                children: [
                  Container(
                    height: 24,
                    width: 56,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(6),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    height: 12,
                    width: 48,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String value;
  final String label;
  final AppColors c;

  const _StatItem({
    required this.value,
    required this.label,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 18),
        child: Column(
          children: [
            Text(
              value,
              style: GoogleFonts.outfit(
                color: c.accent,
                fontSize: 24,
                fontWeight: FontWeight.w800,
                height: 1,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: GoogleFonts.outfit(
                color: c.textMuted,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _StatDivider extends StatelessWidget {
  final AppColors c;
  const _StatDivider({required this.c});

  @override
  Widget build(BuildContext context) {
    return Container(width: 1, height: 32, color: c.border);
  }
}

// ---------------------------------------------------------------------------
// Category horizontal scroll — card style: icon above + label
// ---------------------------------------------------------------------------

class _CategoryRow extends StatelessWidget {
  final AppColors c;
  final String lang;
  final double hp;

  const _CategoryRow({required this.c, required this.lang, required this.hp});

  static const List<Map<String, Object>> _cats = [
    {'slug': 'car', 'icon': Icons.directions_car_rounded, 'key': 'cat.car'},
    {'slug': 'suv', 'icon': Icons.directions_car_filled_rounded, 'key': 'cat.suv'},
    {'slug': 'electric', 'icon': Icons.electric_car_rounded, 'key': 'cat.electric'},
    {'slug': 'motorcycle', 'icon': Icons.two_wheeler_rounded, 'key': 'cat.motorcycle'},
    {'slug': 'truck', 'icon': Icons.local_shipping_rounded, 'key': 'cat.truck'},
    {'slug': 'parts', 'icon': Icons.settings_rounded, 'key': 'cat.parts'},
    {'slug': 'pickup', 'icon': Icons.airport_shuttle_rounded, 'key': 'cat.pickup'},
    {
      'slug': 'commercial',
      'icon': Icons.business_rounded,
      'key': 'cat.commercial'
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(hp, 22, hp, 12),
          child: Text(
            t('home.categories', lang),
            style: AppTextStyles.headingLarge(context),
          ),
        ),
        SizedBox(
          height: 88,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.symmetric(horizontal: hp),
            itemCount: _cats.length,
            itemBuilder: (ctx, i) {
              final cat = _cats[i];
              return Padding(
                padding: const EdgeInsets.only(right: 10),
                child: _CategoryCard(
                  icon: cat['icon'] as IconData,
                  label: t(cat['key'] as String, lang),
                  slug: cat['slug'] as String,
                  c: c,
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _CategoryCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String slug;
  final AppColors c;

  const _CategoryCard({
    required this.icon,
    required this.label,
    required this.slug,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.go('/catalog?category=$slug'),
      child: Container(
        width: 72,
        height: 88,
        decoration: BoxDecoration(
          color: c.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: c.border, width: 1.2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: c.accent.withValues(alpha: 0.09),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: c.accent, size: 20),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: GoogleFonts.outfit(
                color: c.textSecondary,
                fontSize: 11,
                fontWeight: FontWeight.w600,
                height: 1.2,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Featured section
// ---------------------------------------------------------------------------

class _FeaturedSection extends StatelessWidget {
  final AppColors c;
  final String lang;
  final double hp;
  final PageController pageCtrl;
  final int currentPage;
  final ValueChanged<int> onPageChanged;

  const _FeaturedSection({
    required this.c,
    required this.lang,
    required this.hp,
    required this.pageCtrl,
    required this.currentPage,
    required this.onPageChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, _) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SectionHeader(
              c: c,
              lang: lang,
              hp: hp,
              title: t('home.featuredTitle', lang),
              onViewAll: () => context.go('/catalog'),
            ),
            if (provider.featuredLoading)
              SizedBox(
                height: 260,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: EdgeInsets.symmetric(horizontal: hp),
                  itemCount: 3,
                  itemBuilder: (ctx3, idx) => Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: SizedBox(width: 240, child: CarCardShimmer()),
                  ),
                ),
              )
            else if (provider.featured.isEmpty)
              _FeaturedEmptyState(c: c, lang: lang, hp: hp)
            else ...[
              SizedBox(
                height: 290,
                child: PageView.builder(
                  controller: pageCtrl,
                  padEnds: false,
                  itemCount: provider.featured.length,
                  onPageChanged: onPageChanged,
                  itemBuilder: (ctx2, i) {
                    final listing = provider.featured[i];
                    return Padding(
                      padding: EdgeInsets.only(
                        left: i == 0 ? hp : 6,
                        right: i == provider.featured.length - 1 ? hp : 6,
                      ),
                      child: CarCard(
                        listing: listing,
                        onTap: () => ctx2.push('/car/${listing.id}'),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 10),
              if (provider.featured.length > 1)
                Center(
                  child: _DotIndicators(
                    count: provider.featured.length,
                    current: currentPage,
                    c: c,
                  ),
                ),
            ],
          ],
        );
      },
    );
  }
}

class _FeaturedEmptyState extends StatelessWidget {
  final AppColors c;
  final String lang;
  final double hp;

  const _FeaturedEmptyState({
    required this.c,
    required this.lang,
    required this.hp,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: hp),
      child: Container(
        height: 120,
        decoration: BoxDecoration(
          color: c.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: c.border),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.star_outline_rounded, color: c.textMuted, size: 28),
            const SizedBox(width: 12),
            Text(
              lang == 'ru' ? 'Нет топ объявлений' : 'Эълони топ нест',
              style: GoogleFonts.outfit(
                color: c.textMuted,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DotIndicators extends StatelessWidget {
  final int count;
  final int current;
  final AppColors c;

  const _DotIndicators({
    required this.count,
    required this.current,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(
        count,
        (i) => AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          margin: const EdgeInsets.symmetric(horizontal: 3),
          width: i == current ? 20 : 6,
          height: 6,
          decoration: BoxDecoration(
            color: i == current ? c.accent : c.border,
            borderRadius: BorderRadius.circular(3),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

class _SectionHeader extends StatelessWidget {
  final AppColors c;
  final String lang;
  final double hp;
  final String title;
  final VoidCallback onViewAll;

  const _SectionHeader({
    required this.c,
    required this.lang,
    required this.hp,
    required this.title,
    required this.onViewAll,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(hp, 24, hp, 12),
      child: Row(
        children: [
          Expanded(
            child: Text(title, style: AppTextStyles.headingLarge(context)),
          ),
          GestureDetector(
            onTap: onViewAll,
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
              child: Row(
                children: [
                  Text(
                    t('hero.viewAll', lang),
                    style: GoogleFonts.outfit(
                      color: c.accent,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Icon(Icons.arrow_forward_ios_rounded,
                      color: c.accent, size: 12),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Fresh listings sliver — shimmer loading
// ---------------------------------------------------------------------------

class _FreshSliver extends StatelessWidget {
  final AppColors c;
  final String lang;
  final double hp;

  const _FreshSliver({required this.c, required this.lang, required this.hp});

  @override
  Widget build(BuildContext context) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, _) {
        if (provider.freshLoading && provider.fresh.isEmpty) {
          return SliverList(
            delegate: SliverChildBuilderDelegate(
              (ctx2, i) => Padding(
                padding: EdgeInsets.symmetric(horizontal: hp, vertical: 6),
                child: _FreshShimmerItem(c: c),
              ),
              childCount: 4,
            ),
          );
        }
        if (provider.freshError != null && provider.fresh.isEmpty) {
          return SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: hp, vertical: 32),
              child: Column(
                children: [
                  Icon(Icons.cloud_off_outlined, size: 48, color: c.textMuted),
                  const SizedBox(height: 12),
                  Text(
                    lang == 'ru' ? 'Не удалось загрузить объявления' : 'Дархостҳо бор нашуданд',
                    style: TextStyle(color: c.textSecondary, fontSize: 14),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () => context.read<ListingProvider>().loadFresh(refresh: true),
                    style: OutlinedButton.styleFrom(foregroundColor: c.accent, side: BorderSide(color: c.accent)),
                    child: Text(lang == 'ru' ? 'Повторить' : 'Такроран'),
                  ),
                ],
              ),
            ),
          );
        }
        if (provider.fresh.isEmpty) {
          return SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: hp, vertical: 32),
              child: _EmptyFreshState(c: c, lang: lang),
            ),
          );
        }
        return SliverList(
          delegate: SliverChildBuilderDelegate(
            (ctx2, i) {
              final listing = provider.fresh[i];
              return Padding(
                padding: EdgeInsets.symmetric(horizontal: hp, vertical: 6),
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

class _FreshShimmerItem extends StatelessWidget {
  final AppColors c;
  const _FreshShimmerItem({required this.c});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: c.border,
      highlightColor: c.surface,
      child: Container(
        height: 112,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }
}

class _EmptyFreshState extends StatelessWidget {
  final AppColors c;
  final String lang;

  const _EmptyFreshState({required this.c, required this.lang});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: c.tagBg,
            shape: BoxShape.circle,
          ),
          child: Icon(Icons.car_rental_rounded, color: c.textMuted, size: 30),
        ),
        const SizedBox(height: 12),
        Text(
          t('catalog.noResults', lang),
          style: GoogleFonts.outfit(
            color: c.textMuted,
            fontSize: 15,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Load more button
// ---------------------------------------------------------------------------

class _LoadMoreBtn extends StatelessWidget {
  final AppColors c;
  final String lang;
  final double hp;

  const _LoadMoreBtn({required this.c, required this.lang, required this.hp});

  @override
  Widget build(BuildContext context) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, _) {
        if (!provider.hasMoreFresh) return const SizedBox.shrink();
        return Padding(
          padding: EdgeInsets.fromLTRB(hp, 8, hp, 0),
          child: OutlinedButton(
            onPressed: provider.freshLoadingMore
                ? null
                : () => provider.loadMoreFresh(),
            style: OutlinedButton.styleFrom(
              foregroundColor: c.accent,
              side: BorderSide(color: c.accent),
              minimumSize: const Size(double.infinity, 50),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
            child: provider.freshLoadingMore
                ? SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: c.accent),
                  )
                : Text(
                    t('catalog.loadMore', lang),
                    style: GoogleFonts.outfit(fontWeight: FontWeight.w700),
                  ),
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Sell banner — gradient, impactful
// ---------------------------------------------------------------------------

class _SellBanner extends StatelessWidget {
  final AppColors c;
  final String lang;
  final double hp;

  const _SellBanner({required this.c, required this.lang, required this.hp});

  @override
  Widget build(BuildContext context) {
    // Derive a darker shade for the gradient end
    final accentDark = Color.lerp(c.accent, const Color(0xFF7A1A04), 0.35)!;

    return Container(
      margin: EdgeInsets.fromLTRB(hp, 28, hp, 0),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [c.accent, accentDark],
          stops: const [0.0, 1.0],
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: c.accent.withValues(alpha: 0.35),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.hardEdge,
        children: [
          // Decorative background circle
          Positioned(
            right: -30,
            top: -30,
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.07),
              ),
            ),
          ),
          Positioned(
            right: 20,
            bottom: -20,
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.05),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        t('sell.title', lang),
                        style: GoogleFonts.outfit(
                          color: Colors.white,
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                          height: 1.2,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        lang == 'ru'
                            ? 'Бесплатно. Тысячи покупателей'
                            : 'Ройгон. Ҳазорон харидор',
                        style: GoogleFonts.outfit(
                          color: Colors.white.withValues(alpha: 0.80),
                          fontSize: 13,
                          height: 1.4,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                      const SizedBox(height: 18),
                      GestureDetector(
                        onTap: () => context.go('/post'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 20, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.12),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                lang == 'ru' ? 'Разместить' : 'Гузоштан',
                                style: GoogleFonts.outfit(
                                  color: c.accent,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Icon(Icons.arrow_forward_rounded,
                                  color: c.accent, size: 16),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  Icons.directions_car_filled_rounded,
                  color: Colors.white.withValues(alpha: 0.22),
                  size: 72,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
