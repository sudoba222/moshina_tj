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
    final colors = context.appColors;
    final lang = context.watch<LanguageProvider>().lang;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: colors.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: colors.border),
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildImage(context),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${listing.brand} ${listing.model} ${listing.year}',
                          style: TextStyle(
                            color: colors.text,
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      _buildTypeBadge(context, lang),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    listing.formattedPrice,
                    style: TextStyle(
                      color: colors.accent,
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(Icons.location_on_outlined,
                          size: 14, color: colors.textMuted),
                      const SizedBox(width: 2),
                      Expanded(
                        child: Text(
                          listing.city,
                          style: TextStyle(
                              color: colors.textMuted, fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (listing.mileage != null) ...[
                        Icon(Icons.speed_outlined,
                            size: 14, color: colors.textMuted),
                        const SizedBox(width: 2),
                        Text(
                          '${listing.formattedMileage} ${t('km', lang)}',
                          style: TextStyle(
                              color: colors.textMuted, fontSize: 12),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImage(BuildContext context) {
    final colors = context.appColors;
    final imageUrl = listing.firstImageUrl;

    if (imageUrl.isEmpty) {
      return Container(
        height: 160,
        color: colors.border,
        child: Center(
          child: Icon(Icons.directions_car_outlined,
              size: 48, color: colors.textMuted),
        ),
      );
    }

    return SizedBox(
      height: 160,
      width: double.infinity,
      child: CachedNetworkImage(
        imageUrl: imageUrl,
        fit: BoxFit.cover,
        placeholder: (ctx, url) => Shimmer.fromColors(
          baseColor: colors.border,
          highlightColor: colors.surface,
          child: Container(color: Colors.white),
        ),
        errorWidget: (ctx, url, err) => Container(
          color: colors.border,
          child: Center(
            child: Icon(Icons.directions_car_outlined,
                size: 48, color: colors.textMuted),
          ),
        ),
      ),
    );
  }

  Widget _buildTypeBadge(BuildContext context, String lang) {
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
        color = context.appColors.accent;
        label = t('sale', lang);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
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
    final colors = context.appColors;
    return Shimmer.fromColors(
      baseColor: colors.border,
      highlightColor: colors.surface,
      child: Container(
        decoration: BoxDecoration(
          color: colors.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: colors.border),
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(height: 160, color: Colors.white),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                      height: 14, width: double.infinity, color: Colors.white),
                  const SizedBox(height: 8),
                  Container(height: 16, width: 100, color: Colors.white),
                  const SizedBox(height: 8),
                  Container(height: 12, width: 150, color: Colors.white),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
