enum DiagramElementType { well, motor, valve, electricityPole, pipeJunction, pipeEnd }

enum DiagramConnectionType { pipe, wire }

DiagramElementType _elementTypeFromJson(String value) {
  switch (value) {
    case 'well':
      return DiagramElementType.well;
    case 'motor':
      return DiagramElementType.motor;
    case 'valve':
      return DiagramElementType.valve;
    case 'electricity_pole':
      return DiagramElementType.electricityPole;
    case 'pipe_end':
      return DiagramElementType.pipeEnd;
    case 'pipe_junction':
    default:
      return DiagramElementType.pipeJunction;
  }
}

DiagramConnectionType _connectionTypeFromJson(String value) {
  return value == 'wire' ? DiagramConnectionType.wire : DiagramConnectionType.pipe;
}

class DiagramElement {
  final String id;
  final DiagramElementType type;
  final double lat;
  final double lng;
  final String? label;

  DiagramElement({
    required this.id,
    required this.type,
    required this.lat,
    required this.lng,
    this.label,
  });

  factory DiagramElement.fromJson(Map<String, dynamic> json) {
    return DiagramElement(
      id: json['id'] as String,
      type: _elementTypeFromJson(json['type'] as String),
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      label: json['label'] as String?,
    );
  }
}

class DiagramConnection {
  final String id;
  final String from;
  final String to;
  final DiagramConnectionType type;

  DiagramConnection({
    required this.id,
    required this.from,
    required this.to,
    required this.type,
  });

  factory DiagramConnection.fromJson(Map<String, dynamic> json) {
    return DiagramConnection(
      id: json['id'] as String,
      from: json['from'] as String,
      to: json['to'] as String,
      type: _connectionTypeFromJson(json['type'] as String),
    );
  }
}

class BoundaryPoint {
  final double lat;
  final double lng;

  BoundaryPoint({required this.lat, required this.lng});

  factory BoundaryPoint.fromJson(Map<String, dynamic> json) {
    return BoundaryPoint(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
    );
  }
}

class FarmDiagram {
  final List<DiagramElement> elements;
  final List<DiagramConnection> connections;
  final List<BoundaryPoint> boundary;

  FarmDiagram({required this.elements, required this.connections, this.boundary = const []});

  factory FarmDiagram.fromJson(Map<String, dynamic> json) {
    return FarmDiagram(
      elements: (json['elements'] as List? ?? [])
          .map((e) => DiagramElement.fromJson(e as Map<String, dynamic>))
          .toList(),
      connections: (json['connections'] as List? ?? [])
          .map((c) => DiagramConnection.fromJson(c as Map<String, dynamic>))
          .toList(),
      boundary: (json['boundary'] as List? ?? [])
          .map((b) => BoundaryPoint.fromJson(b as Map<String, dynamic>))
          .toList(),
    );
  }

  bool get isEmpty => elements.isEmpty && boundary.length < 3;
}
