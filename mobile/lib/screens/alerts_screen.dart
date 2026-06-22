import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../l10n/tr_extension.dart';
import '../models/notification_item.dart';
import '../providers/app_state.dart';
import '../widgets/language_switcher.dart';
import 'account_settings_screen.dart';
import 'notifications_screen.dart';
import 'orders_screen.dart';

class _P {
  static const text = Color(0xFF222222);
  static const subtext = Color(0xFF717171);
  static const divider = Color(0xFFEBEBEB);
  static const circleBtn = Color(0xFFF2F2F2);
  static const pillActive = Color(0xFF222222);
  static const pillInactive = Color(0xFFF2F2F2);
}

class AlertsScreen extends StatefulWidget {
  final String title;

  const AlertsScreen({super.key, this.title = 'Messages'});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  String _filter = 'all'; // all | farm | market
  bool _searching = false;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppState>().loadNotifications();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<NotificationItem> _filtered(List<NotificationItem> all) {
    Iterable<NotificationItem> result = all;
    switch (_filter) {
      case 'farm':
        result = result.where((n) => n.isAlert || n.isIrrigation);
        break;
      case 'market':
        result = result.where((n) => n.isOrder);
        break;
    }
    final query = _searchController.text.trim().toLowerCase();
    if (query.isNotEmpty) {
      result = result.where((n) =>
          n.title.toLowerCase().contains(query) || n.message.toLowerCase().contains(query));
    }
    return result.toList();
  }

  Future<void> _openItem(NotificationItem item) async {
    if (item.isOrder) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const OrdersScreen()));
      return;
    }
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _DetailSheet(item: item),
    );
  }

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    final state = context.watch<AppState>();
    final filtered = _filtered(state.notifications);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // ── Header: title + bell, search + settings ────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
              child: Row(
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        Text(widget.title,
                            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w500, color: _P.text, letterSpacing: -0.3)),
                        const SizedBox(width: 8),
                        InkWell(
                          borderRadius: BorderRadius.circular(20),
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen())),
                          child: const Padding(
                            padding: EdgeInsets.all(4),
                            child: Icon(Icons.notifications_off_outlined, size: 22, color: _P.text),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const LanguageSwitcher(size: 44),
                  const SizedBox(width: 10),
                  _CircleIcon(
                    icon: Icons.search,
                    onTap: () => setState(() => _searching = !_searching),
                  ),
                  const SizedBox(width: 10),
                  _CircleIcon(
                    icon: Icons.settings_outlined,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AccountSettingsScreen())),
                  ),
                ],
              ),
            ),

            if (_searching)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
                child: TextField(
                  controller: _searchController,
                  autofocus: true,
                  onChanged: (_) => setState(() {}),
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: _P.text),
                  decoration: InputDecoration(
                    hintText: context.tr('alerts_search_hint'),
                    hintStyle: const TextStyle(color: _P.subtext),
                    prefixIcon: const Icon(Icons.search, color: _P.subtext, size: 20),
                    filled: true,
                    fillColor: _P.pillInactive,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                  ),
                ),
              ),

            // ── Filter pills ─────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(
                children: [
                  _Pill(label: context.tr('category_all'), value: 'all', current: _filter, onTap: (v) => setState(() => _filter = v)),
                  const SizedBox(width: 8),
                  _Pill(label: context.tr('nav_farm'), value: 'farm', current: _filter, onTap: (v) => setState(() => _filter = v)),
                  const SizedBox(width: 8),
                  _Pill(label: context.tr('nav_market'), value: 'market', current: _filter, onTap: (v) => setState(() => _filter = v)),
                ],
              ),
            ),
            const SizedBox(height: 8),
            const Divider(height: 1, thickness: 1, color: _P.divider),

            Expanded(
              child: RefreshIndicator(
                onRefresh: () => context.read<AppState>().loadNotifications(),
                child: state.isLoadingNotifications
                    ? const Center(child: CircularProgressIndicator())
                    : state.notificationsError != null
                        ? _ErrorView(message: state.notificationsError!, onRetry: () => context.read<AppState>().loadNotifications())
                        : filtered.isEmpty
                            ? _EmptyView()
                            : ListView.separated(
                                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                                itemCount: filtered.length,
                                separatorBuilder: (_, __) => const Divider(height: 1, thickness: 1, color: _P.divider),
                                itemBuilder: (context, i) => _MessageRow(
                                  item: filtered[i],
                                  onTap: () => _openItem(filtered[i]),
                                ),
                              ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final String label, value, current;
  final void Function(String) onTap;
  const _Pill({required this.label, required this.value, required this.current, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final active = value == current;
    return GestureDetector(
      onTap: () => onTap(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
        decoration: BoxDecoration(
          color: active ? _P.pillActive : _P.pillInactive,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w400,
            color: active ? Colors.white : _P.text,
          ),
        ),
      ),
    );
  }
}

IconData _iconFor(NotificationItem item) {
  if (item.isOrder) return Icons.shopping_bag_outlined;
  if (item.isIrrigation) return Icons.water_drop_outlined;
  return Icons.water_drop;
}

const _alertMessageKeyMap = {
  'threshold': 'notif_msg_threshold',
  'device_offline_went': 'notif_msg_device_offline_went',
  'device_offline_stopped': 'notif_msg_device_offline_stopped',
  'safety_cutoff': 'notif_msg_safety_cutoff',
};

String _orderStatusLabel(BuildContext context, String status) {
  switch (status) {
    case 'placed': return context.tr('notif_status_placed');
    case 'confirmed': return context.tr('notif_status_confirmed');
    case 'shipped': return context.tr('notif_status_shipped');
    case 'delivered': return context.tr('notif_status_delivered');
    case 'cancelled': return context.tr('notif_status_cancelled');
    default: return status.isEmpty ? '' : status[0].toUpperCase() + status.substring(1);
  }
}

String _titleFor(BuildContext context, NotificationItem item) {
  final key = item.titleKey;
  if (key == null) return item.title;
  var result = context.tr(key);
  (item.titleParams ?? const {}).forEach((k, v) => result = result.replaceAll('{$k}', '$v'));
  return result;
}

String _messageFor(BuildContext context, NotificationItem item) {
  final key = item.messageKey;
  if (key == null) return item.message;
  final params = item.messageParams ?? const {};

  if (item.isOrder) {
    final statusWord = _orderStatusLabel(context, '${params['status'] ?? ''}');
    return context.tr(key).replaceAll('{status}', statusWord).replaceAll('{total}', '${params['total'] ?? ''}');
  }
  if (item.isIrrigation) return context.tr(key);

  final mappedKey = _alertMessageKeyMap[key];
  if (mappedKey == null) return item.message;
  var result = context.tr(mappedKey);
  params.forEach((k, v) {
    if (k == 'breach') {
      result = result.replaceAll('{breach}', v == 'above' ? context.tr('notif_breach_above') : context.tr('notif_breach_below'));
    } else {
      result = result.replaceAll('{$k}', '$v');
    }
  });
  return result;
}

String _statusLabel(BuildContext context, NotificationItem item) {
  if (item.isAlert) return item.status == 'resolved' ? context.tr('alerts_resolved') : context.tr('alerts_ongoing');
  if (item.isOrder) return _orderStatusLabel(context, item.status);
  if (item.isIrrigation) return item.status == 'completed' ? context.tr('notif_status_completed') : context.tr('notif_status_aborted');
  final s = item.status;
  return s.isEmpty ? '' : s[0].toUpperCase() + s.substring(1);
}

class _MessageRow extends StatelessWidget {
  final NotificationItem item;
  final VoidCallback onTap;
  const _MessageRow({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: const BoxDecoration(color: _P.text, shape: BoxShape.circle),
              alignment: Alignment.center,
              child: Icon(_iconFor(item), color: Colors.white, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          _titleFor(context, item),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.text),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(_dayLabel(context, item.createdAt), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w400, color: _P.subtext)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _messageFor(context, item),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: _P.text),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _statusLabel(context, item),
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: _P.subtext),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _dayLabel(BuildContext context, DateTime dt) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final day = DateTime(dt.year, dt.month, dt.day);
    final diff = today.difference(day).inDays;
    if (diff == 0) {
      final h = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
      final m = dt.minute.toString().padLeft(2, '0');
      return '$h:$m ${dt.hour >= 12 ? 'PM' : 'AM'}';
    }
    if (diff == 1) return context.tr('alerts_yesterday');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${dt.day} ${months[dt.month - 1]}';
  }
}

class _DetailSheet extends StatefulWidget {
  final NotificationItem item;
  const _DetailSheet({required this.item});

  @override
  State<_DetailSheet> createState() => _DetailSheetState();
}

class _DetailSheetState extends State<_DetailSheet> {
  bool _resolving = false;

  Future<void> _resolve() async {
    setState(() => _resolving = true);
    final err = await context.read<AppState>().resolveAlert(widget.item.refId);
    if (!mounted) return;
    if (err != null) {
      setState(() => _resolving = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
    } else {
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    final item = widget.item;
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: const BoxDecoration(color: _P.text, shape: BoxShape.circle),
                  alignment: Alignment.center,
                  child: Icon(_iconFor(item), color: Colors.white, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(_titleFor(context, item), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.text)),
                      Text(
                        item.isAlert ? (item.severity ?? '').toUpperCase() : _statusLabel(context, item),
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w400, color: _P.subtext),
                      ),
                    ],
                  ),
                ),
                InkWell(
                  onTap: () => Navigator.pop(context),
                  borderRadius: BorderRadius.circular(20),
                  child: const Padding(padding: EdgeInsets.all(4), child: Icon(Icons.close, color: _P.text)),
                ),
              ],
            ),
            const SizedBox(height: 18),
            Text(_messageFor(context, item), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.text, height: 1.4)),
            const SizedBox(height: 20),
            if (item.isAlert && item.status != 'resolved')
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _resolving ? null : _resolve,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _P.text,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: _resolving
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(context.tr('alerts_mark_resolved'), style: const TextStyle(fontWeight: FontWeight.w400, fontSize: 14)),
                ),
              )
            else if (item.isAlert)
              Text(context.tr('alerts_marked_resolved'), style: const TextStyle(fontSize: 12, color: _P.subtext)),
          ],
        ),
      ),
    );
  }
}

class _CircleIcon extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _CircleIcon({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Container(
        width: 44,
        height: 44,
        decoration: const BoxDecoration(color: _P.circleBtn, shape: BoxShape.circle),
        child: Icon(icon, size: 22, color: _P.text),
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  const _EmptyView();

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 80, 20, 20),
          child: Column(
            children: [
              const Icon(Icons.notifications_none_outlined, size: 44, color: _P.subtext),
              const SizedBox(height: 14),
              Text(context.tr('alerts_no_messages'), style: const TextStyle(color: _P.text, fontSize: 15, fontWeight: FontWeight.w400)),
              const SizedBox(height: 4),
              Text(
                context.tr('alerts_empty_sub'),
                textAlign: TextAlign.center,
                style: const TextStyle(color: _P.subtext, fontSize: 12),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(24),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                Text(message, style: const TextStyle(color: Color(0xFFDC2626))),
                const SizedBox(height: 10),
                TextButton(onPressed: onRetry, child: Text(context.tr('common_retry'))),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
