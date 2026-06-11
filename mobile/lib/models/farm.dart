class Farm {
  final int id;
  final String name;
  final String? location;
  final double? latitude;
  final double? longitude;
  final int deviceCount;

  Farm({
    required this.id,
    required this.name,
    this.location,
    this.latitude,
    this.longitude,
    required this.deviceCount,
  });

  factory Farm.fromJson(Map<String, dynamic> json) {
    return Farm(
      id: json['id'] as int,
      name: json['name'] as String,
      location: json['location'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      deviceCount: int.tryParse('${json['device_count'] ?? 0}') ?? 0,
    );
  }

  bool get hasLocation => latitude != null && longitude != null;
}
