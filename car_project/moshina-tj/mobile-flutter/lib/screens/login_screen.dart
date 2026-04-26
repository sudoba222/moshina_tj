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

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  late AnimationController _fadeCtrl;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  // Phone tab
  CountryCode _selectedCountry = CountryCode.all.first;
  final _phoneCtrl = TextEditingController();
  bool _phoneLoading = false;
  String? _phoneError;

  // Email tab
  final _emailFormKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscure = true;
  bool _emailLoading = false;

  // Telegram OTP inline
  bool _showTelegramPhoneField = false;
  final _tgPhoneCtrl = TextEditingController();
  bool _tgLoading = false;

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
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _tgPhoneCtrl.dispose();
    _fadeCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendPhoneOtp() async {
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
      await api.sendPhoneOtp(_selectedCountry.dialCode + phone);
      if (mounted) {
        context.push('/otp?phone=${Uri.encodeComponent(_selectedCountry.dialCode + phone)}&mode=login');
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
    final ok = await auth.loginWithEmail(
      _emailCtrl.text.trim(),
      _passCtrl.text,
    );
    if (mounted) {
      setState(() => _emailLoading = false);
      if (ok) context.go('/');
    }
  }

  Future<void> _sendTelegramOtp() async {
    final phone = _tgPhoneCtrl.text.trim();
    if (phone.isEmpty) return;
    setState(() => _tgLoading = true);
    try {
      final api = context.read<ApiService>();
      final link = await api.sendTelegramOtp(phone);
      if (mounted && link.isNotEmpty) {
        final uri = Uri.parse(link);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ошибка отправки через Telegram')),
        );
      }
    } finally {
      if (mounted) setState(() => _tgLoading = false);
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
    final screenH = MediaQuery.of(context).size.height;
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
            top: -60,
            right: -60,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: c.accent.withValues(alpha: 0.06),
              ),
            ),
          ),
          Positioned(
            bottom: 80,
            left: -80,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: c.accent.withValues(alpha: 0.04),
              ),
            ),
          ),
          SafeArea(
            child: FadeTransition(
              opacity: _fadeAnim,
              child: SlideTransition(
                position: _slideAnim,
                child: SingleChildScrollView(
                  padding: EdgeInsets.symmetric(horizontal: hp, vertical: 8),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight:
                          screenH - MediaQuery.of(context).padding.top - 16,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SizedBox(height: screenH * 0.06),
                        AuthHeroSection(c: c, lang: lang),
                        SizedBox(height: screenH * 0.045),
                        _FormCard(
                          tabCtrl: _tabCtrl,
                          c: c,
                          lang: lang,
                          selectedCountry: _selectedCountry,
                          onCountryChanged: (code) =>
                              setState(() => _selectedCountry = code),
                          phoneCtrl: _phoneCtrl,
                          phoneLoading: _phoneLoading,
                          phoneError: _phoneError,
                          onSendPhoneOtp: _sendPhoneOtp,
                          emailFormKey: _emailFormKey,
                          emailCtrl: _emailCtrl,
                          passCtrl: _passCtrl,
                          obscure: _obscure,
                          onToggleObscure: () =>
                              setState(() => _obscure = !_obscure),
                          emailLoading: _emailLoading,
                          emailError: authError,
                          onSubmitEmail: _submitEmail,
                          showTelegramField: _showTelegramPhoneField,
                          onShowTelegramField: () =>
                              setState(() => _showTelegramPhoneField = true),
                          tgPhoneCtrl: _tgPhoneCtrl,
                          tgLoading: _tgLoading,
                          onSendTelegramOtp: _sendTelegramOtp,
                        ),
                        const SizedBox(height: 28),
                        AuthBottomLink(
                          prefix: t('auth.noAccount', lang),
                          linkText: t('auth.register', lang),
                          onTap: () => context.push('/register'),
                          c: c,
                        ),
                        const SizedBox(height: 32),
                      ],
                    ),
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

class _FormCard extends StatelessWidget {
  final TabController tabCtrl;
  final AppColors c;
  final String lang;
  final CountryCode selectedCountry;
  final ValueChanged<CountryCode> onCountryChanged;
  final TextEditingController phoneCtrl;
  final bool phoneLoading;
  final String? phoneError;
  final VoidCallback onSendPhoneOtp;
  final GlobalKey<FormState> emailFormKey;
  final TextEditingController emailCtrl;
  final TextEditingController passCtrl;
  final bool obscure;
  final VoidCallback onToggleObscure;
  final bool emailLoading;
  final String? emailError;
  final VoidCallback onSubmitEmail;
  final bool showTelegramField;
  final VoidCallback onShowTelegramField;
  final TextEditingController tgPhoneCtrl;
  final bool tgLoading;
  final VoidCallback onSendTelegramOtp;

  const _FormCard({
    required this.tabCtrl,
    required this.c,
    required this.lang,
    required this.selectedCountry,
    required this.onCountryChanged,
    required this.phoneCtrl,
    required this.phoneLoading,
    required this.phoneError,
    required this.onSendPhoneOtp,
    required this.emailFormKey,
    required this.emailCtrl,
    required this.passCtrl,
    required this.obscure,
    required this.onToggleObscure,
    required this.emailLoading,
    required this.emailError,
    required this.onSubmitEmail,
    required this.showTelegramField,
    required this.onShowTelegramField,
    required this.tgPhoneCtrl,
    required this.tgLoading,
    required this.onSendTelegramOtp,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
        ],
        border: Border.all(color: c.border),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // TabBar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Container(
              decoration: BoxDecoration(
                color: c.bg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: TabBar(
                controller: tabCtrl,
                indicator: BoxDecoration(
                  color: c.accent,
                  borderRadius: BorderRadius.circular(10),
                ),
                indicatorSize: TabBarIndicatorSize.tab,
                labelColor: Colors.white,
                unselectedLabelColor: c.textMuted,
                dividerColor: Colors.transparent,
                tabs: [
                  Tab(text: t('auth.phoneTab', lang)),
                  Tab(text: t('auth.emailTab', lang)),
                ],
              ),
            ),
          ),
          // Tab content
          SizedBox(
            height: 220,
            child: TabBarView(
              controller: tabCtrl,
              children: [
                _PhoneTab(
                  c: c,
                  lang: lang,
                  selectedCountry: selectedCountry,
                  onCountryChanged: onCountryChanged,
                  phoneCtrl: phoneCtrl,
                  loading: phoneLoading,
                  error: phoneError,
                  onSend: onSendPhoneOtp,
                ),
                _EmailTab(
                  c: c,
                  lang: lang,
                  formKey: emailFormKey,
                  emailCtrl: emailCtrl,
                  passCtrl: passCtrl,
                  obscure: obscure,
                  onToggleObscure: onToggleObscure,
                  loading: emailLoading,
                  error: emailError,
                  onSubmit: onSubmitEmail,
                ),
              ],
            ),
          ),
          // Divider + social buttons
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: Column(
              children: [
                _DividerRow(c: c),
                const SizedBox(height: 12),
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
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 10),
                if (!showTelegramField)
                  OutlinedButton.icon(
                    onPressed: onShowTelegramField,
                    icon: Icon(Icons.send_rounded, size: 18, color: c.accent),
                    label: Text(t('auth.continueTelegram', lang)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: c.text,
                      side: BorderSide(color: c.border),
                      minimumSize: const Size(double.infinity, 48),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                  )
                else
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: tgPhoneCtrl,
                          keyboardType: TextInputType.phone,
                          style: TextStyle(color: c.text, fontSize: 14),
                          decoration: InputDecoration(
                            hintText: t('auth.telegramHint', lang),
                            hintStyle:
                                TextStyle(color: c.textMuted, fontSize: 13),
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: BorderSide(color: c.border),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: BorderSide(color: c.border),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide:
                                  BorderSide(color: c.accent, width: 1.5),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        height: 48,
                        child: ElevatedButton(
                          onPressed: tgLoading ? null : onSendTelegramOtp,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: c.accent,
                            foregroundColor: Colors.white,
                            minimumSize: Size.zero,
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10)),
                          ),
                          child: tgLoading
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                      color: Colors.white, strokeWidth: 2))
                              : const Icon(Icons.send_rounded, size: 18),
                        ),
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

class _PhoneTab extends StatelessWidget {
  final AppColors c;
  final String lang;
  final CountryCode selectedCountry;
  final ValueChanged<CountryCode> onCountryChanged;
  final TextEditingController phoneCtrl;
  final bool loading;
  final String? error;
  final VoidCallback onSend;

  const _PhoneTab({
    required this.c,
    required this.lang,
    required this.selectedCountry,
    required this.onCountryChanged,
    required this.phoneCtrl,
    required this.loading,
    required this.error,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (error != null) ...[
            AuthErrorBanner(message: error!),
            const SizedBox(height: 10),
          ],
          Row(
            children: [
              CountryPickerButton(
                selected: selectedCountry,
                onChanged: onCountryChanged,
                c: c,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: SizedBox(
                  height: 56,
                  child: TextField(
                    controller: phoneCtrl,
                    keyboardType: TextInputType.phone,
                    style: TextStyle(
                        color: c.text,
                        fontSize: 15,
                        fontWeight: FontWeight.w500),
                    decoration: InputDecoration(
                      hintText: '900 00 00 00',
                      hintStyle: TextStyle(color: c.textMuted, fontSize: 14),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 17),
                      filled: true,
                      fillColor: c.surface,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: c.border, width: 1.2),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: c.border, width: 1.2),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: c.accent, width: 1.8),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          AuthPrimaryButton(
            loading: loading,
            label: t('auth.getCode', lang),
            onPressed: onSend,
            c: c,
          ),
        ],
      ),
    );
  }
}

class _EmailTab extends StatelessWidget {
  final AppColors c;
  final String lang;
  final GlobalKey<FormState> formKey;
  final TextEditingController emailCtrl;
  final TextEditingController passCtrl;
  final bool obscure;
  final VoidCallback onToggleObscure;
  final bool loading;
  final String? error;
  final VoidCallback onSubmit;

  const _EmailTab({
    required this.c,
    required this.lang,
    required this.formKey,
    required this.emailCtrl,
    required this.passCtrl,
    required this.obscure,
    required this.onToggleObscure,
    required this.loading,
    required this.error,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
      child: Form(
        key: formKey,
        child: Column(
          children: [
            if (error != null) ...[
              AuthErrorBanner(message: error!),
              const SizedBox(height: 10),
            ],
            AuthField(
              controller: emailCtrl,
              label: 'Email',
              prefixIcon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              c: c,
              validator: (v) {
                if (v == null || v.trim().isEmpty) {
                  return 'Введите email';
                }
                return null;
              },
            ),
            const SizedBox(height: 10),
            AuthField(
              controller: passCtrl,
              label: t('auth.password', lang),
              prefixIcon: Icons.lock_outline_rounded,
              obscureText: obscure,
              c: c,
              suffixIcon: IconButton(
                icon: Icon(
                  obscure
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  color: c.textMuted,
                  size: 20,
                ),
                onPressed: onToggleObscure,
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Введите пароль';
                return null;
              },
            ),
            const SizedBox(height: 10),
            AuthPrimaryButton(
              loading: loading,
              label: t('auth.login', lang),
              onPressed: onSubmit,
              c: c,
            ),
          ],
        ),
      ),
    );
  }
}

class _DividerRow extends StatelessWidget {
  final AppColors c;
  const _DividerRow({required this.c});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Divider(color: c.border, thickness: 1)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            'или',
            style: TextStyle(color: c.textMuted, fontSize: 13),
          ),
        ),
        Expanded(child: Divider(color: c.border, thickness: 1)),
      ],
    );
  }
}
