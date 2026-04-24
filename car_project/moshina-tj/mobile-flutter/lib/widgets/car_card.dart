import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import '../models/listing.dart';
import '../providers/language_provider.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';

class CarCard extends StatelessWidget {
  final Listing listing;
  final VoidCallback? onTap;

  const CarCard({super.key, required this.listing, this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: c.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: c.border, width: 1),
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            _ImageSection(listing: listing, colors: c),
            _ContentSection(listing: listing, colors: c, lang: lang),
          ],
        ),
      ),
    );
  }
}

class _ImageSection extends StatelessWidget {
  final Listing listing;
  final AppColors colors;

  const _ImageSection({required this.listing, required this.colors});

  @override
  Widget build(BuildContext context) {
    final imageUrl = listing.firstImageUrl;

    return Stack(
      children: [
        // 16:9 image
        AspectRatio(
          aspectRatio: 16 / 9,
          child: imageUrl.isNotEmpty
              ? CachedNetworkImage(
                  imageUrl: imageUrl,
                  fit: BoxFit.cover,
                  placeholder: (ctx, url) => Shimmer.fromColors(
                    baseColor: colors.border,
                    highlightColor: colors.surface,
                    child: Container(color: colors.card),
                  ),
                  errorWidget: (ctx, url, err) => _NoImage(colors: colors),
                )
              : _NoImage(colors: colors),
        ),
        // Top-left badges
        Positioned(
          top: 8,
          left: 8,
          child: _BadgeRow(listing: listing),
        ),
        // Dealer badge bottom-left
        if (listing.isDealerListing)
          Positioned(
            bottom: 8,
            left: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.7),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.store, size: 10, color: Colors.white),
                  const SizedBox(width: 3),
                  Text(
                    'Дилер',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _NoImage extends StatelessWidget {
  final AppColors colors;
  const _NoImage({required this.colors});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: colors.border,
      child: Center(
        child: Icon(Icons.directions_car_outlined,
            size: 40, color: colors.textMuted),
      ),
    );
  }
}

class _BadgeRow extends StatelessWidget {
  final Listing listing;
  const _BadgeRow({required this.listing});

  @override
  Widget build(BuildContext context) {
    final badges = <Widget>[];

    if (listing.isFeatured) {
      badges.add(_Badge(
        label: 'Топ',
        gradient: const LinearGradient(
          colors: [Color(0xFFD4AF37), Color(0xFFC83808)],
        ),
      ));
    }
    if (listing.listingType == 'rent') {
      badges.add(_Badge(
        label: 'Аренда',
        color: const Color(0xFF2563EB),
      ));
    }
    if (listing.listingType == 'installment' ||
        listing.installmentAvailable) {
      badges.add(_Badge(
        label: 'Рассрочка',
        color: const Color(0xFFC83808),
      ));
    }
    if (listing.availability == 'on_order') {
      badges.add(_Badge(
        label: 'На заказ',
        color: const Color(0xFFF59E0B),
      ));
    }

    if (badges.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: 4,
      runSpacing: 4,
      children: badges,
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color? color;
  final Gradient? gradient;

  const _Badge({required this.label, this.color, this.gradient});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: gradient == null ? color : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _ContentSection extends StatelessWidget {
  final Listing listing;
  final AppColors colors;
  final String lang;

  const _ContentSection({
    required this.listing,
    required this.colors,
    required this.lang,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Brand · Model · Year row
          Row(
            children: [
              Icon(Icons.directions_car,
                  size: 14, color: colors.textSecondary),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  '${listing.brand} ${listing.model}',
                  style: TextStyle(
                    color: colors.textSecondary,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                '· ${listing.year}',
                style: TextStyle(
                  color: colors.textMuted,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          // Price row
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                listing.formattedPrice(lang),
                style: TextStyle(
                  color: colors.accent,
                  fontSize: 19,
                  fontWeight: FontWeight.w900,
                ),
              ),
              if (listing.isNegotiable) ...[
                const SizedBox(width: 6),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.colorSuccess.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    t('common.negotiable', lang),
                    style: TextStyle(
                      color: AppColors.colorSuccess,
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 8),
          // Spec chips
          if (_hasSpecs)
            Wrap(
              spacing: 4,
              runSpacing: 4,
              children: _buildSpecChips(colors),
            ),
          const SizedBox(height: 8),
          // Bottom row: city | date
          Row(
            children: [
              Icon(Icons.location_on_outlined, size: 12, color: colors.textMuted),
              const SizedBox(width: 2),
              Expanded(
                child: Text(
                  listing.city,
                  style: TextStyle(color: colors.textMuted, fontSize: 11),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                listing.formattedDate(lang),
                style: TextStyle(color: colors.textMuted, fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }

  bool get _hasSpecs =>
      listing.transmission != null ||
      listing.fuel != null ||
      listing.mileage != null;

  List<Widget> _buildSpecChips(AppColors c) {
    final chips = <Widget>[];
    if (listing.transmission != null) {
      chips.add(_SpecChip(label: listing.transmission!, colors: c));
    }
    if (listing.fuel != null) {
      chips.add(_SpecChip(label: listing.fuel!, colors: c));
    }
    if (listing.mileage != null) {
      chips.add(_SpecChip(label: listing.formattedMileage, colors: c));
    }
    return chips;
  }
}

class _SpecChip extends StatelessWidget {
  final String label;
  final AppColors colors;

  const _SpecChip({required this.label, required this.colors});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: colors.tagBg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: colors.textSecondary,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class CarCardShimmer extends StatelessWidget {
  const CarCardShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Shimmer.fromColors(
      baseColor: c.border,
      highlightColor: c.surface,
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
              child: Container(color: c.card),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                      height: 13, width: 140, color: Colors.white),
                  const SizedBox(height: 8),
                  Container(height: 19, width: 100, color: Colors.white),
                  const SizedBox(height: 10),
                  Container(height: 11, width: 160, color: Colors.white),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
