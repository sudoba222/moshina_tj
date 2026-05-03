import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/language_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';

class OtpScreen extends StatefulWidget {
  final String? phone;
  final String? email;
  final String mode; // 'login' | 'register' | 'email'
  final String? name;

  const OtpScreen({
    super.key,
    this.phone,
    this.email,
    required this.mode,
    this.name,
  });

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final List<TextEditingController> _ctrls =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _nodes = List.generate(6, (_) => FocusNode());

  bool _loading = false;
  String? _error;
  int _countdown = 60;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final c in _ctrls) {
      c.dispose();
    }
    for (final n in _nodes) {
      n.dispose();
    }
    super.dispose();
  }

  void _startTimer() {
    _countdown = 60;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        if (_countdown > 0) {
          _countdown--;
        } else {
          t.cancel();
        }
      });
    });
  }

  String get _code => _ctrls.map((c) => c.text).join();

  void _onDigit(int index, String value) {
    if (value.isEmpty) {
      if (index > 0) _nodes[index - 1].requestFocus();
      return;
    }
    if (value.length > 1) {
      // Handle paste
      final digits = value.replaceAll(RegExp(r'\D'), '');
      for (int i = 0; i < 6 && i < digits.length; i++) {
        _ctrls[i].text = digits[i];
      }
      if (digits.length >= 6) {
        _nodes[5].requestFocus();
        _submit();
      } else {
        final next = digits.length < 6 ? digits.length : 5;
        _nodes[next].requestFocus();
      }
      setState(() {});
      return;
    }
    _ctrls[index].text = value;
    if (index < 5) {
      _nodes[index + 1].requestFocus();
    } else {
      _nodes[index].unfocus();
      _submit();
    }
    setState(() {});
  }

  Future<void> _resend() async {
    if (_countdown > 0) return;
    try {
      final api = context.read<ApiService>();
      if (widget.mode == 'email') {
        await api.registerEmail(widget.email!, widget.name ?? '');
      } else {
        await api.sendPhoneOtp(widget.phone!);
      }
      _startTimer();
      for (final c in _ctrls) {
        c.clear();
      }
      _nodes[0].requestFocus();
      setState(() => _error = null);
    } catch (_) {}
  }

  Future<void> _submit() async {
    final code = _code;
    if (code.length < 6 || _loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final auth = context.read<AuthProvider>();
    bool ok = false;
    try {
      if (widget.mode == 'email') {
        ok = await auth.verifyEmailOtp(widget.email!, code);
      } else {
        ok = await auth.loginWithOtp(
          widget.phone!,
          code,
          name: widget.name,
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
    if (mounted && ok) context.go('/');
    if (mounted && !ok && _error == null) {
      setState(() => _error = auth.error ?? t('error.invalidCode', context.read<LanguageProvider>().lang));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;
    final target = widget.phone ?? widget.email ?? '';

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              GestureDetector(
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
              const SizedBox(height: 32),
              Text(
                t('otp.title', lang),
                style: GoogleFonts.outfit(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: c.text,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 8),
              RichText(
                text: TextSpan(
                  style: TextStyle(color: c.textSecondary, fontSize: 15),
                  children: [
                    TextSpan(text: '${t('otp.sent', lang)} '),
                    TextSpan(
                      text: target,
                      style: TextStyle(
                        color: c.text,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 40),
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.red, size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],
              // 6-digit boxes
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(6, (i) {
                  return _OtpBox(
                    controller: _ctrls[i],
                    focusNode: _nodes[i],
                    onChanged: (v) => _onDigit(i, v),
                    c: c,
                  );
                }),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: (_loading || _code.length < 6) ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: c.accent,
                    disabledBackgroundColor: c.accent.withValues(alpha: 0.4),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: _loading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : Text(
                          t('otp.confirm', lang),
                          style: GoogleFonts.outfit(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 20),
              Center(
                child: _countdown > 0
                    ? Text(
                        '${t('otp.countdown', lang)} $_countdown с',
                        style: TextStyle(color: c.textMuted, fontSize: 14),
                      )
                    : GestureDetector(
                        onTap: _resend,
                        child: Text(
                          t('otp.resend', lang),
                          style: TextStyle(
                            color: c.accent,
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OtpBox extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;
  final AppColors c;

  const _OtpBox({
    required this.controller,
    required this.focusNode,
    required this.onChanged,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 46,
      height: 56,
      child: TextField(
        controller: controller,
        focusNode: focusNode,
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        maxLength: 6,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        style: GoogleFonts.outfit(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: c.text,
        ),
        decoration: InputDecoration(
          counterText: '',
          contentPadding: EdgeInsets.zero,
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: c.border, width: 1.5),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: c.accent, width: 2),
          ),
          filled: true,
          fillColor: c.card,
        ),
        onChanged: onChanged,
      ),
    );
  }
}
