import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import '../models/listing.dart';
import '../providers/favorites_provider.dart';
import '../providers/language_provider.dart';
import '../providers/listing_provider.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';
import '../widgets/car_card.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  List<Listing> _listings = [];
  bool _loading = false;
  // Track which IDs we last loaded so we can refresh when favorites change
  Set<String> _loadedIds = {};

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final favoriteIds = context.read<FavoritesProvider>().favoriteIds;
    if (favoriteIds != _loadedIds) {
      _fetchListings(favoriteIds);
    }
  }

  Future<void> _fetchListings(Set<String> ids) async {
    if (ids.isEmpty) {
      setState(() {
        _listings = [];
        _loadedIds = ids;
        _loading = false;
      });
      return;
    }

    setState(() => _loading = true);

    final provider = context.read<ListingProvider>();
    final results = <Listing>[];

    // Fetch concurrently to minimise wall-clock time
    final futures = ids.map((id) => provider.getListingById(id));
    final fetched = await Future.wait(futures, eagerError: false);
    for (final listing in fetched) {
      if (listing != null) results.add(listing);
    }

    if (mounted) {
      setState(() {
        _listings = results;
        _loadedIds = Set.from(ids);
        _loading = false;
      });
    }
  }

  Future<void> _refresh() async {
    final ids = context.read<FavoritesProvider>().favoriteIds;
    _loadedIds = {}; // force reload
    await _fetchListings(ids);
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;
    // Re-evaluate whenever favorites change
    final favoriteIds = context.watch<FavoritesProvider>().favoriteIds;

    // If favorites have changed externally, reload
    if (favoriteIds != _loadedIds && !_loading) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _fetchListings(favoriteIds);
      });
    }

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(c, lang),
            Expanded(
              child: _loading
                  ? _buildShimmer(c)
                  : favoriteIds.isEmpty
                      ? _buildEmpty(c, lang)
                      : RefreshIndicator(
                          color: c.accent,
                          onRefresh: _refresh,
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 8),
                            itemCount: _listings.length,
                            itemBuilder: (ctx, i) {
                              final listing = _listings[i];
                              return Padding(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 6),
                                child: CarCard(
                                  listing: listing,
                                  onTap: () => ctx.push('/car/${listing.id}'),
                                ),
                              );
                            },
                          ),
                        ),
            ),
          ],
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
          Icon(Icons.favorite_rounded, color: c.accent, size: 24),
          const SizedBox(width: 10),
          Text(
            t('favorites.title', lang),
            style: GoogleFonts.outfit(
              color: c.text,
              fontSize: 22,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty(AppColors c, String lang) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.favorite_border_rounded, size: 72, color: c.border),
            const SizedBox(height: 16),
            Text(
              t('favorites.empty', lang),
              style: GoogleFonts.outfit(
                color: c.text,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              t('favorites.emptyHint', lang),
              style: TextStyle(
                color: c.textMuted,
                fontSize: 13,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShimmer(AppColors c) {
    return Shimmer.fromColors(
      baseColor: c.border,
      highlightColor: c.surface,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: 5,
        itemBuilder: (_, idx) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Container(
            height: 220,
            decoration: BoxDecoration(
              color: c.card,
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
      ),
    );
  }
}
