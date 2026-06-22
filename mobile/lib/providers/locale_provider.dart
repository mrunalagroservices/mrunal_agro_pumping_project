import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../l10n/translations.dart';

/// Holds the current UI language ('mr' | 'hi' | 'en') and persists the
/// choice across app restarts. Marathi is the default for first-time users.
class LocaleProvider extends ChangeNotifier {
  static const _prefsKey = 'app_language_code';
  static const defaultLanguageCode = 'mr';

  String _languageCode = defaultLanguageCode;
  String get languageCode => _languageCode;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _languageCode = prefs.getString(_prefsKey) ?? defaultLanguageCode;
    notifyListeners();
  }

  Future<void> setLanguage(String code) async {
    if (code == _languageCode) return;
    _languageCode = code;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, code);
  }

  /// Looks up [key] in the current language, falling back to English and
  /// then to the raw key so missing translations are visible, not crashes.
  String t(String key) {
    final entry = kTranslations[key];
    if (entry == null) return key;
    return entry[_languageCode] ?? entry['en'] ?? key;
  }
}
