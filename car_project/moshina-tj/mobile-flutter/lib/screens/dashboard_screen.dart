import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/language_provider.dart';
import '../providers/listing_provider.dart';
import '../providers/theme_provider.dart';
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

  Widget _buildUnauthenticated(
      BuildContext context, AppColors c, String lang) {
    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(title: Text(t('nav.profile', lang))),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: c.border,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.person_outline, size: 40, color: c.textMuted),
            ),
            const SizedBox(height: 16),
            Text(
              t('auth.login', lang),
              style: TextStyle(
                color: c.text,
                fontWeight: FontWeight.w600,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              t('post.loginRequired', lang),
              textAlign: TextAlign.center,
              style: TextStyle(color: c.textSecondary, fontSize: 14),
            ),
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 40),
              child: ElevatedButton(
                onPressed: () => context.push('/login'),
                child: Text(t('auth.login', lang)),
              ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => context.push('/register'),
              child: Text(
                t('auth.register', lang),
                style: TextStyle(color: c.accent),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDashboard(
      BuildContext context, AppColors c, String lang, AuthProvider auth) {
    final user = auth.user!;

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        title: Text(t('nav.profile', lang)),
        actions: [
          IconButton(
            icon: Icon(Icons.logout, color: c.textSecondary),
            onPressed: () => _confirmLogout(context, lang, c, auth),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: c.accent,
        onRefresh: () async {},
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _ProfileCard(user: user, c: c),
            const SizedBox(height: 16),
            _SettingsCard(c: c, lang: lang),
            const SizedBox(height: 20),
            Text(
              t('dashboard.myListings', lang),
              style: TextStyle(
                color: c.text,
                fontWeight: FontWeight.w700,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 12),
            _MyListings(c: c, lang: lang),
          ],
        ),
      ),
    );
  }

  void _confirmLogout(
      BuildContext context, String lang, AppColors c, AuthProvider auth) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: c.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: Text(
          t('auth.logout', lang),
          style: TextStyle(color: c.text, fontWeight: FontWeight.w700),
        ),
        content: Text(
          'Вы уверены, что хотите выйти?',
          style: TextStyle(color: c.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              t('catalog.reset', lang),
              style: TextStyle(color: c.textMuted),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              auth.logout();
            },
            child: Text(
              t('auth.logout', lang),
              style: TextStyle(color: c.accent),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  final dynamic user;
  final AppColors c;

  const _ProfileCard({required this.user, required this.c});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 36,
            backgroundColor: c.accent.withValues(alpha: 0.12),
            child: Text(
              user.initials,
              style: TextStyle(
                color: c.accent,
                fontWeight: FontWeight.w700,
                fontSize: 24,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user.displayName,
                  style: TextStyle(
                    color: c.text,
                    fontWeight: FontWeight.w700,
                    fontSize: 18,
                  ),
                ),
                if (user.phone != null)
                  Text(
                    user.phone!,
                    style:
                        TextStyle(color: c.textSecondary, fontSize: 14),
                  ),
                if (user.email != null)
                  Text(
                    user.email!,
                    style:
                        TextStyle(color: c.textSecondary, fontSize: 13),
                  ),
                const SizedBox(height: 4),
                if (user.isVerified)
                  Row(
                    children: [
                      Icon(Icons.verified,
                          size: 14, color: c.accent),
                      const SizedBox(width: 4),
                      Text(
                        'Verified',
                        style: TextStyle(
                            color: c.accent,
                            fontSize: 12,
                            fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
              ],
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
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.border),
      ),
      child: Column(
        children: [
          // Language row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Icon(Icons.language, size: 20, color: c.textSecondary),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    t('dashboard.language', lang),
                    style: TextStyle(color: c.text, fontSize: 15),
                  ),
                ),
                _LangButton(
                  label: 'RU',
                  selected: langProvider.lang == 'ru',
                  onTap: () => langProvider.setLang('ru'),
                  c: c,
                ),
                const SizedBox(width: 6),
                _LangButton(
                  label: 'TJ',
                  selected: langProvider.lang == 'tj',
                  onTap: () => langProvider.setLang('tj'),
                  c: c,
                ),
              ],
            ),
          ),
          Divider(color: c.border, height: 1),
          // Theme row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Icon(
                  themeProvider.isDark ? Icons.dark_mode : Icons.light_mode,
                  size: 20,
                  color: c.textSecondary,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    themeProvider.isDark
                        ? t('dashboard.dark', lang)
                        : t('dashboard.light', lang),
                    style: TextStyle(color: c.text, fontSize: 15),
                  ),
                ),
                Switch(
                  value: themeProvider.isDark,
                  activeThumbColor: c.accent,
                  activeTrackColor: c.accent.withValues(alpha: 0.4),
                  onChanged: (v) => themeProvider.setDark(v),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MyListings extends StatelessWidget {
  final AppColors c;
  final String lang;

  const _MyListings({required this.c, required this.lang});

  @override
  Widget build(BuildContext context) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, _) {
        final listings = provider.fresh.take(3).toList();

        if (listings.isEmpty) {
          return Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: c.card,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: c.border),
            ),
            child: Column(
              children: [
                Icon(Icons.car_rental, size: 40, color: c.textMuted),
                const SizedBox(height: 12),
                Text(
                  t('common.noListings', lang),
                  style: TextStyle(color: c.textSecondary, fontSize: 14),
                ),
              ],
            ),
          );
        }

        return Column(
          children: listings
              .map((listing) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: CarCard(
                      listing: listing,
                      onTap: () => context.push('/car/${listing.id}'),
                    ),
                  ))
              .toList(),
        );
      },
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
