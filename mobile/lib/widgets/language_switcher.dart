import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/tr_extension.dart';
import '../providers/locale_provider.dart';

const _kText = Color(0xFF222222);
const _kCircleBg = Color(0xFFF2F2F2);

/// Current-language pill for the top-right corner of a screen — shows "En",
/// "हिंदी" or "मराठी" instead of a generic globe icon, so the active language
/// is visible at a glance. Tapping it opens a bottom sheet to switch; the
/// choice applies instantly app-wide and is persisted.
class LanguageSwitcher extends StatelessWidget {
  final double size;
  const LanguageSwitcher({super.key, this.size = 40});

  static String _currentLabel(BuildContext context, String code) {
    switch (code) {
      case 'en':
        return 'En';
      case 'hi':
        return context.tr('language_hindi');
      case 'mr':
      default:
        return context.tr('language_marathi');
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    final label = _currentLabel(context, locale.languageCode);
    return InkWell(
      onTap: () => _openPicker(context),
      borderRadius: BorderRadius.circular(size / 2),
      child: Container(
        height: size,
        constraints: BoxConstraints(minWidth: size),
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(color: _kCircleBg, borderRadius: BorderRadius.circular(size / 2)),
        alignment: Alignment.center,
        child: Text(
          label,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _kText),
        ),
      ),
    );
  }

  void _openPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetContext) => const _LanguageSheet(),
    );
  }
}

class _LanguageSheet extends StatelessWidget {
  const _LanguageSheet();

  static const _options = [
    ('mr', 'language_marathi'),
    ('hi', 'language_hindi'),
    ('en', 'language_english'),
  ];

  @override
  Widget build(BuildContext context) {
    final locale = context.watch<LocaleProvider>();
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(context.tr('language_choose'),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: _kText)),
            const SizedBox(height: 12),
            for (final (code, labelKey) in _options)
              InkWell(
                onTap: () {
                  locale.setLanguage(code);
                  Navigator.pop(context);
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  child: Row(
                    children: [
                      Icon(
                        locale.languageCode == code ? Icons.radio_button_checked : Icons.radio_button_off,
                        size: 20,
                        color: _kText,
                      ),
                      const SizedBox(width: 14),
                      Text(context.tr(labelKey), style: const TextStyle(fontSize: 15, color: _kText)),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
