import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/tr_extension.dart';
import '../providers/locale_provider.dart';

const _kText = Color(0xFF222222);
const _kCircleBg = Color(0xFFF2F2F2);

/// Globe icon button for the top-right corner of a screen. Tapping it opens
/// a bottom sheet to pick English / हिंदी / मराठी; the choice applies
/// instantly app-wide and is persisted.
class LanguageSwitcher extends StatelessWidget {
  final double size;
  const LanguageSwitcher({super.key, this.size = 40});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => _openPicker(context),
      borderRadius: BorderRadius.circular(size / 2),
      child: Container(
        width: size,
        height: size,
        decoration: const BoxDecoration(color: _kCircleBg, shape: BoxShape.circle),
        alignment: Alignment.center,
        child: const Icon(Icons.language, size: 20, color: _kText),
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
