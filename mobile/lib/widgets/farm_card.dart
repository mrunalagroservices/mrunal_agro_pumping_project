import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../l10n/tr_extension.dart';
import '../models/actuator.dart';
import '../models/device.dart';
import '../models/farm.dart';
import '../providers/app_state.dart';
import 'actuator_tile.dart';
import 'status_dot.dart';

class FarmCard extends StatefulWidget {
  final Farm farm;

  const FarmCard({super.key, required this.farm});

  @override
  State<FarmCard> createState() => _FarmCardState();
}

class _FarmCardState extends State<FarmCard> {
  final Set<int> _busyActuatorIds = {};

  Future<void> _handleToggle(Actuator actuator) async {
    setState(() => _busyActuatorIds.add(actuator.id));
    final error = await context.read<AppState>().toggleActuator(actuator);
    if (!mounted) return;
    setState(() => _busyActuatorIds.remove(actuator.id));
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error)),
      );
    }
  }

  Future<void> _handleEdit() async {
    final nameController = TextEditingController(text: widget.farm.name);
    final locationController =
        TextEditingController(text: widget.farm.location ?? '');

    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(context.tr('widget_edit_farm')),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: InputDecoration(labelText: context.tr('widget_farm_name')),
                textCapitalization: TextCapitalization.words,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: locationController,
                decoration: InputDecoration(labelText: context.tr('widget_location')),
                textCapitalization: TextCapitalization.words,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(context.tr('widget_cancel')),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(context.tr('widget_save')),
            ),
          ],
        );
      },
    );

    if (result != true || !mounted) return;

    final name = nameController.text.trim();
    if (name.isEmpty) return;

    final error = await context.read<AppState>().updateFarm(
          widget.farm.id,
          name: name,
          location: locationController.text.trim(),
        );
    if (!mounted) return;
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error)),
      );
    }
  }

  Future<void> _handleDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(context.tr('widget_delete_farm')),
          content: Text(
            context.tr('widget_delete_farm_confirm').replaceAll('{name}', widget.farm.name),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(context.tr('widget_cancel')),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.offlineRed,
              ),
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(context.tr('widget_delete')),
            ),
          ],
        );
      },
    );

    if (confirmed != true || !mounted) return;

    final error = await context.read<AppState>().deleteFarm(widget.farm.id);
    if (!mounted) return;
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final devices = state.devicesForFarm(widget.farm.id);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.farm.name,
                        style: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.w600),
                      ),
                      if (widget.farm.location != null &&
                          widget.farm.location!.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(
                            widget.farm.location!,
                            style: TextStyle(
                                color: AppColors.textSecondary, fontSize: 11),
                          ),
                        ),
                    ],
                  ),
                ),
                _FarmStatusBadge(active: state.isFarmActive(widget.farm.id)),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert, color: AppColors.offGray),
                  onSelected: (value) {
                    if (value == 'edit') {
                      _handleEdit();
                    } else if (value == 'delete') {
                      _handleDelete();
                    }
                  },
                  itemBuilder: (context) => [
                    PopupMenuItem(
                      value: 'edit',
                      child: ListTile(
                        leading: const Icon(Icons.edit_outlined),
                        title: Text(context.tr('widget_edit')),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                    PopupMenuItem(
                      value: 'delete',
                      child: ListTile(
                        leading: const Icon(Icons.delete_outline,
                            color: AppColors.offlineRed),
                        title: Text(context.tr('widget_delete'),
                            style: const TextStyle(color: AppColors.offlineRed)),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            if (devices.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(
                  context.tr('widget_no_devices'),
                  style: TextStyle(color: AppColors.textMuted),
                ),
              )
            else
              ...devices.map((device) => _DeviceSection(
                    device: device,
                    busyActuatorIds: _busyActuatorIds,
                    onToggle: (a) => _handleToggle(a),
                  )),
          ],
        ),
      ),
    );
  }
}

class _DeviceSection extends StatelessWidget {
  final Device device;
  final Set<int> busyActuatorIds;
  final void Function(Actuator actuator) onToggle;

  const _DeviceSection({
    required this.device,
    required this.busyActuatorIds,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final actuators = context.watch<AppState>().actuatorsForDevice(device.id);

    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.only(top: 12, bottom: 2),
            child: Row(
              children: [
                StatusDot(
                  color: device.isOnline
                      ? AppColors.primary600
                      : AppColors.offlineRed,
                  size: 8,
                ),
                const SizedBox(width: 6),
                Text(
                  device.name,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                const SizedBox(width: 6),
                Text(
                  device.isOnline ? context.tr('widget_online') : context.tr('widget_offline'),
                  style: TextStyle(color: AppColors.textMuted, fontSize: 10),
                ),
              ],
            ),
          ),
          if (actuators.isEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 14, top: 4, bottom: 4),
              child: Text(
                context.tr('widget_no_actuators'),
                style: TextStyle(color: AppColors.textMuted, fontSize: 11),
              ),
            )
          else
            ...actuators.map((a) => ActuatorTile(
                  actuator: a,
                  deviceOnline: device.isOnline,
                  busy: busyActuatorIds.contains(a.id),
                  onToggle: () => onToggle(a),
                )),
        ],
      ),
    );
  }
}

class _FarmStatusBadge extends StatelessWidget {
  final bool active;

  const _FarmStatusBadge({required this.active});

  @override
  Widget build(BuildContext context) {
    final color = active ? AppColors.primary600 : AppColors.offGray;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          StatusDot(color: color, size: 8),
          const SizedBox(width: 6),
          Text(
            active ? context.tr('widget_running') : context.tr('widget_idle'),
            style: TextStyle(
                color: color, fontSize: 10, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}
