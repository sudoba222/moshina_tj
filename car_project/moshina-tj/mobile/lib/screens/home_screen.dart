import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import '../providers/listing_provider.dart';
import '../providers/language_provider.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';
import '../widgets/car_card.dart';
import '../widgets/search_bar_widget.dart';

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
      final provider = context.read<ListingProvider>();
      if (provider.featured.isEmpty) provider.loadFeatured();
      if (provider.fresh.isEmpty) provider.loadFresh();
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final lang = context.watch<LanguageProvider>().lang;

    return Scaffold(
      backgroundColor: colors.bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: colors.accent,
          onRefresh: () async {
            final p = context.read<ListingProvider>();
            await Future.wait([
              p.loadFeatured(),
              p.loadFresh(refresh: true),
            ]);
          },
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _buildHeader(context, lang, colors)),
              SliverToBoxAdapter(
                  child: _buildFeaturedSection(context, lang, colors)),
              SliverToBoxAdapter(
                child: Padding(
                  padding:
                      const EdgeInsets.fromLTRB(16, 20, 16, 8),
                  child: Text(
                    t('fresh_listings', lang),
                    style: TextStyle(
                      color: colors.text,
                      fontWeight: FontWeight.w700,
                      fontSize: 18,
                    ),
                  ),
                ),
              ),
              _buildFreshList(context, lang, colors),
              SliverToBoxAdapter(child: _buildLoadMore(context, lang, colors)),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(
      BuildContext context, String lang, AppColorExtension colors) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.directions_car, color: colors.accent, size: 24),
              const SizedBox(width: 8),
              Text(
                'MOSHINA.TJ',
                style: TextStyle(
                  color: colors.text,
                  fontWeight: FontWeight.w800,
                  fontSize: 20,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SearchBarWidget(
            lang: lang,
            controller: _searchCtrl,
            onSubmitted: (q) {
              if (q.trim().isNotEmpty) {
                context.push('/catalog?q=${Uri.encodeComponent(q)}');
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildFeaturedSection(
      BuildContext context, String lang, AppColorExtension colors) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, _) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
              child: Text(
                t('featured', lang),
                style: TextStyle(
                  color: colors.text,
                  fontWeight: FontWeight.w700,
                  fontSize: 18,
                ),
              ),
            ),
            if (provider.featuredLoading)
              SizedBox(
                height: 220,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: 4,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (_, __) => SizedBox(
                    width: 220,
                    child: Shimmer.fromColors(
                      baseColor: colors.border,
                      highlightColor: colors.surface,
                      child: Container(
                        decoration: BoxDecoration(
                          color: colors.card,
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ),
              )
            else if (provider.featuredError != null)
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(provider.featuredError!,
                    style: TextStyle(color: colors.textMuted)),
              )
            else if (provider.featured.isEmpty)
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(t('no_listings', lang),
                    style: TextStyle(color: colors.textMuted)),
              )
            else
              SizedBox(
                height: 250,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: provider.featured.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (ctx, i) {
                    final listing = provider.featured[i];
                    return SizedBox(
                      width: 220,
                      child: CarCard(
                        listing: listing,
                        onTap: () => ctx.push('/car/${listing.id}'),
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

  Widget _buildFreshList(
      BuildContext context, String lang, AppColorExtension colors) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, _) {
        if (provider.freshLoading) {
          return SliverList(
            delegate: SliverChildBuilderDelegate(
              (_, __) => Padding(
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
            child: _buildError(context, lang, colors, () {
              provider.loadFresh(refresh: true);
            }),
          );
        }

        if (provider.fresh.isEmpty) {
          return SliverToBoxAdapter(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text(t('no_listings', lang),
                    style: TextStyle(color: colors.textMuted)),
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

  Widget _buildLoadMore(
      BuildContext context, String lang, AppColorExtension colors) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, _) {
        if (provider.freshLoadingMore) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: CircularProgressIndicator(color: colors.accent),
            ),
          );
        }
        if (provider.hasMoreFresh) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: OutlinedButton(
              onPressed: () => provider.loadMoreFresh(),
              style: OutlinedButton.styleFrom(
                foregroundColor: colors.accent,
                side: BorderSide(color: colors.accent),
                minimumSize: const Size(double.infinity, 44),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              child: Text(t('load_more', lang)),
            ),
          );
        }
        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildError(BuildContext context, String lang,
      AppColorExtension colors, VoidCallback onRetry) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          Icon(Icons.wifi_off_outlined, size: 48, color: colors.textMuted),
          const SizedBox(height: 12),
          Text(t('error_loading', lang),
              style: TextStyle(color: colors.textSecondary)),
          const SizedBox(height: 12),
          TextButton(
            onPressed: onRetry,
            child: Text(t('retry', lang),
                style: TextStyle(color: colors.accent)),
          ),
        ],
      ),
    );
  }
}
