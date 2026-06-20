import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
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
  final String title;
  final String subtitle;
  final String action;
  _BannerData({this.icon, this.emoji, required this.title, required this.subtitle, required this.action});
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
      _BannerData(emoji: '🔔', title: 'Turn on notifications',
          subtitle: "Don't miss updates about orders and pump alerts.", action: 'Yes, notify me'),
      _BannerData(icon: Icons.mail_outline, title: 'Confirm your email address',
          subtitle: "We'll send a code to your inbox.", action: 'Confirm email'),
    ];
    _loadVersion();
  }

  Future<void> _loadVersion() async {
    try {
      final info = await PackageInfo.fromPlatform();
      if (!mounted) return;
      setState(() => _versionLabel = 'Version ${info.version} (${info.buildNumber})');
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
      SnackBar(content: Text('$f — coming soon'), behavior: SnackBarBehavior.floating),
    );
  }

  void _dismiss(_BannerData b) => setState(() => _banners.remove(b));

  @override
  Widget build(BuildContext context) {
    context.watch<AppState>(); // keep reactive
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
          children: [
            Align(
              alignment: Alignment.topLeft,
              child: _CircleBack(onTap: () => Navigator.pop(context)),
            ),
            const SizedBox(height: 18),
            const Text('Account settings',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w500, color: _P.text, letterSpacing: -0.3)),
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
                                onAction: () => _comingSoon(b.title),
                                onDismiss: () => _dismiss(b),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
            ),

            // ── Settings list ────────────────────────────────────────────
            _Row(icon: Icons.person_outline, label: 'Personal information', onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const PersonalInfoScreen()));
            }),
            const _Div(),
            _Row(icon: Icons.shield_outlined, label: 'Login & security', onTap: () => _comingSoon('Login & security')),
            const _Div(),
            _Row(icon: Icons.front_hand_outlined, label: 'Privacy', onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const PrivacyScreen()));
            }),
            const _Div(),
            _Row(icon: Icons.notifications_outlined, label: 'Notifications', onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
            }),
            const _Div(),
            _Row(icon: Icons.payments_outlined, label: 'Payments', onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const PaymentsScreen()));
            }),
            const _Div(),
            _Row(icon: Icons.calculate_outlined, label: 'Taxes (GST)', onTap: () => _comingSoon('Taxes')),
            const _Div(),
            _Row(icon: Icons.language_outlined, label: 'Translation', onTap: () => _comingSoon('Translation')),
            const _Div(),
            _Row(icon: Icons.accessibility_new_outlined, label: 'Accessibility', onTap: () => _comingSoon('Accessibility')),

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
                    Text(data.title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14, color: _P.text)),
                    const SizedBox(height: 3),
                    Text(data.subtitle, style: const TextStyle(color: _P.subtext, fontWeight: FontWeight.w400, fontSize: 12, height: 1.3)),
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
              child: Text(data.action, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
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
