import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:provider/provider.dart';
import '../l10n/tr_extension.dart';
import '../providers/app_state.dart';
import '../widgets/language_switcher.dart';
import 'notifications_screen.dart';
import 'payments_screen.dart';
import 'personal_info_screen.dart';
import 'privacy_screen.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const bannerBg = Color(0xFFF7F7F7);
  static const circleBtn = Color(0xFFF2F2F2);
  static const divider = Color(0xFFEBEBEB);
}

class _BannerData {
  final IconData? icon;
  final String? emoji;
  final String titleKey;
  final String subtitleKey;
  final String actionKey;
  _BannerData({this.icon, this.emoji, required this.titleKey, required this.subtitleKey, required this.actionKey});
}

class AccountSettingsScreen extends StatefulWidget {
  const AccountSettingsScreen({super.key});

  @override
  State<AccountSettingsScreen> createState() => _AccountSettingsScreenState();
}

class _AccountSettingsScreenState extends State<AccountSettingsScreen> {
  late final List<_BannerData> _banners;
  final _pageController = PageController(viewportFraction: 0.9);
  String? _versionLabel;

  @override
  void initState() {
    super.initState();
    _banners = [
      _BannerData(emoji: '🔔', titleKey: 'settings_notif_banner_title',
          subtitleKey: 'settings_notif_banner_sub', actionKey: 'settings_notif_banner_action'),
      _BannerData(icon: Icons.mail_outline, titleKey: 'settings_email_banner_title',
          subtitleKey: 'settings_email_banner_sub', actionKey: 'settings_email_banner_action'),
    ];
    _loadVersion();
  }

  Future<void> _loadVersion() async {
    try {
      final info = await PackageInfo.fromPlatform();
      if (!mounted) return;
      setState(() => _versionLabel = context.tr('settings_version')
          .replaceAll('{version}', info.version)
          .replaceAll('{build}', info.buildNumber));
    } catch (_) {
      // Plugin channel not registered yet (e.g. mid hot-restart) — just omit the footer.
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _comingSoon(String f) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(context.tr('profile_coming_soon').replaceAll('{feature}', f)), behavior: SnackBarBehavior.floating),
    );
  }

  void _dismiss(_BannerData b) => setState(() => _banners.remove(b));

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    context.watch<AppState>(); // keep reactive
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
          children: [
            Row(
              children: [
                _CircleBack(onTap: () => Navigator.pop(context)),
                const Spacer(),
                const LanguageSwitcher(),
              ],
            ),
            const SizedBox(height: 18),
            Text(context.tr('settings_title'),
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w500, color: _P.text, letterSpacing: -0.3)),
            const SizedBox(height: 20),

            // ── Dismissible banner carousel ──────────────────────────────
            AnimatedSize(
              duration: const Duration(milliseconds: 280),
              curve: Curves.easeInOut,
              child: _banners.isEmpty
                  ? const SizedBox.shrink()
                  : Padding(
                      padding: const EdgeInsets.only(bottom: 22),
                      child: SizedBox(
                        height: 188,
                        child: PageView.builder(
                          controller: _pageController,
                          padEnds: false,
                          itemCount: _banners.length,
                          itemBuilder: (context, i) {
                            final b = _banners[i];
                            return Padding(
                              padding: EdgeInsets.only(right: i == _banners.length - 1 ? 0 : 12),
                              child: _BannerCard(
                                data: b,
                                onAction: () => _comingSoon(context.tr(b.titleKey)),
                                onDismiss: () => _dismiss(b),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
            ),

            // ── Settings list ────────────────────────────────────────────
            _Row(icon: Icons.person_outline, label: context.tr('settings_personal_info'), onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const PersonalInfoScreen()));
            }),
            const _Div(),
            _Row(icon: Icons.shield_outlined, label: context.tr('settings_login_security'), onTap: () => _comingSoon(context.tr('settings_login_security'))),
            const _Div(),
            _Row(icon: Icons.front_hand_outlined, label: context.tr('settings_privacy'), onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const PrivacyScreen()));
            }),
            const _Div(),
            _Row(icon: Icons.notifications_outlined, label: context.tr('settings_notifications'), onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
            }),
            const _Div(),
            _Row(icon: Icons.payments_outlined, label: context.tr('settings_payments'), onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const PaymentsScreen()));
            }),
            const _Div(),
            _Row(icon: Icons.calculate_outlined, label: context.tr('settings_taxes'), onTap: () => _comingSoon(context.tr('settings_taxes'))),
            const _Div(),
            _Row(icon: Icons.language_outlined, label: context.tr('settings_translation'), onTap: () => _comingSoon(context.tr('settings_translation'))),
            const _Div(),
            _Row(icon: Icons.accessibility_new_outlined, label: context.tr('settings_accessibility'), onTap: () => _comingSoon(context.tr('settings_accessibility'))),

            if (_versionLabel != null) ...[
              const SizedBox(height: 16),
              const Divider(height: 1, thickness: 1, color: _P.divider),
              const SizedBox(height: 16),
              Text(_versionLabel!, style: const TextStyle(fontSize: 11, color: _P.subtext)),
            ],
          ],
        ),
      ),
    );
  }
}

class _BannerCard extends StatelessWidget {
  final _BannerData data;
  final VoidCallback onAction;
  final VoidCallback onDismiss;

  const _BannerCard({required this.data, required this.onAction, required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 16, 12, 16),
      decoration: BoxDecoration(color: _P.bannerBg, borderRadius: BorderRadius.circular(18)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 40,
                child: data.emoji != null
                    ? Text(data.emoji!, style: const TextStyle(fontSize: 28))
                    : Icon(data.icon, size: 28, color: _P.text),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(context.tr(data.titleKey), style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14, color: _P.text)),
                    const SizedBox(height: 3),
                    Text(context.tr(data.subtitleKey), style: const TextStyle(color: _P.subtext, fontWeight: FontWeight.w400, fontSize: 12, height: 1.3)),
                  ],
                ),
              ),
              InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: onDismiss,
                child: const Padding(padding: EdgeInsets.all(4), child: Icon(Icons.close, size: 20, color: _P.text)),
              ),
            ],
          ),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onAction,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: _P.text,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(context.tr(data.actionKey), style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
            ),
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _Row({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 17),
        child: Row(
          children: [
            Icon(icon, color: _P.text, size: 26),
            const SizedBox(width: 18),
            Expanded(child: Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.text))),
            const Icon(Icons.chevron_right, color: Color(0xFF717171), size: 24),
          ],
        ),
      ),
    );
  }
}

class _Div extends StatelessWidget {
  const _Div();
  @override
  Widget build(BuildContext context) => const Divider(height: 1, thickness: 1, color: _P.divider);
}

class _CircleBack extends StatelessWidget {
  final VoidCallback onTap;
  const _CircleBack({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        width: 44,
        height: 44,
        decoration: const BoxDecoration(color: _P.circleBtn, shape: BoxShape.circle),
        child: const Icon(Icons.arrow_back, size: 22, color: _P.text),
      ),
    );
  }
}
