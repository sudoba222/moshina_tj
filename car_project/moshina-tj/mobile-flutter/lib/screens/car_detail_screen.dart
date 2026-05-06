import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/listing.dart';
import '../providers/favorites_provider.dart';
import '../providers/listing_provider.dart';
import '../providers/language_provider.dart';
import '../providers/auth_provider.dart';
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

  @override
  void initState() {
    super.initState();
    _galleryCtrl = PageController();
    _loadListing();
  }

  @override
  void dispose() {
    _galleryCtrl.dispose();
    super.dispose();
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
              Consumer<FavoritesProvider>(
                builder: (_, favs, __) {
                  final isFav = favs.isFavorite(listing.id);
                  return IconButton(
                    icon: Icon(
                      isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                      color: isFav ? Colors.redAccent : c.text,
                    ),
                    onPressed: () => favs.toggleFavorite(listing.id),
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
                  const SizedBox(height: 16),
                  _buildSpecsGrid(listing, c, lang),
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
                  // Space for sticky bottom bar
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
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

  Widget _buildSpecsGrid(Listing listing, AppColors c, String lang) {
    final specs = <(IconData, String, String?)>[
      (Icons.calendar_today_outlined, t('detail.year', lang),
          listing.year.toString()),
      if (listing.mileage != null)
        (Icons.speed_outlined, t('detail.mileage', lang),
            listing.formattedMileage),
      if (listing.fuel != null)
        (Icons.local_gas_station_outlined, t('detail.fuel', lang),
            listing.fuel),
      if (listing.transmission != null)
        (Icons.settings_outlined, t('detail.transmission', lang),
            listing.transmission),
      if (listing.engineVolume != null)
        (Icons.engineering_outlined, t('detail.engine', lang),
            '${listing.engineVolume} л'),
      if (listing.driveType != null)
        (Icons.four_k_plus_outlined, t('detail.drive', lang),
            listing.driveType),
      if (listing.bodyType != null)
        (Icons.directions_car_outlined, t('detail.body', lang),
            listing.bodyType),
      if (listing.color != null)
        (Icons.palette_outlined, t('detail.color', lang), listing.color),
      (Icons.location_on_outlined, t('detail.city', lang), listing.city),
      if (listing.customsCleared != null)
        (Icons.fact_check_outlined, t('detail.customs', lang),
            listing.customsCleared! ? t('common.yes', lang) : t('common.no', lang)),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 3.0,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemCount: specs.length,
      itemBuilder: (_, i) {
        final (icon, label, value) = specs[i];
        if (value == null) return const SizedBox.shrink();
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: c.accentDim,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(icon, size: 18, color: c.accent),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      label,
                      style: TextStyle(color: c.textMuted, fontSize: 10),
                      maxLines: 1,
                    ),
                    Text(
                      value,
                      style: TextStyle(
                        color: c.text,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
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
                  return Hero(
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
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${currentIndex + 1}/${listing.images.length}',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600),
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
    final name = listing.sellerName ?? (lang == 'ru' ? 'Продавец' : 'Фурӯшанда');
    final initials = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: c.accentDim,
                child: Text(
                  initials,
                  style: TextStyle(
                    color: c.accent,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: TextStyle(
                        color: c.text,
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                      ),
                    ),
                    if (listing.isDealerListing) ...[
                      const SizedBox(height: 2),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: c.accentDim,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          t('badges.dealer', lang),
                          style: TextStyle(
                            color: c.accent,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Primary call button — full width, prominent
          _LargeContactBtn(
            label: t('detail.call', lang),
            icon: Icons.phone_rounded,
            color: AppColors.colorSuccess,
            onTap: onCall,
          ),
          const SizedBox(height: 8),
          // Secondary row: WhatsApp + Chat
          Row(
            children: [
              Expanded(
                child: _OutlineContactBtn(
                  label: 'WhatsApp',
                  icon: Icons.chat_rounded,
                  color: AppColors.whatsapp,
                  onTap: onWhatsApp,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _OutlineContactBtn(
                  label: t('chat.openChat', lang),
                  icon: Icons.message_outlined,
                  color: c.accent,
                  onTap: onChat,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LargeContactBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _LargeContactBtn({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        height: 52,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.28),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 20, color: Colors.white),
            const SizedBox(width: 8),
            Text(
              label,
              style: AppTextStyles.bodyLg(
                  color: Colors.white, weight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }
}

class _OutlineContactBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _OutlineContactBtn({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 46,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.5)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: AppTextStyles.bodySm(
                    color: color, weight: FontWeight.w600),
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
        separatorBuilder: (_, __) => const SizedBox(width: 12),
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
                  style: GoogleFontsPrice(c),
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

TextStyle GoogleFontsPrice(AppColors c) {
  // Helper — avoids importing google_fonts directly in this method
  return TextStyle(
    color: c.accent,
    fontSize: 22,
    fontWeight: FontWeight.w900,
    letterSpacing: -0.4,
  );
}
