import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/listing.dart';
import '../providers/auth_provider.dart';
import '../providers/language_provider.dart';
import '../providers/theme_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';
import '../widgets/car_card.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;
    final auth = context.watch<AuthProvider>();

    if (auth.status == AuthStatus.unknown) {
      return Scaffold(
        backgroundColor: c.bg,
        body: Center(child: CircularProgressIndicator(color: c.accent)),
      );
    }

    if (!auth.isAuthenticated) {
      return _buildUnauthenticated(context, c, lang);
    }

    return _buildDashboard(context, c, lang, auth);
  }

  Widget _buildUnauthenticated(BuildContext context, AppColors c, String lang) {
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.card,
        surfaceTintColor: Colors.transparent,
        title: Text(t('nav.profile', lang),
            style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: c.text)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Divider(color: c.border, height: 1),
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Illustrative icon in a large circle
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      c.accent.withValues(alpha: 0.15),
                      c.accent.withValues(alpha: 0.05),
                    ],
                  ),
                  border: Border.all(color: c.accent.withValues(alpha: 0.2)),
                ),
                child: Icon(Icons.person_outline_rounded,
                    size: 48, color: c.accent),
              ),
              const SizedBox(height: 24),
              Text(
                lang == 'ru'
                    ? 'Войдите в аккаунт'
                    : 'Ба аккаунт ворид шавед',
                style: GoogleFonts.outfit(
                    color: c.text, fontWeight: FontWeight.w800, fontSize: 22),
              ),
              const SizedBox(height: 10),
              Text(
                t('post.loginRequired', lang),
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(
                    color: c.textSecondary, fontSize: 14, height: 1.5),
              ),
              const SizedBox(height: 32),
              // Card with login + register
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: c.card,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: c.border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () => context.push('/login'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: c.accent,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          minimumSize: const Size(double.infinity, 50),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: Text(
                          t('auth.login', lang),
                          style: GoogleFonts.outfit(
                              color: Colors.white, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () => context.push('/register'),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: c.accent),
                          foregroundColor: c.accent,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          minimumSize: const Size(double.infinity, 50),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        child: Text(
                          t('auth.register', lang),
                          style: GoogleFonts.outfit(
                              fontWeight: FontWeight.w700),
                        ),
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
  }

  Widget _buildDashboard(BuildContext context, AppColors c, String lang, AuthProvider auth) {
    final user = auth.user!;

    return Scaffold(
      backgroundColor: c.bg,
      body: RefreshIndicator(
        color: c.accent,
        onRefresh: () async {},
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              backgroundColor: c.card,
              surfaceTintColor: Colors.transparent,
              pinned: true,
              title: Text(
                t('nav.profile', lang),
                style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: c.text, fontSize: 18),
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
                  _ProfileCard(user: user, c: c, lang: lang),
                  const SizedBox(height: 14),
                  _SettingsCard(c: c, lang: lang),
                  const SizedBox(height: 14),
                  _DangerCard(c: c, lang: lang, auth: auth),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        t('profile.myListings', lang),
                        style: GoogleFonts.outfit(
                            color: c.text, fontWeight: FontWeight.w700, fontSize: 18),
                      ),
                      TextButton.icon(
                        onPressed: () => context.push('/post'),
                        icon: Icon(Icons.add_circle_outline, color: c.accent, size: 18),
                        label: Text(t('listing.postNew', lang),
                            style: TextStyle(color: c.accent, fontWeight: FontWeight.w600, fontSize: 13)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  _MyListings(userId: user.id, c: c, lang: lang),
                  const SizedBox(height: 24),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  final dynamic user;
  final AppColors c;
  final String lang;

  const _ProfileCard({required this.user, required this.c, required this.lang});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 70,
                height: 70,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      c.accent,
                      Color.lerp(c.accent, const Color(0xFF7A1A04), 0.4)!,
                    ],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: c.accent.withValues(alpha: 0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    user.initials,
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 24,
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
                      user.displayName,
                      style: GoogleFonts.outfit(
                          color: c.text, fontWeight: FontWeight.w700, fontSize: 17),
                    ),
                    if (user.phone != null)
                      Text(user.phone!, style: TextStyle(color: c.textSecondary, fontSize: 13)),
                    if (user.email != null)
                      Text(user.email!, style: TextStyle(color: c.textSecondary, fontSize: 13)),
                    if (user.isVerified) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.verified_rounded, size: 14, color: c.accent),
                          const SizedBox(width: 4),
                          Text(t('common.verified', lang),
                              style: TextStyle(color: c.accent, fontSize: 12, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: () => context.push('/edit-profile'),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: c.accent.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.edit_outlined, color: c.accent, size: 16),
                  const SizedBox(width: 6),
                  Text(
                    t('profile.editProfile', lang),
                    style: TextStyle(color: c.accent, fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsCard extends StatelessWidget {
  final AppColors c;
  final String lang;

  const _SettingsCard({required this.c, required this.lang});

  @override
  Widget build(BuildContext context) {
    final langProvider = context.watch<LanguageProvider>();
    final themeProvider = context.watch<ThemeProvider>();

    return Container(
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: Column(
        children: [
          _SettingRow(
            icon: Icons.language_rounded,
            label: t('dashboard.language', lang),
            c: c,
            trailing: Row(
              children: [
                _LangButton(label: 'RU', selected: langProvider.lang == 'ru', onTap: () => langProvider.setLang('ru'), c: c),
                const SizedBox(width: 6),
                _LangButton(label: 'TJ', selected: langProvider.lang == 'tj', onTap: () => langProvider.setLang('tj'), c: c),
              ],
            ),
          ),
          Divider(color: c.border, height: 1),
          _SettingRow(
            icon: themeProvider.isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
            label: themeProvider.isDark ? t('dashboard.dark', lang) : t('dashboard.light', lang),
            c: c,
            trailing: Switch(
              value: themeProvider.isDark,
              activeThumbColor: c.accent,
              activeTrackColor: c.accent.withValues(alpha: 0.4),
              onChanged: (v) => themeProvider.setDark(v),
            ),
          ),
          Divider(color: c.border, height: 1),
          _SettingRow(
            icon: Icons.lock_outline_rounded,
            label: t('profile.changePassword', lang),
            c: c,
            onTap: () => context.push('/change-password'),
            trailing: Icon(Icons.chevron_right_rounded, color: c.textMuted, size: 20),
          ),
          Divider(color: c.border, height: 1),
          _SettingRow(
            icon: Icons.lock_reset_outlined,
            label: t('auth.forgotPassword', lang),
            c: c,
            onTap: () => context.push('/forgot-password'),
            trailing: Icon(Icons.chevron_right_rounded, color: c.textMuted, size: 20),
          ),
          Divider(color: c.border, height: 1),
          _SettingRow(
            icon: Icons.favorite_border_rounded,
            label: t('nav.favorites', lang),
            c: c,
            onTap: () => context.push('/favorites'),
            trailing: Icon(Icons.chevron_right_rounded, color: c.textMuted, size: 20),
          ),
          Divider(color: c.border, height: 1),
          _SettingRow(
            icon: Icons.support_agent_outlined,
            label: t('support.title', lang),
            c: c,
            onTap: () => context.push('/support'),
            trailing: Icon(Icons.chevron_right_rounded, color: c.textMuted, size: 20),
          ),
          Divider(color: c.border, height: 1),
          _SettingRow(
            icon: Icons.shield_outlined,
            label: t('settings.privacy', lang),
            c: c,
            onTap: () => context.push('/privacy'),
            trailing: Icon(Icons.chevron_right_rounded, color: c.textMuted, size: 20),
          ),
        ],
      ),
    );
  }
}

class _DangerCard extends StatelessWidget {
  final AppColors c;
  final String lang;
  final AuthProvider auth;

  const _DangerCard({required this.c, required this.lang, required this.auth});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.border),
      ),
      child: _SettingRow(
        icon: Icons.logout_rounded,
        label: t('auth.logout', lang),
        c: c,
        iconColor: Colors.red,
        labelColor: Colors.red,
        onTap: () => _confirmLogout(context),
        trailing: Icon(Icons.chevron_right_rounded, color: c.textMuted, size: 20),
      ),
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: Text(t('auth.logout', lang),
            style: GoogleFonts.outfit(color: c.text, fontWeight: FontWeight.w700)),
        content: Text(t('auth.logoutConfirm', lang),
            style: TextStyle(color: c.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(t('common.cancel', lang), style: TextStyle(color: c.textMuted)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              auth.logout();
            },
            child: Text(t('auth.logout', lang), style: const TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}

class _SettingRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final AppColors c;
  final Widget? trailing;
  final VoidCallback? onTap;
  final Color? iconColor;
  final Color? labelColor;

  const _SettingRow({
    required this.icon,
    required this.label,
    required this.c,
    this.trailing,
    this.onTap,
    this.iconColor,
    this.labelColor,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 20, color: iconColor ?? c.textSecondary),
            const SizedBox(width: 12),
            Expanded(
              child: Text(label, style: TextStyle(color: labelColor ?? c.text, fontSize: 15)),
            ),
            ?trailing,
          ],
        ),
      ),
    );
  }
}

class _MyListings extends StatefulWidget {
  final String userId;
  final AppColors c;
  final String lang;

  const _MyListings({required this.userId, required this.c, required this.lang});

  @override
  State<_MyListings> createState() => _MyListingsState();
}

class _MyListingsState extends State<_MyListings> {
  List<Listing> _listings = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = context.read<ApiService>();
      final raw = await api.getMyListings();
      if (mounted) {
        setState(() {
          _listings = raw
              .map((e) => Listing.fromJson(e as Map<String, dynamic>))
              .toList();
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _delete(String id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: widget.c.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: Text(t('listing.deleteConfirm', widget.lang),
            style: GoogleFonts.outfit(color: widget.c.text, fontWeight: FontWeight.w700)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(t('common.cancel', widget.lang), style: TextStyle(color: widget.c.textMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              t('common.delete', widget.lang),
              style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
    if (ok == true && mounted) {
      try {
        final api = context.read<ApiService>();
        await api.deleteListing(id);
        setState(() => _listings.removeWhere((l) => l.id == id));
      } catch (_) {}
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'active':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      default:
        return Colors.orange;
    }
  }

  String _statusLabel(String status, String lang) {
    switch (status) {
      case 'active':
        return t('listing.status.active', lang);
      case 'rejected':
        return t('listing.status.rejected', lang);
      case 'inactive':
        return t('listing.status.inactive', lang);
      default:
        return t('listing.status.pending', lang);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Column(
        children: List.generate(
          2,
          (_) => Container(
            height: 90,
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              color: widget.c.card,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: widget.c.border),
            ),
          ),
        ),
      );
    }

    if (_listings.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: widget.c.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: widget.c.border),
        ),
        child: Column(
          children: [
            Icon(Icons.car_rental_outlined, size: 44, color: widget.c.textMuted),
            const SizedBox(height: 12),
            Text(
              t('common.noListings', widget.lang),
              style: TextStyle(color: widget.c.textSecondary, fontSize: 14),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () => context.push('/post'),
              icon: Icon(Icons.add, color: widget.c.accent, size: 18),
              label: Text(t('listing.postNew', widget.lang),
                  style: TextStyle(color: widget.c.accent, fontWeight: FontWeight.w600)),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: widget.c.accent),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: _listings.map((listing) {
        final statusColor = _statusColor(listing.status);
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            color: widget.c.card,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: widget.c.border),
          ),
          child: Column(
            children: [
              CarCard(
                listing: listing,
                onTap: () => context.push('/car/${listing.id}'),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        _statusLabel(listing.status, widget.lang),
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const Spacer(),
                    GestureDetector(
                      onTap: () => context.push('/edit-listing/${listing.id}'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: widget.c.accent.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.edit_outlined, color: widget.c.accent, size: 14),
                            const SizedBox(width: 4),
                            Text(
                              widget.lang == 'ru' ? 'Изменить' : 'Таҳрир',
                              style: TextStyle(color: widget.c.accent, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: () => _delete(listing.id),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.red.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.delete_outline_rounded, color: Colors.red, size: 14),
                            const SizedBox(width: 4),
                            Text(t('listing.delete', widget.lang),
                                style: const TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class _LangButton extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final AppColors c;

  const _LangButton({
    required this.label,
    required this.selected,
    required this.onTap,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: selected ? c.accent : c.border,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : c.textSecondary,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}
