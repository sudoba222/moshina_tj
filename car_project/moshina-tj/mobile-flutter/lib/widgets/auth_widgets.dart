import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';

// ---------------------------------------------------------------------------
// Hero section: wordmark + subtitle (used on both login and register screens)
// ---------------------------------------------------------------------------

class AuthHeroSection extends StatelessWidget {
  final AppColors c;
  final String lang;

  const AuthHeroSection({super.key, required this.c, required this.lang});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Logo icon with gradient ring
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(
              colors: [
                c.accent.withValues(alpha: 0.12),
                c.accent.withValues(alpha: 0.04),
              ],
            ),
            border:
                Border.all(color: c.accent.withValues(alpha: 0.2), width: 1.5),
          ),
          child: Center(
            child:
                Icon(Icons.directions_car_rounded, color: c.accent, size: 36),
          ),
        ),
        const SizedBox(height: 20),
        // TajCar wordmark
        RichText(
          text: TextSpan(
            children: [
              TextSpan(
                text: 'Taj',
                style: GoogleFonts.outfit(
                  color: c.text,
                  fontWeight: FontWeight.w900,
                  fontSize: 36,
                  letterSpacing: -1,
                ),
              ),
              TextSpan(
                text: 'Car',
                style: GoogleFonts.outfit(
                  color: c.accent,
                  fontWeight: FontWeight.w900,
                  fontSize: 36,
                  letterSpacing: -1,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 6),
        Text(
          t('auth.subtitle', lang),
          style: GoogleFonts.outfit(
            color: c.textMuted,
            fontSize: 14,
            fontWeight: FontWeight.w400,
            letterSpacing: 0.1,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Error banner
// ---------------------------------------------------------------------------

class AuthErrorBanner extends StatelessWidget {
  final String message;

  const AuthErrorBanner({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.colorError.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border:
            Border.all(color: AppColors.colorError.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline_rounded,
              color: AppColors.colorError, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: GoogleFonts.outfit(
                color: AppColors.colorError,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Auth text field
// ---------------------------------------------------------------------------

class AuthField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String? hint;
  final IconData prefixIcon;
  final TextInputType? keyboardType;
  final bool obscureText;
  final Widget? suffixIcon;
  final AppColors c;
  final String? Function(String?)? validator;

  const AuthField({
    super.key,
    required this.controller,
    required this.label,
    this.hint,
    required this.prefixIcon,
    this.keyboardType,
    this.obscureText = false,
    this.suffixIcon,
    required this.c,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      textCapitalization: TextCapitalization.none,
      style: GoogleFonts.outfit(
        color: c.text,
        fontSize: 15,
        fontWeight: FontWeight.w500,
      ),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        labelStyle: GoogleFonts.outfit(color: c.textMuted, fontSize: 14),
        hintStyle: GoogleFonts.outfit(color: c.textMuted, fontSize: 14),
        prefixIcon: Padding(
          padding: const EdgeInsets.only(left: 4),
          child: Icon(prefixIcon, color: c.textMuted, size: 20),
        ),
        suffixIcon: suffixIcon,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 17),
        filled: true,
        fillColor: c.surface,
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: c.border, width: 1.2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: c.accent, width: 1.8),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(
              color: AppColors.colorError.withValues(alpha: 0.7)),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide:
              const BorderSide(color: AppColors.colorError, width: 1.8),
        ),
      ),
      validator: validator,
    );
  }
}

// ---------------------------------------------------------------------------
// Primary CTA button
// ---------------------------------------------------------------------------

class AuthPrimaryButton extends StatelessWidget {
  final bool loading;
  final String label;
  final VoidCallback? onPressed;
  final AppColors c;

  const AuthPrimaryButton({
    super.key,
    required this.loading,
    required this.label,
    required this.onPressed,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: loading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: c.accent,
          foregroundColor: Colors.white,
          disabledBackgroundColor: c.accent.withValues(alpha: 0.55),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
        child: loading
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2.5,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    label,
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.2,
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

// ---------------------------------------------------------------------------
// Bottom account-link row
// ---------------------------------------------------------------------------

class AuthBottomLink extends StatelessWidget {
  final String prefix;
  final String linkText;
  final VoidCallback onTap;
  final AppColors c;

  const AuthBottomLink({
    super.key,
    required this.prefix,
    required this.linkText,
    required this.onTap,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: RichText(
          text: TextSpan(
            text: '$prefix ',
            style: GoogleFonts.outfit(
              color: c.textMuted,
              fontSize: 14,
              fontWeight: FontWeight.w400,
            ),
            children: [
              TextSpan(
                text: linkText,
                style: GoogleFonts.outfit(
                  color: c.accent,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
