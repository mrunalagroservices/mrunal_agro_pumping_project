import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../models/farm.dart';
import '../providers/app_state.dart';

// Default map center: Pune, Maharashtra (used when no farm has GPS coordinates yet).
const _defaultCenter = LatLng(18.5204, 73.8567);

/// Full-screen, live farm map: custom light basemap, pulsing "live" markers
/// for farms with a pump currently running, and animated fly-to on selection.
class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> with TickerProviderStateMixin {
  final MapController _mapController = MapController();
  AnimationController? _flyController;
  int? _selectedFarmId;

  @override
  void dispose() {
    _flyController?.dispose();
    super.dispose();
  }

  void _flyTo(LatLng target, double targetZoom) {
    final camera = _mapController.camera;
    final startCenter = camera.center;
    final startZoom = camera.zoom;

    _flyController?.dispose();
    final controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    );
    final curved = CurvedAnimation(parent: controller, curve: Curves.easeInOutCubic);
    curved.addListener(() {
      final t = curved.value;
      final lat = startCenter.latitude + (target.latitude - startCenter.latitude) * t;
      final lng = startCenter.longitude + (target.longitude - startCenter.longitude) * t;
      final zoom = startZoom + (targetZoom - startZoom) * t;
      _mapController.move(LatLng(lat, lng), zoom);
    });
    _flyController = controller;
    controller.forward();
  }

  void _selectFarm(Farm farm) {
    if (!farm.hasLocation) return;
    setState(() => _selectedFarmId = farm.id);
    final targetZoom = _mapController.camera.zoom < 13 ? 14.0 : _mapController.camera.zoom;
    _flyTo(LatLng(farm.latitude!, farm.longitude!), targetZoom);
    _showFarmSheet(farm);
  }

  void _showFarmSheet(Farm farm) {
    final state = context.read<AppState>();
    final isActive = state.isFarmActive(farm.id);
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _PulsingDot(active: isActive),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    farm.name,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            if (farm.location != null) ...[
              const SizedBox(height: 6),
              Text(farm.location!, style: TextStyle(color: AppColors.textSecondary)),
            ],
            const SizedBox(height: 12),
            Text(
              isActive
                  ? 'Pump running · ${farm.deviceCount} device(s)'
                  : 'Idle · ${farm.deviceCount} device(s)',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final farmsWithLocation = state.farms.where((f) => f.hasLocation).toList();
    final center = farmsWithLocation.isNotEmpty
        ? LatLng(farmsWithLocation.first.latitude!, farmsWithLocation.first.longitude!)
        : _defaultCenter;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Map'),
        actions: [
          if (state.isLoadingDashboard)
            const Padding(
              padding: EdgeInsets.only(right: 16),
              child: Center(
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => context.read<AppState>().loadDashboard(),
        child: Stack(
          children: [
            FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCenter: center,
                initialZoom: farmsWithLocation.isNotEmpty ? 12 : 6,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                  subdomains: const ['a', 'b', 'c', 'd'],
                  userAgentPackageName: 'com.mrunalagro.mobile',
                ),
                MarkerLayer(
                  markers: farmsWithLocation.map((farm) {
                    final isActive = state.isFarmActive(farm.id);
                    final selected = _selectedFarmId == farm.id;
                    return Marker(
                      point: LatLng(farm.latitude!, farm.longitude!),
                      width: 70,
                      height: 70,
                      child: GestureDetector(
                        onTap: () => _selectFarm(farm),
                        child: _LiveFarmMarker(active: isActive, selected: selected),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
            // Empty-state overlay.
            if (farmsWithLocation.isEmpty)
              Positioned.fill(
                child: Container(
                  alignment: Alignment.center,
                  color: Colors.black.withValues(alpha: 0.25),
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 32),
                    child: Text(
                      'No farm locations set yet.\n'
                      'Add latitude/longitude to a farm to see it on the map.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ),
            // Scrollable farm chips.
            if (farmsWithLocation.isNotEmpty)
              Positioned(
                left: 0,
                right: 0,
                top: 12,
                child: SizedBox(
                  height: 40,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: farmsWithLocation.length,
                    separatorBuilder: (context, index) => const SizedBox(width: 8),
                    itemBuilder: (ctx, i) {
                      final farm = farmsWithLocation[i];
                      final isActive = state.isFarmActive(farm.id);
                      final selected = _selectedFarmId == farm.id;
                      return GestureDetector(
                        onTap: () => _selectFarm(farm),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: selected ? AppColors.primary600 : Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.12),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: isActive ? AppColors.primary500 : AppColors.slate400,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                farm.name,
                                style: TextStyle(
                                  color: selected ? Colors.white : AppColors.textPrimary,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
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

/// Animated "live" marker: a pulsing ring behind a solid dot for farms with
/// a pump currently running, similar to a live-location indicator.
class _LiveFarmMarker extends StatefulWidget {
  final bool active;
  final bool selected;

  const _LiveFarmMarker({required this.active, required this.selected});

  @override
  State<_LiveFarmMarker> createState() => _LiveFarmMarkerState();
}

class _LiveFarmMarkerState extends State<_LiveFarmMarker> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))
      ..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.active ? AppColors.primary600 : AppColors.slate400;
    final dotSize = widget.selected ? 22.0 : 18.0;

    return Center(
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (widget.active)
            AnimatedBuilder(
              animation: _controller,
              builder: (context, _) {
                final t = _controller.value;
                return Container(
                  width: 18 + 36 * t,
                  height: 18 + 36 * t,
                  decoration: BoxDecoration(
                    color: AppColors.primary600.withValues(alpha: (1 - t) * 0.35),
                    shape: BoxShape.circle,
                  ),
                );
              },
            ),
          AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            width: dotSize,
            height: dotSize,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 4),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PulsingDot extends StatelessWidget {
  final bool active;

  const _PulsingDot({required this.active});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 12,
      height: 12,
      decoration: BoxDecoration(
        color: active ? AppColors.primary600 : AppColors.offGray,
        shape: BoxShape.circle,
      ),
    );
  }
}
