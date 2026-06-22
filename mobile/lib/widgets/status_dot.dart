import 'package:flutter/material.dart';
import '../config/theme.dart';

/// Small colored dot used to indicate actuator/device status.
///
/// - green  -> actuator is ON
/// - gray   -> actuator is OFF (device online)
/// - red    -> device offline / unreachable
class StatusDot extends StatelessWidget {
  final Color color;
  final double size;

  const StatusDot({super.key, required this.color, this.size = 10});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}

Color statusColor({required bool isOn, required bool deviceOnline}) {
  if (isOn) return AppColors.success;
  if (!deviceOnline) return AppColors.danger;
  return AppColors.subtext;
}
