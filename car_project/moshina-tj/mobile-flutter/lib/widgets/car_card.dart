import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import '../models/listing.dart';
import '../providers/favorites_provider.dart';
import '../providers/language_provider.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';

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
// HORIZONTAL CARD — full-width marketplace style (Avito/OLX)
// Square photo left (swipeable), info right, flat with bottom divider
// ─────────────────────────────────────────────────────────────────────────────

class _HorizontalCard extends StatefulWidget {
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
  State<_HorizontalCard> createState() => _HorizontalCardState();
}

class _HorizontalCardState extends State<_HorizontalCard> {
  int _photoIdx = 0;
  PageController? _pageCtrl;

  @override
  void initState() {
    super.initState();
    if (widget.listing.images.length > 1) {
      _pageCtrl = PageController();
    }
  }

  @override
  void dispose() {
    _pageCtrl?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isFav = context.watch<FavoritesProvider>().isFavorite(widget.listing.id);
    const double imgSize = 130;
    final images = widget.listing.images;
    final hasMany = images.length > 1;

    return GestureDetector(
      onTap: widget.onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        color: widget.c.card,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Square photo (swipeable) ──────────────────────────────
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(
                      width: imgSize,
                      height: imgSize,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          // Photo view — PageView when multiple images
                          images.isEmpty
                              ? _NoImage(colors: widget.c)
                              : hasMany
                                  ? PageView.builder(
                                      controller: _pageCtrl,
                                      onPageChanged: (i) =>
                                          setState(() => _photoIdx = i),
                                      itemCount: images.length,
                                      itemBuilder: (_, i) => CachedNetworkImage(
                                        imageUrl: images[i].url,
                                        fit: BoxFit.cover,
                                        placeholder: (ctx, url) =>
                                            Shimmer.fromColors(
                                          baseColor: widget.c.border,
                                          highlightColor: widget.c.surface,
                                          child: Container(color: widget.c.card),
                                        ),
                                        errorWidget: (ctx, url, err) =>
                                            _NoImage(colors: widget.c),
                                      ),
                                    )
                                  : CachedNetworkImage(
                                      imageUrl: images[0].url,
                                      fit: BoxFit.cover,
                                      placeholder: (ctx, url) =>
                                          Shimmer.fromColors(
                                        baseColor: widget.c.border,
                                        highlightColor: widget.c.surface,
                                        child: Container(color: widget.c.card),
                                      ),
                                      errorWidget: (ctx, url, err) =>
                                          _NoImage(colors: widget.c),
                                    ),
                          // Badges
                          if (_hasBadge)
                            Positioned(
                              top: 5,
                              left: 5,
                              child: _BadgeRow(listing: widget.listing),
                            ),
                          // Photo counter (x/total)
                          if (hasMany)
                            Positioned(
                              bottom: 5,
                              right: 5,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 5, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.60),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  '${_photoIdx + 1}/${images.length}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // ── Info ─────────────────────────────────────────────────
                  Expanded(
                    child: SizedBox(
                      height: imgSize,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Title row + fav
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  '${widget.listing.brand} ${widget.listing.model}',
                                  style: GoogleFonts.outfit(
                                    color: widget.c.text,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    height: 1.2,
                                    letterSpacing: -0.3,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 4),
                              GestureDetector(
                                onTap: () => context
                                    .read<FavoritesProvider>()
                                    .toggleFavorite(widget.listing.id),
                                behavior: HitTestBehavior.opaque,
                                child: Padding(
                                  padding: const EdgeInsets.all(3),
                                  child: Icon(
                                    isFav
                                        ? Icons.favorite_rounded
                                        : Icons.favorite_border_rounded,
                                    color: isFav
                                        ? widget.c.accent
                                        : widget.c.textMuted,
                                    size: 20,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          // Year · km · fuel
                          Text(
                            [
                              widget.listing.year.toString(),
                              if (widget.listing.mileage != null)
                                widget.listing.formattedMileage,
                              if (widget.listing.fuel != null)
                                widget.listing.fuel!,
                              if (widget.listing.transmission != null)
                                widget.listing.transmission!,
                            ].join(' · '),
                            style: GoogleFonts.outfit(
                              color: widget.c.textMuted,
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const Spacer(),
                          // Price
                          Text(
                            widget.listing.formattedPrice(widget.lang),
                            style: GoogleFonts.outfit(
                              color: widget.c.accent,
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.5,
                              height: 1,
                            ),
                          ),
                          if (widget.listing.isNegotiable) ...[
                            const SizedBox(height: 3),
                            Text(
                              t('common.negotiable', widget.lang),
                              style: GoogleFonts.outfit(
                                color: const Color(0xFF888888),
                                fontSize: 11,
                                fontWeight: FontWeight.w400,
                              ),
                            ),
                          ],
                          const SizedBox(height: 6),
                          // City · date
                          Row(
                            children: [
                              Icon(Icons.location_on_outlined,
                                  size: 12, color: widget.c.textMuted),
                              const SizedBox(width: 2),
                              Expanded(
                                child: Text(
                                  '${widget.listing.city} · ${widget.listing.formattedDate(widget.lang)}',
                                  style: GoogleFonts.outfit(
                                    color: widget.c.textMuted,
                                    fontSize: 11,
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
            // Bottom divider
            Divider(height: 1, thickness: 1, color: widget.c.border),
          ],
        ),
      ),
    );
  }

  bool get _hasBadge =>
      widget.listing.isFeatured ||
      widget.listing.listingType == 'rent' ||
      widget.listing.listingType == 'installment' ||
      widget.listing.installmentAvailable ||
      widget.listing.availability == 'on_order';
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
        // Bottom-left: price pinned on image (only for vertical non-compact)
        if (!compact)
          Positioned(
            bottom: 10,
            left: 10,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (listing.isNegotiable) ...[
                  _NegotiableBadge(),
                  const SizedBox(height: 4),
                ],
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.65),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    listing.formattedPrice('ru'),
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4,
                      height: 1,
                    ),
                  ),
                ),
              ],
            ),
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
    final lang = context.watch<LanguageProvider>().lang;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.50),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        t('common.negotiable', lang),
        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _DealerBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LanguageProvider>().lang;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.store_rounded, size: 11, color: Colors.white),
          const SizedBox(width: 4),
          Text(
            t('badges.dealer', lang),
            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
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
    final lang = context.watch<LanguageProvider>().lang;
    final badges = <Widget>[];
    if (listing.isFeatured) {
      badges.add(_Badge(label: t('badges.featured', lang), color: const Color(0xFFC83808)));
    }
    if (listing.listingType == 'rent') {
      badges.add(_Badge(label: t('badges.rent', lang), color: const Color(0xFF5C5C5C)));
    }
    if (listing.listingType == 'installment' || listing.installmentAvailable) {
      badges.add(_Badge(label: t('badges.installment', lang), color: const Color(0xFF5C5C5C)));
    }
    if (listing.availability == 'on_order') {
      badges.add(_Badge(label: t('badges.onOrder', lang), color: const Color(0xFF5C5C5C)));
    }
    if (badges.isEmpty) return const SizedBox.shrink();
    return Wrap(spacing: 4, runSpacing: 4, children: badges);
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;

  const _Badge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
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
          // Title + year
          Text(
            '${listing.brand} ${listing.model}',
            style: GoogleFonts.outfit(
              color: colors.text,
              fontSize: 17,
              fontWeight: FontWeight.w800,
              height: 1.2,
              letterSpacing: -0.4,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            listing.year.toString(),
            style: GoogleFonts.outfit(
              color: colors.textMuted,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 10),

          // Spec chips
          if (_hasChips) ...[
            _ChipRow(listing: listing, colors: colors),
            const SizedBox(height: 10),
          ],

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
      listing.transmission != null || listing.mileage != null;
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
          color: c.card,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Square photo placeholder
                    Container(
                      width: 130, height: 130,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: SizedBox(
                        height: 130,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(height: 16, width: 140, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                            const SizedBox(height: 6),
                            Container(height: 12, width: 100, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                            const Spacer(),
                            Container(height: 20, width: 90, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                            const SizedBox(height: 8),
                            Container(height: 11, width: 120, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Container(height: 1, color: Colors.white.withValues(alpha: 0.5)),
            ],
          ),
        ),
      );
    }
    return Shimmer.fromColors(
      baseColor: c.border,
      highlightColor: c.surface,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Container(
          color: c.card,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Image fills remaining space so content never overflows
              Expanded(child: Container(color: Colors.white)),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(height: 15, width: 150, color: Colors.white),
                    const SizedBox(height: 8),
                    Container(height: 12, width: 120, color: Colors.white),
                    const SizedBox(height: 8),
                    Container(height: 20, width: 90, color: Colors.white),
                    const SizedBox(height: 8),
                    Container(height: 11, width: 170, color: Colors.white),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
