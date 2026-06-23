import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../l10n/tr_extension.dart';
import '../providers/app_state.dart';
import '../widgets/language_switcher.dart';
import '../widgets/top_bar_actions.dart';
import 'farms_screen.dart';
import 'history_screen.dart';
import 'schedules_screen.dart';

// Default map center: Pune, Maharashtra (used when no farm has GPS coordinates yet).
const _defaultCenter = LatLng(18.5204, 73.8567);

// Typography palette — matches the Profile screen.
const _kText = Color(0xFF222222);
const _kSub = Color(0xFF717171);

class DashboardScreen extends StatelessWidget {
  final VoidCallback? onViewMap;

  const DashboardScreen({super.key, this.onViewMap});

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    final state = context.watch<AppState>();

    final farmsWithLocation = state.farms.where((f) => f.hasLocation).toList();
    final center = farmsWithLocation.isNotEmpty
        ? LatLng(farmsWithLocation.first.latitude!, farmsWithLocation.first.longitude!)
        : _defaultCenter;

    final onlineDevices = state.devices.where((d) => d.isOnline).length;
    final activeActuators = state.actuators.where((a) => a.isOn).length;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Image.asset('assets/images/icon.png', height: 28),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Mrunal Agro',
                    style: TextStyle(fontWeight: FontWeight.w500, fontSize: 16, color: _kText, letterSpacing: -0.2)),
                Text(
                  state.user != null
                      ? context.tr('dashboard_greeting').replaceAll(
                          '{name}',
                          state.user!.preferredFirstName?.isNotEmpty == true
                              ? state.user!.preferredFirstName!
                              : state.user!.name,
                        )
                      : context.tr('dashboard_pumping_control'),
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w400, color: _kSub),
                ),
              ],
            ),
          ],
        ),
        actions: const [LanguageSwitcher(size: 36), SizedBox(width: 6), TopBarActions()],
      ),
      body: RefreshIndicator(
        onRefresh: () => context.read<AppState>().loadDashboard(),
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: SizedBox(
                height: 240,
                child: Stack(
                  children: [
                    IgnorePointer(
                      child: FlutterMap(
                        options: MapOptions(
                          initialCenter: center,
                          initialZoom: farmsWithLocation.isNotEmpty ? 12 : 6,
                          interactionOptions:
                              const InteractionOptions(flags: InteractiveFlag.none),
                        ),
                        children: [
                          TileLayer(
                            urlTemplate:
                                'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                            subdomains: const ['a', 'b', 'c', 'd'],
                            retinaMode: MediaQuery.devicePixelRatioOf(context) > 1,
                            userAgentPackageName: 'com.mrunalagro.mobile',
                          ),
                          MarkerLayer(
                            markers: farmsWithLocation.map((farm) {
                              final color = state.isFarmActive(farm.id)
                                  ? AppColors.success
                                  : AppColors.subtext;
                              return Marker(
                                point: LatLng(farm.latitude!, farm.longitude!),
                                width: 80,
                                height: 60,
                                child: _FarmMarker(
                                  color: color,
                                  label: farm.name,
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                    Positioned(
                      right: 12,
                      bottom: 12,
                      child: GestureDetector(
                        onTap: onViewMap,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.15),
                                blurRadius: 4,
                                offset: const Offset(0, 1),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.map_outlined, size: 14, color: AppColors.accent),
                              const SizedBox(width: 4),
                              Text(
                                context.tr('dashboard_view_live_map'),
                                style: const TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.accent,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    if (farmsWithLocation.isEmpty)
                      Positioned.fill(
                        child: Container(
                          color: Colors.black.withValues(alpha: 0.35),
                          alignment: Alignment.center,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                            child: Text(
                              context.tr('dashboard_no_farm_location'),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                  color: Colors.white, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Row(
                  children: [
                    Text(context.tr('dashboard_overview'),
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w500, color: _kText, letterSpacing: -0.3)),
                    const Spacer(),
                    if (state.isLoadingDashboard)
                      const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                  ],
                ),
              ),
            ),
            if (state.dashboardError != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      state.dashboardError!,
                      style: const TextStyle(color: AppColors.danger),
                    ),
                  ),
                ),
              ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              sliver: SliverToBoxAdapter(
                child: SizedBox(
                  height: 96,
                  child: Row(
                  children: [
                    Expanded(
                      child: _StatCard(
                        icon: Icons.agriculture_outlined,
                        color: AppColors.success,
                        label: context.tr('dashboard_stat_farms'),
                        value: '${state.farms.length}',
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _StatCard(
                        icon: Icons.developer_board_outlined,
                        color: AppColors.success,
                        label: context.tr('dashboard_stat_online'),
                        value: '$onlineDevices/${state.devices.length}',
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _StatCard(
                        icon: Icons.water_drop_outlined,
                        color: AppColors.success,
                        label: context.tr('dashboard_stat_running'),
                        value: '$activeActuators/${state.actuators.length}',
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _StatCard(
                        icon: Icons.bolt_outlined,
                        color: activeActuators > 0
                            ? AppColors.success
                            : AppColors.subtext,
                        label: context.tr('dashboard_stat_status'),
                        value: activeActuators > 0
                            ? context.tr('dashboard_status_running')
                            : context.tr('dashboard_status_idle'),
                      ),
                    ),
                  ],
                  ),
                ),
              ),
            ),
            // Quick links: Farms & Devices / Schedules
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: _QuickLinkCard(
                        icon: Icons.agriculture_outlined,
                        iconBg: const Color(0xFFDCFCE7),
                        iconColor: AppColors.accent,
                        title: context.tr('dashboard_farms_devices'),
                        subtitle: context.tr('dashboard_farms_devices_sub'),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const FarmsScreen()),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: _QuickLinkCard(
                        icon: Icons.schedule_outlined,
                        iconBg: const Color(0xFFFFF7ED),
                        iconColor: const Color(0xFFD97706),
                        title: context.tr('dashboard_schedules'),
                        subtitle: context.tr('dashboard_schedules_sub'),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const SchedulesScreen()),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // History shortcut
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                child: GestureDetector(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const HistoryScreen()),
                  ),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 4, offset: const Offset(0, 2))],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: const Color(0xFFEDE9FE),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.bar_chart_outlined, color: Color(0xFF7C3AED), size: 20),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(context.tr('dashboard_history_analytics'), style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13, color: _kText)),
                              Text(context.tr('dashboard_history_analytics_sub'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w400, color: _kSub)),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right_outlined, color: Color(0xFF94A3B8)),
                      ],
                    ),
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

class _QuickLinkCard extends StatelessWidget {
  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _QuickLinkCard({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 4, offset: const Offset(0, 2))],
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(color: iconBg, borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13, color: _kText)),
                  Text(subtitle, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w400, color: _kSub)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_outlined, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String value;

  const _StatCard({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 26,
              height: 26,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 14),
            ),
            const SizedBox(height: 6),
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: _kText),
            ),
            const SizedBox(height: 1),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: _kSub, fontSize: 8.5, fontWeight: FontWeight.w400),
            ),
          ],
        ),
      ),
    );
  }
}

class _FarmMarker extends StatelessWidget {
  final Color color;
  final String label;

  const _FarmMarker({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w500),
          ),
        ),
        const SizedBox(height: 2),
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.2),
                blurRadius: 4,
              ),
            ],
          ),
          child: const Icon(Icons.water_drop, color: Colors.white, size: 14),
        ),
      ],
    );
  }
}
