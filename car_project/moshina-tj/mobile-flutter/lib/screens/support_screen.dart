import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/language_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  bool _loading = false;

  Future<void> _startChat() async {
    setState(() => _loading = true);
    try {
      final api = context.read<ApiService>();
      final result = await api.createSupportTicket();
      final convId = (result['conv_id'] ?? result['id'] ?? '').toString();
      if (mounted && convId.isNotEmpty) {
        context.push('/chat/$convId', extra: result);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: AppColors.colorError,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.card,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded, color: c.text),
          onPressed: () => context.pop(),
        ),
        title: Text(
          t('support.title', lang),
          style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: c.text),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Divider(color: c.border, height: 1),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Hero card ────────────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                color: c.card,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: c.border),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: c.accent.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.support_agent_outlined, color: c.accent, size: 36),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    t('support.open', lang),
                    textAlign: TextAlign.center,
                    style: GoogleFonts.outfit(
                      color: c.text,
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    t('support.helpText', lang),
                    textAlign: TextAlign.center,
                    style: TextStyle(color: c.textSecondary, fontSize: 14, height: 1.5),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _loading ? null : _startChat,
                      icon: _loading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Icon(Icons.chat_bubble_outline_rounded, size: 18),
                      label: Text(
                        t('support.startChat', lang),
                        style: GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 15),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: c.accent,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 52),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 28),

            // ── FAQ section ──────────────────────────────────────────────────
            Text(
              t('support.faq', lang),
              style: GoogleFonts.outfit(color: c.text, fontSize: 17, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),

            Container(
              decoration: BoxDecoration(
                color: c.card,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: c.border),
              ),
              child: Column(
                children: [
                  _FaqTile(
                    c: c,
                    question: t('faq.postListing.q', lang),
                    answer: t('faq.postListing.a', lang),
                    isFirst: true,
                  ),
                  Divider(color: c.border, height: 1),
                  _FaqTile(
                    c: c,
                    question: t('faq.contactSeller.q', lang),
                    answer: t('faq.contactSeller.a', lang),
                  ),
                  Divider(color: c.border, height: 1),
                  _FaqTile(
                    c: c,
                    question: t('faq.safety.q', lang),
                    answer: t('faq.safety.a', lang),
                  ),
                  Divider(color: c.border, height: 1),
                  _FaqTile(
                    c: c,
                    question: t('faq.becomeDealer.q', lang),
                    answer: t('faq.becomeDealer.a', lang),
                    isLast: true,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _FaqTile extends StatelessWidget {
  final AppColors c;
  final String question;
  final String answer;
  final bool isFirst;
  final bool isLast;

  const _FaqTile({
    required this.c,
    required this.question,
    required this.answer,
    this.isFirst = false,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.vertical(
        top: isFirst ? const Radius.circular(16) : Radius.zero,
        bottom: isLast ? const Radius.circular(16) : Radius.zero,
      ),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        expandedCrossAxisAlignment: CrossAxisAlignment.start,
        backgroundColor: c.card,
        collapsedBackgroundColor: c.card,
        iconColor: c.accent,
        collapsedIconColor: c.textMuted,
        title: Text(
          question,
          style: GoogleFonts.outfit(color: c.text, fontSize: 14, fontWeight: FontWeight.w600),
        ),
        children: [
          Text(
            answer,
            style: TextStyle(color: c.textSecondary, fontSize: 13, height: 1.5),
          ),
        ],
      ),
    );
  }
}
