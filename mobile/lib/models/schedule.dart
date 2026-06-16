class Schedule {
  final int id;
  final int actuatorId;
  final String? actuatorName;
  final String name;
  final List<int> daysOfWeek;
  final String startTime;
  final int durationMinutes;
  bool isActive;

  Schedule({
    required this.id,
    required this.actuatorId,
    this.actuatorName,
    required this.name,
    required this.daysOfWeek,
    required this.startTime,
    required this.durationMinutes,
    required this.isActive,
  });

  static const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  String get activeDays {
    if (daysOfWeek.length == 7) return 'Every day';
    if (daysOfWeek.isEmpty) return 'No days';
    return daysOfWeek.map((d) => dayLabels[d]).join(', ');
  }

  String get displayTime => startTime.length >= 5 ? startTime.substring(0, 5) : startTime;

  factory Schedule.fromJson(Map<String, dynamic> json) {
    return Schedule(
      id: json['id'] as int,
      actuatorId: json['actuator_id'] as int,
      actuatorName: json['actuator_name'] as String?,
      name: json['name'] as String,
      daysOfWeek: (json['days_of_week'] as List<dynamic>).map((d) => d as int).toList(),
      startTime: json['start_time'] as String? ?? '00:00',
      durationMinutes: json['duration_minutes'] as int? ?? 0,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}
