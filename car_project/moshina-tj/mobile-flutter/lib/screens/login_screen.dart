import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
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
  late AnimationController _fadeCtrl;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  // Phone
  CountryCode _selectedCountry = CountryCode.all.first;
  final _phoneCtrl = TextEditingController();
  bool _phoneLoading = false;
  String? _phoneError;

  // Email (expandable inline)
  bool _emailExpanded = false;
  final _emailFormKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  bool _emailLoading = false;
  String? _emailError;

  // Telegram (expandable inline)
  bool _telegramExpanded = false;
  final _tgPhoneCtrl = TextEditingController();
  bool _tgLoading = false;

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
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _tgPhoneCtrl.dispose();
    _fadeCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendPhoneOtp() async {
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
      final fullPhone = _selectedCountry.dialCode + phone;
      await api.sendPhoneOtp(fullPhone);
      if (mounted) {
        context.push('/otp', extra: {'phone': fullPhone, 'mode': 'login'});
      }
    } catch (e) {
      if (mounted) {
        setState(() =>
            _phoneError = t('error.sendCodeFailed', context.read<LanguageProvider>().lang));
      }
    } finally {
      if (mounted) setState(() => _phoneLoading = false);
    }
  }

  Future<void> _submitEmail() async {
    if (!_emailFormKey.currentState!.validate()) return;
    setState(() {
      _emailLoading = true;
      _emailError = null;
    });
    try {
      final api = context.read<ApiService>();
      // registerEmail triggers an OTP flow; backend treats existing accounts as login.
      await api.registerEmail(_emailCtrl.text.trim(), '');
      if (mounted) {
        context.push('/otp',
            extra: {'email': _emailCtrl.text.trim(), 'mode': 'email'});
      }
    } catch (e) {
      if (mounted) {
        setState(() => _emailError = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _emailLoading = false);
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
      if (mounted) {
        context.push('/otp', extra: {'phone': phone, 'mode': 'login'});
      }
    } catch (_) {
      if (mounted) {
        final lang = context.read<LanguageProvider>().lang;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(t('error.telegramFailed', lang))),
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
    return 24;
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;
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
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        SizedBox(height: screenH * 0.07),
                        AuthHeroSection(c: c, lang: lang),
                        SizedBox(height: screenH * 0.05),

                        // Phone error
                        if (_phoneError != null) ...[
                          AuthErrorBanner(message: _phoneError!),
                          const SizedBox(height: 12),
                        ],

                        // Phone input row
                        Row(
                          children: [
                            CountryPickerButton(
                              selected: _selectedCountry,
                              onChanged: (code) =>
                                  setState(() => _selectedCountry = code),
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
                                    contentPadding:
                                        const EdgeInsets.symmetric(
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

                        // Primary CTA
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
                          onToggle: () => setState(() {
                            _emailExpanded = !_emailExpanded;
                            if (!_emailExpanded) _emailError = null;
                          }),
                          formKey: _emailFormKey,
                          emailCtrl: _emailCtrl,
                          loading: _emailLoading,
                          error: _emailError,
                          onSubmit: _submitEmail,
                        ),
                        const SizedBox(height: 28),

                        // Divider
                        _DividerRow(c: c, lang: lang),
                        const SizedBox(height: 16),

                        // Google button
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
                        const SizedBox(height: 10),

                        // Telegram section
                        _TelegramSection(
                          lang: lang,
                          c: c,
                          expanded: _telegramExpanded,
                          onExpand: () =>
                              setState(() => _telegramExpanded = true),
                          tgPhoneCtrl: _tgPhoneCtrl,
                          loading: _tgLoading,
                          onSend: _sendTelegramOtp,
                        ),
                        const SizedBox(height: 36),

                        Center(
                          child: AuthBottomLink(
                            prefix: t('auth.noAccount', lang),
                            linkText: t('auth.register', lang),
                            onTap: () => context.push('/register'),
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
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Expandable email login section
// ---------------------------------------------------------------------------

class _EmailSection extends StatelessWidget {
  final String lang;
  final AppColors c;
  final bool expanded;
  final VoidCallback onToggle;
  final GlobalKey<FormState> formKey;
  final TextEditingController emailCtrl;
  final bool loading;
  final String? error;
  final VoidCallback onSubmit;

  const _EmailSection({
    required this.lang,
    required this.c,
    required this.expanded,
    required this.onToggle,
    required this.formKey,
    required this.emailCtrl,
    required this.loading,
    required this.error,
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
                  ? (lang == 'ru' ? 'Скрыть Email' : 'Email-ро пинҳон кунед')
                  : (lang == 'ru'
                      ? 'или войти через Email'
                      : 'ё тавассути Email даромад'),
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
                              if (v == null || !v.contains('@')) {
                                return t('error.invalidEmail', lang);
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 8),
                          Text(
                            lang == 'ru'
                                ? 'Отправим код подтверждения на email'
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
// Telegram login section (collapse → expand with phone input)
// ---------------------------------------------------------------------------

class _TelegramSection extends StatelessWidget {
  final String lang;
  final AppColors c;
  final bool expanded;
  final VoidCallback onExpand;
  final TextEditingController tgPhoneCtrl;
  final bool loading;
  final VoidCallback onSend;

  const _TelegramSection({
    required this.lang,
    required this.c,
    required this.expanded,
    required this.onExpand,
    required this.tgPhoneCtrl,
    required this.loading,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    if (!expanded) {
      return OutlinedButton.icon(
        onPressed: onExpand,
        icon: Icon(Icons.send_rounded, size: 18, color: c.accent),
        label: Text(t('auth.continueTelegram', lang)),
        style: OutlinedButton.styleFrom(
          foregroundColor: c.text,
          side: BorderSide(color: c.border),
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14)),
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          t('auth.telegramPhone', lang),
          style: TextStyle(
            color: c.textMuted,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: SizedBox(
                height: 52,
                child: TextField(
                  controller: tgPhoneCtrl,
                  keyboardType: TextInputType.phone,
                  autofocus: true,
                  style: TextStyle(color: c.text, fontSize: 15),
                  decoration: InputDecoration(
                    hintText: t('auth.telegramHint', lang),
                    hintStyle:
                        TextStyle(color: c.textMuted, fontSize: 13),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 14),
                    filled: true,
                    fillColor: c.surface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: c.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: c.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: c.accent, width: 1.8),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: loading ? null : onSend,
                style: ElevatedButton.styleFrom(
                  backgroundColor: c.accent,
                  foregroundColor: Colors.white,
                  minimumSize: Size.zero,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
                child: loading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : Text(
                        t('auth.sendCode', lang),
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
              ),
            ),
          ],
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
