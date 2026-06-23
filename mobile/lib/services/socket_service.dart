import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/api_config.dart';

/// Realtime connection to the same Socket.IO server the web dashboard uses,
/// so actuator/device toggles made on one client are reflected on the other.
class SocketService {
  io.Socket? _socket;

  void connect(
    String token, {
    required void Function(Map<String, dynamic> data) onActuatorStatus,
    required void Function(Map<String, dynamic> data) onDeviceStatus,
    void Function(Map<String, dynamic> data)? onPowerEvent,
  }) {
    disconnect();

    final socket = io.io(
      socketBaseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .build(),
    );

    socket.onConnect((_) => socket.emit('join-org', token));
    socket.on('actuator-status', (data) {
      onActuatorStatus(Map<String, dynamic>.from(data as Map));
    });
    socket.on('device-status', (data) {
      onDeviceStatus(Map<String, dynamic>.from(data as Map));
    });
    socket.on('power-event', (data) {
      onPowerEvent?.call(Map<String, dynamic>.from(data as Map));
    });

    socket.connect();
    _socket = socket;
  }

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }
}
