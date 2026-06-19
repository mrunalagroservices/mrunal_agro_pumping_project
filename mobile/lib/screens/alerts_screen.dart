import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/alert_model.dart';
import '../providers/app_state.dart';
import 'account_settings_screen.dart';
import 'notifications_screen.dart';

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
  String _filter = 'all'; // all | unresolved | critical
  bool _searching = false;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppState>().loadAlerts();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<AlertModel> _filtered(List<AlertModel> all) {
    Iterable<AlertModel> result = all;
    switch (_filter) {
      case 'unresolved':
        result = result.where((a) => !a.isResolved);
        break;
      case 'critical':
        result = result.where((a) => a.severity == 'critical');
        break;
    }
    final query = _searchController.text.trim().toLowerCase();
    if (query.isNotEmpty) {
      result = result.where((a) =>
          a.message.toLowerCase().contains(query) ||
          (a.deviceName?.toLowerCase().contains(query) ?? false));
    }
    return result.toList();
  }

  Future<void> _openAlert(AlertModel alert) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => _AlertDetailSheet(alert: alert),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final filtered = _filtered(state.alerts);

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
                            style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w600, color: _P.text, letterSpacing: -0.3)),
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
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w400, color: _P.text),
                  decoration: InputDecoration(
                    hintText: 'Search messages',
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
                  _Pill(label: 'All', value: 'all', current: _filter, onTap: (v) => setState(() => _filter = v)),
                  const SizedBox(width: 8),
                  _Pill(label: 'Unresolved', value: 'unresolved', current: _filter, onTap: (v) => setState(() => _filter = v)),
                  const SizedBox(width: 8),
                  _Pill(label: 'Critical', value: 'critical', current: _filter, onTap: (v) => setState(() => _filter = v)),
                ],
              ),
            ),
            const SizedBox(height: 8),
            const Divider(height: 1, thickness: 1, color: _P.divider),

            Expanded(
              child: RefreshIndicator(
                onRefresh: () => context.read<AppState>().loadAlerts(),
                child: state.isLoadingAlerts
                    ? const Center(child: CircularProgressIndicator())
                    : state.alertsError != null
                        ? _ErrorView(message: state.alertsError!, onRetry: () => context.read<AppState>().loadAlerts())
                        : filtered.isEmpty
                            ? const _EmptyView()
                            : ListView.separated(
                                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                                itemCount: filtered.length,
                                separatorBuilder: (_, __) => const Divider(height: 1, thickness: 1, color: _P.divider),
                                itemBuilder: (context, i) => _MessageRow(
                                  alert: filtered[i],
                                  onTap: () => _openAlert(filtered[i]),
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
            fontSize: 14,
            fontWeight: FontWeight.w400,
            color: active ? Colors.white : _P.text,
          ),
        ),
      ),
    );
  }
}

class _MessageRow extends StatelessWidget {
  final AlertModel alert;
  final VoidCallback onTap;
  const _MessageRow({required this.alert, required this.onTap});

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
              child: const Icon(Icons.water_drop, color: Colors.white, size: 26),
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
                          alert.deviceName ?? 'Mrunal Agro',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.text),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(_dayLabel(alert.createdAt), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: _P.subtext)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    alert.message,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w400, color: _P.text),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    alert.isResolved ? 'Resolved' : 'Ongoing',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: _P.subtext),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _dayLabel(DateTime dt) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final day = DateTime(dt.year, dt.month, dt.day);
    final diff = today.difference(day).inDays;
    if (diff == 0) {
      final h = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
      final m = dt.minute.toString().padLeft(2, '0');
      return '$h:$m ${dt.hour >= 12 ? 'PM' : 'AM'}';
    }
    if (diff == 1) return 'Yesterday';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${dt.day} ${months[dt.month - 1]}';
  }
}

class _AlertDetailSheet extends StatefulWidget {
  final AlertModel alert;
  const _AlertDetailSheet({required this.alert});

  @override
  State<_AlertDetailSheet> createState() => _AlertDetailSheetState();
}

class _AlertDetailSheetState extends State<_AlertDetailSheet> {
  bool _resolving = false;

  Future<void> _resolve() async {
    setState(() => _resolving = true);
    final err = await context.read<AppState>().resolveAlert(widget.alert.id);
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
    final alert = widget.alert;
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
                  child: const Icon(Icons.water_drop, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(alert.deviceName ?? 'Mrunal Agro',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.text)),
                      Text(alert.severity.toUpperCase(),
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: _P.subtext)),
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
            Text(alert.message, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: _P.text, height: 1.4)),
            const SizedBox(height: 20),
            if (!alert.isResolved)
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
                      : const Text('Mark as resolved', style: TextStyle(fontWeight: FontWeight.w400, fontSize: 16)),
                ),
              )
            else
              const Text('This was marked resolved.', style: TextStyle(fontSize: 14, color: _P.subtext)),
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
              const Text('No messages', style: TextStyle(color: _P.text, fontSize: 17, fontWeight: FontWeight.w400)),
              const SizedBox(height: 4),
              const Text(
                'All clear — your farm is running smoothly.',
                textAlign: TextAlign.center,
                style: TextStyle(color: _P.subtext, fontSize: 14),
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
                TextButton(onPressed: onRetry, child: const Text('Retry')),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
