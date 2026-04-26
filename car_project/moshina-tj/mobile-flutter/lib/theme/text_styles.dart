import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Central typography scale for the TAJCAR app.
/// Always use these instead of raw TextStyle font sizes.
class AppTextStyles {
  AppTextStyles._();

  // ── Display ──────────────────────────────────────────────────────────────
  static TextStyle display({Color? color, FontWeight weight = FontWeight.w800}) =>
      GoogleFonts.outfit(fontSize: 28, fontWeight: weight, color: color);

  // ── Headline ─────────────────────────────────────────────────────────────
  static TextStyle h1({Color? color, FontWeight weight = FontWeight.w700}) =>
      GoogleFonts.outfit(fontSize: 22, fontWeight: weight, color: color);

  static TextStyle h2({Color? color, FontWeight weight = FontWeight.w700}) =>
      GoogleFonts.outfit(fontSize: 18, fontWeight: weight, color: color);

  static TextStyle h3({Color? color, FontWeight weight = FontWeight.w600}) =>
      GoogleFonts.outfit(fontSize: 16, fontWeight: weight, color: color);

  // ── Body ─────────────────────────────────────────────────────────────────
  static TextStyle bodyLg({Color? color, FontWeight weight = FontWeight.w400}) =>
      GoogleFonts.outfit(fontSize: 15, fontWeight: weight, color: color);

  static TextStyle body({Color? color, FontWeight weight = FontWeight.w400}) =>
      GoogleFonts.outfit(fontSize: 14, fontWeight: weight, color: color);

  static TextStyle bodySm({Color? color, FontWeight weight = FontWeight.w400}) =>
      GoogleFonts.outfit(fontSize: 13, fontWeight: weight, color: color);

  // ── Caption / Label ───────────────────────────────────────────────────────
  static TextStyle caption({Color? color, FontWeight weight = FontWeight.w400}) =>
      GoogleFonts.outfit(fontSize: 11, fontWeight: weight, color: color);

  static TextStyle micro({Color? color, FontWeight weight = FontWeight.w400}) =>
      GoogleFonts.outfit(fontSize: 10, fontWeight: weight, color: color);

  // ── Price ─────────────────────────────────────────────────────────────────
  static TextStyle price({Color? color}) =>
      GoogleFonts.outfit(
        fontSize: 19,
        fontWeight: FontWeight.w900,
        color: color,
      );

  // ── Button label ──────────────────────────────────────────────────────────
  static TextStyle button({Color? color}) =>
      GoogleFonts.outfit(
        fontSize: 15,
        fontWeight: FontWeight.w700,
        color: color,
      );

  // ── Aliases used by redesigned screens ───────────────────────────────────
  static TextStyle headingLarge(BuildContext context, {Color? color}) =>
      h1(color: color ?? Theme.of(context).colorScheme.onSurface);

  static TextStyle headingMedium(BuildContext context, {Color? color}) =>
      h2(color: color ?? Theme.of(context).colorScheme.onSurface);

  static TextStyle headingSmall(BuildContext context, {Color? color}) =>
      h3(color: color ?? Theme.of(context).colorScheme.onSurface);

  static TextStyle priceLarge(BuildContext context, {Color? color}) =>
      GoogleFonts.outfit(
        fontSize: 28,
        fontWeight: FontWeight.w900,
        color: color ?? Theme.of(context).colorScheme.primary,
        letterSpacing: -0.5,
      );

  static TextStyle label(BuildContext context, {Color? color}) =>
      GoogleFonts.outfit(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: color ?? Theme.of(context).colorScheme.onSurfaceVariant,
        letterSpacing: 0.2,
      );
}
