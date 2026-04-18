import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/listing.dart';
import '../providers/listing_provider.dart';
import '../providers/language_provider.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';

class CarDetailScreen extends StatefulWidget {
  final int listingId;

  const CarDetailScreen({super.key, required this.listingId});

  @override
  State<CarDetailScreen> createState() => _CarDetailScreenState();
}

class _CarDetailScreenState extends State<CarDetailScreen> {
  Listing? _listing;
  bool _loading = true;
  String? _error;
  int _currentImageIndex = 0;

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
      final listing = await context
          .read<ListingProvider>()
          .getListingById(widget.listingId);
      if (mounted) {
        setState(() {
          _listing = listing;
          _loading = false;
          if (listing == null) _error = 'Объявление не найдено';
        });
      }
    } catch (e) {
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
    if (await canLaunchUrl(uri)) launchUrl(uri);
  }

  Future<void> _whatsappSeller() async {
    final phone = _listing?.sellerPhone;
    if (phone == null) return;
    final cleaned = phone.replaceAll(RegExp(r'[^\d]'), '');
    final uri = Uri.parse('https://wa.me/$cleaned');
    if (await canLaunchUrl(uri)) launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final lang = context.watch<LanguageProvider>().lang;

    if (_loading) {
      return Scaffold(
        backgroundColor: colors.bg,
        appBar: AppBar(),
        body: Center(child: CircularProgressIndicator(color: colors.accent)),
      );
    }

    if (_error != null || _listing == null) {
      return Scaffold(
        backgroundColor: colors.bg,
        appBar: AppBar(),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 48, color: colors.textMuted),
              const SizedBox(height: 12),
              Text(_error ?? t('error_loading', lang),
                  style: TextStyle(color: colors.textSecondary)),
              const SizedBox(height: 12),
              TextButton(
                onPressed: _loadListing,
                child: Text(t('retry', lang),
                    style: TextStyle(color: colors.accent)),
              ),
            ],
          ),
        ),
      );
    }

    final listing = _listing!;

    return Scaffold(
      backgroundColor: colors.bg,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 280,
            backgroundColor: colors.surface,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              background: _buildGallery(listing, colors),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildTitleRow(listing, colors, lang),
                  const SizedBox(height: 8),
                  _buildPrice(listing, colors),
                  const SizedBox(height: 16),
                  _buildSpecs(listing, colors, lang),
                  if (listing.description != null &&
                      listing.description!.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _buildDescription(listing, colors, lang),
                  ],
                  const SizedBox(height: 16),
                  _buildSellerCard(listing, colors, lang),
                  const SizedBox(height: 20),
                  _buildActionButtons(context, colors, lang),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGallery(Listing listing, AppColorExtension colors) {
    if (listing.images.isEmpty) {
      return Container(
        color: colors.border,
        child: Center(
          child: Icon(Icons.directions_car_outlined,
              size: 80, color: colors.textMuted),
        ),
      );
    }

    return Stack(
      children: [
        PageView.builder(
          itemCount: listing.images.length,
          onPageChanged: (i) => setState(() => _currentImageIndex = i),
          itemBuilder: (ctx, i) {
            return CachedNetworkImage(
              imageUrl: listing.images[i].url,
              fit: BoxFit.cover,
              placeholder: (_, __) => Container(color: colors.border),
              errorWidget: (_, __, ___) => Container(
                color: colors.border,
                child: Center(
                  child: Icon(Icons.directions_car_outlined,
                      size: 80, color: colors.textMuted),
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

  Widget _buildTitleRow(
      Listing listing, AppColorExtension colors, String lang) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(
            '${listing.brand} ${listing.model} ${listing.year}',
            style: TextStyle(
              color: colors.text,
              fontWeight: FontWeight.w700,
              fontSize: 22,
            ),
          ),
        ),
        const SizedBox(width: 8),
        _buildTypeBadge(listing, colors, lang),
      ],
    );
  }

  Widget _buildTypeBadge(
      Listing listing, AppColorExtension colors, String lang) {
    Color color;
    String label;
    switch (listing.listingType) {
      case 'rent':
        color = AppColors.rentBlue;
        label = t('rent', lang);
      case 'installment':
        color = AppColors.installmentOrange;
        label = t('installment', lang);
      default:
        color = colors.accent;
        label = t('sale', lang);
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(label,
          style: TextStyle(
              color: color, fontWeight: FontWeight.w600, fontSize: 13)),
    );
  }

  Widget _buildPrice(Listing listing, AppColorExtension colors) {
    return Text(
      listing.formattedPrice,
      style: TextStyle(
        color: colors.accent,
        fontWeight: FontWeight.w800,
        fontSize: 26,
      ),
    );
  }

  Widget _buildSpecs(
      Listing listing, AppColorExtension colors, String lang) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        children: [
          _SpecRow(
            icon: Icons.calendar_today_outlined,
            label: t('year', lang),
            value: listing.year.toString(),
            colors: colors,
          ),
          if (listing.mileage != null) ...[
            Divider(color: colors.border, height: 16),
            _SpecRow(
              icon: Icons.speed_outlined,
              label: t('mileage', lang),
              value: '${listing.formattedMileage} ${t('km', lang)}',
              colors: colors,
            ),
          ],
          Divider(color: colors.border, height: 16),
          _SpecRow(
            icon: Icons.location_on_outlined,
            label: t('city', lang),
            value: listing.city,
            colors: colors,
          ),
        ],
      ),
    );
  }

  Widget _buildDescription(
      Listing listing, AppColorExtension colors, String lang) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          t('description', lang),
          style: TextStyle(
            color: colors.text,
            fontWeight: FontWeight.w700,
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: colors.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: colors.border),
          ),
          child: Text(
            listing.description!,
            style: TextStyle(
              color: colors.textSecondary,
              fontSize: 14,
              height: 1.6,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSellerCard(
      Listing listing, AppColorExtension colors, String lang) {
    final name = listing.sellerName ?? 'Продавец';
    final phone = listing.sellerPhone ?? '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          t('seller', lang),
          style: TextStyle(
            color: colors.text,
            fontWeight: FontWeight.w700,
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: colors.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: colors.border),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: colors.accent.withValues(alpha: 0.1),
                child: Icon(Icons.person_outline,
                    color: colors.accent, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        style: TextStyle(
                            color: colors.text,
                            fontWeight: FontWeight.w600,
                            fontSize: 15)),
                    if (phone.isNotEmpty)
                      Text(phone,
                          style: TextStyle(
                              color: colors.textSecondary, fontSize: 13)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons(
      BuildContext context, AppColorExtension colors, String lang) {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: _callSeller,
            icon: const Icon(Icons.phone_outlined, size: 18),
            label: Text(t('call', lang)),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: _whatsappSeller,
            icon: const Icon(Icons.chat_outlined, size: 18),
            label: Text(t('whatsapp', lang)),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF25D366),
              side: const BorderSide(color: Color(0xFF25D366)),
              minimumSize: const Size(0, 48),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ),
      ],
    );
  }
}

class _SpecRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final AppColorExtension colors;

  const _SpecRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.colors,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: colors.textMuted),
        const SizedBox(width: 8),
        Text(label,
            style: TextStyle(color: colors.textSecondary, fontSize: 14)),
        const Spacer(),
        Text(value,
            style: TextStyle(
                color: colors.text,
                fontWeight: FontWeight.w600,
                fontSize: 14)),
      ],
    );
  }
}
