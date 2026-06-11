import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../models/actuator.dart';
import 'status_dot.dart';

class ActuatorTile extends StatelessWidget {
  final Actuator actuator;
  final bool deviceOnline;
  final bool busy;
  final VoidCallback onToggle;

  const ActuatorTile({
    super.key,
    required this.actuator,
    required this.deviceOnline,
    required this.busy,
    required this.onToggle,
  });

  IconData get _icon {
    switch (actuator.actuatorType) {
      case 'pump':
        return Icons.water_drop_outlined;
      case 'valve':
        return Icons.water_outlined;
      default:
        return Icons.bolt_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = statusColor(isOn: actuator.isOn, deviceOnline: deviceOnline);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(_icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(actuator.name,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Row(
                  children: [
                    StatusDot(color: color),
                    const SizedBox(width: 6),
                    Text(
                      actuator.isOn
                          ? 'Running'
                          : (deviceOnline ? 'Off' : 'Device offline'),
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (busy)
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else
            Switch(
              value: actuator.isOn,
              activeTrackColor: AppColors.primary600,
              onChanged: (_) => onToggle(),
            ),
        ],
      ),
    );
  }
}
