import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../models/actuator.dart';
import '../providers/app_state.dart';
import '../widgets/status_dot.dart';
import '../widgets/top_bar_actions.dart';

class AnalysisScreen extends StatelessWidget {
  const AnalysisScreen({super.key});

  IconData _iconFor(String actuatorType) {
    switch (actuatorType) {
      case 'pump':
        return Icons.water_drop_outlined;
      case 'valve':
        return Icons.water_outlined;
      default:
        return Icons.bolt_outlined;
    }
  }

  String _labelFor(String actuatorType) {
    switch (actuatorType) {
      case 'pump':
        return 'Pumps';
      case 'valve':
        return 'Valves';
      default:
        return 'Motors';
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();

    final byType = <String, List<Actuator>>{};
    for (final a in state.actuators) {
      byType.putIfAbsent(a.actuatorType, () => []).add(a);
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Analysis',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
        actions: const [TopBarActions()],
      ),
      body: RefreshIndicator(
        onRefresh: () => context.read<AppState>().loadDashboard(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Equipment breakdown',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            if (byType.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Center(
                    child: Text(
                      'No actuators configured yet.',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  ),
                ),
              )
            else
              ...byType.entries.map((entry) {
                final running = entry.value.where((a) => a.isOn).length;
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.primary600.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(_iconFor(entry.key),
                          color: AppColors.primary600, size: 20),
                    ),
                    title: Text(_labelFor(entry.key),
                        style: const TextStyle(fontWeight: FontWeight.w500)),
                    subtitle: Text('${entry.value.length} total'),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '$running running',
                          style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary600),
                        ),
                        Text(
                          '${entry.value.length - running} off',
                          style: TextStyle(color: AppColors.textMuted, fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            const SizedBox(height: 24),
            const Text('Farm status',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            if (state.farms.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Center(
                    child: Text(
                      'No farms yet.',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  ),
                ),
              )
            else
              ...state.farms.map((farm) {
                final devices = state.devicesForFarm(farm.id);
                final online = devices.where((d) => d.isOnline).length;
                final active = state.isFarmActive(farm.id);
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    title: Text(farm.name,
                        style: const TextStyle(fontWeight: FontWeight.w500)),
                    subtitle: Text('$online / ${devices.length} devices online'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        StatusDot(
                          color: active
                              ? AppColors.primary600
                              : AppColors.offGray,
                          size: 8,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          active ? 'Running' : 'Idle',
                          style: TextStyle(
                            color: active
                                ? AppColors.primary600
                                : AppColors.textSecondary,
                            fontWeight: FontWeight.w500,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}
