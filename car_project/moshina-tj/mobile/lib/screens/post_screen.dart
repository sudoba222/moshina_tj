import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/language_provider.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';

class PostScreen extends StatelessWidget {
  const PostScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final lang = context.watch<LanguageProvider>().lang;
    final auth = context.watch<AuthProvider>();

    if (!auth.isAuthenticated) {
      return Scaffold(
        backgroundColor: colors.bg,
        appBar: AppBar(title: Text(t('post', lang))),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: colors.accent.withValues(alpha: 0.08),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.add_box_outlined,
                      size: 40, color: colors.accent),
                ),
                const SizedBox(height: 20),
                Text(
                  t('sign_in_to_post', lang),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: colors.text,
                    fontWeight: FontWeight.w600,
                    fontSize: 17,
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => context.push('/login'),
                  child: Text(t('login', lang)),
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
        ),
      );
    }

    return Scaffold(
      backgroundColor: colors.bg,
      appBar: AppBar(title: Text(t('post', lang))),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SectionHeader(title: 'Информация об автомобиле', colors: colors),
            const SizedBox(height: 12),
            _buildComingSoonCard(colors),
          ],
        ),
      ),
    );
  }

  Widget _buildComingSoonCard(AppColorExtension colors) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: colors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        children: [
          Icon(Icons.construction_outlined, size: 48, color: colors.textMuted),
          const SizedBox(height: 12),
          Text(
            'Размещение объявлений',
            style: TextStyle(
                color: colors.text,
                fontWeight: FontWeight.w700,
                fontSize: 16),
          ),
          const SizedBox(height: 8),
          Text(
            'Функция размещения объявлений доступна на сайте tajcar.tj. Мобильное приложение будет обновлено в ближайшее время.',
            textAlign: TextAlign.center,
            style: TextStyle(color: colors.textSecondary, fontSize: 14, height: 1.5),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final AppColorExtension colors;

  const _SectionHeader({required this.title, required this.colors});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: TextStyle(
        color: colors.text,
        fontWeight: FontWeight.w700,
        fontSize: 16,
      ),
    );
  }
}
