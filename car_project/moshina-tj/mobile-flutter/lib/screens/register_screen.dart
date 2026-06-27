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

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  CountryCode _country = CountryCode.all.first;
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _phoneLoading = false;
  String? _nameError;
  String? _phoneError;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendPhoneOtp() async {
    final name = _nameCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    final lang = context.read<LanguageProvider>().lang;

    setState(() { _nameError = null; _phoneError = null; });

    if (name.length < 2) {
      setState(() => _nameError = t('auth.nameMinLength', lang));
      return;
    }
    if (phone.isEmpty) {
      setState(() => _phoneError = t('error.enterPhone', lang));
      return;
    }

    setState(() => _phoneLoading = true);
    try {
      final fullPhone = _country.dialCode + phone;
      await context.read<ApiService>().sendPhoneOtp(fullPhone);
      if (mounted) {
        context.push('/otp', extra: {
          'phone': fullPhone,
          'mode': 'register',
          'name': name,
        });
      }
    } catch (_) {
      if (mounted) setState(() => _phoneError = t('error.sendCodeFailed', context.read<LanguageProvider>().lang));
    } finally {
      if (mounted) setState(() => _phoneLoading = false);
    }
  }

  Future<void> _googleRegister() async {
    await launchUrl(
      Uri.parse('https://tajcar.tj/auth/login'),
      mode: LaunchMode.externalApplication,
    );
  }

  void _openEmailSheet() {
    final c = context.colors;
    final lang = context.read<LanguageProvider>().lang;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _EmailRegisterSheet(c: c, lang: lang, name: _nameCtrl.text.trim()),
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
          // ── HERO TOP ──────────────────────────────────────────────────────
          _RegisterHeroTop(c: c, lang: lang),

          // ── FORM CARD ─────────────────────────────────────────────────────
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
                      lang == 'ru' ? 'Создайте аккаунт' : 'Аккаунт созед',
                      style: GoogleFonts.outfit(
                        color: c.text,
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      lang == 'ru' ? 'Займёт меньше минуты' : 'Камтар аз як дақиқа мегирад',
                      style: GoogleFonts.outfit(color: c.textMuted, fontSize: 14),
                    ),
                    const SizedBox(height: 24),

                    // Name field
                    _InputField(
                      ctrl: _nameCtrl,
                      hint: lang == 'ru' ? 'Ваше имя' : 'Номи шумо',
                      icon: Icons.person_outline_rounded,
                      c: c,
                      hasError: _nameError != null,
                      onChanged: () { if (_nameError != null) setState(() => _nameError = null); },
                      textCapitalization: TextCapitalization.words,
                    ),
                    if (_nameError != null) ...[
                      const SizedBox(height: 6),
                      _InlineError(message: _nameError!, c: c),
                    ],
                    const SizedBox(height: 12),

                    // Phone row
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
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
                      const SizedBox(height: 6),
                      _InlineError(message: _phoneError!, c: c),
                    ],
                    const SizedBox(height: 20),

                    // Main CTA
                    _PrimaryBtn(
                      label: lang == 'ru' ? 'Создать аккаунт' : 'Аккаунт созед',
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
                            onTap: _googleRegister,
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

                    // Login link
                    GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => context.pop(),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Center(child: RichText(
                          text: TextSpan(
                            text: '${t('auth.hasAccount', lang)} ',
                            style: GoogleFonts.outfit(color: c.textMuted, fontSize: 14),
                            children: [
                              TextSpan(
                                text: t('auth.login', lang),
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
// Register hero top — same orange bg, small back button
// ─────────────────────────────────────────────────────────────────────────────

class _RegisterHeroTop extends StatelessWidget {
  final AppColors c;
  final String lang;

  const _RegisterHeroTop({required this.c, required this.lang});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: c.accent,
      child: SafeArea(
        bottom: false,
        child: SizedBox(
          height: 180,
          child: Stack(
            children: [
              // Back button
              Positioned(
                top: 12,
                left: 16,
                child: GestureDetector(
                  onTap: () => context.pop(),
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.arrow_back_rounded, color: Colors.white, size: 20),
                  ),
                ),
              ),
              // Logo centered
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Image.asset(
                      'assets/images/splash_logo.png',
                      height: 70,
                      width: 70,
                      color: Colors.white,
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic input field
// ─────────────────────────────────────────────────────────────────────────────

class _InputField extends StatelessWidget {
  final TextEditingController ctrl;
  final String hint;
  final IconData icon;
  final AppColors c;
  final bool hasError;
  final VoidCallback onChanged;
  final TextCapitalization textCapitalization;

  const _InputField({
    required this.ctrl,
    required this.hint,
    required this.icon,
    required this.c,
    required this.hasError,
    required this.onChanged,
    this.textCapitalization = TextCapitalization.none,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: TextField(
        controller: ctrl,
        textCapitalization: textCapitalization,
        onChanged: (_) => onChanged(),
        style: GoogleFonts.outfit(color: c.text, fontSize: 16, fontWeight: FontWeight.w500),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.outfit(color: c.textMuted, fontSize: 15),
          prefixIcon: Icon(icon, color: c.textMuted, size: 20),
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
// Shared phone field (same as in login)
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
        style: GoogleFonts.outfit(color: c.text, fontSize: 16, fontWeight: FontWeight.w600),
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
// Shared small widgets (copied from login, private to this file)
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
        Text(message, style: GoogleFonts.outfit(color: AppColors.colorError, fontSize: 12.5)),
      ],
    );
  }
}

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
            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(label, style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 0.1)),
                  const SizedBox(width: 8),
                  const Icon(Icons.arrow_forward_rounded, size: 18),
                ],
              ),
      ),
    );
  }
}

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
          child: Text(t('auth.or', lang), style: GoogleFonts.outfit(color: c.textMuted, fontSize: 13)),
        ),
        Expanded(child: Divider(color: c.border, thickness: 1)),
      ],
    );
  }
}

class _SocialBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final AppColors c;
  final VoidCallback onTap;
  const _SocialBtn({required this.icon, required this.label, required this.c, required this.onTap});

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
            Text(label, style: GoogleFonts.outfit(color: c.textSecondary, fontSize: 11, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Email registration bottom sheet
// ─────────────────────────────────────────────────────────────────────────────

class _EmailRegisterSheet extends StatefulWidget {
  final AppColors c;
  final String lang;
  final String name;

  const _EmailRegisterSheet({required this.c, required this.lang, required this.name});

  @override
  State<_EmailRegisterSheet> createState() => _EmailRegisterSheetState();
}

class _EmailRegisterSheetState extends State<_EmailRegisterSheet> {
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
    context.push('/otp', extra: {
      'email': _emailCtrl.text.trim(),
      'mode': 'email',
      'name': widget.name,
    });
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
                      lang == 'ru' ? 'Пришлём код для подтверждения' : 'Коди тасдиқ мефиристем',
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
