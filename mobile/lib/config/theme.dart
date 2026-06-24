import 'package:flutter/material.dart';

/// Bundled font family (see assets/fonts + pubspec.yaml). Applied app-wide.
const String kFontFamily = 'Inter';

/// Single shared palette for the whole app — warm near-black text, light
/// neutral grays, and one vivid farm-green brand accent — used consistently
/// across every screen, instead of each screen defining its own private
/// color set.
class AppColors {
  // ── Neutrals ─────────────────────────────────────────────────────────
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const border = Color(0xFFDDDDDD);
  static const fieldBorder = Color(0xFFB0B0B0);

  // ── Surfaces ─────────────────────────────────────────────────────────
  static const background = Colors.white;
  static const surfaceMuted = Color(0xFFF7F7F7); // banners, cards
  static const chip = Color(0xFFF2F2F2); // circle buttons, pills, tiles

  // ── Brand accent ──────────────────────────────────────────────────────
  static const accent = Color(0xFF22A559);
  static const accentBg = Color(0xFFDCFCE7);

  // ── Semantic ─────────────────────────────────────────────────────────
  static const success = Color(0xFF15803D);
  static const successBg = Color(0xFFF0FDF4);
  static const danger = Color(0xFFDC2626);
  static const dangerBg = Color(0xFFFEF2F2);
  static const warning = Color(0xFFD97706);
  static const warningBg = Color(0xFFFFFBEB);
  static const info = Color(0xFF2563EB);
  static const infoBg = Color(0xFFEFF6FF);

  // ── One-off decorative tones (kept named for the screens that use them) ─
  static const avatarBg = Color(0xFFDCFCE7);
  static const avatarFg = Color(0xFF166534);
  static const newBadge = Color(0xFF2E4A5C);
}

ThemeData buildAppTheme() {
  final base = ThemeData(useMaterial3: true);

  return base.copyWith(
    scaffoldBackgroundColor: AppColors.background,
    primaryTextTheme: base.primaryTextTheme.apply(fontFamily: kFontFamily),
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.accent,
      primary: AppColors.accent,
    ),
    textTheme: base.textTheme.apply(
      fontFamily: kFontFamily,
      bodyColor: AppColors.text,
      displayColor: AppColors.text,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.background,
      foregroundColor: AppColors.text,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontFamily: kFontFamily,
        color: AppColors.text,
        fontSize: 16,
        fontWeight: FontWeight.w500,
      ),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.divider),
      ),
      margin: EdgeInsets.zero,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.text,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontFamily: kFontFamily, fontSize: 14, fontWeight: FontWeight.w500),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.divider),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.divider),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.text, width: 1.5),
      ),
    ),
  );
}
