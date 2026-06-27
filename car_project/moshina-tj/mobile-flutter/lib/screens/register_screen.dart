import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/auth_provider.dart';
import '../providers/language_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';
import '../widgets/auth_widgets.dart';
import '../widgets/country_picker.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _fadeCtrl;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  // Shared name field (used for both phone and email registration)
  final _nameCtrl = TextEditingController();

  // Phone OTP
  CountryCode _country = CountryCode.all.first;
  final _phoneCtrl = TextEditingController();
  bool _phoneLoading = false;
  String? _phoneError;

  // Email OTP (expandable)
  bool _emailExpanded = false;
  final _emailFormKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  bool _emailLoading = false;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 520),
    );
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.06),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut));
    _fadeCtrl.forward();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _fadeCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendPhoneOtp() async {
    final name = _nameCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    final lang = context.read<LanguageProvider>().lang;
    if (phone.isEmpty) {
      setState(() => _phoneError = t('error.enterPhone', lang));
      return;
    }
    setState(() {
      _phoneLoading = true;
      _phoneError = null;
    });
    try {
      final api = context.read<ApiService>();
      final fullPhone = _country.dialCode + phone;
      await api.sendPhoneOtp(fullPhone);
      if (mounted) {
        context.push('/otp', extra: {
          'phone': fullPhone,
          'mode': 'register',
          if (name.isNotEmpty) 'name': name,
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _phoneError =
            t('error.sendCodeFailed', context.read<LanguageProvider>().lang));
      }
    } finally {
      if (mounted) setState(() => _phoneLoading = false);
    }
  }

  Future<void> _submitEmail() async {
    if (!_emailFormKey.currentState!.validate()) return;
    setState(() => _emailLoading = true);
    final auth = context.read<AuthProvider>();
    final ok = await auth.registerWithEmail(
      _emailCtrl.text.trim(),
      _nameCtrl.text.trim(),
    );
    if (mounted) {
      setState(() => _emailLoading = false);
      if (ok) {
        context.push('/otp',
            extra: {'email': _emailCtrl.text.trim(), 'mode': 'email'});
      }
    }
  }

  double _hPad(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    if (w < 360) return 18;
    if (w < 400) return 22;
    return 24;
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;
    final authError = context.select((AuthProvider p) => p.error);
    final hp = _hPad(context);

    return Scaffold(
      backgroundColor: c.bg,
      body: Stack(
        children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [c.bg, Color.lerp(c.bg, c.accent, 0.04)!],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 100,
            left: -80,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: c.accent.withValues(alpha: 0.05),
              ),
            ),
          ),
          SafeArea(
            child: FadeTransition(
              opacity: _fadeAnim,
              child: SlideTransition(
                position: _slideAnim,
                child: SingleChildScrollView(
                  padding: EdgeInsets.symmetric(horizontal: hp),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 16),

                      // Back button
                      Align(
                        alignment: Alignment.centerLeft,
                        child: GestureDetector(
                          onTap: () => context.pop(),
                          child: Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(
                              color: c.card,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: c.border),
                            ),
                            child: Icon(Icons.arrow_back_rounded,
                                color: c.text, size: 20),
                          ),
                        ),
                      ),
                      const SizedBox(height: 28),

                      AuthHeroSection(c: c, lang: lang),
                      const SizedBox(height: 32),

                      // Global auth error
                      if (authError != null) ...[
                        AuthErrorBanner(message: authError),
                        const SizedBox(height: 14),
                      ],

                      // Name field (shared by phone + email paths)
                      AuthField(
                        controller: _nameCtrl,
                        label: t('auth.fullName', lang),
                        prefixIcon: Icons.badge_outlined,
                        c: c,
                      ),
                      const SizedBox(height: 12),

                      // Phone error
                      if (_phoneError != null) ...[
                        AuthErrorBanner(message: _phoneError!),
                        const SizedBox(height: 10),
                      ],

                      // Phone input row
                      Row(
                        children: [
                          CountryPickerButton(
                            selected: _country,
                            onChanged: (cc) => setState(() => _country = cc),
                            c: c,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: SizedBox(
                              height: 56,
                              child: TextField(
                                controller: _phoneCtrl,
                                keyboardType: TextInputType.phone,
                                onChanged: (_) {
                                  if (_phoneError != null) {
                                    setState(() => _phoneError = null);
                                  }
                                },
                                style: TextStyle(
                                  color: c.text,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                                decoration: InputDecoration(
                                  hintText: '900 00 00 00',
                                  hintStyle: TextStyle(
                                      color: c.textMuted, fontSize: 15),
                                  contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 17),
                                  filled: true,
                                  fillColor: c.surface,
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(14),
                                    borderSide: BorderSide(
                                        color: c.border, width: 1.2),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(14),
                                    borderSide: BorderSide(
                                        color: c.border, width: 1.2),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(14),
                                    borderSide: BorderSide(
                                        color: c.accent, width: 1.8),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Phone CTA
                      AuthPrimaryButton(
                        loading: _phoneLoading,
                        label: t('auth.getCode', lang),
                        onPressed: _sendPhoneOtp,
                        c: c,
                      ),
                      const SizedBox(height: 20),

                      // Expandable email section
                      _EmailSection(
                        lang: lang,
                        c: c,
                        expanded: _emailExpanded,
                        onToggle: () =>
                            setState(() => _emailExpanded = !_emailExpanded),
                        formKey: _emailFormKey,
                        emailCtrl: _emailCtrl,
                        loading: _emailLoading,
                        onSubmit: _submitEmail,
                      ),
                      const SizedBox(height: 28),

                      // Divider + Google (Telegram removed from register)
                      _DividerRow(c: c, lang: lang),
                      const SizedBox(height: 16),
                      OutlinedButton.icon(
                        onPressed: () => launchUrl(
                          Uri.parse('https://tajcar.tj/auth/login'),
                          mode: LaunchMode.externalApplication,
                        ),
                        icon: Icon(Icons.g_mobiledata_rounded,
                            size: 22, color: c.accent),
                        label: Text(t('auth.continueGoogle', lang)),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: c.text,
                          side: BorderSide(color: c.border),
                          minimumSize: const Size(double.infinity, 52),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14)),
                        ),
                      ),
                      const SizedBox(height: 28),

                      Center(
                        child: AuthBottomLink(
                          prefix: t('auth.hasAccount', lang),
                          linkText: t('auth.login', lang),
                          onTap: () => context.pop(),
                          c: c,
                        ),
                      ),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Expandable email registration section
// ---------------------------------------------------------------------------

class _EmailSection extends StatelessWidget {
  final String lang;
  final AppColors c;
  final bool expanded;
  final VoidCallback onToggle;
  final GlobalKey<FormState> formKey;
  final TextEditingController emailCtrl;
  final bool loading;
  final VoidCallback onSubmit;

  const _EmailSection({
    required this.lang,
    required this.c,
    required this.expanded,
    required this.onToggle,
    required this.formKey,
    required this.emailCtrl,
    required this.loading,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        GestureDetector(
          onTap: onToggle,
          behavior: HitTestBehavior.opaque,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Text(
              expanded
                  ? (lang == 'ru'
                      ? 'Скрыть Email'
                      : 'Email-ро пинҳон кунед')
                  : (lang == 'ru'
                      ? 'или зарегистрироваться через Email'
                      : 'ё тавассути Email сабт кардан'),
              style: TextStyle(
                color: c.accent,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
        ClipRect(
          child: AnimatedSize(
            duration: const Duration(milliseconds: 280),
            curve: Curves.easeInOut,
            child: expanded
                ? Padding(
                    padding: const EdgeInsets.only(top: 14),
                    child: Form(
                      key: formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          AuthField(
                            controller: emailCtrl,
                            label: 'Email',
                            prefixIcon: Icons.email_outlined,
                            keyboardType: TextInputType.emailAddress,
                            c: c,
                            validator: (v) {
                              if (v == null || !v.contains('@')) {
                                return t('error.invalidEmail', lang);
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 8),
                          Text(
                            lang == 'ru'
                                ? 'Отправим код на email'
                                : 'Коди тасдиқро ба email мефиристем',
                            style: TextStyle(color: c.textMuted, fontSize: 12),
                          ),
                          const SizedBox(height: 14),
                          AuthPrimaryButton(
                            loading: loading,
                            label: t('auth.getCode', lang),
                            onPressed: onSubmit,
                            c: c,
                          ),
                        ],
                      ),
                    ),
                  )
                : const SizedBox.shrink(),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Divider with "или" label
// ---------------------------------------------------------------------------

class _DividerRow extends StatelessWidget {
  final AppColors c;
  final String lang;
  const _DividerRow({required this.c, required this.lang});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Divider(color: c.border, thickness: 1)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            t('auth.or', lang),
            style: TextStyle(color: c.textMuted, fontSize: 13),
          ),
        ),
        Expanded(child: Divider(color: c.border, thickness: 1)),
      ],
    );
  }
}
