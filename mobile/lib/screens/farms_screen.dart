import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../models/power_event.dart';
import '../providers/app_state.dart';
import '../widgets/farm_card.dart';
import '../widgets/top_bar_actions.dart';

class FarmsScreen extends StatefulWidget {
  const FarmsScreen({super.key});

  @override
  State<FarmsScreen> createState() => _FarmsScreenState();
}

class _FarmsScreenState extends State<FarmsScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  // Electricity tab: per-device notify prefs
  final Set<int> _notifyEnabled = {};

  // Anti-theft tab: per-actuator config
  final Set<int> _antitheftEnabled = {};
  final Map<int, String> _thresholds = {};

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _tabs.addListener(_onTabChanged);
  }

  void _onTabChanged() {
    if (_tabs.index == 1) {
      // Load power events for all devices when switching to Electricity tab
      final state = context.read<AppState>();
      for (final d in state.devices) {
        state.loadPowerEvents(d.id);
      }
    }
  }

  @override
  void dispose() {
    _tabs.removeListener(_onTabChanged);
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Farms & Devices',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
        actions: const [TopBarActions()],
        bottom: TabBar(
          controller: _tabs,
          labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
          tabs: const [
            Tab(icon: Icon(Icons.agriculture_outlined, size: 18), text: 'Farms'),
            Tab(icon: Icon(Icons.bolt_outlined, size: 18), text: 'Electricity'),
            Tab(icon: Icon(Icons.shield_outlined, size: 18), text: 'Anti-Theft'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _FarmsTab(),
          _ElectricityTab(notifyEnabled: _notifyEnabled, onToggleNotify: (id) => setState(() => _notifyEnabled.contains(id) ? _notifyEnabled.remove(id) : _notifyEnabled.add(id))),
          _AntiTheftTab(enabled: _antitheftEnabled, thresholds: _thresholds,
            onToggle: (id) => setState(() => _antitheftEnabled.contains(id) ? _antitheftEnabled.remove(id) : _antitheftEnabled.add(id)),
            onThreshold: (id, v) => setState(() => _thresholds[id] = v),
          ),
        ],
      ),
    );
  }
}

// ── Tab 1: Farms & Devices ────────────────────────────────────────────────────
class _FarmsTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    return RefreshIndicator(
      onRefresh: () => context.read<AppState>().loadDashboard(),
      child: Builder(builder: (context) {
        if (state.dashboardError != null) {
          return ListView(children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(12)),
                child: Text(state.dashboardError!, style: const TextStyle(color: AppColors.offlineRed)),
              ),
            ),
          ]);
        }
        if (!state.isLoadingDashboard && state.farms.isEmpty) {
          return ListView(children: [
            Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text('No farms yet. Add one from the web dashboard.',
                    style: TextStyle(color: AppColors.textSecondary)),
              ),
            ),
          ]);
        }
        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: state.farms.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, i) => FarmCard(farm: state.farms[i]),
        );
      }),
    );
  }
}

// ── Tab 2: Electricity Monitoring ─────────────────────────────────────────────
class _ElectricityTab extends StatelessWidget {
  final Set<int> notifyEnabled;
  final void Function(int) onToggleNotify;

  const _ElectricityTab({required this.notifyEnabled, required this.onToggleNotify});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final onlineCount = state.devices.where((d) => d.isOnline).length;
    final offlineCount = state.devices.length - onlineCount;

    return RefreshIndicator(
      onRefresh: () => context.read<AppState>().loadDashboard(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Summary row
          Row(
            children: [
              Expanded(child: _SummaryCard(icon: Icons.bolt, color: const Color(0xFF10B981), count: onlineCount, label: 'Power ON')),
              const SizedBox(width: 10),
              Expanded(child: _SummaryCard(icon: Icons.bolt_outlined, color: AppColors.offGray, count: offlineCount, label: 'No Power')),
            ],
          ),
          const SizedBox(height: 12),
          // Info banner
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.battery_charging_full_outlined, size: 16, color: Color(0xFFD97706)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Battery-powered ESP32 stays online 24/7. An AC detection circuit reports electricity ON/OFF events.',
                    style: const TextStyle(fontSize: 10, color: Color(0xFF92400E)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (state.devices.isEmpty)
            Center(child: Padding(
              padding: const EdgeInsets.all(32),
              child: Text('No devices added yet.', style: TextStyle(color: AppColors.textSecondary)),
            ))
          else
            ...state.farms.map((farm) {
              final farmDevices = state.devicesForFarm(farm.id);
              if (farmDevices.isEmpty) return const SizedBox.shrink();
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text(farm.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
                  ...farmDevices.map((d) {
                    final hasPower = d.isOnline;
                    final notifyOn = notifyEnabled.contains(d.id);
                    final events = state.powerEvents[d.id];
                    final days = events != null ? buildDayRecords(events, hasPower) : <DayRecord>[];
                    final hasHistory = days.any((r) => r.windows.isNotEmpty);

                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 4, offset: const Offset(0, 2))],
                      ),
                      child: Column(
                        children: [
                          // Device header
                          Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: hasPower ? const Color(0xFFECFDF5) : const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    hasPower ? Icons.bolt : Icons.bolt_outlined,
                                    color: hasPower ? const Color(0xFF10B981) : AppColors.textMuted,
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(d.name, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12)),
                                      Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: hasPower ? const Color(0xFFD1FAE5) : const Color(0xFFF1F5F9),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              hasPower ? '⚡ Power ON' : 'No Power',
                                              style: TextStyle(
                                                fontSize: 8,
                                                fontWeight: FontWeight.w600,
                                                color: hasPower ? const Color(0xFF059669) : AppColors.textMuted,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          Text(_timeSince(d.lastSeenAt), style: TextStyle(fontSize: 8, color: AppColors.textMuted)),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                GestureDetector(
                                  onTap: () => onToggleNotify(d.id),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: notifyOn ? const Color(0xFFFFFBEB) : const Color(0xFFF8FAFC),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: notifyOn ? const Color(0xFFFDE68A) : const Color(0xFFE2E8F0),
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          notifyOn ? Icons.notifications_active_outlined : Icons.notifications_off_outlined,
                                          size: 14,
                                          color: notifyOn ? const Color(0xFFD97706) : AppColors.textMuted,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          notifyOn ? 'Notify ON' : 'Notify',
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w500,
                                            color: notifyOn ? const Color(0xFFD97706) : AppColors.textMuted,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // Power timeline
                          if (events == null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: const Center(child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))),
                            )
                          else if (!hasHistory)
                            Padding(
                              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                              child: Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  'No power events recorded yet. Wire the AC detection module to get daily ON/OFF history.',
                                  style: TextStyle(fontSize: 9, color: AppColors.textMuted),
                                ),
                              ),
                            )
                          else
                            Padding(
                              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                              child: Column(
                                children: days.map((day) {
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 6),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        SizedBox(
                                          width: 64,
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(day.label, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w500)),
                                              if (day.totalMinutes > 0)
                                                Text(fmtHours(day.totalMinutes), style: TextStyle(fontSize: 8, color: AppColors.textMuted)),
                                            ],
                                          ),
                                        ),
                                        Expanded(
                                          child: day.windows.isEmpty
                                              ? Container(height: 6, margin: const EdgeInsets.only(top: 4), decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(3)))
                                              : Column(
                                                  children: day.windows.map((w) {
                                                    final onStr = '${w.on.hour.toString().padLeft(2, '0')}:${w.on.minute.toString().padLeft(2, '0')}';
                                                    final offStr = w.off != null
                                                        ? '${w.off!.hour.toString().padLeft(2, '0')}:${w.off!.minute.toString().padLeft(2, '0')}'
                                                        : 'Now';
                                                    return Padding(
                                                      padding: const EdgeInsets.only(bottom: 3),
                                                      child: Row(
                                                        children: [
                                                          Text(onStr, style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w500, color: Color(0xFF059669))),
                                                          const SizedBox(width: 4),
                                                          Expanded(child: Container(height: 6, decoration: BoxDecoration(color: const Color(0xFF6EE7B7), borderRadius: BorderRadius.circular(3)))),
                                                          const SizedBox(width: 4),
                                                          Text(offStr, style: TextStyle(fontSize: 8, fontWeight: FontWeight.w500, color: w.off == null ? const Color(0xFF059669) : const Color(0xFFEF4444))),
                                                        ],
                                                      ),
                                                    );
                                                  }).toList(),
                                                ),
                                        ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ),
                            ),
                        ],
                      ),
                    );
                  }),
                ],
              );
            }),
        ],
      ),
    );
  }

  String _timeSince(DateTime? dt) {
    if (dt == null) return 'Never';
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

// ── Tab 3: Anti-Theft ─────────────────────────────────────────────────────────
class _AntiTheftTab extends StatelessWidget {
  final Set<int> enabled;
  final Map<int, String> thresholds;
  final void Function(int) onToggle;
  final void Function(int, String) onThreshold;

  const _AntiTheftTab({
    required this.enabled,
    required this.thresholds,
    required this.onToggle,
    required this.onThreshold,
  });

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Hardware notice
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFFEF2F2),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFFECACA)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.shield_outlined, color: Color(0xFFDC2626), size: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('Requires CT current sensor hardware', style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFFDC2626), fontSize: 11)),
                    SizedBox(height: 4),
                    Text(
                      'Clip an SCT-013 current transformer around the motor wire. If motor is ON but current drops to 0A — wire cut detected. Instant alert sent.',
                      style: TextStyle(color: Color(0xFF991B1B), fontSize: 10),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // How it works cards
        Row(
          children: [
            Expanded(child: _HowCard(
              icon: Icons.check_circle_outline,
              color: const Color(0xFF10B981),
              title: 'Normal',
              desc: 'Motor ON → current high → safe',
            )),
            const SizedBox(width: 8),
            Expanded(child: _HowCard(
              icon: Icons.warning_amber_outlined,
              color: const Color(0xFFDC2626),
              title: 'Wire cut',
              desc: 'Motor ON → current 0A → ALERT',
            )),
          ],
        ),
        const SizedBox(height: 20),

        if (state.actuators.isEmpty)
          Center(child: Padding(
            padding: const EdgeInsets.all(32),
            child: Text('No actuators/motors found.', style: TextStyle(color: AppColors.textSecondary)),
          ))
        else
          ...state.farms.map((farm) {
            final allFarmActuators = state.actuators.where((a) => a.farmId == farm.id).toList();
            if (allFarmActuators.isEmpty) return const SizedBox.shrink();

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(farm.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                ),
                ...allFarmActuators.map((a) {
                  final isEnabled = enabled.contains(a.id);
                  final threshold = thresholds[a.id] ?? '';
                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: isEnabled ? const Color(0xFFFECACA) : const Color(0xFFE2E8F0)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: isEnabled ? const Color(0xFFFEF2F2) : const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  isEnabled ? Icons.shield : Icons.shield_outlined,
                                  color: isEnabled ? const Color(0xFFDC2626) : AppColors.textMuted,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(a.name, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12)),
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: a.isOn ? AppColors.primary600.withValues(alpha: 0.1) : const Color(0xFFF1F5F9),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            a.isOn ? '● ON' : 'OFF',
                                            style: TextStyle(fontSize: 8, fontWeight: FontWeight.w600, color: a.isOn ? AppColors.primary600 : AppColors.textMuted),
                                          ),
                                        ),
                                      ],
                                    ),
                                    Text(a.actuatorType, style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
                                  ],
                                ),
                              ),
                              Switch(
                                value: isEnabled,
                                activeTrackColor: const Color(0xFFDC2626),
                                activeThumbColor: Colors.white,
                                inactiveTrackColor: const Color(0xFFE2E8F0),
                                inactiveThumbColor: Colors.white,
                                trackOutlineColor: WidgetStateProperty.all(Colors.transparent),
                                onChanged: (_) => onToggle(a.id),
                              ),
                            ],
                          ),
                          if (isEnabled) ...[
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                const Icon(Icons.settings_outlined, size: 14, color: Color(0xFFDC2626)),
                                const SizedBox(width: 6),
                                const Text('Expected current:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500)),
                                const SizedBox(width: 8),
                                SizedBox(
                                  width: 80,
                                  height: 34,
                                  child: TextField(
                                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                    onChanged: (v) => onThreshold(a.id, v),
                                    decoration: InputDecoration(
                                      hintText: '8.0',
                                      suffixText: 'A',
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                                      ),
                                      isDense: true,
                                    ),
                                    style: const TextStyle(fontSize: 11),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: threshold.isEmpty ? const Color(0xFFFFFBEB) : const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                threshold.isEmpty
                                    ? 'Enter expected current to activate monitoring'
                                    : 'Alert fires if current drops below ${(double.tryParse(threshold) ?? 0) * 0.5}A while motor is ON',
                                style: TextStyle(
                                  fontSize: 9,
                                  color: threshold.isEmpty ? const Color(0xFFD97706) : const Color(0xFFDC2626),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }),
              ],
            );
          }),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final int count;
  final String label;
  const _SummaryCard({required this.icon, required this.color, required this.count, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('$count', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: color)),
              Text(label, style: TextStyle(fontSize: 9, color: color.withValues(alpha: 0.8))),
            ],
          ),
        ],
      ),
    );
  }
}

class _HowCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title, desc;
  const _HowCard({required this.icon, required this.color, required this.title, required this.desc});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 6),
          Text(title, style: TextStyle(fontWeight: FontWeight.w600, color: color, fontSize: 11)),
          Text(desc, style: TextStyle(color: AppColors.textSecondary, fontSize: 9)),
        ],
      ),
    );
  }
}
