import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// Raw color constants — internal only, use AppColors extension in widgets
class _C {
  // Light
  static const lBg = Color(0xFFF2F4F7);
  static const lSurface = Color(0xFFFFFFFF);
  static const lCard = Color(0xFFFFFFFF);
  static const lBorder = Color(0xFFE4E8EF);
  static const lBorderStrong = Color(0xFFCDD3DE);
  static const lText = Color(0xFF191F28);
  static const lTextSecondary = Color(0xFF4B5668);
  static const lTextMuted = Color(0xFF8A95A8);
  static const lAccent = Color(0xFFC83808);
  static const lAccentHover = Color(0xFFA82E06);
  static const lTagBg = Color(0xFFF2F4F7);
  static const lNavBg = Color(0xFFFFFFFF);
  static const lFooterBg = Color(0xFF111827);

  // Dark
  static const dBg = Color(0xFF111318);
  static const dSurface = Color(0xFF1A1E27);
  static const dCard = Color(0xFF1E2330);
  static const dBorder = Color(0xFF2E3548);
  static const dBorderStrong = Color(0xFF3A4557);
  static const dText = Color(0xFFEAEFF8);
  static const dTextSecondary = Color(0xFF9AAFCF);
  static const dTextMuted = Color(0xFF6D7D99);
  static const dAccent = Color(0xFFD94020);
  static const dAccentHover = Color(0xFFF05030);
  static const dTagBg = Color(0xFF252B3A);
  static const dNavBg = Color(0xFF1A1E27);

  // Semantic
  static const colorError = Color(0xFFEF4444);
  static const colorSuccess = Color(0xFF16A34A);
  static const colorInfo = Color(0xFF2563EB);
  static const colorWarning = Color(0xFFF59E0B);
  static const colorOnline = Color(0xFF22C55E);
  // Encar-style price red (dark variant brightened for contrast on dark cards)
  static const lPrice = Color(0xFFE60023);
  static const dPrice = Color(0xFFFF5A64);
  static const whatsapp = Color(0xFF25D366);
}

class AppColors extends ThemeExtension<AppColors> {
  final Color bg;
  final Color surface;
  final Color card;
  final Color border;
  final Color borderStrong;
  final Color text;
  final Color textSecondary;
  final Color textMuted;
  final Color accent;
  final Color accentHover;
  final Color accentDim;
  final Color price;
  final Color tagBg;
  final Color navBg;
  final Color footerBg;

  // Semantic — same in both themes
  static const colorError = _C.colorError;
  static const colorSuccess = _C.colorSuccess;
  static const colorInfo = _C.colorInfo;
  static const colorWarning = _C.colorWarning;
  static const colorOnline = _C.colorOnline;
  static const whatsapp = _C.whatsapp;

  const AppColors({
    required this.bg,
    required this.surface,
    required this.card,
    required this.border,
    required this.borderStrong,
    required this.text,
    required this.textSecondary,
    required this.textMuted,
    required this.accent,
    required this.accentHover,
    required this.accentDim,
    required this.price,
    required this.tagBg,
    required this.navBg,
    required this.footerBg,
  });

  static const light = AppColors(
    bg: _C.lBg,
    surface: _C.lSurface,
    card: _C.lCard,
    border: _C.lBorder,
    borderStrong: _C.lBorderStrong,
    text: _C.lText,
    textSecondary: _C.lTextSecondary,
    textMuted: _C.lTextMuted,
    accent: _C.lAccent,
    accentHover: _C.lAccentHover,
    accentDim: Color(0x14C83808),
    price: _C.lPrice,
    tagBg: _C.lTagBg,
    navBg: _C.lNavBg,
    footerBg: _C.lFooterBg,
  );

  static const dark = AppColors(
    bg: _C.dBg,
    surface: _C.dSurface,
    card: _C.dCard,
    border: _C.dBorder,
    borderStrong: _C.dBorderStrong,
    text: _C.dText,
    textSecondary: _C.dTextSecondary,
    textMuted: _C.dTextMuted,
    accent: _C.dAccent,
    accentHover: _C.dAccentHover,
    accentDim: Color(0x24D94020),
    price: _C.dPrice,
    tagBg: _C.dTagBg,
    navBg: _C.dNavBg,
    footerBg: _C.dBg,
  );

  @override
  AppColors copyWith({
    Color? bg,
    Color? surface,
    Color? card,
    Color? border,
    Color? borderStrong,
    Color? text,
    Color? textSecondary,
    Color? textMuted,
    Color? accent,
    Color? accentHover,
    Color? accentDim,
    Color? price,
    Color? tagBg,
    Color? navBg,
    Color? footerBg,
  }) {
    return AppColors(
      bg: bg ?? this.bg,
      surface: surface ?? this.surface,
      card: card ?? this.card,
      border: border ?? this.border,
      borderStrong: borderStrong ?? this.borderStrong,
      text: text ?? this.text,
      textSecondary: textSecondary ?? this.textSecondary,
      textMuted: textMuted ?? this.textMuted,
      accent: accent ?? this.accent,
      accentHover: accentHover ?? this.accentHover,
      accentDim: accentDim ?? this.accentDim,
      price: price ?? this.price,
      tagBg: tagBg ?? this.tagBg,
      navBg: navBg ?? this.navBg,
      footerBg: footerBg ?? this.footerBg,
    );
  }

  @override
  AppColors lerp(AppColors? other, double t) {
    if (other == null) return this;
    return AppColors(
      bg: Color.lerp(bg, other.bg, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      card: Color.lerp(card, other.card, t)!,
      border: Color.lerp(border, other.border, t)!,
      borderStrong: Color.lerp(borderStrong, other.borderStrong, t)!,
      text: Color.lerp(text, other.text, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      textMuted: Color.lerp(textMuted, other.textMuted, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      accentHover: Color.lerp(accentHover, other.accentHover, t)!,
      accentDim: Color.lerp(accentDim, other.accentDim, t)!,
      price: Color.lerp(price, other.price, t)!,
      tagBg: Color.lerp(tagBg, other.tagBg, t)!,
      navBg: Color.lerp(navBg, other.navBg, t)!,
      footerBg: Color.lerp(footerBg, other.footerBg, t)!,
    );
  }
}

extension AppThemeContext on BuildContext {
  AppColors get colors => Theme.of(this).extension<AppColors>()!;
}

class AppTheme {
  static ThemeData light() {
    final base = ThemeData.light(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: _C.lBg,
      colorScheme: const ColorScheme.light(
        primary: _C.lAccent,
        onPrimary: Colors.white,
        surface: _C.lCard,
        onSurface: _C.lText,
        outline: _C.lBorder,
      ),
      textTheme: GoogleFonts.outfitTextTheme(base.textTheme)
          .apply(bodyColor: _C.lText, displayColor: _C.lText),
      appBarTheme: AppBarTheme(
        backgroundColor: _C.lNavBg,
        foregroundColor: _C.lText,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: GoogleFonts.outfit(
          color: _C.lText,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
      cardTheme: const CardThemeData(
        color: _C.lCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
          side: BorderSide(color: _C.lBorder),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: _C.lSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _C.lBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _C.lBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _C.lAccent, width: 1.5),
        ),
        hintStyle: const TextStyle(color: _C.lTextMuted),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _C.lAccent,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 52),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: GoogleFonts.outfit(
              fontSize: 15, fontWeight: FontWeight.w700),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: _C.lAccent,
          side: const BorderSide(color: _C.lAccent),
          minimumSize: const Size(double.infinity, 52),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: GoogleFonts.outfit(
              fontSize: 15, fontWeight: FontWeight.w700),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: _C.lNavBg,
        selectedItemColor: _C.lAccent,
        unselectedItemColor: _C.lTextMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        showSelectedLabels: true,
        showUnselectedLabels: true,
        selectedLabelStyle:
            TextStyle(fontWeight: FontWeight.w600, fontSize: 11),
        unselectedLabelStyle: TextStyle(fontSize: 11),
      ),
      dividerColor: _C.lBorder,
      extensions: const [AppColors.light],
    );
  }

  static ThemeData dark() {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: _C.dBg,
      colorScheme: const ColorScheme.dark(
        primary: _C.dAccent,
        onPrimary: Colors.white,
        surface: _C.dCard,
        onSurface: _C.dText,
        outline: _C.dBorder,
      ),
      textTheme: GoogleFonts.outfitTextTheme(base.textTheme)
          .apply(bodyColor: _C.dText, displayColor: _C.dText),
      appBarTheme: AppBarTheme(
        backgroundColor: _C.dNavBg,
        foregroundColor: _C.dText,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: GoogleFonts.outfit(
          color: _C.dText,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
      cardTheme: const CardThemeData(
        color: _C.dCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
          side: BorderSide(color: _C.dBorder),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: _C.dSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _C.dBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _C.dBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: _C.dAccent, width: 1.5),
        ),
        hintStyle: const TextStyle(color: _C.dTextMuted),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _C.dAccent,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 52),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: GoogleFonts.outfit(
              fontSize: 15, fontWeight: FontWeight.w700),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: _C.dAccent,
          side: const BorderSide(color: _C.dAccent),
          minimumSize: const Size(double.infinity, 52),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: GoogleFonts.outfit(
              fontSize: 15, fontWeight: FontWeight.w700),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: _C.dNavBg,
        selectedItemColor: _C.dAccent,
        unselectedItemColor: _C.dTextMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        showSelectedLabels: true,
        showUnselectedLabels: true,
        selectedLabelStyle:
            TextStyle(fontWeight: FontWeight.w600, fontSize: 11),
        unselectedLabelStyle: TextStyle(fontSize: 11),
      ),
      dividerColor: _C.dBorder,
      extensions: const [AppColors.dark],
    );
  }
}
