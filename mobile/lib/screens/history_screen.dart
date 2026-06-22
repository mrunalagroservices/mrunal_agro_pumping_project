import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../l10n/tr_extension.dart';
import '../providers/app_state.dart';
import '../widgets/language_switcher.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  String _range = '10d';
  Map<String, dynamic>? _overview;
  List<dynamic>? _dailyLogs;
  bool _loading = false;
  String? _error;
  final Set<int> _expandedDays = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final state = context.read<AppState>();
      final days = _range == '24h' ? 2 : 10;
      final results = await Future.wait([
        state.fetchAnalytics(_range),
        state.fetchDailyRuntime(days),
      ]);
      if (!mounted) return;
      final daily = results[1];
      setState(() {
        _overview = results[0];
        _dailyLogs = (daily['days'] as List?)?.reversed.toList() ?? [];
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('dashboard_history_analytics'),
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
        actions: [
          const LanguageSwitcher(size: 36),
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                _RangeBtn(
                    label: '24h',
                    value: '24h',
                    current: _range,
                    onTap: (v) {
                      setState(() => _range = v);
                      _load();
                    }),
                _RangeBtn(
                    label: '10d',
                    value: '10d',
                    current: _range,
                    onTap: (v) {
                      setState(() => _range = v);
                      _load();
                    }),
              ],
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? ListView(children: [
                    Padding(
                      padding: const EdgeInsets.all(24),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                            color: const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(12)),
                        child: Column(children: [
                          Text(_error!,
                              style: const TextStyle(color: Color(0xFFDC2626))),
                          const SizedBox(height: 10),
                          TextButton(onPressed: _load, child: Text(context.tr('common_retry'))),
                        ]),
                      ),
                    ),
                  ])
                : _overview == null
                    ? ListView(children: [
                        Padding(
                          padding: const EdgeInsets.all(48),
                          child: Column(children: [
                            Icon(Icons.bar_chart_outlined,
                                size: 48, color: AppColors.subtext),
                            const SizedBox(height: 12),
                            Text(context.tr('history_no_data'),
                                style:
                                    const TextStyle(color: AppColors.subtext)),
                          ]),
                        )
                      ])
                    : _buildContent(),
      ),
    );
  }

  Widget _buildContent() {
    final totals = _overview!['totals'] as Map<String, dynamic>? ?? {};
    final actuators = (_overview!['actuators'] as List?) ?? [];
    final rate =
        (_overview!['electricity_rate_per_kwh'] as num?)?.toDouble() ?? 8.0;

    final runtimeMin = (totals['runtime_minutes'] as num?)?.toInt() ?? 0;
    final water = (totals['water_liters'] as num?)?.toDouble() ?? 0;
    final kwh = (totals['electricity_kwh'] as num?)?.toDouble() ?? 0;
    final cost = (totals['cost'] as num?)?.toDouble() ?? 0;
    final running = (totals['currently_running'] as num?)?.toInt() ?? 0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Summary stat cards
        GridView.count(
          crossAxisCount: 2,
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.5,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            _StatCard(
              icon: Icons.timer_outlined,
              color: AppColors.success,
              label: _range == '24h' ? context.tr('history_runtime_24h') : context.tr('history_runtime_10d'),
              value: _fmtHours(runtimeMin),
            ),
            _StatCard(
              icon: Icons.water_drop_outlined,
              color: const Color(0xFF0EA5E9),
              label: context.tr('history_water_pumped'),
              value: water > 0 ? '${water.toStringAsFixed(0)} L' : '—',
              subtitle: water == 0 ? context.tr('history_add_pump_specs') : null,
            ),
            _StatCard(
              icon: Icons.bolt_outlined,
              color: const Color(0xFFF59E0B),
              label: context.tr('history_electricity'),
              value: kwh > 0 ? '${kwh.toStringAsFixed(2)} kWh' : '—',
            ),
            _StatCard(
              icon: Icons.currency_rupee_outlined,
              color: const Color(0xFF10B981),
              label: context.tr('history_est_cost'),
              value: cost > 0 ? '₹${cost.toStringAsFixed(1)}' : '—',
              subtitle: '₹$rate/kWh',
            ),
          ],
        ),

        // Currently running banner
        if (running > 0) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border:
                  Border.all(color: AppColors.success.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                Icon(Icons.bolt, color: AppColors.success, size: 20),
                const SizedBox(width: 8),
                Text(
                  context.tr('history_motors_running').replaceAll('{n}', '$running'),
                  style: TextStyle(
                      color: AppColors.success,
                      fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ],

        // Per-pump breakdown
        if (actuators.isNotEmpty) ...[
          const SizedBox(height: 20),
          Row(
            children: [
              Text(context.tr('history_per_pump_breakdown'),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              const Spacer(),
              Text(_range == '24h' ? context.tr('history_last_24h') : context.tr('history_last_10d'),
                  style: TextStyle(fontSize: 10, color: AppColors.subtext)),
            ],
          ),
          const SizedBox(height: 10),
          ...actuators.map((a) => _ActuatorRow(data: a as Map<String, dynamic>)),
        ],

        if (water == 0 && kwh == 0) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.info_outline,
                    color: Color(0xFFD97706), size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    context.tr('history_needs_specs'),
                    style: const TextStyle(color: Color(0xFF92400E), fontSize: 11),
                  ),
                ),
              ],
            ),
          ),
        ],

        // ── Daily Session Log ─────────────────────────────────────────────────
        const SizedBox(height: 24),
        Row(
          children: [
            Text(context.tr('history_session_log'),
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                _range == '24h' ? context.tr('history_days_2') : context.tr('history_days_10'),
                style: TextStyle(fontSize: 9, color: AppColors.subtext),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (_dailyLogs == null || _dailyLogs!.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Text(context.tr('history_no_sessions'),
                style: const TextStyle(color: AppColors.subtext)),
          )
        else
          ...(_dailyLogs!).asMap().entries.map((entry) {
            final i = entry.key;
            final day = entry.value as Map<String, dynamic>;
            final dayActuators = (day['actuators'] as List?) ?? [];
            final totalHours = (day['total_hours'] as num?)?.toDouble() ?? 0;
            final dayWater = (day['water_liters'] as num?)?.toDouble() ?? 0;
            final dayKwh = (day['electricity_kwh'] as num?)?.toDouble() ?? 0;
            final isExpanded = _expandedDays.contains(i);
            final hasActivity = dayActuators.isNotEmpty;

            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: hasActivity && isExpanded
                        ? AppColors.success.withValues(alpha: 0.3)
                        : const Color(0xFFE2E8F0),
                  ),
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 4,
                        offset: const Offset(0, 2))
                  ],
                ),
                child: Column(
                  children: [
                    // Day header — tappable
                    InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: hasActivity
                          ? () => setState(() => isExpanded
                              ? _expandedDays.remove(i)
                              : _expandedDays.add(i))
                          : null,
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            // Date + total
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    day['label'] as String? ?? day['date'] as String? ?? '—',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w500,
                                        fontSize: 12),
                                  ),
                                  const SizedBox(height: 4),
                                  if (!hasActivity)
                                    Text(context.tr('history_no_pump_activity'),
                                        style: TextStyle(
                                            fontSize: 10,
                                            color: AppColors.subtext))
                                  else
                                    Row(
                                      children: [
                                        _QuickStat(
                                            icon: Icons.timer_outlined,
                                            value: _fmtHours(
                                                (totalHours * 60).round()),
                                            color: AppColors.success),
                                        if (dayWater > 0) ...[
                                          const SizedBox(width: 10),
                                          _QuickStat(
                                              icon: Icons.water_drop_outlined,
                                              value:
                                                  '${dayWater.toStringAsFixed(0)}L',
                                              color: const Color(0xFF0EA5E9)),
                                        ],
                                        if (dayKwh > 0) ...[
                                          const SizedBox(width: 10),
                                          _QuickStat(
                                              icon: Icons.bolt_outlined,
                                              value:
                                                  '${dayKwh.toStringAsFixed(2)}kWh',
                                              color: const Color(0xFFF59E0B)),
                                        ],
                                      ],
                                    ),
                                ],
                              ),
                            ),
                            // Activity badge + chevron
                            if (hasActivity) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppColors.success
                                      .withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  context.tr('history_n_pumps').replaceAll('{n}', '${dayActuators.length}'),
                                  style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w500,
                                      color: AppColors.success),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Icon(
                                isExpanded
                                    ? Icons.expand_less
                                    : Icons.expand_more,
                                color: AppColors.subtext,
                                size: 20,
                              ),
                            ] else
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: AppColors.subtext,
                                  shape: BoxShape.circle,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),

                    // Expanded session details
                    if (isExpanded && hasActivity) ...[
                      Divider(
                          height: 1,
                          color: const Color(0xFFE2E8F0),
                          indent: 14,
                          endIndent: 14),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
                        child: Column(
                          children: (dayActuators)
                              .map((a) =>
                                  _ActuatorSessionRow(data: a as Map<String, dynamic>))
                              .toList(),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          }),

        const SizedBox(height: 24),
      ],
    );
  }

  String _fmtHours(int minutes) {
    if (minutes == 0) return '0m';
    if (minutes < 60) return '${minutes}m';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return m == 0 ? '${h}h' : '${h}h ${m}m';
  }
}

// ── Actuator Session Row (inside expanded day) ────────────────────────────────
class _ActuatorSessionRow extends StatelessWidget {
  final Map<String, dynamic> data;
  const _ActuatorSessionRow({required this.data});

  @override
  Widget build(BuildContext context) {
    final name = data['name'] as String? ?? '—';
    final hours = (data['hours'] as num?)?.toDouble() ?? 0;
    final sessions = (data['sessions'] as List?) ?? [];

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(Icons.water_drop_outlined,
                    size: 14, color: AppColors.success),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(name,
                    style: const TextStyle(
                        fontWeight: FontWeight.w500, fontSize: 11)),
              ),
              Text(
                _fmtHours((hours * 60).round()),
                style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: AppColors.success),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: sessions.map((s) {
              final session = s as Map<String, dynamic>;
              final start = session['start'] as String? ?? '—';
              final end = session['end'] as String? ?? '—';
              final dur = _sessionDuration(start, end);
              return Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.play_arrow_rounded,
                        size: 12, color: Color(0xFF059669)),
                    const SizedBox(width: 3),
                    Text(
                      start,
                      style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF059669)),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 4),
                      child: Icon(Icons.arrow_forward_rounded,
                          size: 10, color: Color(0xFF6EE7B7)),
                    ),
                    const Icon(Icons.stop_rounded,
                        size: 12, color: Color(0xFFDC2626)),
                    const SizedBox(width: 3),
                    Text(
                      end,
                      style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFFDC2626)),
                    ),
                    if (dur != null) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(dur,
                            style: TextStyle(
                                fontSize: 8, color: AppColors.subtext)),
                      ),
                    ],
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  String? _sessionDuration(String start, String end) {
    try {
      final sp = start.split(':');
      final ep = end.split(':');
      final startMin =
          int.parse(sp[0]) * 60 + int.parse(sp[1]);
      final endMin = int.parse(ep[0]) * 60 + int.parse(ep[1]);
      var diff = endMin - startMin;
      if (diff <= 0) diff += 24 * 60; // crossed midnight
      if (diff == 0) return null;
      final h = diff ~/ 60;
      final m = diff % 60;
      if (h == 0) return '${m}m';
      if (m == 0) return '${h}h';
      return '${h}h ${m}m';
    } catch (_) {
      return null;
    }
  }

  String _fmtHours(int minutes) {
    if (minutes == 0) return '0m';
    if (minutes < 60) return '${minutes}m';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return m == 0 ? '${h}h' : '${h}h ${m}m';
  }
}

// ── Supporting widgets ────────────────────────────────────────────────────────
class _RangeBtn extends StatelessWidget {
  final String label, value, current;
  final void Function(String) onTap;
  const _RangeBtn(
      {required this.label,
      required this.value,
      required this.current,
      required this.onTap});

  @override
  Widget build(BuildContext context) {
    final active = value == current;
    return GestureDetector(
      onTap: () => onTap(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: active ? AppColors.success : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: active ? Colors.white : AppColors.subtext,
            )),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label, value;
  final String? subtitle;
  const _StatCard(
      {required this.icon,
      required this.color,
      required this.label,
      required this.value,
      this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8)),
              child: Icon(icon, color: color, size: 16),
            ),
            const SizedBox(height: 8),
            Text(value,
                style:
                    const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            Text(label,
                style: TextStyle(color: AppColors.subtext, fontSize: 9)),
            if (subtitle != null)
              Text(subtitle!,
                  style:
                      TextStyle(color: AppColors.subtext, fontSize: 8)),
          ],
        ),
      ),
    );
  }
}

class _QuickStat extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String value;
  const _QuickStat(
      {required this.icon, required this.color, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: color),
        const SizedBox(width: 3),
        Text(value,
            style: TextStyle(
                fontSize: 10, fontWeight: FontWeight.w500, color: color)),
      ],
    );
  }
}

class _ActuatorRow extends StatelessWidget {
  final Map<String, dynamic> data;
  const _ActuatorRow({required this.data});

  @override
  Widget build(BuildContext context) {
    final name = data['name'] as String? ?? '—';
    final farm = data['farm_name'] as String? ?? '';
    final runtimeMin = (data['runtime_minutes'] as num?)?.toInt() ?? 0;
    final water = (data['water_liters'] as num?)?.toDouble() ?? 0;
    final kwh = (data['electricity_kwh'] as num?)?.toDouble() ?? 0;
    final cost = (data['cost'] as num?)?.toDouble() ?? 0;
    final isOn = data['current_state'] == 'on';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(name,
                            style: const TextStyle(
                                fontWeight: FontWeight.w500, fontSize: 12)),
                        const SizedBox(width: 6),
                        if (isOn)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(context.tr('farms_status_on'),
                                style: TextStyle(
                                    fontSize: 8,
                                    color: AppColors.success,
                                    fontWeight: FontWeight.w600)),
                          ),
                      ],
                    ),
                    if (farm.isNotEmpty)
                      Text(farm,
                          style: TextStyle(
                              fontSize: 10, color: AppColors.subtext)),
                  ],
                ),
              ),
              Text(
                _fmtHours(runtimeMin),
                style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: AppColors.success,
                    fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: runtimeMin > 0
                  ? (runtimeMin / 1440).clamp(0.0, 1.0)
                  : 0,
              backgroundColor: const Color(0xFFF1F5F9),
              valueColor: AlwaysStoppedAnimation(AppColors.success),
              minHeight: 4,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _MiniStat(
                  label: context.tr('history_water_label'),
                  value: water > 0 ? '${water.toStringAsFixed(0)}L' : '—'),
              _MiniStat(
                  label: context.tr('history_electricity'),
                  value: kwh > 0 ? '${kwh.toStringAsFixed(2)}kWh' : '—'),
              _MiniStat(
                  label: context.tr('history_cost_label'),
                  value: cost > 0 ? '₹${cost.toStringAsFixed(1)}' : '—'),
            ],
          ),
        ],
      ),
    );
  }

  String _fmtHours(int minutes) {
    if (minutes == 0) return '0m';
    if (minutes < 60) return '${minutes}m';
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return m == 0 ? '${h}h' : '${h}h ${m}m';
  }
}

class _MiniStat extends StatelessWidget {
  final String label, value;
  const _MiniStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 8, color: AppColors.subtext)),
          Text(value,
              style:
                  const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
