import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/app_state.dart';
import '../widgets/top_bar_actions.dart';

// Default map center: Pune, Maharashtra (used when no farm has GPS coordinates yet).
const _defaultCenter = LatLng(18.5204, 73.8567);

class DashboardScreen extends StatelessWidget {
  final VoidCallback? onViewMap;

  const DashboardScreen({super.key, this.onViewMap});

  @override
  Widget build(BuildContext context) {
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
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                Text(
                  state.user != null ? 'Hi, ${state.user!.name}' : 'Pumping Control',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ],
        ),
        actions: const [TopBarActions()],
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
                            userAgentPackageName: 'com.mrunalagro.mobile',
                          ),
                          MarkerLayer(
                            markers: farmsWithLocation.map((farm) {
                              final color = state.isFarmActive(farm.id)
                                  ? AppColors.primary600
                                  : AppColors.offGray;
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
                            children: const [
                              Icon(Icons.map_outlined, size: 14, color: AppColors.primary700),
                              SizedBox(width: 4),
                              Text(
                                'View live map',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary700,
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
                          child: const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 24),
                            child: Text(
                              'No farm locations set yet.\nAdd latitude/longitude to a farm '
                              'to see it on the map.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  color: Colors.white, fontWeight: FontWeight.w600),
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
                    const Text('Overview',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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
                      style: const TextStyle(color: AppColors.offlineRed),
                    ),
                  ),
                ),
              ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              sliver: SliverGrid.count(
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.5,
                children: [
                  _StatCard(
                    icon: Icons.agriculture_outlined,
                    color: AppColors.primary600,
                    label: 'Farms',
                    value: '${state.farms.length}',
                  ),
                  _StatCard(
                    icon: Icons.developer_board_outlined,
                    color: AppColors.primary600,
                    label: 'Devices online',
                    value: '$onlineDevices / ${state.devices.length}',
                  ),
                  _StatCard(
                    icon: Icons.water_drop_outlined,
                    color: AppColors.primary600,
                    label: 'Pumps running',
                    value: '$activeActuators / ${state.actuators.length}',
                  ),
                  _StatCard(
                    icon: Icons.bolt_outlined,
                    color: activeActuators > 0
                        ? AppColors.primary600
                        : AppColors.offGray,
                    label: 'Status',
                    value: activeActuators > 0 ? 'Running' : 'Idle',
                  ),
                ],
              ),
            ),
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
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(height: 10),
            Text(
              value,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
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
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
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
