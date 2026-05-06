import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import '../models/listing.dart';
import '../providers/favorites_provider.dart';
import '../providers/language_provider.dart';
import '../theme/app_theme.dart';

// Standard card shadow used across the app
BoxShadow get _cardShadow => BoxShadow(
      color: Colors.black.withValues(alpha: 0.07),
      blurRadius: 16,
      offset: const Offset(0, 6),
    );

class CarCard extends StatelessWidget {
  final Listing listing;
  final VoidCallback? onTap;
  /// When true renders a compact 2-col grid variant (image-only top, minimal info bottom).
  final bool compact;

  const CarCard({
    super.key,
    required this.listing,
    this.onTap,
    this.compact = false,
  });

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
          boxShadow: [_cardShadow],
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            _ImageSection(listing: listing, colors: c, compact: compact),
            compact
                ? _CompactContent(listing: listing, colors: c, lang: lang)
                : _ContentSection(listing: listing, colors: c, lang: lang),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Image section
// ---------------------------------------------------------------------------

class _ImageSection extends StatelessWidget {
  final Listing listing;
  final AppColors colors;
  final bool compact;

  const _ImageSection({
    required this.listing,
    required this.colors,
    required this.compact,
  });

  @override
  Widget build(BuildContext context) {
    final imageUrl = listing.firstImageUrl;
    final imageHeight = compact ? 120.0 : 200.0;

    return Stack(
      children: [
        SizedBox(
          height: imageHeight,
          width: double.infinity,
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
        // Gradient overlay (bottom of image, for badge legibility)
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Container(
            height: imageHeight * 0.45,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.transparent, Colors.black45],
              ),
            ),
          ),
        ),
        // Top-left badges
        Positioned(
          top: 8,
          left: 8,
          child: _BadgeRow(listing: listing),
        ),
        // Top-right: favourite button
        if (!compact)
          Positioned(
            top: 4,
            right: 4,
            child: _FavButton(colors: colors, listingId: listing.id),
          ),
        // Bottom-left: negotiable badge
        if (listing.isNegotiable)
          Positioned(
            bottom: 8,
            left: 8,
            child: _NegotiableBadge(),
          ),
        // Bottom-right: dealer badge
        if (listing.isDealerListing)
          Positioned(
            bottom: 8,
            right: 8,
            child: _DealerBadge(),
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
    return ColoredBox(
      color: colors.border,
      child: Center(
        child: Icon(Icons.directions_car_outlined,
            size: 40, color: colors.textMuted),
      ),
    );
  }
}

class _FavButton extends StatelessWidget {
  final AppColors colors;
  final String listingId;

  const _FavButton({required this.colors, required this.listingId});

  @override
  Widget build(BuildContext context) {
    final isFav = context.watch<FavoritesProvider>().isFavorite(listingId);
    return GestureDetector(
      onTap: () => context.read<FavoritesProvider>().toggleFavorite(listingId),
      child: Container(
        width: 36,
        height: 36,
        margin: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.9),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Icon(
          isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
          color: isFav ? Colors.redAccent : Colors.black54,
          size: 18,
        ),
      ),
    );
  }
}

class _NegotiableBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.colorSuccess,
        borderRadius: BorderRadius.circular(6),
      ),
      child: const Text(
        'Торг',
        style: TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _DealerBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: const [
          Icon(Icons.store_rounded, size: 10, color: Colors.white),
          SizedBox(width: 3),
          Text(
            'Дилер',
            style: TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
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
      badges.add(const _Badge(
        label: 'Топ',
        gradient: LinearGradient(
          colors: [Color(0xFFD4AF37), Color(0xFFC83808)],
        ),
      ));
    }
    if (listing.listingType == 'rent') {
      badges.add(const _Badge(label: 'Аренда', color: Color(0xFF2563EB)));
    }
    if (listing.listingType == 'installment' || listing.installmentAvailable) {
      badges.add(const _Badge(label: 'Рассрочка', color: Color(0xFFC83808)));
    }
    if (listing.availability == 'on_order') {
      badges.add(const _Badge(label: 'На заказ', color: Color(0xFFF59E0B)));
    }

    if (badges.isEmpty) return const SizedBox.shrink();

    return Wrap(spacing: 4, runSpacing: 4, children: badges);
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

// ---------------------------------------------------------------------------
// Full-size content section
// ---------------------------------------------------------------------------

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
          // Title: brand + model
          Text(
            '${listing.brand} ${listing.model}',
            style: TextStyle(
              color: colors.text,
              fontSize: 16,
              fontWeight: FontWeight.w700,
              height: 1.2,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 6),
          // Year + mileage chips
          if (_hasChips) ...[
            _ChipRow(listing: listing, colors: colors),
            const SizedBox(height: 8),
          ],
          // Price row
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                listing.formattedPrice(lang),
                style: TextStyle(
                  color: colors.accent,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Bottom row: city · date
          Row(
            children: [
              Icon(Icons.location_on_outlined,
                  size: 12, color: colors.textMuted),
              const SizedBox(width: 2),
              Expanded(
                child: Text(
                  listing.city,
                  style: TextStyle(color: colors.textMuted, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                width: 3,
                height: 3,
                margin: const EdgeInsets.symmetric(horizontal: 5),
                decoration: BoxDecoration(
                  color: colors.textMuted,
                  shape: BoxShape.circle,
                ),
              ),
              Text(
                listing.formattedDate(lang),
                style: TextStyle(color: colors.textMuted, fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }

  bool get _hasChips =>
      listing.transmission != null ||
      listing.fuel != null ||
      listing.mileage != null;
}

// ---------------------------------------------------------------------------
// Compact content section (grid mode)
// ---------------------------------------------------------------------------

class _CompactContent extends StatelessWidget {
  final Listing listing;
  final AppColors colors;
  final String lang;

  const _CompactContent({
    required this.listing,
    required this.colors,
    required this.lang,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${listing.brand} ${listing.model}',
            style: TextStyle(
              color: colors.text,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            listing.formattedPrice(lang),
            style: TextStyle(
              color: colors.accent,
              fontSize: 15,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Year + mileage chip row
// ---------------------------------------------------------------------------

class _ChipRow extends StatelessWidget {
  final Listing listing;
  final AppColors colors;

  const _ChipRow({required this.listing, required this.colors});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 5,
      runSpacing: 4,
      children: [
        _SpecChip(
          label: listing.year.toString(),
          colors: colors,
        ),
        if (listing.mileage != null)
          _SpecChip(label: listing.formattedMileage, colors: colors),
        if (listing.transmission != null)
          _SpecChip(label: listing.transmission!, colors: colors),
        if (listing.fuel != null)
          _SpecChip(label: listing.fuel!, colors: colors),
      ],
    );
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
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: colors.border, width: 0.5),
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

// ---------------------------------------------------------------------------
// Shimmer skeleton
// ---------------------------------------------------------------------------

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
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(height: 200, color: c.card),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(height: 16, width: 160, color: Colors.white),
                  const SizedBox(height: 8),
                  Container(height: 11, width: 120, color: Colors.white),
                  const SizedBox(height: 8),
                  Container(height: 20, width: 90, color: Colors.white),
                  const SizedBox(height: 8),
                  Container(height: 12, width: 180, color: Colors.white),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
