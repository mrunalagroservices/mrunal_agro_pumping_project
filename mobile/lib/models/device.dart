class Device {
  final int id;
  final int? farmId;
  final String? farmName;
  final String name;
  final String deviceType;
  final String status; // online, offline
  final int relayCount;
  final DateTime? lastSeenAt;

  Device({
    required this.id,
    this.farmId,
    this.farmName,
    required this.name,
    required this.deviceType,
    required this.status,
    required this.relayCount,
    this.lastSeenAt,
  });

  bool get isOnline => status == 'online';

  Device copyWith({String? status, DateTime? lastSeenAt}) {
    return Device(
      id: id,
      farmId: farmId,
      farmName: farmName,
      name: name,
      deviceType: deviceType,
      status: status ?? this.status,
      relayCount: relayCount,
      lastSeenAt: lastSeenAt ?? this.lastSeenAt,
    );
  }

  factory Device.fromJson(Map<String, dynamic> json) {
    return Device(
      id: json['id'] as int,
      farmId: json['farm_id'] as int?,
      farmName: json['farm_name'] as String?,
      name: json['name'] as String,
      deviceType: json['device_type'] as String? ?? 'esp32_gateway',
      status: json['status'] as String? ?? 'offline',
      relayCount: int.tryParse('${json['relay_count'] ?? 0}') ?? 0,
      lastSeenAt: json['last_seen_at'] != null
          ? DateTime.tryParse(json['last_seen_at'] as String)
          : null,
    );
  }
}
