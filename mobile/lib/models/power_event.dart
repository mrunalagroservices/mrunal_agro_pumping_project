class PowerEvent {
  final String eventType; // 'power_on' | 'power_off'
  final DateTime createdAt;

  PowerEvent({required this.eventType, required this.createdAt});

  bool get isPowerOn => eventType == 'power_on';

  factory PowerEvent.fromJson(Map<String, dynamic> json) {
    return PowerEvent(
      eventType: json['event_type'] as String,
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

class PowerWindow {
  final DateTime on;
  final DateTime? off;
  PowerWindow({required this.on, this.off});

  int get minutes {
    final end = off ?? DateTime.now();
    return end.difference(on).inMinutes;
  }
}

class DayRecord {
  final String label;
  final String dateKey;
  final List<PowerWindow> windows;
  int totalMinutes;

  DayRecord({
    required this.label,
    required this.dateKey,
    required this.windows,
    this.totalMinutes = 0,
  });
}

List<DayRecord> buildDayRecords(List<PowerEvent> events, bool isOnline) {
  final now = DateTime.now();
  final days = <DayRecord>[];
  for (int i = 6; i >= 0; i--) {
    final d = now.subtract(Duration(days: i));
    final key = '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
    final label = i == 0 ? 'Today' : i == 1 ? 'Yesterday'
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.weekday % 7];
    days.add(DayRecord(label: label, dateKey: key, windows: []));
  }

  DateTime? onTime;
  for (final ev in events) {
    if (ev.isPowerOn) {
      onTime = ev.createdAt;
    } else if (!ev.isPowerOn && onTime != null) {
      final key = '${onTime.year}-${onTime.month.toString().padLeft(2, '0')}-${onTime.day.toString().padLeft(2, '0')}';
      final bucket = days.firstWhere((d) => d.dateKey == key, orElse: () => days.first);
      final w = PowerWindow(on: onTime, off: ev.createdAt);
      bucket.windows.add(w);
      bucket.totalMinutes += w.minutes;
      onTime = null;
    }
  }
  if (onTime != null && isOnline) {
    final key = '${onTime.year}-${onTime.month.toString().padLeft(2, '0')}-${onTime.day.toString().padLeft(2, '0')}';
    final bucket = days.firstWhere((d) => d.dateKey == key, orElse: () => days.last);
    final w = PowerWindow(on: onTime, off: null);
    bucket.windows.add(w);
    bucket.totalMinutes += w.minutes;
  }
  return days;
}

String fmtHours(int minutes) {
  if (minutes < 60) return '${minutes}m';
  final h = minutes ~/ 60;
  final m = minutes % 60;
  return m == 0 ? '${h}h' : '${h}h ${m}m';
}
