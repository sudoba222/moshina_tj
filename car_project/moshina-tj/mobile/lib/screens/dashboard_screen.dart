import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/language_provider.dart';
import '../providers/listing_provider.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';
import '../widgets/car_card.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _isDark = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _isDark = Theme.of(context).brightness == Brightness.dark;
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final lang = context.watch<LanguageProvider>().lang;
    final auth = context.watch<AuthProvider>();

    if (auth.status == AuthStatus.unknown) {
      return Scaffold(
        backgroundColor: colors.bg,
        body: Center(child: CircularProgressIndicator(color: colors.accent)),
      );
    }

    if (!auth.isAuthenticated) {
      return _buildUnauthenticated(context, colors, lang);
    }

    return _buildDashboard(context, colors, lang, auth);
  }

  Widget _buildUnauthenticated(
      BuildContext context, AppColorExtension colors, String lang) {
    return Scaffold(
      backgroundColor: colors.bg,
      appBar: AppBar(title: Text(t('profile', lang))),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: colors.border,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.person_outline,
                  size: 40, color: colors.textMuted),
            ),
            const SizedBox(height: 16),
            Text(
              t('not_logged_in', lang),
              style: TextStyle(
                  color: colors.text,
                  fontWeight: FontWeight.w600,
                  fontSize: 18),
            ),
            const SizedBox(height: 8),
            Text(
              t('login_to_view', lang),
              style: TextStyle(color: colors.textSecondary, fontSize: 14),
            ),
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 40),
              child: ElevatedButton(
                onPressed: () => context.push('/login'),
                child: Text(t('login', lang)),
              ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => context.push('/register'),
              child: Text(
                t('register', lang),
                style: TextStyle(color: colors.accent),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDashboard(BuildContext context, AppColorExtension colors,
      String lang, AuthProvider auth) {
    final user = auth.user!;

    return Scaffold(
      backgroundColor: colors.bg,
      appBar: AppBar(
        title: Text(t('profile', lang)),
        actions: [
          IconButton(
            icon: Icon(Icons.logout, color: colors.textSecondary),
            onPressed: () => _confirmLogout(context, lang, colors, auth),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: colors.accent,
        onRefresh: () async {},
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildProfileCard(context, user, colors, lang),
            const SizedBox(height: 16),
            _buildSettingsCard(context, colors, lang),
            const SizedBox(height: 20),
            Text(
              t('my_listings', lang),
              style: TextStyle(
                color: colors.text,
                fontWeight: FontWeight.w700,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 12),
            _buildMyListings(context, colors, lang),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileCard(BuildContext context, dynamic user,
      AppColorExtension colors, String lang) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colors.border),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 36,
            backgroundColor: colors.accent.withValues(alpha: 0.12),
            child: Text(
              user.displayName.isNotEmpty
                  ? user.displayName[0].toUpperCase()
                  : 'U',
              style: TextStyle(
                color: colors.accent,
                fontWeight: FontWeight.w700,
                fontSize: 28,
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
                    color: colors.text,
                    fontWeight: FontWeight.w700,
                    fontSize: 18,
                  ),
                ),
                if (user.phone != null)
                  Text(
                    user.phone!,
                    style: TextStyle(
                        color: colors.textSecondary, fontSize: 14),
                  ),
                if (user.email != null)
                  Text(
                    user.email!,
                    style: TextStyle(
                        color: colors.textSecondary, fontSize: 13),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsCard(
      BuildContext context, AppColorExtension colors, String lang) {
    final langProvider = context.watch<LanguageProvider>();

    return Container(
      decoration: BoxDecoration(
        color: colors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        children: [
          _SettingsTile(
            icon: Icons.language,
            title: t('language', lang),
            colors: colors,
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _LangButton(
                  label: 'RU',
                  selected: langProvider.lang == 'ru',
                  onTap: () => langProvider.setLang('ru'),
                  colors: colors,
                ),
                const SizedBox(width: 6),
                _LangButton(
                  label: 'TJ',
                  selected: langProvider.lang == 'tj',
                  onTap: () => langProvider.setLang('tj'),
                  colors: colors,
                ),
              ],
            ),
          ),
          Divider(color: colors.border, height: 1),
          _SettingsTile(
            icon: _isDark ? Icons.dark_mode : Icons.light_mode,
            title: t('dark_mode', lang),
            colors: colors,
            trailing: Switch(
              value: _isDark,
              activeThumbColor: colors.accent,
              activeTrackColor: colors.accent.withValues(alpha: 0.4),
              onChanged: (v) {
                setState(() => _isDark = v);
                // Theme switching is handled via the router/app level
                // We notify parent via the provider approach
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMyListings(
      BuildContext context, AppColorExtension colors, String lang) {
    return Consumer<ListingProvider>(
      builder: (ctx, provider, _) {
        // Show fresh listings filtered (in production this would be /users/{id}/listings)
        final myListings = provider.fresh.take(3).toList();

        if (myListings.isEmpty) {
          return Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: colors.card,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: colors.border),
            ),
            child: Column(
              children: [
                Icon(Icons.car_rental, size: 40, color: colors.textMuted),
                const SizedBox(height: 12),
                Text(
                  t('no_listings', lang),
                  style: TextStyle(color: colors.textSecondary, fontSize: 14),
                ),
              ],
            ),
          );
        }

        return Column(
          children: myListings
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

  void _confirmLogout(BuildContext context, String lang,
      AppColorExtension colors, AuthProvider auth) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: colors.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: Text(t('logout', lang),
            style: TextStyle(color: colors.text, fontWeight: FontWeight.w700)),
        content: Text('Вы уверены, что хотите выйти?',
            style: TextStyle(color: colors.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child:
                Text(t('reset', lang), style: TextStyle(color: colors.textMuted)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              auth.logout();
            },
            child: Text(t('logout', lang),
                style: TextStyle(color: colors.accent)),
          ),
        ],
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final AppColorExtension colors;
  final Widget trailing;

  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.colors,
    required this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: colors.textSecondary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(title,
                style: TextStyle(color: colors.text, fontSize: 15)),
          ),
          trailing,
        ],
      ),
    );
  }
}

class _LangButton extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final AppColorExtension colors;

  const _LangButton({
    required this.label,
    required this.selected,
    required this.onTap,
    required this.colors,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: selected ? colors.accent : colors.border,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : colors.textSecondary,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}
