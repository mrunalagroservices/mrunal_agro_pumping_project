import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/user.dart';
import '../providers/app_state.dart';
import 'personal_info_screen.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
}

class _Category {
  final String key;
  final String label;
  const _Category(this.key, this.label);
}

class _Section {
  final String title;
  final String description;
  final List<_Category> categories;
  const _Section({required this.title, required this.description, required this.categories});
}

const _offerSections = [
  _Section(
    title: 'Farm offers & tips',
    description: 'Inspire your next planting season with personalised recommendations and special offers.',
    categories: [
      _Category('promo_offers', 'Promotions and offers'),
      _Category('farming_tips', 'Farming tips'),
    ],
  ),
  _Section(
    title: 'Mrunal Agro updates',
    description: 'Stay up to date on the latest news from Mrunal Agro, and let us know how we can improve.',
    categories: [
      _Category('news_updates', 'News and features'),
      _Category('feedback_requests', 'Feedback requests'),
      _Category('service_alerts', 'Service alerts'),
    ],
  ),
];

const _offerCategoryKeys = ['promo_offers', 'farming_tips', 'news_updates', 'feedback_requests', 'service_alerts'];

const _accountSections = [
  _Section(
    title: 'Account activity and policies',
    description: 'Confirm your orders and account activity, and learn about important Mrunal Agro policies.',
    categories: [
      _Category('account_activity', 'Account activity'),
      _Category('order_policies', 'Order policies'),
    ],
  ),
  _Section(
    title: 'Reminders',
    description: 'Get important reminders about your irrigation schedules and account activity.',
    categories: [
      _Category('schedule_reminders', 'Schedule reminders'),
    ],
  ),
  _Section(
    title: 'Support messages',
    description: 'Keep in touch with support before, during and after your orders.',
    categories: [
      _Category('support_messages', 'Messages'),
    ],
  ),
];

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  late final TapGestureRecognizer _phoneSettingsLink;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _phoneSettingsLink = TapGestureRecognizer()
      ..onTap = () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PersonalInfoScreen()));
  }

  @override
  void dispose() {
    _tabs.dispose();
    _phoneSettingsLink.dispose();
    super.dispose();
  }

  ChannelPrefs _prefsFor(String key) {
    final user = context.read<AppState>().user;
    return user?.notificationPreferences[key] ?? const ChannelPrefs();
  }

  Future<void> _editCategory(_Category category) async {
    final result = await showModalBottomSheet<ChannelPrefs>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _NotificationEditSheet(category: category, initial: _prefsFor(category.key)),
    );
    if (result == null || !mounted) return;
    final err = await context.read<AppState>().updateNotificationPref(category.key, result);
    if (!mounted) return;
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
    }
  }

  Future<void> _unsubscribeAll() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Unsubscribe from all offers and updates?'),
        content: const Text("You'll continue to get notifications about your account activity."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Unsubscribe')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final user = context.read<AppState>().user;
    final merged = Map<String, ChannelPrefs>.from(user?.notificationPreferences ?? {});
    for (final key in _offerCategoryKeys) {
      merged[key] = const ChannelPrefs();
    }
    final err = await context.read<AppState>().updateProfile(notificationPreferences: merged);
    if (!mounted) return;
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
    }
  }

  String get _allOffersStatus {
    final user = context.watch<AppState>().user;
    final prefsList = _offerCategoryKeys.map((k) => user?.notificationPreferences[k] ?? const ChannelPrefs());
    if (prefsList.every((p) => !p.anyOn)) return 'All off';
    final allDefaultOn = prefsList.every((p) => p.sms && !p.email && !p.push);
    if (allDefaultOn) return 'On: SMS';
    return 'Custom';
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().user;
    final maskedPhone = (user?.phone != null && user!.phone!.length >= 4)
        ? '+91 ***** ${user.phone!.replaceAll(RegExp(r'\D'), '').substring(user.phone!.replaceAll(RegExp(r'\D'), '').length - 4)}'
        : 'your number';

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: Align(
                alignment: Alignment.topLeft,
                child: _CircleBack(onTap: () => Navigator.pop(context)),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('Notifications',
                    style: TextStyle(fontSize: 30, fontWeight: FontWeight.w600, color: _P.text, letterSpacing: -0.3)),
              ),
            ),
            const SizedBox(height: 12),
            TabBar(
              controller: _tabs,
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              labelColor: _P.text,
              unselectedLabelColor: _P.subtext,
              indicatorColor: _P.text,
              indicatorSize: TabBarIndicatorSize.label,
              labelPadding: const EdgeInsets.symmetric(horizontal: 20),
              labelStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
              unselectedLabelStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w400),
              tabs: const [
                Tab(text: 'Offers and updates'),
                Tab(text: 'Account'),
              ],
            ),
            const Divider(height: 1, thickness: 1, color: _P.divider),
            Expanded(
              child: TabBarView(
                controller: _tabs,
                children: [
                  ListView(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
                    children: [
                      for (final section in _offerSections) ..._buildSection(section),
                      const SizedBox(height: 8),
                      const Text('Unsubscribe from all offers and updates',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: _P.text)),
                      const SizedBox(height: 4),
                      const Text("You'll continue to get notifications about your account activity.",
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.subtext, height: 1.3)),
                      const SizedBox(height: 14),
                      _CategoryRow(label: 'All offers and updates', status: _allOffersStatus, onTap: _unsubscribeAll),
                      const SizedBox(height: 24),
                      Text.rich(
                        TextSpan(
                          style: const TextStyle(fontSize: 13, color: _P.subtext, height: 1.4),
                          children: [
                            TextSpan(
                                text: 'By opting in to text messages, you agree to receive automated marketing '
                                    'messages from Mrunal Agro at $maskedPhone. To receive messages at a different '
                                    'number, '),
                            TextSpan(
                              text: 'update your phone number settings',
                              style: const TextStyle(fontWeight: FontWeight.w600, decoration: TextDecoration.underline, color: _P.text),
                              recognizer: _phoneSettingsLink,
                            ),
                            const TextSpan(text: ' on your personal info page.'),
                          ],
                        ),
                      ),
                    ],
                  ),
                  ListView(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
                    children: [
                      for (final section in _accountSections) ..._buildSection(section),
                      const SizedBox(height: 8),
                      Text.rich(
                        TextSpan(
                          style: const TextStyle(fontSize: 13, color: _P.subtext, height: 1.4),
                          children: [
                            TextSpan(
                                text: 'By opting in to text messages, you agree to receive automated account '
                                    'messages from Mrunal Agro at $maskedPhone. To receive messages at a different '
                                    'number, '),
                            TextSpan(
                              text: 'update your phone number settings',
                              style: const TextStyle(fontWeight: FontWeight.w600, decoration: TextDecoration.underline, color: _P.text),
                              recognizer: _phoneSettingsLink,
                            ),
                            const TextSpan(text: ' on your personal info page.'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildSection(_Section section) {
    return [
      Text(section.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: _P.text)),
      const SizedBox(height: 4),
      Text(section.description, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.subtext, height: 1.3)),
      const SizedBox(height: 14),
      for (final cat in section.categories)
        Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: _CategoryRow(
            label: cat.label,
            status: _prefsFor(cat.key).statusLabel,
            onTap: () => _editCategory(cat),
          ),
        ),
      const SizedBox(height: 10),
      const Divider(height: 1, thickness: 1, color: _P.divider),
      const SizedBox(height: 20),
    ];
  }
}

class _CategoryRow extends StatelessWidget {
  final String label;
  final String status;
  final VoidCallback onTap;
  const _CategoryRow({required this.label, required this.status, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.text)),
              const SizedBox(height: 2),
              Text(status, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.subtext)),
            ],
          ),
        ),
        _EditLink(onTap: onTap),
      ],
    );
  }
}

class _EditLink extends StatefulWidget {
  final VoidCallback onTap;
  const _EditLink({required this.onTap});

  @override
  State<_EditLink> createState() => _EditLinkState();
}

class _EditLinkState extends State<_EditLink> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.92 : 1.0,
        duration: const Duration(milliseconds: 120),
        child: AnimatedOpacity(
          opacity: _pressed ? 0.55 : 1.0,
          duration: const Duration(milliseconds: 120),
          child: const Text(
            'Edit',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.text, decoration: TextDecoration.underline),
          ),
        ),
      ),
    );
  }
}

class _NotificationEditSheet extends StatefulWidget {
  final _Category category;
  final ChannelPrefs initial;
  const _NotificationEditSheet({required this.category, required this.initial});

  @override
  State<_NotificationEditSheet> createState() => _NotificationEditSheetState();
}

class _NotificationEditSheetState extends State<_NotificationEditSheet> {
  late ChannelPrefs _prefs;

  @override
  void initState() {
    super.initState();
    _prefs = widget.initial;
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(widget.category.label,
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: _P.text)),
                ),
                InkWell(
                  onTap: () => Navigator.pop(context, _prefs),
                  borderRadius: BorderRadius.circular(20),
                  child: const Padding(padding: EdgeInsets.all(4), child: Icon(Icons.close, color: _P.text)),
                ),
              ],
            ),
            const SizedBox(height: 22),
            _ChannelToggle(
              label: 'Email',
              value: _prefs.email,
              onChanged: (v) => setState(() => _prefs = _prefs.copyWith(email: v)),
            ),
            const Divider(height: 28, thickness: 1, color: _P.divider),
            _ChannelToggle(
              label: 'Push notifications',
              value: _prefs.push,
              onChanged: (v) => setState(() => _prefs = _prefs.copyWith(push: v)),
            ),
            const Divider(height: 28, thickness: 1, color: _P.divider),
            _ChannelToggle(
              label: 'SMS',
              value: _prefs.sms,
              onChanged: (v) => setState(() => _prefs = _prefs.copyWith(sms: v)),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChannelToggle extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
  const _ChannelToggle({required this.label, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.text))),
        Switch(
          value: value,
          onChanged: onChanged,
          thumbColor: const WidgetStatePropertyAll(Colors.white),
          activeTrackColor: _P.text,
        ),
      ],
    );
  }
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
        child: const Icon(Icons.arrow_back, size: 20, color: _P.text),
      ),
    );
  }
}
