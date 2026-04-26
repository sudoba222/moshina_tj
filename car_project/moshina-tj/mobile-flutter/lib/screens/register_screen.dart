import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
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
      setState(() => _phoneError = 'Введите номер телефона');
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
        final encodedPhone = Uri.encodeComponent(fullPhone);
        final encodedName = Uri.encodeComponent(name.isEmpty ? '' : name);
        context.push('/otp?phone=$encodedPhone&mode=register&name=$encodedName');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _phoneError = 'Ошибка отправки кода. Проверьте номер.');
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
        final encodedEmail = Uri.encodeComponent(_emailCtrl.text.trim());
        context.push('/otp?email=$encodedEmail&mode=email');
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
              if (v == null || v.trim().length < 2) return 'Минимум 2 символа';
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
              if (v == null || !v.contains('@')) return 'Введите корректный email';
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
