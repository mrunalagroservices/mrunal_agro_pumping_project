import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';
import '../providers/locale_provider.dart';

/// `context.tr('key')` — looks up the current-language string.
///
/// Uses `read`, not `watch`, so it's safe to call from anywhere (callbacks,
/// async code, initState) and not just inside a widget's `build()`. Because
/// of that, screens must separately call `context.watch<LocaleProvider>()`
/// once near the top of `build()` so they actually rebuild when the
/// language changes — `tr()` alone does not subscribe to updates.
extension TrContext on BuildContext {
  String tr(String key) => read<LocaleProvider>().t(key);

  /// Call once near the top of `build()` to make the widget rebuild when
  /// the user switches language. Safe to call even if you don't need the
  /// return value — it exists purely to register the dependency.
  LocaleProvider watchLocale() => watch<LocaleProvider>();
}
