import 'package:flutter/material.dart';

class AlertModel {
  final int id;
  final String? deviceName;
  final String alertType;
  final String severity;
  final String message;
  bool isResolved;
  final DateTime createdAt;

  AlertModel({
    required this.id,
    this.deviceName,
    required this.alertType,
    required this.severity,
    required this.message,
    required this.isResolved,
    required this.createdAt,
  });

  Color get severityColor {
    switch (severity) {
      case 'critical':
        return const Color(0xFFDC2626);
      case 'warning':
        return const Color(0xFFD97706);
      default:
        return const Color(0xFF2563EB);
    }
  }

  Color get severityBg {
    switch (severity) {
      case 'critical':
        return const Color(0xFFFEF2F2);
      case 'warning':
        return const Color(0xFFFFFBEB);
      default:
        return const Color(0xFFEFF6FF);
    }
  }

  IconData get severityIcon {
    switch (severity) {
      case 'critical':
        return Icons.error_outline;
      case 'warning':
        return Icons.warning_amber_outlined;
      default:
        return Icons.info_outline;
    }
  }

  factory AlertModel.fromJson(Map<String, dynamic> json) {
    return AlertModel(
      id: json['id'] as int,
      deviceName: json['device_name'] as String?,
      alertType: json['alert_type'] as String? ?? 'unknown',
      severity: json['severity'] as String? ?? 'info',
      message: json['message'] as String? ?? '',
      isResolved: json['is_resolved'] as bool? ?? false,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
    );
  }
}
