import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import '../models/listing.dart';
import '../providers/favorites_provider.dart';
import '../providers/language_provider.dart';
import '../theme/app_theme.dart';

BoxShadow get _cardShadow => BoxShadow(
      color: Colors.black.withValues(alpha: 0.08),
      blurRadius: 20,
      spreadRadius: 0,
      offset: const Offset(0, 6),
    );

class CarCard extends StatelessWidget {
  final Listing listing;
  final VoidCallback? onTap;
  final bool compact;
  /// Horizontal layout: image left, info right — used in list views
  final bool horizontal;

  const CarCard({
    super.key,
    required this.listing,
    this.onTap,
    this.compact = false,
    this.horizontal = false,
  });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;

    if (horizontal) {
      return _HorizontalCard(listing: listing, c: c, lang: lang, onTap: onTap);
    }

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: c.card,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [_cardShadow],
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            _VerticalImageSection(listing: listing, colors: c, compact: compact),
            compact
                ? _CompactContent(listing: listing, colors: c, lang: lang)
                : _VerticalContent(listing: listing, colors: c, lang: lang),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HORIZONTAL CARD — professional list card (image left, info right)
// ─────────────────────────────────────────────────────────────────────────────

class _HorizontalCard extends StatelessWidget {
  final Listing listing;
  final AppColors c;
  final String lang;
  final VoidCallback? onTap;

  const _HorizontalCard({
    required this.listing,
    required this.c,
    required this.lang,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final imageUrl = listing.firstImageUrl;
    final isFav = context.watch<FavoritesProvider>().isFavorite(listing.id);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 128,
        decoration: BoxDecoration(
          color: c.card,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [_cardShadow],
        ),
        clipBehavior: Clip.hardEdge,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Image (left) ─────────────────────────────────────────────────
            SizedBox(
              width: 138,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  imageUrl.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: imageUrl,
                          fit: BoxFit.cover,
                          placeholder: (ctx, url) => Shimmer.fromColors(
                            baseColor: c.border,
                            highlightColor: c.surface,
                            child: Container(color: c.card),
                          ),
                          errorWidget: (ctx, url, err) => _NoImage(colors: c),
                        )
                      : _NoImage(colors: c),
                  // Gradient right edge blend
                  Positioned(
                    right: 0,
                    top: 0,
                    bottom: 0,
                    child: Container(
                      width: 24,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.centerLeft,
                          end: Alignment.centerRight,
                          colors: [Colors.transparent, c.card.withValues(alpha: 0.3)],
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
                  // Photo count indicator
                  if (listing.images.length > 1)
                    Positioned(
                      bottom: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.55),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.photo_library_outlined, color: Colors.white, size: 9),
                            const SizedBox(width: 3),
                            Text(
                              '${listing.images.length}',
                              style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // ── Info (right) ─────────────────────────────────────────────────
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 11, 12, 11),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title + fav
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            '${listing.brand} ${listing.model}',
                            style: GoogleFonts.outfit(
                              color: c.text,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              height: 1.2,
                              letterSpacing: -0.2,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 4),
                        _SmallFavBtn(colors: c, listingId: listing.id, isFav: isFav),
                      ],
                    ),

                    const Spacer(),

                    // Price
                    Text(
                      listing.formattedPrice(lang),
                      style: GoogleFonts.outfit(
                        color: c.accent,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.4,
                        height: 1,
                      ),
                    ),

                    const SizedBox(height: 7),

                    // Spec chips
                    _HorizontalChips(listing: listing, colors: c),

                    const SizedBox(height: 7),

                    // City + date
                    Row(
                      children: [
                        Icon(Icons.location_on_outlined, size: 11, color: c.textMuted),
                        const SizedBox(width: 2),
                        Expanded(
                          child: Text(
                            '${listing.city} · ${listing.formattedDate(lang)}',
                            style: GoogleFonts.outfit(
                              color: c.textMuted,
                              fontSize: 11,
                              fontWeight: FontWeight.w400,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SmallFavBtn extends StatelessWidget {
  final AppColors colors;
  final String listingId;
  final bool isFav;

  const _SmallFavBtn({required this.colors, required this.listingId, required this.isFav});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.read<FavoritesProvider>().toggleFavorite(listingId),
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.all(2),
        child: Icon(
          isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
          color: isFav ? colors.accent : colors.textMuted,
          size: 18,
        ),
      ),
    );
  }
}

class _HorizontalChips extends StatelessWidget {
  final Listing listing;
  final AppColors colors;

  const _HorizontalChips({required this.listing, required this.colors});

  @override
  Widget build(BuildContext context) {
    final chips = <String>[];
    chips.add(listing.year.toString());
    if (listing.mileage != null) chips.add(listing.formattedMileage);
    if (listing.transmission != null) chips.add(listing.transmission!);
    if (listing.fuel != null && chips.length < 4) chips.add(listing.fuel!);

    if (chips.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 20,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: chips.length,
        physics: const NeverScrollableScrollPhysics(),
        separatorBuilder: (_, __) => const SizedBox(width: 4),
        itemBuilder: (_, i) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
          decoration: BoxDecoration(
            color: colors.tagBg,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: colors.border, width: 0.5),
          ),
          child: Text(
            chips[i],
            style: GoogleFonts.outfit(
              color: colors.textSecondary,
              fontSize: 10,
              fontWeight: FontWeight.w600,
              height: 1.2,
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VERTICAL CARD — featured / compact (existing style, enhanced)
// ─────────────────────────────────────────────────────────────────────────────

class _VerticalImageSection extends StatelessWidget {
  final Listing listing;
  final AppColors colors;
  final bool compact;

  const _VerticalImageSection({
    required this.listing,
    required this.colors,
    required this.compact,
  });

  @override
  Widget build(BuildContext context) {
    final imageUrl = listing.firstImageUrl;
    final imageHeight = compact ? 130.0 : 210.0;

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
        // Bottom gradient
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: Container(
            height: imageHeight * 0.5,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.transparent, Colors.black54],
              ),
            ),
          ),
        ),
        // Top-left badges
        Positioned(
          top: 10,
          left: 10,
          child: _BadgeRow(listing: listing),
        ),
        // Fav button
        if (!compact)
          Positioned(
            top: 6,
            right: 6,
            child: _FavButton(colors: colors, listingId: listing.id),
          ),
        // Bottom: negotiable + dealer
        if (listing.isNegotiable)
          Positioned(
            bottom: 10,
            left: 10,
            child: _NegotiableBadge(),
          ),
        if (listing.isDealerListing)
          Positioned(
            bottom: 10,
            right: 10,
            child: _DealerBadge(),
          ),
        // Photo count
        if (listing.images.length > 1 && !compact)
          Positioned(
            bottom: 10,
            right: listing.isDealerListing ? 70 : 10,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.55),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.photo_library_outlined, color: Colors.white, size: 11),
                  const SizedBox(width: 4),
                  Text(
                    '${listing.images.length}',
                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
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
        child: Icon(Icons.directions_car_outlined, size: 36, color: colors.textMuted),
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
        width: 38,
        height: 38,
        margin: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.92),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.15),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Icon(
          isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
          color: isFav ? const Color(0xFFEF4444) : Colors.black54,
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
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.colorSuccess,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Text(
        'Торг',
        style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _DealerBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: const [
          Icon(Icons.store_rounded, size: 11, color: Colors.white),
          SizedBox(width: 4),
          Text('Дилер', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
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
        gradient: LinearGradient(colors: [Color(0xFFD4AF37), Color(0xFFC83808)]),
      ));
    }
    if (listing.listingType == 'rent') badges.add(const _Badge(label: 'Аренда', color: Color(0xFF2563EB)));
    if (listing.listingType == 'installment' || listing.installmentAvailable) {
      badges.add(const _Badge(label: 'Рассрочка', color: Color(0xFFC83808)));
    }
    if (listing.availability == 'on_order') badges.add(const _Badge(label: 'На заказ', color: Color(0xFFF59E0B)));
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
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: gradient == null ? color : null,
        gradient: gradient,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertical content section
// ─────────────────────────────────────────────────────────────────────────────

class _VerticalContent extends StatelessWidget {
  final Listing listing;
  final AppColors colors;
  final String lang;

  const _VerticalContent({required this.listing, required this.colors, required this.lang});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title
          Text(
            '${listing.brand} ${listing.model}',
            style: GoogleFonts.outfit(
              color: colors.text,
              fontSize: 17,
              fontWeight: FontWeight.w700,
              height: 1.2,
              letterSpacing: -0.3,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),

          // Spec chips
          if (_hasChips) ...[
            _ChipRow(listing: listing, colors: colors),
            const SizedBox(height: 10),
          ],

          // Price
          Text(
            listing.formattedPrice(lang),
            style: GoogleFonts.outfit(
              color: colors.accent,
              fontSize: 22,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
              height: 1,
            ),
          ),
          const SizedBox(height: 10),

          // City + date
          Row(
            children: [
              Icon(Icons.location_on_outlined, size: 12, color: colors.textMuted),
              const SizedBox(width: 3),
              Expanded(
                child: Text(
                  listing.city,
                  style: GoogleFonts.outfit(color: colors.textMuted, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                width: 3, height: 3,
                margin: const EdgeInsets.symmetric(horizontal: 6),
                decoration: BoxDecoration(color: colors.textMuted, shape: BoxShape.circle),
              ),
              Text(
                listing.formattedDate(lang),
                style: GoogleFonts.outfit(color: colors.textMuted, fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }

  bool get _hasChips =>
      listing.transmission != null || listing.fuel != null || listing.mileage != null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact content (grid mode)
// ─────────────────────────────────────────────────────────────────────────────

class _CompactContent extends StatelessWidget {
  final Listing listing;
  final AppColors colors;
  final String lang;

  const _CompactContent({required this.listing, required this.colors, required this.lang});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(11, 9, 11, 11),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${listing.brand} ${listing.model}',
            style: GoogleFonts.outfit(color: colors.text, fontSize: 13, fontWeight: FontWeight.w700),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            listing.formattedPrice(lang),
            style: GoogleFonts.outfit(color: colors.accent, fontSize: 15, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chip row (vertical card)
// ─────────────────────────────────────────────────────────────────────────────

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
        _SpecChip(label: listing.year.toString(), colors: colors),
        if (listing.mileage != null) _SpecChip(label: listing.formattedMileage, colors: colors),
        if (listing.transmission != null) _SpecChip(label: listing.transmission!, colors: colors),
        if (listing.fuel != null) _SpecChip(label: listing.fuel!, colors: colors),
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
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: colors.tagBg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: colors.border, width: 0.5),
      ),
      child: Text(
        label,
        style: GoogleFonts.outfit(
          color: colors.textSecondary,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shimmer skeleton
// ─────────────────────────────────────────────────────────────────────────────

class CarCardShimmer extends StatelessWidget {
  final bool horizontal;
  const CarCardShimmer({super.key, this.horizontal = false});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    if (horizontal) {
      return Shimmer.fromColors(
        baseColor: c.border,
        highlightColor: c.surface,
        child: Container(
          height: 128,
          decoration: BoxDecoration(
            color: c.card,
            borderRadius: BorderRadius.circular(18),
          ),
          clipBehavior: Clip.hardEdge,
          child: Row(
            children: [
              Container(width: 138, color: Colors.white),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(height: 15, width: 120, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                      const Spacer(),
                      Container(height: 18, width: 90, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                      const SizedBox(height: 8),
                      Container(height: 12, width: 160, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                      const SizedBox(height: 8),
                      Container(height: 11, width: 100, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }
    return Shimmer.fromColors(
      baseColor: c.border,
      highlightColor: c.surface,
      child: Container(
        decoration: BoxDecoration(color: c.card, borderRadius: BorderRadius.circular(18)),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(height: 210, color: c.card),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(height: 17, width: 160, color: Colors.white),
                  const SizedBox(height: 10),
                  Container(height: 12, width: 130, color: Colors.white),
                  const SizedBox(height: 10),
                  Container(height: 22, width: 100, color: Colors.white),
                  const SizedBox(height: 10),
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
