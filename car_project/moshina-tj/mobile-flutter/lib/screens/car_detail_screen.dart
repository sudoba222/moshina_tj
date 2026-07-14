import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/listing.dart';
import '../providers/favorites_provider.dart';
import '../providers/listing_provider.dart';
import '../providers/language_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/recently_viewed_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../theme/text_styles.dart';
import '../l10n/strings.dart';
import '../widgets/car_card.dart';

class CarDetailScreen extends StatefulWidget {
  final String listingId;

  const CarDetailScreen({super.key, required this.listingId});

  @override
  State<CarDetailScreen> createState() => _CarDetailScreenState();
}

class _CarDetailScreenState extends State<CarDetailScreen> {
  Listing? _listing;
  bool _loading = true;
  String? _error;
  int _currentImageIndex = 0;
  List<Listing> _related = [];
  bool _descExpanded = false;
  late PageController _galleryCtrl;

  // Endless recommendations feed at the bottom of the page
  final ScrollController _scrollCtrl = ScrollController();
  final List<Listing> _feed = [];
  final Set<String> _feedSeen = {};
  int _feedPage = 1;
  bool _feedHasMore = true;
  bool _feedLoading = false;

  @override
  void initState() {
    super.initState();
    _galleryCtrl = PageController();
    _scrollCtrl.addListener(_onScroll);
    _loadListing();
    _loadFeed();
  }

  @override
  void dispose() {
    _scrollCtrl.removeListener(_onScroll);
    _scrollCtrl.dispose();
    _galleryCtrl.dispose();
    super.dispose();
  }

  void _onScroll() {
    // Load the next page ~800px before the end so it feels seamless
    if (_scrollCtrl.position.pixels >=
        _scrollCtrl.position.maxScrollExtent - 800) {
      _loadFeed();
    }
  }

  Future<void> _loadFeed() async {
    if (_feedLoading || !_feedHasMore) return;
    _feedLoading = true;
    _feedSeen.add(widget.listingId); // never recommend the current car
    try {
      final data = await ApiService().getListingsPage(page: _feedPage);
      final items = (data['items'] as List<dynamic>? ?? [])
          .map((j) => Listing.fromJson(j as Map<String, dynamic>))
          .where((l) => _feedSeen.add(l.id))
          .toList();
      if (!mounted) return;
      setState(() {
        _feed.addAll(items);
        _feedPage += 1;
        final page = (data['page'] as num?)?.toInt() ?? _feedPage;
        final pages = (data['pages'] as num?)?.toInt() ?? page;
        _feedHasMore = page < pages;
      });
    } catch (_) {
      _feedHasMore = false;
    } finally {
      _feedLoading = false;
      if (mounted) setState(() {});
    }
  }

  Future<void> _loadListing() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final provider = context.read<ListingProvider>();
      final listing = await provider.getListingById(widget.listingId);
      if (mounted) {
        setState(() {
          _listing = listing;
          _loading = false;
          if (listing == null) _error = t('error.loading', context.read<LanguageProvider>().lang);
        });
        if (listing != null) {
          context.read<RecentlyViewedProvider>().add({
            'id': listing.id,
            'brand': listing.brand,
            'model': listing.model,
            'year': listing.year,
            'price': listing.price,
            'currency': listing.currency,
            'imageUrl': listing.firstImageUrl,
          });
          final related = await provider.getRelatedListings(
            widget.listingId,
            brand: listing.brand,
          );
          if (mounted) setState(() => _related = related);
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = t('error.loading', context.read<LanguageProvider>().lang);
        });
      }
    }
  }

  Future<void> _callSeller() async {
    final phone = _listing?.sellerPhone;
    if (phone == null) return;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  Future<void> _whatsappSeller() async {
    final phone = _listing?.sellerPhone;
    if (phone == null) return;
    final cleaned = phone.replaceAll(RegExp(r'[^\d]'), '');
    final uri = Uri.parse('https://wa.me/$cleaned');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _openChat() async {
    final isLoggedIn = context.read<AuthProvider>().isAuthenticated;
    if (!isLoggedIn) {
      context.push('/login');
      return;
    }
    try {
      final api = context.read<ApiService>();
      final conv = await api.createOrGetConversation(_listing!.id);
      if (!mounted) return;
      final convId = conv['id'] as String?;
      if (convId != null) {
        context.push('/chat/$convId', extra: conv);
      }
    } catch (_) {
      if (!mounted) return;
      final lang = context.read<LanguageProvider>().lang;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('error.generic', lang))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;

    if (_loading) {
      return Scaffold(
        backgroundColor: c.bg,
        appBar: AppBar(),
        body: Center(child: CircularProgressIndicator(color: c.accent)),
      );
    }

    if (_error != null || _listing == null) {
      return Scaffold(
        backgroundColor: c.bg,
        appBar: AppBar(),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 56, color: c.textMuted),
              const SizedBox(height: 12),
              Text(
                _error ?? t('error.loading', lang),
                style: TextStyle(color: c.textSecondary, fontSize: 15),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: _loadListing,
                child: Text(t('error.retry', lang),
                    style: TextStyle(color: c.accent)),
              ),
            ],
          ),
        ),
      );
    }

    final listing = _listing!;
    final galleryHeight = (MediaQuery.of(context).size.height * 0.38)
        .clamp(0.0, 320.0);

    return Scaffold(
      backgroundColor: c.bg,
      extendBodyBehindAppBar: false,
      bottomNavigationBar: _StickyBar(
        c: c,
        lang: lang,
        listing: listing,
        onCall: _callSeller,
      ),
      body: CustomScrollView(
        controller: _scrollCtrl,
        slivers: [
          // Pinned app bar that shows title after scroll
          SliverAppBar(
            pinned: true,
            expandedHeight: 0,
            backgroundColor: c.navBg,
            foregroundColor: c.text,
            surfaceTintColor: Colors.transparent,
            title: Text(
              '${listing.brand} ${listing.model} ${listing.year}',
              style: TextStyle(
                  color: c.text, fontSize: 16, fontWeight: FontWeight.w700),
            ),
            actions: [
              IconButton(
                icon: Icon(Icons.share_rounded, color: c.text),
                onPressed: () {
                  final url =
                      'https://tajcar.tj/car/${listing.id}';
                  SharePlus.instance.share(
                    ShareParams(
                      text:
                          '${listing.brand} ${listing.model} ${listing.year} — $url',
                    ),
                  );
                },
              ),
              Consumer<FavoritesProvider>(
                builder: (_, favs, _) {
                  final isFav = favs.isFavorite(listing.id);
                  return IconButton(
                    icon: Icon(
                      isFav
                          ? Icons.favorite_rounded
                          : Icons.favorite_border_rounded,
                      color: isFav ? Colors.redAccent : c.text,
                    ),
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      favs.toggleFavorite(listing.id);
                    },
                  );
                },
              ),
            ],
          ),

          // Gallery
          SliverToBoxAdapter(
            child: _Gallery(
              listing: listing,
              c: c,
              galleryHeight: galleryHeight,
              currentIndex: _currentImageIndex,
              controller: _galleryCtrl,
              onPageChanged: (i) =>
                  setState(() => _currentImageIndex = i),
            ),
          ),

          // Main content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildTitleAndPrice(listing, c, lang),
                  const SizedBox(height: 14),
                  _buildKeySpecsStrip(listing, c, lang),
                  const SizedBox(height: 20),
                  _SectionTitle(title: t('detail.specs', lang), c: c),
                  const SizedBox(height: 8),
                  _buildSpecsTable(listing, c, lang),
                  if (listing.description != null &&
                      listing.description!.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    _SectionTitle(title: t('detail.description', lang), c: c),
                    const SizedBox(height: 8),
                    _ExpandableDescription(
                      text: listing.description!,
                      lang: lang,
                      expanded: _descExpanded,
                      c: c,
                      onToggle: () =>
                          setState(() => _descExpanded = !_descExpanded),
                    ),
                  ],
                  const SizedBox(height: 20),
                  _SectionTitle(title: t('detail.seller', lang), c: c),
                  const SizedBox(height: 8),
                  _SellerCard(
                    listing: listing,
                    c: c,
                    lang: lang,
                    onCall: _callSeller,
                    onWhatsApp: _whatsappSeller,
                    onChat: _openChat,
                  ),
                  if (_related.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    _SectionTitle(
                        title: t('detail.related', lang), c: c),
                    const SizedBox(height: 12),
                    _RelatedListings(
                        related: _related, c: c, lang: lang),
                  ],
                  // Heading for the endless recommendations feed
                  if (_feed.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    _SectionTitle(
                        title: t('detail.moreToExplore', lang), c: c),
                  ],
                ],
              ),
            ),
          ),

          // Endless recommendations feed — big Encar-style cards
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (ctx, i) {
                  if (i >= _feed.length) {
                    return _feedHasMore
                        ? Padding(
                            padding: const EdgeInsets.symmetric(vertical: 24),
                            child: Center(
                              child: CircularProgressIndicator(color: c.accent),
                            ),
                          )
                        : const SizedBox.shrink();
                  }
                  final listing = _feed[i];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: CarCard(
                      listing: listing,
                      onTap: () => ctx.push('/car/${listing.id}'),
                    ),
                  );
                },
                childCount: _feed.length + (_feedHasMore ? 1 : 0),
              ),
            ),
          ),

          // Space for sticky bottom bar
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }

  Widget _buildTitleAndPrice(Listing listing, AppColors c, String lang) {
    Color badgeColor;
    String badgeLabel;
    switch (listing.listingType) {
      case 'rent':
        badgeColor = AppColors.colorInfo;
        badgeLabel = t('filters.rent', lang);
      case 'installment':
        badgeColor = AppColors.colorWarning;
        badgeLabel = t('filters.installment', lang);
      default:
        badgeColor = c.accent;
        badgeLabel = t('filters.sale', lang);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                '${listing.brand} ${listing.model} ${listing.year}',
                style: AppTextStyles.headingLarge(context),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: badgeColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                badgeLabel,
                style: TextStyle(
                  color: badgeColor,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(
              listing.formattedPrice(lang),
              style: AppTextStyles.priceLarge(context),
            ),
            if (listing.isNegotiable) ...[
              const SizedBox(width: 10),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.colorSuccess.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  t('common.negotiable', lang),
                  style: const TextStyle(
                    color: AppColors.colorSuccess,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 8),
        // Location + views row
        Row(
          children: [
            Icon(Icons.location_on_outlined,
                size: 14,
                color: context.colors.textSecondary),
            const SizedBox(width: 3),
            Text(
              listing.city,
              style: TextStyle(
                  color: context.colors.textSecondary, fontSize: 13),
            ),
            const SizedBox(width: 12),
            Icon(Icons.remove_red_eye_outlined,
                size: 13,
                color: context.colors.textMuted),
            const SizedBox(width: 3),
            Text(
              '${listing.viewsCount} ${t('detail.views', lang)}',
              style:
                  TextStyle(color: context.colors.textMuted, fontSize: 12),
            ),
          ],
        ),
      ],
    );
  }

  /// Quick-glance strip under the price — the 4 facts every buyer scans
  /// first (Encar / Auto.ru pattern): year, mileage, fuel, transmission.
  Widget _buildKeySpecsStrip(Listing listing, AppColors c, String lang) {
    final items = <(IconData, String, String)>[
      (Icons.calendar_today_outlined, t('detail.year', lang),
          listing.year.toString()),
      if (listing.mileage != null)
        (Icons.speed_outlined, t('detail.mileage', lang),
            listing.formattedMileage),
      if (listing.fuel != null)
        (Icons.local_gas_station_outlined, t('detail.fuel', lang),
            listing.fuel!),
      if (listing.transmission != null)
        (Icons.settings_outlined, t('detail.transmission', lang),
            listing.transmission!),
    ];

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: c.tagBg,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0)
              Container(width: 0.5, height: 34, color: c.border),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(items[i].$1, size: 18, color: c.textSecondary),
                  const SizedBox(height: 5),
                  Text(
                    items[i].$3,
                    style: TextStyle(
                      color: c.text,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 1),
                  Text(
                    items[i].$2,
                    style: TextStyle(color: c.textMuted, fontSize: 10.5),
                    maxLines: 1,
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// Full spec sheet as label→value rows with dividers — the standard
  /// "Характеристики" table used by Encar, Mobile.de and Auto.ru.
  Widget _buildSpecsTable(Listing listing, AppColors c, String lang) {
    final rows = <(String, String)>[
      if (listing.bodyType != null)
        (t('detail.body', lang), listing.bodyType!),
      if (listing.engineVolume != null)
        (t('detail.engine', lang), '${listing.engineVolume} л'),
      if (listing.driveType != null)
        (t('detail.drive', lang), listing.driveType!),
      if (listing.color != null)
        (t('detail.color', lang), listing.color!),
      if (listing.customsCleared != null)
        (t('detail.customs', lang),
            listing.customsCleared! ? t('common.yes', lang) : t('common.no', lang)),
      (t('detail.city', lang), listing.city),
    ];

    return Container(
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.border),
      ),
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0)
              Divider(height: 1, thickness: 0.5, color: c.border, indent: 14, endIndent: 14),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      rows[i].$1,
                      style: TextStyle(color: c.textMuted, fontSize: 13.5),
                    ),
                  ),
                  Text(
                    rows[i].$2,
                    style: TextStyle(
                      color: c.text,
                      fontWeight: FontWeight.w600,
                      fontSize: 13.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

class _Gallery extends StatelessWidget {
  final Listing listing;
  final AppColors c;
  final double galleryHeight;
  final int currentIndex;
  final PageController controller;
  final ValueChanged<int> onPageChanged;

  const _Gallery({
    required this.listing,
    required this.c,
    required this.galleryHeight,
    required this.currentIndex,
    required this.controller,
    required this.onPageChanged,
  });

  void _openFullscreen(BuildContext context, Listing listing, int startIndex) {
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierColor: Colors.black87,
        pageBuilder: (_, _, _) => _FullscreenGallery(
          images: listing.images.map((e) => e.url).toList(),
          initialIndex: startIndex,
          listingId: listing.id,
        ),
        transitionDuration: const Duration(milliseconds: 220),
        transitionsBuilder: (_, animation, _, child) =>
            FadeTransition(opacity: animation, child: child),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (listing.images.isEmpty) {
      return SizedBox(
        height: galleryHeight,
        child: ColoredBox(
          color: c.border,
          child: Center(
            child: Icon(Icons.directions_car_outlined,
                size: 80, color: c.textMuted),
          ),
        ),
      );
    }

    return Column(
      children: [
        Stack(
          children: [
            SizedBox(
              height: galleryHeight,
              child: PageView.builder(
                controller: controller,
                itemCount: listing.images.length,
                onPageChanged: onPageChanged,
                itemBuilder: (_, i) {
                  return GestureDetector(
                    onTap: () => _openFullscreen(context, listing, i),
                    child: Hero(
                      tag: 'car_img_${listing.id}_$i',
                      child: CachedNetworkImage(
                        imageUrl: listing.images[i].url,
                        fit: BoxFit.cover,
                        width: double.infinity,
                        placeholder: (ctx, url) =>
                            Container(color: c.border),
                        errorWidget: (ctx, url, err) => Container(
                          color: c.border,
                          child: Center(
                            child: Icon(Icons.directions_car_outlined,
                                size: 60, color: c.textMuted),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            // Dots
            if (listing.images.length > 1)
              Positioned(
                bottom: 12,
                left: 0,
                right: 0,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                    listing.images.length,
                    (i) => AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: i == currentIndex ? 20 : 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: i == currentIndex
                            ? Colors.white
                            : Colors.white.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
              ),
            // Image counter badge
            Positioned(
              bottom: 12,
              right: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${currentIndex + 1}/${listing.images.length}',
                  style: const TextStyle(
                      color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ),
            ),
            // ← Left arrow
            if (listing.images.length > 1 && currentIndex > 0)
              Positioned(
                left: 10,
                top: 0,
                bottom: 0,
                child: Center(
                  child: _GalleryArrow(
                    icon: Icons.chevron_left_rounded,
                    onTap: () => controller.previousPage(
                      duration: const Duration(milliseconds: 280),
                      curve: Curves.easeInOut,
                    ),
                  ),
                ),
              ),
            // → Right arrow
            if (listing.images.length > 1 && currentIndex < listing.images.length - 1)
              Positioned(
                right: 10,
                top: 0,
                bottom: 0,
                child: Center(
                  child: _GalleryArrow(
                    icon: Icons.chevron_right_rounded,
                    onTap: () => controller.nextPage(
                      duration: const Duration(milliseconds: 280),
                      curve: Curves.easeInOut,
                    ),
                  ),
                ),
              ),
          ],
        ),
        // Thumbnail strip
        if (listing.images.length > 1) ...[
          const SizedBox(height: 8),
          SizedBox(
            height: 60,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: listing.images.length,
              itemBuilder: (ctx, i) {
                final selected = i == currentIndex;
                return GestureDetector(
                  onTap: () {
                    controller.animateToPage(
                      i,
                      duration: const Duration(milliseconds: 250),
                      curve: Curves.easeInOut,
                    );
                  },
                  child: Container(
                    width: 60,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: selected ? c.accent : c.border,
                        width: selected ? 2 : 1,
                      ),
                    ),
                    clipBehavior: Clip.hardEdge,
                    child: CachedNetworkImage(
                      imageUrl: listing.images[i].url,
                      fit: BoxFit.cover,
                      placeholder: (ctx2, url) =>
                          Container(color: c.border),
                      errorWidget: (ctx2, url, _) =>
                          Container(color: c.border),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Expandable description
// ---------------------------------------------------------------------------

class _ExpandableDescription extends StatelessWidget {
  final String text;
  final String lang;
  final bool expanded;
  final AppColors c;
  final VoidCallback onToggle;

  const _ExpandableDescription({
    required this.text,
    required this.lang,
    required this.expanded,
    required this.c,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            text,
            maxLines: expanded ? null : 4,
            overflow: expanded ? TextOverflow.visible : TextOverflow.ellipsis,
            style: TextStyle(
                color: c.textSecondary, fontSize: 14, height: 1.6),
          ),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: onToggle,
            child: Text(
              expanded
                  ? t('detail.readLess', lang)
                  : t('detail.readMore', lang),
              style: TextStyle(
                color: c.accent,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Seller card with action buttons
// ---------------------------------------------------------------------------

class _SellerCard extends StatelessWidget {
  final Listing listing;
  final AppColors c;
  final String lang;
  final VoidCallback onCall;
  final VoidCallback onWhatsApp;
  final VoidCallback onChat;

  const _SellerCard({
    required this.listing,
    required this.c,
    required this.lang,
    required this.onCall,
    required this.onWhatsApp,
    required this.onChat,
  });

  @override
  Widget build(BuildContext context) {
    final name = listing.sellerName ?? t('common.seller', lang);
    final initials = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: c.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 16,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        children: [
          // Tap the seller header to open their public profile
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: listing.userId != null
                ? () => context.push('/seller/${listing.userId}')
                : null,
            child: Row(
            children: [
              // Gradient avatar with soft ring
              Container(
                padding: const EdgeInsets.all(2.5),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: c.accentDim, width: 2),
                ),
                child: Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [c.accent, c.accentHover],
                    ),
                  ),
                  child: Center(
                    child: Text(
                      initials,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            name,
                            style: TextStyle(
                              color: c.text,
                              fontWeight: FontWeight.w800,
                              fontSize: 16.5,
                              letterSpacing: -0.2,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (listing.isDealerListing) ...[
                          const SizedBox(width: 5),
                          Icon(Icons.verified_rounded,
                              size: 17, color: AppColors.colorInfo),
                        ],
                      ],
                    ),
                    const SizedBox(height: 3),
                    // Seller type badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: listing.isDealerListing
                            ? c.accentDim
                            : c.tagBg,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            listing.isDealerListing
                                ? Icons.store_rounded
                                : Icons.person_outline_rounded,
                            size: 12,
                            color: listing.isDealerListing
                                ? c.accent
                                : c.textSecondary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            listing.isDealerListing
                                ? t('badges.dealer', lang)
                                : t('detail.privateSeller', lang),
                            style: TextStyle(
                              color: listing.isDealerListing
                                  ? c.accent
                                  : c.textSecondary,
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              // Tap-to-copy phone chip
              if (listing.sellerPhone != null)
                GestureDetector(
                  onTap: () {
                    HapticFeedback.lightImpact();
                    Clipboard.setData(
                        ClipboardData(text: listing.sellerPhone!));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(t('common.copied', lang)),
                        duration: const Duration(seconds: 2),
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(9),
                    decoration: BoxDecoration(
                      color: c.tagBg,
                      shape: BoxShape.circle,
                      border: Border.all(color: c.border, width: 0.5),
                    ),
                    child: Icon(Icons.copy_rounded,
                        size: 16, color: c.textSecondary),
                  ),
                ),
            ],
            ),
          ),
          const SizedBox(height: 14),
          Divider(height: 1, thickness: 0.5, color: c.border),
          const SizedBox(height: 14),
          // Primary call button — gradient, soft glow
          GestureDetector(
            onTap: onCall,
            child: Container(
              width: double.infinity,
              height: 52,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xFF22B85B), AppColors.colorSuccess],
                ),
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.colorSuccess.withValues(alpha: 0.30),
                    blurRadius: 14,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.phone_rounded,
                      size: 20, color: Colors.white),
                  const SizedBox(width: 8),
                  Text(
                    t('detail.call', lang),
                    style: AppTextStyles.bodyLg(
                        color: Colors.white, weight: FontWeight.w700),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 9),
          // Secondary row: soft-filled WhatsApp + Chat
          Row(
            children: [
              Expanded(
                child: _SoftContactBtn(
                  label: 'WhatsApp',
                  icon: Icons.chat_rounded,
                  color: AppColors.whatsapp,
                  c: c,
                  onTap: onWhatsApp,
                ),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: _SoftContactBtn(
                  label: t('chat.openChat', lang),
                  icon: Icons.forum_outlined,
                  color: c.accent,
                  c: c,
                  onTap: onChat,
                ),
              ),
            ],
          ),
          const SizedBox(height: 13),
          // Safety tip
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.shield_outlined, size: 13, color: c.textMuted),
              const SizedBox(width: 5),
              Flexible(
                child: Text(
                  t('detail.safetyTip', lang),
                  style: TextStyle(color: c.textMuted, fontSize: 11.5),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Soft-filled secondary contact button (tinted background, colored label)
class _SoftContactBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final AppColors c;
  final VoidCallback onTap;

  const _SoftContactBtn({
    required this.label,
    required this.icon,
    required this.color,
    required this.c,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 46,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 17, color: color),
            const SizedBox(width: 7),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  color: color,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Related listings horizontal strip
// ---------------------------------------------------------------------------

class _RelatedListings extends StatelessWidget {
  final List<Listing> related;
  final AppColors c;
  final String lang;

  const _RelatedListings({
    required this.related,
    required this.c,
    required this.lang,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 270,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: related.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (ctx, i) {
          final item = related[i];
          return SizedBox(
            width: 230,
            child: CarCard(
              listing: item,
              onTap: () => ctx.push('/car/${item.id}'),
            ),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Section title
// ---------------------------------------------------------------------------

class _SectionTitle extends StatelessWidget {
  final String title;
  final AppColors c;

  const _SectionTitle({required this.title, required this.c});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: AppTextStyles.headingMedium(context),
    );
  }
}

// ---------------------------------------------------------------------------
// Sticky bottom bar
// ---------------------------------------------------------------------------

class _StickyBar extends StatelessWidget {
  final AppColors c;
  final String lang;
  final Listing listing;
  final VoidCallback onCall;

  const _StickyBar({
    required this.c,
    required this.lang,
    required this.listing,
    required this.onCall,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        12,
        16,
        12 + MediaQuery.of(context).padding.bottom,
      ),
      decoration: BoxDecoration(
        color: c.navBg,
        border: Border(top: BorderSide(color: c.border)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  listing.formattedPrice(lang),
                  style: _priceStyle(c),
                ),
                if (listing.isNegotiable)
                  Text(
                    t('common.negotiable', lang),
                    style: TextStyle(
                        color: AppColors.colorSuccess,
                        fontSize: 12,
                        fontWeight: FontWeight.w600),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            height: 48,
            child: ElevatedButton.icon(
              onPressed: onCall,
              icon: const Icon(Icons.phone_rounded, size: 18),
              label: Text(t('detail.call', lang)),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(140, 48),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

TextStyle _priceStyle(AppColors c) {
  return TextStyle(
    color: c.accent,
    fontSize: 22,
    fontWeight: FontWeight.w900,
    letterSpacing: -0.4,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gallery navigation arrow button
// ─────────────────────────────────────────────────────────────────────────────

class _GalleryArrow extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _GalleryArrow({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.88),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.22),
              blurRadius: 12,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Icon(icon, size: 24, color: const Color(0xFF1A1A1A)),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fullscreen gallery with pinch-to-zoom

class _FullscreenGallery extends StatefulWidget {
  final List<String> images;
  final int initialIndex;
  final String listingId;

  const _FullscreenGallery({
    required this.images,
    required this.initialIndex,
    required this.listingId,
  });

  @override
  State<_FullscreenGallery> createState() => _FullscreenGalleryState();
}

class _FullscreenGalleryState extends State<_FullscreenGallery> {
  late final PageController _ctrl;
  late int _index;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex;
    _ctrl = PageController(initialPage: _index);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          PageView.builder(
            controller: _ctrl,
            itemCount: widget.images.length,
            onPageChanged: (i) => setState(() => _index = i),
            itemBuilder: (_, i) => InteractiveViewer(
              minScale: 0.8,
              maxScale: 5.0,
              child: Hero(
                tag: 'car_img_${widget.listingId}_$i',
                child: CachedNetworkImage(
                  imageUrl: widget.images[i],
                  fit: BoxFit.contain,
                  placeholder: (_, _) => const Center(
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white54),
                  ),
                  errorWidget: (_, _, _) => const Center(
                    child: Icon(Icons.broken_image_rounded,
                        color: Colors.white38, size: 64),
                  ),
                ),
              ),
            ),
          ),
          // Close button
          SafeArea(
            child: Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.close_rounded,
                        color: Colors.white, size: 22),
                  ),
                ),
              ),
            ),
          ),
          // Counter
          if (widget.images.length > 1)
            SafeArea(
              child: Align(
                alignment: Alignment.topLeft,
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${_index + 1}/${widget.images.length}',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
