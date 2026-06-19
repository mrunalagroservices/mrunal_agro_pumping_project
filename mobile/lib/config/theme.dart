import 'package:flutter/material.dart';

/// Bundled font family (see assets/fonts + pubspec.yaml). Applied app-wide.
const String kFontFamily = 'Inter';

/// Matches the web dashboard's Tailwind palette: "primary" green +
/// "slate" grays for text/borders/background.
class AppColors {
  static const primary50 = Color(0xFFF0FDF4);
  static const primary100 = Color(0xFFDCFCE7);
  static const primary200 = Color(0xFFBBF7D0);
  static const primary400 = Color(0xFF4ADE80);
  static const primary500 = Color(0xFF22C55E);
  static const primary600 = Color(0xFF16A34A);
  static const primary700 = Color(0xFF15803D);

  // Tailwind "slate" palette
  static const slate50 = Color(0xFFF8FAFC);
  static const slate200 = Color(0xFFE2E8F0);
  static const slate400 = Color(0xFF94A3B8);
  static const slate500 = Color(0xFF64748B);
  static const slate600 = Color(0xFF475569);
  static const slate900 = Color(0xFF0F172A);

  static const offGray = slate500;
  static const offlineRed = Color(0xFFEF4444);
  static const background = slate50;
  static const cardBorder = slate200;
  static const textPrimary = slate900;
  static const textSecondary = slate500;
  static const textMuted = slate400;
}

ThemeData buildAppTheme() {
  final base = ThemeData(useMaterial3: true);

  return base.copyWith(
    scaffoldBackgroundColor: AppColors.background,
    primaryTextTheme: base.primaryTextTheme.apply(fontFamily: kFontFamily),
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary600,
      primary: AppColors.primary600,
    ),
    textTheme: base.textTheme.apply(
      fontFamily: kFontFamily,
      bodyColor: AppColors.textPrimary,
      displayColor: AppColors.textPrimary,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.background,
      foregroundColor: AppColors.textPrimary,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontFamily: kFontFamily,
        color: AppColors.textPrimary,
        fontSize: 18,
        fontWeight: FontWeight.w600,
      ),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.cardBorder),
      ),
      margin: EdgeInsets.zero,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary600,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontFamily: kFontFamily, fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.cardBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.cardBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary600, width: 1.5),
      ),
    ),
  );
}
