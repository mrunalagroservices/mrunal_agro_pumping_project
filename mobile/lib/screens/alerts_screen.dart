import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../models/alert_model.dart';
import '../providers/app_state.dart';

class AlertsScreen extends StatefulWidget {
  final String title;

  const AlertsScreen({super.key, this.title = 'Alerts'});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  String _filter = 'unresolved'; // all | unresolved | critical

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppState>().loadAlerts();
    });
  }

  List<AlertModel> _filtered(List<AlertModel> all) {
    switch (_filter) {
      case 'unresolved':
        return all.where((a) => !a.isResolved).toList();
      case 'critical':
        return all.where((a) => a.severity == 'critical').toList();
      default:
        return all;
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final filtered = _filtered(state.alerts);
    final unresolvedCount = state.alerts.where((a) => !a.isResolved).length;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Text(widget.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 18)),
            if (unresolvedCount > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFDC2626),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$unresolvedCount',
                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => context.read<AppState>().loadAlerts(),
        child: Column(
          children: [
            // Filter chips
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: [
                  _FilterChip(label: 'Unresolved', value: 'unresolved', current: _filter, onTap: (v) => setState(() => _filter = v)),
                  const SizedBox(width: 8),
                  _FilterChip(label: 'Critical', value: 'critical', current: _filter, onTap: (v) => setState(() => _filter = v)),
                  const SizedBox(width: 8),
                  _FilterChip(label: 'All', value: 'all', current: _filter, onTap: (v) => setState(() => _filter = v)),
                ],
              ),
            ),
            Expanded(
              child: state.isLoadingAlerts
                  ? const Center(child: CircularProgressIndicator())
                  : state.alertsError != null
                      ? _ErrorView(message: state.alertsError!, onRetry: () => context.read<AppState>().loadAlerts())
                      : filtered.isEmpty
                          ? _EmptyView(filter: _filter)
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                              itemCount: filtered.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 8),
                              itemBuilder: (context, i) => _AlertCard(
                                alert: filtered[i],
                                onResolve: () async {
                                  final err = await context.read<AppState>().resolveAlert(filtered[i].id);
                                  if (!mounted) return;
                                  if (err != null) {
                                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
                                  }
                                },
                              ),
                            ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label, value, current;
  final void Function(String) onTap;
  const _FilterChip({required this.label, required this.value, required this.current, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final active = value == current;
    return GestureDetector(
      onTap: () => onTap(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active ? AppColors.primary600 : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: active ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}

class _AlertCard extends StatelessWidget {
  final AlertModel alert;
  final VoidCallback onResolve;
  const _AlertCard({required this.alert, required this.onResolve});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: alert.isResolved ? const Color(0xFFF8FAFC) : alert.severityBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: alert.isResolved ? const Color(0xFFE2E8F0) : alert.severityColor.withValues(alpha: 0.3),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: alert.isResolved
                    ? const Color(0xFFE2E8F0)
                    : alert.severityColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                alert.isResolved ? Icons.check_circle_outline : alert.severityIcon,
                color: alert.isResolved ? AppColors.textMuted : alert.severityColor,
                size: 18,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: alert.isResolved
                              ? const Color(0xFFE2E8F0)
                              : alert.severityColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          alert.severity.toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: alert.isResolved ? AppColors.textMuted : alert.severityColor,
                          ),
                        ),
                      ),
                      if (alert.deviceName != null) ...[
                        const SizedBox(width: 6),
                        Text('· ${alert.deviceName}',
                            style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                      ],
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(alert.message, style: const TextStyle(fontSize: 13)),
                  const SizedBox(height: 4),
                  Text(
                    _timeAgo(alert.createdAt),
                    style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            if (!alert.isResolved)
              TextButton(
                onPressed: onResolve,
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('Resolve', style: TextStyle(fontSize: 12)),
              ),
          ],
        ),
      ),
    );
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

class _EmptyView extends StatelessWidget {
  final String filter;
  const _EmptyView({required this.filter});

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(48),
          child: Column(
            children: [
              Icon(Icons.notifications_none_outlined, size: 48, color: AppColors.textMuted),
              const SizedBox(height: 12),
              Text(
                filter == 'unresolved' ? 'No unresolved alerts' : 'No alerts',
                style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              Text(
                'All clear — your farm is running smoothly.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textMuted, fontSize: 13),
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
