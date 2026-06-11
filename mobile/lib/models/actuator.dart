class Actuator {
  final int id;
  final int deviceId;
  final String? deviceName;
  final int? farmId;
  final String name;
  final String actuatorType; // motor, pump, valve
  final int relayChannel;
  final String currentState; // on, off
  final DateTime? lastTurnedOnAt;
  final DateTime? lastTurnedOffAt;

  Actuator({
    required this.id,
    required this.deviceId,
    this.deviceName,
    this.farmId,
    required this.name,
    required this.actuatorType,
    required this.relayChannel,
    required this.currentState,
    this.lastTurnedOnAt,
    this.lastTurnedOffAt,
  });

  bool get isOn => currentState == 'on';

  Actuator copyWith({String? currentState}) {
    return Actuator(
      id: id,
      deviceId: deviceId,
      deviceName: deviceName,
      farmId: farmId,
      name: name,
      actuatorType: actuatorType,
      relayChannel: relayChannel,
      currentState: currentState ?? this.currentState,
      lastTurnedOnAt: lastTurnedOnAt,
      lastTurnedOffAt: lastTurnedOffAt,
    );
  }

  factory Actuator.fromJson(Map<String, dynamic> json) {
    return Actuator(
      id: json['id'] as int,
      deviceId: json['device_id'] as int,
      deviceName: json['device_name'] as String?,
      farmId: json['farm_id'] as int?,
      name: json['name'] as String,
      actuatorType: json['actuator_type'] as String? ?? 'motor',
      relayChannel: json['relay_channel'] as int,
      currentState: json['current_state'] as String? ?? 'off',
      lastTurnedOnAt: json['last_turned_on_at'] != null
          ? DateTime.tryParse(json['last_turned_on_at'] as String)
          : null,
      lastTurnedOffAt: json['last_turned_off_at'] != null
          ? DateTime.tryParse(json['last_turned_off_at'] as String)
          : null,
    );
  }
}
