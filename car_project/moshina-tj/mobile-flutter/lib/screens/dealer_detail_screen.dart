import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/listing.dart';
import '../providers/auth_provider.dart';
import '../providers/language_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';
import '../widgets/car_card.dart';

class DealerDetailScreen extends StatefulWidget {
  final String dealerId;

  const DealerDetailScreen({super.key, required this.dealerId});

  @override
  State<DealerDetailScreen> createState() => _DealerDetailScreenState();
}

class _DealerDetailScreenState extends State<DealerDetailScreen> {
  Map<String, dynamic>? _dealer;
  List<Listing> _listings = [];
  bool _loading = true;
  String? _error;
  bool _contactLoading = false;

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
      final api = context.read<ApiService>();
      final data = await api.getDealerDetail(widget.dealerId);
      final dealerRaw = data['dealer'] as Map<String, dynamic>? ?? data;
      final listingsRaw = data['listings'] as List<dynamic>? ?? [];
      setState(() {
        _dealer = dealerRaw;
        _listings = listingsRaw
            .map((e) => Listing.fromJson(e as Map<String, dynamic>))
            .toList();
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _call(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _startChat() async {
    if (_listings.isEmpty) return;
    setState(() => _contactLoading = true);
    try {
      final api = context.read<ApiService>();
      final conv = await api.createOrGetConversation(_listings.first.id);
      final convId = (conv['id'] ?? conv['conv_id'] ?? '').toString();
      if (mounted && convId.isNotEmpty) {
        context.push('/chat/$convId', extra: conv);
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _contactLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;

    if (_loading) {
      return Scaffold(
        backgroundColor: c.bg,
        body: _buildShimmer(c),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: c.bg,
        appBar: AppBar(backgroundColor: c.card),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.wifi_off_outlined, size: 48, color: c.textMuted),
              const SizedBox(height: 12),
              Text(t('error.generic', lang), style: TextStyle(color: c.textSecondary)),
              const SizedBox(height: 12),
              TextButton(
                onPressed: _load,
                child: Text(t('error.retry', lang), style: TextStyle(color: c.accent)),
              ),
            ],
          ),
        ),
      );
    }

    if (_dealer == null) return const SizedBox.shrink();

    final dealer = _dealer!;
    final name = dealer['name'] as String? ?? '';
    final logoUrl = dealer['logo_url'] as String?;
    final city = dealer['city'] as String?;
    final phone = dealer['phone'] as String?;
    final website = dealer['website'] as String?;
    final isVerified = dealer['is_verified'] as bool? ?? false;
    final description = dealer['description'] as String?;
    final rating = dealer['rating'];
    final memberSince = dealer['created_at'] as String?;
    final auth = context.read<AuthProvider>();

    return Scaffold(
      backgroundColor: c.bg,
      body: CustomScrollView(
        slivers: [
          // ── SliverAppBar ──────────────────────────────────────────────────
          SliverAppBar(
            backgroundColor: c.card,
            surfaceTintColor: Colors.transparent,
            pinned: true,
            expandedHeight: 180,
            leading: IconButton(
              icon: Icon(Icons.arrow_back_rounded, color: c.text),
              onPressed: () => context.pop(),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: _buildHeroBg(c, logoUrl, name),
            ),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(1),
              child: Divider(color: c.border, height: 1),
            ),
          ),

          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // ── Header card ─────────────────────────────────────────────
                _HeaderCard(
                  c: c,
                  lang: lang,
                  name: name,
                  city: city,
                  phone: phone,
                  website: website,
                  isVerified: isVerified,
                  onCall: phone != null ? () => _call(phone) : null,
                ),
                const SizedBox(height: 12),

                // ── Stats row ────────────────────────────────────────────────
                _StatsRow(
                  c: c,
                  lang: lang,
                  listingCount: _listings.length,
                  rating: rating,
                  memberSince: memberSince,
                ),
                const SizedBox(height: 12),

                // ── About section ────────────────────────────────────────────
                if (description != null && description.isNotEmpty) ...[
                  _SectionTitle(title: t('dealers.aboutDealer', lang), c: c),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: c.card,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: c.border),
                    ),
                    child: Text(
                      description,
                      style: TextStyle(color: c.textSecondary, fontSize: 14, height: 1.5),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // ── Action buttons ───────────────────────────────────────────
                Row(
                  children: [
                    if (phone != null)
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _call(phone),
                          icon: const Icon(Icons.phone_outlined, size: 18),
                          label: Text(t('detail.call', lang)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: c.accent,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(0, 48),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                    if (phone != null && auth.isAuthenticated && _listings.isNotEmpty)
                      const SizedBox(width: 10),
                    if (auth.isAuthenticated && _listings.isNotEmpty)
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _contactLoading ? null : _startChat,
                          icon: _contactLoading
                              ? SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: c.accent),
                                )
                              : Icon(Icons.chat_bubble_outline, size: 18, color: c.accent),
                          label: Text(
                            t('dealers.contactDealer', lang),
                            style: TextStyle(color: c.accent),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: c.accent),
                            minimumSize: const Size(0, 48),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 20),

                // ── Dealer listings ──────────────────────────────────────────
                _SectionTitle(title: t('dealers.dealerListings', lang), c: c),
                const SizedBox(height: 12),

                if (_listings.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: c.card,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: c.border),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.car_rental_outlined, size: 44, color: c.textMuted),
                        const SizedBox(height: 10),
                        Text(
                          t('dealers.noListings', lang),
                          style: TextStyle(color: c.textSecondary, fontSize: 14),
                        ),
                      ],
                    ),
                  )
                else
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      childAspectRatio: 0.78,
                    ),
                    itemCount: _listings.length,
                    itemBuilder: (ctx, i) {
                      final listing = _listings[i];
                      return GestureDetector(
                        onTap: () => context.push('/car/${listing.id}'),
                        child: CarCard(
                          listing: listing,
                          horizontal: true,
                          onTap: () => context.push('/car/${listing.id}'),
                        ),
                      );
                    },
                  ),

                const SizedBox(height: 24),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroBg(AppColors c, String? logoUrl, String name) {
    return Container(
      color: c.card,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: 40),
            _DealerAvatar(logoUrl: logoUrl, name: name, c: c, size: 80),
            const SizedBox(height: 10),
            Text(
              name,
              style: GoogleFonts.outfit(
                color: c.text,
                fontSize: 20,
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShimmer(AppColors c) {
    return Shimmer.fromColors(
      baseColor: c.border,
      highlightColor: c.surface,
      child: CustomScrollView(
        slivers: [
          SliverAppBar(
            backgroundColor: c.card,
            expandedHeight: 180,
            flexibleSpace: Container(color: c.card),
          ),
          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                Container(height: 120, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14))),
                const SizedBox(height: 12),
                Container(height: 80, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14))),
                const SizedBox(height: 12),
                Container(height: 48, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12))),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Subwidgets ────────────────────────────────────────────────────────────────

class _DealerAvatar extends StatelessWidget {
  final String? logoUrl;
  final String name;
  final AppColors c;
  final double size;

  const _DealerAvatar({required this.logoUrl, required this.name, required this.c, required this.size});

  @override
  Widget build(BuildContext context) {
    if (logoUrl != null && logoUrl!.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(size / 4),
        child: CachedNetworkImage(
          imageUrl: logoUrl!,
          width: size,
          height: size,
          fit: BoxFit.contain,
          errorWidget: (_, __, ___) => _initials(),
        ),
      );
    }
    return _initials();
  }

  Widget _initials() {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: c.accent.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(size / 4),
      ),
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : 'D',
          style: GoogleFonts.outfit(
            color: c.accent,
            fontSize: size * 0.4,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _HeaderCard extends StatelessWidget {
  final AppColors c;
  final String lang;
  final String name;
  final String? city;
  final String? phone;
  final String? website;
  final bool isVerified;
  final VoidCallback? onCall;

  const _HeaderCard({
    required this.c,
    required this.lang,
    required this.name,
    this.city,
    this.phone,
    this.website,
    required this.isVerified,
    this.onCall,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  name,
                  style: GoogleFonts.outfit(
                    color: c.text,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (isVerified) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.colorSuccess.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.verified_rounded, size: 13, color: AppColors.colorSuccess),
                      const SizedBox(width: 3),
                      Text(
                        t('dealers.verified', lang),
                        style: TextStyle(
                          color: AppColors.colorSuccess,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
          if (city != null) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                Icon(Icons.location_on_outlined, size: 14, color: c.textMuted),
                const SizedBox(width: 4),
                Text(city!, style: TextStyle(color: c.textSecondary, fontSize: 13)),
              ],
            ),
          ],
          if (phone != null) ...[
            const SizedBox(height: 6),
            GestureDetector(
              onTap: onCall,
              child: Row(
                children: [
                  Icon(Icons.phone_outlined, size: 14, color: c.accent),
                  const SizedBox(width: 4),
                  Text(
                    phone!,
                    style: TextStyle(
                      color: c.accent,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (website != null && website!.isNotEmpty) ...[
            const SizedBox(height: 6),
            GestureDetector(
              onTap: () async {
                final uri = Uri.parse(website!);
                if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
              },
              child: Row(
                children: [
                  Icon(Icons.language_outlined, size: 14, color: c.accent),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      website!,
                      style: TextStyle(color: c.accent, fontSize: 13),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
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

class _StatsRow extends StatelessWidget {
  final AppColors c;
  final String lang;
  final int listingCount;
  final dynamic rating;
  final String? memberSince;

  const _StatsRow({
    required this.c,
    required this.lang,
    required this.listingCount,
    this.rating,
    this.memberSince,
  });

  @override
  Widget build(BuildContext context) {
    String? year;
    if (memberSince != null && memberSince!.length >= 4) {
      year = memberSince!.substring(0, 4);
    }

    return Container(
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Row(
        children: [
          _StatTile(
            value: listingCount.toString(),
            label: t('dealers.listings', lang),
            c: c,
          ),
          Container(width: 1, height: 40, color: c.border),
          _StatTile(
            value: rating != null ? rating.toString() : '—',
            label: 'Рейтинг',
            c: c,
          ),
          Container(width: 1, height: 40, color: c.border),
          _StatTile(
            value: year ?? '—',
            label: 'Год',
            c: c,
          ),
        ],
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  final String value;
  final String label;
  final AppColors c;

  const _StatTile({required this.value, required this.label, required this.c});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Column(
          children: [
            Text(
              value,
              style: GoogleFonts.outfit(
                color: c.accent,
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(color: c.textMuted, fontSize: 11),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  final AppColors c;

  const _SectionTitle({required this.title, required this.c});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: GoogleFonts.outfit(
        color: c.text,
        fontSize: 17,
        fontWeight: FontWeight.w700,
      ),
    );
  }
}
