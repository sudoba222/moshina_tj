import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/listing.dart';
import '../providers/listing_provider.dart';
import '../providers/language_provider.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';

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

  @override
  void initState() {
    super.initState();
    _loadListing();
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
          if (listing == null) _error = 'Объявление не найдено';
        });
        if (listing != null) {
          final related = await provider.getRelatedListings(widget.listingId);
          if (mounted) setState(() => _related = related);
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'Ошибка загрузки';
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
              Icon(Icons.error_outline, size: 48, color: c.textMuted),
              const SizedBox(height: 12),
              Text(
                _error ?? t('error.loading', lang),
                style: TextStyle(color: c.textSecondary),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: _loadListing,
                child: Text(
                  t('error.retry', lang),
                  style: TextStyle(color: c.accent),
                ),
              ),
            ],
          ),
        ),
      );
    }

    final listing = _listing!;

    return Scaffold(
      backgroundColor: c.bg,
      extendBodyBehindAppBar: false,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 280,
            backgroundColor: c.surface,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: _buildGallery(listing, c),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildTitleRow(listing, c, lang),
                  const SizedBox(height: 6),
                  _buildPrice(listing, c, lang),
                  const SizedBox(height: 16),
                  _buildSpecsGrid(listing, c, lang),
                  if (listing.description != null &&
                      listing.description!.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    _buildSectionTitle(t('detail.description', lang), c),
                    const SizedBox(height: 8),
                    _buildDescription(listing, c),
                  ],
                  const SizedBox(height: 20),
                  _buildSectionTitle(t('detail.seller', lang), c),
                  const SizedBox(height: 8),
                  _buildSellerCard(listing, c),
                  const SizedBox(height: 24),
                  // Action buttons (sticky bottom bar feel)
                  _buildActionButtons(context, c, lang),
                  if (_related.isNotEmpty) ...[
                    const SizedBox(height: 28),
                    _buildSectionTitle(t('detail.related', lang), c),
                    const SizedBox(height: 12),
                    _buildRelated(context, c, lang),
                  ],
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGallery(Listing listing, AppColors c) {
    if (listing.images.isEmpty) {
      return Container(
        color: c.border,
        child: Center(
          child: Icon(Icons.directions_car_outlined, size: 80, color: c.textMuted),
        ),
      );
    }

    return Stack(
      children: [
        PageView.builder(
          itemCount: listing.images.length,
          onPageChanged: (i) => setState(() => _currentImageIndex = i),
          itemBuilder: (_, i) {
            return CachedNetworkImage(
              imageUrl: listing.images[i].url,
              fit: BoxFit.cover,
              placeholder: (ctx, url) => Container(color: c.border),
              errorWidget: (ctx, url, err) => Container(
                color: c.border,
                child: Center(
                  child: Icon(Icons.directions_car_outlined,
                      size: 80, color: c.textMuted),
                ),
              ),
            );
          },
        ),
        if (listing.images.length > 1)
          Positioned(
            bottom: 12,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                listing.images.length,
                (i) => Container(
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: i == _currentImageIndex ? 20 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: i == _currentImageIndex
                        ? Colors.white
                        : Colors.white.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),
          ),
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
              '${_currentImageIndex + 1}/${listing.images.length}',
              style: const TextStyle(color: Colors.white, fontSize: 12),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTitleRow(Listing listing, AppColors c, String lang) {
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

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(
            '${listing.brand} ${listing.model} ${listing.year}',
            style: TextStyle(
              color: c.text,
              fontWeight: FontWeight.w700,
              fontSize: 22,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
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
    );
  }

  Widget _buildPrice(Listing listing, AppColors c, String lang) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          listing.formattedPrice(lang),
          style: TextStyle(
            color: c.accent,
            fontWeight: FontWeight.w900,
            fontSize: 28,
          ),
        ),
        if (listing.isNegotiable) ...[
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
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
    );
  }

  Widget _buildSectionTitle(String title, AppColors c) {
    return Text(
      title,
      style: TextStyle(
        color: c.text,
        fontWeight: FontWeight.w700,
        fontSize: 17,
      ),
    );
  }

  Widget _buildSpecsGrid(Listing listing, AppColors c, String lang) {
    final specs = <(IconData, String, String?)>[
      (Icons.calendar_today_outlined, t('detail.year', lang), listing.year.toString()),
      if (listing.mileage != null)
        (Icons.speed_outlined, t('detail.mileage', lang), listing.formattedMileage),
      if (listing.fuel != null)
        (Icons.local_gas_station_outlined, t('detail.fuel', lang), listing.fuel),
      if (listing.transmission != null)
        (Icons.settings_outlined, t('detail.transmission', lang), listing.transmission),
      if (listing.engineVolume != null)
        (Icons.engineering_outlined, t('detail.engine', lang),
            '${listing.engineVolume} л'),
      if (listing.driveType != null)
        (Icons.four_k_plus_outlined, t('detail.drive', lang), listing.driveType),
      if (listing.bodyType != null)
        (Icons.directions_car_outlined, t('detail.body', lang), listing.bodyType),
      if (listing.color != null)
        (Icons.palette_outlined, t('detail.color', lang), listing.color),
      (Icons.location_on_outlined, t('detail.city', lang), listing.city),
      if (listing.customsCleared != null)
        (
          Icons.fact_check_outlined,
          t('detail.customs', lang),
          listing.customsCleared! ? 'Да' : 'Нет'
        ),
    ];

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.border),
      ),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 3.2,
        ),
        itemCount: specs.length,
        itemBuilder: (_, i) {
          final (icon, label, value) = specs[i];
          if (value == null) return const SizedBox.shrink();
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            child: Row(
              children: [
                Icon(icon, size: 16, color: c.textMuted),
                const SizedBox(width: 6),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        label,
                        style: TextStyle(
                            color: c.textMuted, fontSize: 10),
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
      ),
    );
  }

  Widget _buildDescription(Listing listing, AppColors c) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.border),
      ),
      child: Text(
        listing.description!,
        style: TextStyle(
          color: c.textSecondary,
          fontSize: 14,
          height: 1.6,
        ),
      ),
    );
  }

  Widget _buildSellerCard(Listing listing, AppColors c) {
    final name = listing.sellerName ?? 'Продавец';
    final phone = listing.sellerPhone ?? '';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: c.accent.withValues(alpha: 0.1),
            child: Icon(Icons.person_outline, color: c.accent, size: 24),
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
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
                if (phone.isNotEmpty)
                  Text(
                    phone,
                    style: TextStyle(color: c.textSecondary, fontSize: 13),
                  ),
              ],
            ),
          ),
          if (listing.isDealerListing)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: c.accentDim,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                t('badges.dealer', ''),
                style: TextStyle(
                  color: c.accent,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, AppColors c, String lang) {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: _callSeller,
            icon: const Icon(Icons.phone_outlined, size: 18),
            label: Text(t('detail.call', lang)),
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(0, 52),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: _whatsappSeller,
            icon: const Icon(Icons.chat_outlined, size: 18),
            label: Text(t('detail.whatsapp', lang)),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.whatsapp,
              side: const BorderSide(color: AppColors.whatsapp),
              minimumSize: const Size(0, 52),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRelated(BuildContext context, AppColors c, String lang) {
    return SizedBox(
      height: 270,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _related.length,
        separatorBuilder: (_, index) => const SizedBox(width: 12),
        itemBuilder: (ctx, i) {
          final item = _related[i];
          return GestureDetector(
            onTap: () => ctx.push('/car/${item.id}'),
            child: SizedBox(
              width: 240,
              child: Container(
                decoration: BoxDecoration(
                  color: c.card,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: c.border),
                ),
                clipBehavior: Clip.hardEdge,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AspectRatio(
                      aspectRatio: 16 / 9,
                      child: item.firstImageUrl.isNotEmpty
                          ? CachedNetworkImage(
                              imageUrl: item.firstImageUrl,
                              fit: BoxFit.cover,
                              placeholder: (ctx2, url) =>
                                  Container(color: c.border),
                              errorWidget: (ctx2, url, err) =>
                                  Container(color: c.border),
                            )
                          : Container(color: c.border),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${item.brand} ${item.model} ${item.year}',
                            style: TextStyle(
                                color: c.text,
                                fontWeight: FontWeight.w600,
                                fontSize: 13),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            item.formattedPrice(lang),
                            style: TextStyle(
                              color: c.accent,
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
