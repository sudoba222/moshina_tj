import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/language_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';
import '../widgets/country_picker.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  CountryCode _country = CountryCode.all.first;
  final _phoneCtrl = TextEditingController();
  bool _phoneLoading = false;
  String? _phoneError;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendPhoneOtp() async {
    final phone = _phoneCtrl.text.trim();
    final lang = context.read<LanguageProvider>().lang;
    if (phone.isEmpty) {
      setState(() => _phoneError = t('error.enterPhone', lang));
      return;
    }
    setState(() { _phoneLoading = true; _phoneError = null; });
    try {
      final fullPhone = _country.dialCode + phone;
      await context.read<ApiService>().sendPhoneOtp(fullPhone);
      if (mounted) context.push('/otp', extra: {'phone': fullPhone, 'mode': 'login'});
    } catch (_) {
      if (mounted) setState(() => _phoneError = t('error.sendCodeFailed', context.read<LanguageProvider>().lang));
    } finally {
      if (mounted) setState(() => _phoneLoading = false);
    }
  }

  void _openTelegramSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _TelegramBottomSheet(c: context.colors, lang: context.read<LanguageProvider>().lang),
    );
  }

  void _openEmailSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _EmailBottomSheet(c: context.colors, lang: context.read<LanguageProvider>().lang),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;

    return Scaffold(
      backgroundColor: c.accent,
      resizeToAvoidBottomInset: true,
      body: Column(
        children: [
          // ── HERO TOP ────────────────────────────────────────────────────────
          _HeroTop(c: c, lang: lang),

          // ── FORM CARD ───────────────────────────────────────────────────────
          Expanded(
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: c.bg,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(
                  24, 28, 24,
                  MediaQuery.of(context).viewInsets.bottom + 32,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title
                    Text(
                      t('auth.loginTitle', lang),
                      style: GoogleFonts.outfit(
                        color: c.text,
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      t('auth.phoneSubtitle', lang),
                      style: GoogleFonts.outfit(color: c.textMuted, fontSize: 14),
                    ),
                    const SizedBox(height: 24),

                    // Phone row
                    Row(
                      children: [
                        CountryPickerButton(
                          selected: _country,
                          onChanged: (cc) => setState(() => _country = cc),
                          c: c,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _PhoneField(
                            ctrl: _phoneCtrl,
                            c: c,
                            lang: lang,
                            hasError: _phoneError != null,
                            onChanged: () { if (_phoneError != null) setState(() => _phoneError = null); },
                          ),
                        ),
                      ],
                    ),

                    if (_phoneError != null) ...[
                      const SizedBox(height: 8),
                      _InlineError(message: _phoneError!, c: c),
                    ],
                    const SizedBox(height: 20),

                    // Main CTA
                    _PrimaryBtn(
                      label: t('auth.getCode', lang),
                      loading: _phoneLoading,
                      c: c,
                      onTap: _sendPhoneOtp,
                    ),
                    const SizedBox(height: 28),

                    // Divider
                    _OrDivider(c: c, lang: lang),
                    const SizedBox(height: 20),

                    // Social buttons
                    Row(
                      children: [
                        Expanded(
                          child: _SocialBtn(
                            icon: Icons.g_mobiledata_rounded,
                            label: 'Google',
                            c: c,
                            onTap: () => launchUrl(
                              Uri.parse('https://tajcar.tj/auth/login'),
                              mode: LaunchMode.externalApplication,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _SocialBtn(
                            icon: Icons.send_rounded,
                            label: 'Telegram',
                            c: c,
                            onTap: _openTelegramSheet,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _SocialBtn(
                            icon: Icons.mail_outline_rounded,
                            label: 'Email',
                            c: c,
                            onTap: _openEmailSheet,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),

                    // Register link
                    GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => context.push('/register'),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Center(child: RichText(
                          text: TextSpan(
                            text: '${t('auth.noAccount', lang)} ',
                            style: GoogleFonts.outfit(color: c.textMuted, fontSize: 14),
                            children: [
                              TextSpan(
                                text: t('auth.register', lang),
                                style: GoogleFonts.outfit(
                                  color: c.accent,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          )),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO — orange top section with logo
// ─────────────────────────────────────────────────────────────────────────────

class _HeroTop extends StatelessWidget {
  final AppColors c;
  final String lang;

  const _HeroTop({required this.c, required this.lang});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: c.accent,
      child: SafeArea(
        bottom: false,
        child: SizedBox(
          height: 210,
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                RichText(
                  text: const TextSpan(
                    children: [
                      TextSpan(
                        text: 'Taj',
                        style: TextStyle(
                          fontSize: 48,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -1.5,
                          height: 1,
                        ),
                      ),
                      TextSpan(
                        text: 'Car',
                        style: TextStyle(
                          fontSize: 48,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFFFFD0C0),
                          letterSpacing: -1.5,
                          height: 1,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  t('auth.subtitle', lang),
                  style: GoogleFonts.outfit(
                    color: Colors.white.withValues(alpha: 0.75),
                    fontSize: 13,
                    fontWeight: FontWeight.w400,
                    letterSpacing: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phone text field
// ─────────────────────────────────────────────────────────────────────────────

class _PhoneField extends StatelessWidget {
  final TextEditingController ctrl;
  final AppColors c;
  final String lang;
  final bool hasError;
  final VoidCallback onChanged;

  const _PhoneField({
    required this.ctrl,
    required this.c,
    required this.lang,
    required this.hasError,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: TextField(
        controller: ctrl,
        keyboardType: TextInputType.phone,
        onChanged: (_) => onChanged(),
        style: GoogleFonts.outfit(
          color: c.text, fontSize: 16, fontWeight: FontWeight.w600,
        ),
        decoration: InputDecoration(
          hintText: '900 00 00 00',
          hintStyle: GoogleFonts.outfit(color: c.textMuted, fontSize: 15),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 17),
          filled: true,
          fillColor: c.surface,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: hasError ? AppColors.colorError : c.border, width: 1.2),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: hasError ? AppColors.colorError : c.border, width: 1.2),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: hasError ? AppColors.colorError : c.accent, width: 1.8),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline error text
// ─────────────────────────────────────────────────────────────────────────────

class _InlineError extends StatelessWidget {
  final String message;
  final AppColors c;

  const _InlineError({required this.message, required this.c});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(Icons.error_outline_rounded, color: AppColors.colorError, size: 15),
        const SizedBox(width: 6),
        Text(
          message,
          style: GoogleFonts.outfit(color: AppColors.colorError, fontSize: 12.5),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Primary CTA button
// ─────────────────────────────────────────────────────────────────────────────

class _PrimaryBtn extends StatelessWidget {
  final String label;
  final bool loading;
  final AppColors c;
  final VoidCallback? onTap;

  const _PrimaryBtn({required this.label, required this.loading, required this.c, this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: loading ? null : onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: c.accent,
          foregroundColor: Colors.white,
          disabledBackgroundColor: c.accent.withValues(alpha: 0.5),
          elevation: 0,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        child: loading
            ? const SizedBox(
                width: 22, height: 22,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    label,
                    style: GoogleFonts.outfit(
                      fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 0.1,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.arrow_forward_rounded, size: 18),
                ],
              ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Or divider
// ─────────────────────────────────────────────────────────────────────────────

class _OrDivider extends StatelessWidget {
  final AppColors c;
  final String lang;

  const _OrDivider({required this.c, required this.lang});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Divider(color: c.border, thickness: 1)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Text(
            t('auth.or', lang),
            style: GoogleFonts.outfit(color: c.textMuted, fontSize: 13),
          ),
        ),
        Expanded(child: Divider(color: c.border, thickness: 1)),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Social method button
// ─────────────────────────────────────────────────────────────────────────────

class _SocialBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final AppColors c;
  final VoidCallback onTap;

  const _SocialBtn({
    required this.icon,
    required this.label,
    required this.c,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: c.border, width: 1.2),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: c.accent, size: 20),
            const SizedBox(height: 2),
            Text(
              label,
              style: GoogleFonts.outfit(
                color: c.textSecondary, fontSize: 11, fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Telegram bottom sheet
// ─────────────────────────────────────────────────────────────────────────────

class _TelegramBottomSheet extends StatefulWidget {
  final AppColors c;
  final String lang;

  const _TelegramBottomSheet({required this.c, required this.lang});

  @override
  State<_TelegramBottomSheet> createState() => _TelegramBottomSheetState();
}

class _TelegramBottomSheetState extends State<_TelegramBottomSheet> {
  CountryCode _country = CountryCode.all.first;
  final _phoneCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final phone = _country.dialCode + _phoneCtrl.text.trim();
    if (_phoneCtrl.text.trim().isEmpty) return;
    setState(() => _loading = true);
    try {
      final link = await context.read<ApiService>().sendTelegramOtp(phone);
      if (mounted && link.isNotEmpty) {
        final uri = Uri.parse(link);
        if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
      if (mounted) {
        Navigator.pop(context);
        context.push('/otp', extra: {'phone': phone, 'mode': 'login'});
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.c;
    final lang = widget.lang;
    return Container(
      padding: EdgeInsets.fromLTRB(24, 20, 24, MediaQuery.of(context).viewInsets.bottom + 32),
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: c.border, borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: c.accent.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.send_rounded, color: c.accent, size: 20),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Telegram', style: GoogleFonts.outfit(
                    color: c.text, fontSize: 18, fontWeight: FontWeight.w800,
                  )),
                  Text(
                    t('auth.telegramAccountPhone', lang),
                    style: GoogleFonts.outfit(color: c.textMuted, fontSize: 13),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              CountryPickerButton(selected: _country, onChanged: (cc) => setState(() => _country = cc), c: c),
              const SizedBox(width: 10),
              Expanded(
                child: SizedBox(
                  height: 56,
                  child: TextField(
                    controller: _phoneCtrl,
                    keyboardType: TextInputType.phone,
                    autofocus: true,
                    style: GoogleFonts.outfit(color: c.text, fontSize: 16, fontWeight: FontWeight.w600),
                    decoration: InputDecoration(
                      hintText: '900 00 00 00',
                      hintStyle: GoogleFonts.outfit(color: c.textMuted),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 17),
                      filled: true,
                      fillColor: c.surface,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: c.border)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: c.border)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: c.accent, width: 1.8)),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _PrimaryBtn(
            label: t('auth.sendCodeBtn', lang),
            loading: _loading,
            c: c,
            onTap: _send,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Email bottom sheet
// ─────────────────────────────────────────────────────────────────────────────

class _EmailBottomSheet extends StatefulWidget {
  final AppColors c;
  final String lang;

  const _EmailBottomSheet({required this.c, required this.lang});

  @override
  State<_EmailBottomSheet> createState() => _EmailBottomSheetState();
}

class _EmailBottomSheetState extends State<_EmailBottomSheet> {
  final _emailCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    // OTP screen handles sending the code on load — just navigate
    Navigator.pop(context);
    context.push('/otp', extra: {'email': _emailCtrl.text.trim(), 'mode': 'email'});
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.c;
    final lang = widget.lang;
    return Container(
      padding: EdgeInsets.fromLTRB(24, 20, 24, MediaQuery.of(context).viewInsets.bottom + 32),
      decoration: BoxDecoration(
        color: c.bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(color: c.border, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: c.accent.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.mail_outline_rounded, color: c.accent, size: 20),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Email', style: GoogleFonts.outfit(color: c.text, fontSize: 18, fontWeight: FontWeight.w800)),
                    Text(
                      t('auth.emailSubtitle', lang),
                      style: GoogleFonts.outfit(color: c.textMuted, fontSize: 13),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (_error != null) ...[
              _InlineError(message: _error!, c: c),
              const SizedBox(height: 10),
            ],
            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              autofocus: true,
              style: GoogleFonts.outfit(color: c.text, fontSize: 16, fontWeight: FontWeight.w500),
              decoration: InputDecoration(
                hintText: 'your@email.com',
                hintStyle: GoogleFonts.outfit(color: c.textMuted),
                prefixIcon: Icon(Icons.mail_outline_rounded, color: c.textMuted, size: 20),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 17),
                filled: true,
                fillColor: c.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: c.border)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: c.border)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: c.accent, width: 1.8)),
              ),
              validator: (v) => (v == null || !v.contains('@')) ? t('error.invalidEmail', lang) : null,
            ),
            const SizedBox(height: 16),
            _PrimaryBtn(
              label: t('auth.getCode', lang),
              loading: _loading,
              c: c,
              onTap: _submit,
            ),
          ],
        ),
      ),
    );
  }
}
