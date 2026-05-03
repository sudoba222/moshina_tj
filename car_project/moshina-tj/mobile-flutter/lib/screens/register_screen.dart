import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
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
  late TabController _tabCtrl;
  late AnimationController _fadeCtrl;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  // Phone OTP tab
  CountryCode _country = CountryCode.all.first;
  final _phoneNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _phoneLoading = false;
  String? _phoneError;

  // Email tab
  final _emailFormKey = GlobalKey<FormState>();
  final _emailNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  bool _emailLoading = false;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
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
    _tabCtrl.dispose();
    _phoneNameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailNameCtrl.dispose();
    _emailCtrl.dispose();
    _fadeCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendPhoneOtp() async {
    final name = _phoneNameCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    if (phone.isEmpty) {
      final lang = context.read<LanguageProvider>().lang;
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
        final lang = context.read<LanguageProvider>().lang;
        setState(() => _phoneError = t('error.sendCodeFailed', lang));
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
      _emailNameCtrl.text.trim(),
    );
    if (mounted) {
      setState(() => _emailLoading = false);
      if (ok) {
        context.push('/otp', extra: {'email': _emailCtrl.text.trim(), 'mode': 'email'});
      }
    }
  }

  double _hPad(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    if (w < 360) return 18;
    if (w < 400) return 22;
    return 28;
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
          // Subtle gradient backdrop
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
          // Decorative blob
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
                    children: [
                      const SizedBox(height: 16),
                      // Back button
                      Align(
                        alignment: Alignment.centerLeft,
                        child: GestureDetector(
                          onTap: () => context.pop(),
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: c.card,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: c.border),
                            ),
                            child: Icon(Icons.arrow_back_rounded, color: c.text, size: 20),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      AuthHeroSection(c: c, lang: lang),
                      const SizedBox(height: 28),
                      // Form card
                      Container(
                        decoration: BoxDecoration(
                          color: c.card,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 20, offset: const Offset(0, 4)),
                            BoxShadow(color: c.accent.withValues(alpha: 0.04), blurRadius: 30, offset: const Offset(0, 8)),
                          ],
                        ),
                        child: Column(
                          children: [
                            // Tabs
                            Container(
                              margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                              decoration: BoxDecoration(
                                color: c.bg,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: TabBar(
                                controller: _tabCtrl,
                                indicator: BoxDecoration(
                                  color: c.accent,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                indicatorSize: TabBarIndicatorSize.tab,
                                labelColor: Colors.white,
                                unselectedLabelColor: c.textMuted,
                                labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 14),
                                unselectedLabelStyle: GoogleFonts.outfit(fontWeight: FontWeight.w500, fontSize: 14),
                                dividerColor: Colors.transparent,
                                tabs: [
                                  Tab(text: t('auth.phoneTab', lang)),
                                  Tab(text: t('auth.emailTab', lang)),
                                ],
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                              child: Column(
                                children: [
                                  if (authError != null) ...[
                                    AuthErrorBanner(message: authError),
                                    const SizedBox(height: 14),
                                  ],
                                  SizedBox(
                                    height: 320,
                                    child: TabBarView(
                                      controller: _tabCtrl,
                                      children: [
                                        _PhoneTab(
                                          nameCtrl: _phoneNameCtrl,
                                          phoneCtrl: _phoneCtrl,
                                          country: _country,
                                          onCountryChanged: (cc) => setState(() => _country = cc),
                                          loading: _phoneLoading,
                                          error: _phoneError,
                                          onSubmit: _sendPhoneOtp,
                                          lang: lang,
                                          c: c,
                                        ),
                                        _EmailTab(
                                          formKey: _emailFormKey,
                                          nameCtrl: _emailNameCtrl,
                                          emailCtrl: _emailCtrl,
                                          loading: _emailLoading,
                                          onSubmit: _submitEmail,
                                          lang: lang,
                                          c: c,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      // Social auth
                      Container(
                        decoration: BoxDecoration(
                          color: c.card,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: c.border),
                          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 16, offset: const Offset(0, 4))],
                        ),
                        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                        child: Column(
                          children: [
                            _RegisterDividerRow(c: c, lang: lang),
                            const SizedBox(height: 12),
                            OutlinedButton.icon(
                              onPressed: () => launchUrl(
                                Uri.parse('https://tajcar.tj/auth/login'),
                                mode: LaunchMode.externalApplication,
                              ),
                              icon: Icon(Icons.g_mobiledata_rounded, size: 22, color: c.accent),
                              label: Text(t('auth.continueGoogle', lang)),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: c.text,
                                side: BorderSide(color: c.border),
                                minimumSize: const Size(double.infinity, 48),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                            const SizedBox(height: 10),
                            OutlinedButton.icon(
                              onPressed: () => context.push('/login'),
                              icon: Icon(Icons.send_rounded, size: 18, color: c.accent),
                              label: Text(t('auth.continueTelegram', lang)),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: c.text,
                                side: BorderSide(color: c.border),
                                minimumSize: const Size(double.infinity, 48),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      AuthBottomLink(
                        prefix: t('auth.hasAccount', lang),
                        linkText: t('auth.login', lang),
                        onTap: () => context.pop(),
                        c: c,
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

class _PhoneTab extends StatelessWidget {
  final TextEditingController nameCtrl;
  final TextEditingController phoneCtrl;
  final CountryCode country;
  final ValueChanged<CountryCode> onCountryChanged;
  final bool loading;
  final String? error;
  final VoidCallback onSubmit;
  final String lang;
  final AppColors c;

  const _PhoneTab({
    required this.nameCtrl,
    required this.phoneCtrl,
    required this.country,
    required this.onCountryChanged,
    required this.loading,
    required this.error,
    required this.onSubmit,
    required this.lang,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AuthField(
          controller: nameCtrl,
          label: t('auth.fullName', lang),
          prefixIcon: Icons.badge_outlined,
          c: c,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            CountryPickerButton(selected: country, onChanged: onCountryChanged, c: c),
            const SizedBox(width: 8),
            Expanded(
              child: AuthField(
                controller: phoneCtrl,
                label: t('auth.phone', lang),
                prefixIcon: Icons.phone_outlined,
                c: c,
                keyboardType: TextInputType.phone,
                hint: '900 00 00 00',
              ),
            ),
          ],
        ),
        if (error != null) ...[
          const SizedBox(height: 10),
          AuthErrorBanner(message: error!),
        ],
        const Spacer(),
        AuthPrimaryButton(
          label: t('auth.getCode', lang),
          onPressed: loading ? null : onSubmit,
          loading: loading,
          c: c,
        ),
      ],
    );
  }
}

class _EmailTab extends StatelessWidget {
  final GlobalKey<FormState> formKey;
  final TextEditingController nameCtrl;
  final TextEditingController emailCtrl;
  final bool loading;
  final VoidCallback onSubmit;
  final String lang;
  final AppColors c;

  const _EmailTab({
    required this.formKey,
    required this.nameCtrl,
    required this.emailCtrl,
    required this.loading,
    required this.onSubmit,
    required this.lang,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: Column(
        children: [
          AuthField(
            controller: nameCtrl,
            label: t('auth.fullName', lang),
            prefixIcon: Icons.badge_outlined,
            c: c,
            validator: (v) {
              if (v == null || v.trim().length < 2) return t('auth.nameMinLength', lang);
              return null;
            },
          ),
          const SizedBox(height: 12),
          AuthField(
            controller: emailCtrl,
            label: 'Email',
            prefixIcon: Icons.email_outlined,
            c: c,
            keyboardType: TextInputType.emailAddress,
            validator: (v) {
              if (v == null || !v.contains('@')) return t('error.invalidEmail', lang);
              return null;
            },
          ),
          const SizedBox(height: 20),
          AuthPrimaryButton(
            label: t('auth.getCode', lang),
            onPressed: loading ? null : onSubmit,
            loading: loading,
            c: c,
          ),
        ],
      ),
    );
  }
}

class _RegisterDividerRow extends StatelessWidget {
  final AppColors c;
  final String lang;
  const _RegisterDividerRow({required this.c, required this.lang});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Divider(color: c.border, thickness: 1)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(t('auth.or', lang), style: TextStyle(color: c.textMuted, fontSize: 13)),
        ),
        Expanded(child: Divider(color: c.border, thickness: 1)),
      ],
    );
  }
}
