import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../l10n/tr_extension.dart';
import '../models/farm.dart';
import '../models/farm_diagram.dart';
import '../providers/app_state.dart';
import '../widgets/language_switcher.dart';

// Default map center: Pune, Maharashtra (used when no farm has GPS coordinates yet).
const _defaultCenter = LatLng(18.5204, 73.8567);

const Map<DiagramElementType, Color> _diagramElementColors = {
  DiagramElementType.well: Color(0xFF0369A1),
  DiagramElementType.motor: Color(0xFF15803D),
  DiagramElementType.valve: Color(0xFF7C3AED),
  DiagramElementType.electricityPole: Color(0xFFB45309),
  DiagramElementType.pipeJunction: Color(0xFF57534E),
};

const Map<DiagramElementType, IconData> _diagramElementIcons = {
  DiagramElementType.well: Icons.water_drop,
  DiagramElementType.motor: Icons.settings,
  DiagramElementType.valve: Icons.tune,
  DiagramElementType.electricityPole: Icons.bolt,
  DiagramElementType.pipeJunction: Icons.add,
};

const Map<DiagramElementType, String> _diagramElementLabelKeys = {
  DiagramElementType.well: 'map_el_well',
  DiagramElementType.motor: 'map_el_motor',
  DiagramElementType.valve: 'map_el_valve',
  DiagramElementType.electricityPole: 'map_el_electricity_pole',
  DiagramElementType.pipeJunction: 'map_el_pipe_junction',
};

const Color _pipeColor = Color(0xFF0EA5E9);
const Color _wireColor = Color(0xFFF59E0B);

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
    context.read<AppState>().loadFarmDiagram(farm.id);
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
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            if (farm.location != null) ...[
              const SizedBox(height: 6),
              Text(farm.location!, style: TextStyle(color: AppColors.subtext)),
            ],
            const SizedBox(height: 12),
            Text(
              (isActive ? context.tr('map_pump_running') : context.tr('map_idle'))
                  .replaceAll('{n}', '${farm.deviceCount}'),
              style: TextStyle(color: AppColors.subtext, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }

  // Read-only render of the well/motor/valve/pole/junction layout authored on
  // the dashboard — only shown for the currently-selected farm, once its
  // diagram has finished loading (guards against showing a stale diagram from
  // a previously-selected farm while the new one is still in flight).
  List<Widget> _buildDiagramLayers(AppState state) {
    final diagram = state.farmDiagram;
    if (diagram == null || diagram.isEmpty) return [];
    if (state.farmDiagramFarmId != _selectedFarmId) return [];

    final elementsById = {for (final e in diagram.elements) e.id: e};

    return [
      PolylineLayer(
        polylines: diagram.connections
            .map((c) {
              final from = elementsById[c.from];
              final to = elementsById[c.to];
              if (from == null || to == null) return null;
              return Polyline(
                points: [LatLng(from.lat, from.lng), LatLng(to.lat, to.lng)],
                color: c.type == DiagramConnectionType.wire ? _wireColor : _pipeColor,
                strokeWidth: 3,
              );
            })
            .whereType<Polyline>()
            .toList(),
      ),
      MarkerLayer(
        markers: diagram.elements.map((el) {
          return Marker(
            point: LatLng(el.lat, el.lng),
            width: 70,
            height: 70,
            child: _DiagramElementMarker(element: el),
          );
        }).toList(),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    context.watchLocale();
    final state = context.watch<AppState>();
    final farmsWithLocation = state.farms.where((f) => f.hasLocation).toList();
    final center = farmsWithLocation.isNotEmpty
        ? LatLng(farmsWithLocation.first.latitude!, farmsWithLocation.first.longitude!)
        : _defaultCenter;

    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('map_title')),
        actions: [
          const LanguageSwitcher(size: 36),
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
                  retinaMode: MediaQuery.devicePixelRatioOf(context) > 1,
                  userAgentPackageName: 'com.mrunalagro.mobile',
                ),
                MarkerLayer(
                  markers: farmsWithLocation.map((farm) {
                    final isActive = state.isFarmActive(farm.id);
                    final selected = _selectedFarmId == farm.id;
                    return Marker(
                      point: LatLng(farm.latitude!, farm.longitude!),
                      width: 90,
                      height: 90,
                      child: GestureDetector(
                        onTap: () => _selectFarm(farm),
                        child: _LiveFarmMarker(active: isActive, selected: selected, label: farm.name),
                      ),
                    );
                  }).toList(),
                ),
                ..._buildDiagramLayers(state),
              ],
            ),
            // Empty-state overlay.
            if (farmsWithLocation.isEmpty)
              Positioned.fill(
                child: Container(
                  alignment: Alignment.center,
                  color: Colors.black.withValues(alpha: 0.25),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Text(
                      context.tr('dashboard_no_farm_location'),
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500),
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
                            color: selected ? AppColors.success : Colors.white,
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
                                  color: isActive ? AppColors.success : AppColors.subtext,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                farm.name,
                                style: TextStyle(
                                  color: selected ? Colors.white : AppColors.text,
                                  fontWeight: FontWeight.w500,
                                  fontSize: 11,
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
  final String label;

  const _LiveFarmMarker({required this.active, required this.selected, required this.label});

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
    final color = widget.active ? AppColors.success : AppColors.subtext;
    final dotSize = widget.selected ? 22.0 : 18.0;

    return Column(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Stack(
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
                      color: AppColors.success.withValues(alpha: (1 - t) * 0.35),
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
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(10),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Text(
            widget.label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 8,
              fontWeight: FontWeight.w600,
              color: widget.selected ? AppColors.accent : const Color(0xFF1e293b),
            ),
          ),
        ),
      ],
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
        color: active ? AppColors.success : AppColors.subtext,
        shape: BoxShape.circle,
      ),
    );
  }
}

/// A single well/motor/valve/pole/junction icon from a farm's saved layout
/// diagram (authored on the dashboard) — read-only on mobile.
class _DiagramElementMarker extends StatelessWidget {
  final DiagramElement element;

  const _DiagramElementMarker({required this.element});

  @override
  Widget build(BuildContext context) {
    final color = _diagramElementColors[element.type] ?? AppColors.subtext;
    final icon = _diagramElementIcons[element.type] ?? Icons.circle;
    final labelKey = _diagramElementLabelKeys[element.type];
    final label = element.label ?? (labelKey != null ? context.tr(labelKey) : '');

    return Column(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2.5),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 4),
            ],
          ),
          child: Icon(icon, color: Colors.white, size: 16),
        ),
        const SizedBox(height: 2),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 3),
            ],
          ),
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 7, fontWeight: FontWeight.w600, color: Color(0xFF1e293b)),
          ),
        ),
      ],
    );
  }
}
