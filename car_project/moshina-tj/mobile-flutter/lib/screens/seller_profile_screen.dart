import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../l10n/strings.dart';
import '../models/listing.dart';
import '../providers/language_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/car_card.dart';

/// Public seller profile — avatar, member-since, and all active listings.
class SellerProfileScreen extends StatefulWidget {
  final String userId;

  const SellerProfileScreen({super.key, required this.userId});

  @override
  State<SellerProfileScreen> createState() => _SellerProfileScreenState();
}

class _SellerProfileScreenState extends State<SellerProfileScreen> {
  final _api = ApiService();

  Map<String, dynamic>? _profile;
  List<Listing> _listings = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _api.getUserProfile(widget.userId),
        _api.getUserListings(widget.userId),
      ]);
      if (!mounted) return;
      setState(() {
        _profile = results[0] as Map<String, dynamic>?;
        _listings = (results[1] as List<dynamic>)
            .map((j) => Listing.fromJson(j as Map<String, dynamic>))
            .toList();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  String _memberSince(String lang) {
    final raw = _profile?['created_at']?.toString();
    if (raw == null) return '';
    final date = DateTime.tryParse(raw);
    if (date == null) return '';
    final formatted = '${date.month.toString().padLeft(2, '0')}.${date.year}';
    return t('seller.onSiteSince', lang).replaceAll('{date}', formatted);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;
    final name = _profile?['name']?.toString() ?? t('common.seller', lang);
    final avatarUrl = _profile?['avatar_url']?.toString();
    final isDealer = _profile?['role']?.toString() == 'dealer';
    final initials = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.navBg,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: c.text),
          onPressed: () => context.pop(),
        ),
        title: Text(t('seller.profile', lang)),
      ),
      body: _loading
          ? Center(child: CircularProgressIndicator(color: c.accent))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text(
                      t('common.error', lang),
                      style: TextStyle(color: c.textMuted),
                    ),
                  ),
                )
              : RefreshIndicator(
                  color: c.accent,
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                    children: [
                      // ── Seller header card ────────────────────────────
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: c.card,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: c.border),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 64,
                              height: 64,
                              clipBehavior: Clip.hardEdge,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: avatarUrl == null
                                    ? LinearGradient(
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                        colors: [c.accent, c.accentHover],
                                      )
                                    : null,
                              ),
                              child: avatarUrl != null
                                  ? CachedNetworkImage(
                                      imageUrl: avatarUrl, fit: BoxFit.cover)
                                  : Center(
                                      child: Text(
                                        initials,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 24,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    name,
                                    style: GoogleFonts.outfit(
                                      color: c.text,
                                      fontSize: 19,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: -0.3,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: isDealer ? c.accentDim : c.tagBg,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      isDealer
                                          ? t('badges.dealer', lang)
                                          : t('detail.privateSeller', lang),
                                      style: TextStyle(
                                        color: isDealer
                                            ? c.accent
                                            : c.textSecondary,
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  if (_memberSince(lang).isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Text(
                                      _memberSince(lang),
                                      style: TextStyle(
                                          color: c.textMuted, fontSize: 12),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 22),

                      // ── Listings ──────────────────────────────────────
                      Text(
                        t('seller.listingsTitle', lang)
                            .replaceAll('{count}', _listings.length.toString()),
                        style: GoogleFonts.outfit(
                          color: c.text,
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (_listings.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 48),
                          child: Column(
                            children: [
                              Icon(Icons.directions_car_outlined,
                                  size: 44, color: c.borderStrong),
                              const SizedBox(height: 10),
                              Text(
                                t('seller.noListings', lang),
                                style: TextStyle(
                                    color: c.textMuted, fontSize: 14),
                              ),
                            ],
                          ),
                        )
                      else
                        for (final listing in _listings)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: CarCard(
                              listing: listing,
                              onTap: () => context.push('/car/${listing.id}'),
                            ),
                          ),
                    ],
                  ),
                ),
    );
  }
}
