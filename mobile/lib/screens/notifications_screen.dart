import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/tr_extension.dart';
import '../models/user.dart';
import '../providers/app_state.dart';
import '../widgets/language_switcher.dart';
import 'personal_info_screen.dart';
import '../config/theme.dart';

class _Category {
  final String key;
  final String labelKey;
  const _Category(this.key, this.labelKey);
}

class _Section {
  final String titleKey;
  final String descriptionKey;
  final List<_Category> categories;
  const _Section({
    required this.titleKey,
    required this.descriptionKey,
    required this.categories,
  });
}

const _offerSections = [
  _Section(
    titleKey: 'notif_section_offers_title',
    descriptionKey: 'notif_section_offers_desc',
    categories: [
      _Category('promo_offers', 'notif_cat_promo_offers'),
      _Category('farming_tips', 'notif_cat_farming_tips'),
    ],
  ),
  _Section(
    titleKey: 'notif_section_updates_title',
    descriptionKey: 'notif_section_updates_desc',
    categories: [
      _Category('news_updates', 'notif_cat_news_updates'),
      _Category('feedback_requests', 'notif_cat_feedback_requests'),
      _Category('service_alerts', 'notif_cat_service_alerts'),
    ],
  ),
];

const _offerCategoryKeys = [
  'promo_offers',
  'farming_tips',
  'news_updates',
  'feedback_requests',
  'service_alerts',
];

const _accountSections = [
  _Section(
    titleKey: 'notif_section_account_title',
    descriptionKey: 'notif_section_account_desc',
    categories: [
      _Category('account_activity', 'notif_cat_account_activity'),
      _Category('order_policies', 'notif_cat_order_policies'),
    ],
  ),
  _Section(
    titleKey: 'notif_section_reminders_title',
    descriptionKey: 'notif_section_reminders_desc',
    categories: [
      _Category('schedule_reminders', 'notif_cat_schedule_reminders'),
    ],
  ),
  _Section(
    titleKey: 'notif_section_support_title',
    descriptionKey: 'notif_section_support_desc',
    categories: [_Category('support_messages', 'notif_cat_support_messages')],
  ),
];

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  late final TapGestureRecognizer _phoneSettingsLink;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _phoneSettingsLink = TapGestureRecognizer()
      ..onTap = () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const PersonalInfoScreen()),
      );
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
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _NotificationEditSheet(
        category: category,
        initial: _prefsFor(category.key),
      ),
    );
    if (result == null || !mounted) return;
    final err = await context.read<AppState>().updateNotificationPref(
      category.key,
      result,
    );
    if (!mounted) return;
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
    }
  }

  Future<void> _unsubscribeAll() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.tr('notif_unsub_dialog_title')),
        content: Text(context.tr('notif_unsub_dialog_body')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(context.tr('notif_cancel')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(context.tr('notif_unsubscribe')),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final user = context.read<AppState>().user;
    final merged = Map<String, ChannelPrefs>.from(
      user?.notificationPreferences ?? {},
    );
    for (final key in _offerCategoryKeys) {
      merged[key] = const ChannelPrefs();
    }
    final err = await context.read<AppState>().updateProfile(
      notificationPreferences: merged,
    );
    if (!mounted) return;
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
    }
  }

  String get _allOffersStatus {
    final user = context.watch<AppState>().user;
    final prefsList = _offerCategoryKeys.map(
      (k) => user?.notificationPreferences[k] ?? const ChannelPrefs(),
    );
    if (prefsList.every((p) => !p.anyOn))
      return context.tr('notif_status_all_off');
    final allDefaultOn = prefsList.every((p) => p.sms && !p.email && !p.push);
    if (allDefaultOn) return context.tr('notif_status_on_sms');
    return context.tr('notif_status_custom');
  }

  String _statusLabelFor(ChannelPrefs p) {
    final channels = <String>[
      if (p.email) context.tr('notif_channel_email'),
      if (p.push) context.tr('notif_channel_push'),
      if (p.sms) context.tr('notif_channel_sms'),
    ];
    if (channels.isEmpty) return context.tr('notif_status_off');
    return context
        .tr('notif_status_on')
        .replaceAll('{channels}', channels.join(context.tr('notif_and')));
  }

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    final user = context.watch<AppState>().user;
    final maskedPhone = (user?.phone != null && user!.phone!.length >= 4)
        ? '+91 ***** ${user.phone!.replaceAll(RegExp(r'\D'), '').substring(user.phone!.replaceAll(RegExp(r'\D'), '').length - 4)}'
        : context.tr('notif_your_number');

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: Row(
                children: [
                  _CircleBack(onTap: () => Navigator.pop(context)),
                  const Spacer(),
                  const LanguageSwitcher(),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  context.tr('notif_title'),
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w500,
                    color: AppColors.text,
                    letterSpacing: -0.3,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TabBar(
              controller: _tabs,
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              labelColor: AppColors.text,
              unselectedLabelColor: AppColors.subtext,
              indicatorColor: AppColors.text,
              indicatorSize: TabBarIndicatorSize.label,
              labelPadding: const EdgeInsets.symmetric(horizontal: 20),
              labelStyle: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
              unselectedLabelStyle: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w400,
              ),
              tabs: [
                Tab(text: context.tr('notif_tab_offers')),
                Tab(text: context.tr('notif_tab_account')),
              ],
            ),
            const Divider(height: 1, thickness: 1, color: AppColors.divider),
            Expanded(
              child: TabBarView(
                controller: _tabs,
                children: [
                  ListView(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
                    children: [
                      for (final section in _offerSections)
                        ..._buildSection(section),
                      const SizedBox(height: 8),
                      Text(
                        context.tr('notif_unsubscribe_title'),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                          color: AppColors.text,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        context.tr('notif_unsubscribe_sub'),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w400,
                          color: AppColors.subtext,
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: 14),
                      _CategoryRow(
                        label: context.tr('notif_all_offers'),
                        status: _allOffersStatus,
                        onTap: _unsubscribeAll,
                      ),
                      const SizedBox(height: 24),
                      Text.rich(
                        TextSpan(
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.subtext,
                            height: 1.4,
                          ),
                          children: [
                            TextSpan(
                              text: context
                                  .tr('notif_consent_marketing')
                                  .replaceAll('{phone}', maskedPhone),
                            ),
                            TextSpan(
                              text: context.tr('notif_update_phone_link'),
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                                decoration: TextDecoration.underline,
                                color: AppColors.text,
                              ),
                              recognizer: _phoneSettingsLink,
                            ),
                            TextSpan(
                              text: context.tr('notif_on_personal_info_page'),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  ListView(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
                    children: [
                      for (final section in _accountSections)
                        ..._buildSection(section),
                      const SizedBox(height: 8),
                      Text.rich(
                        TextSpan(
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.subtext,
                            height: 1.4,
                          ),
                          children: [
                            TextSpan(
                              text: context
                                  .tr('notif_consent_account')
                                  .replaceAll('{phone}', maskedPhone),
                            ),
                            TextSpan(
                              text: context.tr('notif_update_phone_link'),
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                                decoration: TextDecoration.underline,
                                color: AppColors.text,
                              ),
                              recognizer: _phoneSettingsLink,
                            ),
                            TextSpan(
                              text: context.tr('notif_on_personal_info_page'),
                            ),
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
      Text(
        context.tr(section.titleKey),
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          color: AppColors.text,
        ),
      ),
      const SizedBox(height: 4),
      Text(
        context.tr(section.descriptionKey),
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w400,
          color: AppColors.subtext,
          height: 1.3,
        ),
      ),
      const SizedBox(height: 14),
      for (final cat in section.categories)
        Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: _CategoryRow(
            label: context.tr(cat.labelKey),
            status: _statusLabelFor(_prefsFor(cat.key)),
            onTap: () => _editCategory(cat),
          ),
        ),
      const SizedBox(height: 10),
      const Divider(height: 1, thickness: 1, color: AppColors.divider),
      const SizedBox(height: 20),
    ];
  }
}

class _CategoryRow extends StatelessWidget {
  final String label;
  final String status;
  final VoidCallback onTap;
  const _CategoryRow({
    required this.label,
    required this.status,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AppColors.text,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                status,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                  color: AppColors.subtext,
                ),
              ),
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
          child: Text(
            context.tr('notif_edit'),
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w400,
              color: AppColors.text,
              decoration: TextDecoration.underline,
            ),
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
    context.watchLocale();
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
                  child: Text(
                    context.tr(widget.category.labelKey),
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w500,
                      color: AppColors.text,
                    ),
                  ),
                ),
                InkWell(
                  onTap: () => Navigator.pop(context, _prefs),
                  borderRadius: BorderRadius.circular(20),
                  child: const Padding(
                    padding: EdgeInsets.all(4),
                    child: Icon(Icons.close, color: AppColors.text),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 22),
            _ChannelToggle(
              label: context.tr('notif_channel_email'),
              value: _prefs.email,
              onChanged: (v) =>
                  setState(() => _prefs = _prefs.copyWith(email: v)),
            ),
            const Divider(height: 28, thickness: 1, color: AppColors.divider),
            _ChannelToggle(
              label: context.tr('notif_channel_push_full'),
              value: _prefs.push,
              onChanged: (v) =>
                  setState(() => _prefs = _prefs.copyWith(push: v)),
            ),
            const Divider(height: 28, thickness: 1, color: AppColors.divider),
            _ChannelToggle(
              label: context.tr('notif_channel_sms'),
              value: _prefs.sms,
              onChanged: (v) =>
                  setState(() => _prefs = _prefs.copyWith(sms: v)),
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
  const _ChannelToggle({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w400,
              color: AppColors.text,
            ),
          ),
        ),
        Switch(
          value: value,
          onChanged: onChanged,
          thumbColor: const WidgetStatePropertyAll(Colors.white),
          activeTrackColor: AppColors.text,
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
        decoration: const BoxDecoration(
          color: AppColors.chip,
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.arrow_back, size: 20, color: AppColors.text),
      ),
    );
  }
}
