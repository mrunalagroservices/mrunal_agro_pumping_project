import 'package:flutter/foundation.dart';
import '../models/actuator.dart';
import '../models/device.dart';
import '../models/farm.dart';
import '../models/user.dart';
import '../services/api_client.dart';
import '../services/socket_service.dart';

enum AuthStatus { unknown, loggedOut, loggedIn }

class AppState extends ChangeNotifier {
  final ApiClient _api = ApiClient();
  final SocketService _socket = SocketService();

  AuthStatus authStatus = AuthStatus.unknown;
  AppUser? user;

  List<Farm> farms = [];
  List<Device> devices = [];
  List<Actuator> actuators = [];

  bool isLoadingDashboard = false;
  String? dashboardError;

  Future<void> bootstrap() async {
    await _api.loadToken();
    if (!_api.hasToken) {
      authStatus = AuthStatus.loggedOut;
      notifyListeners();
      return;
    }
    try {
      final me = await _api.get('/auth/me');
      user = AppUser.fromJson(me as Map<String, dynamic>);
      authStatus = AuthStatus.loggedIn;
      _connectSocket();
    } catch (_) {
      await _api.clearToken();
      authStatus = AuthStatus.loggedOut;
    }
    notifyListeners();
  }

  Future<String?> login(String email, String password) async {
    try {
      final data = await _api.post('/auth/login', {
        'email': email,
        'password': password,
      }) as Map<String, dynamic>;
      await _api.setToken(data['token'] as String);
      user = AppUser.fromJson(data['user'] as Map<String, dynamic>);
      authStatus = AuthStatus.loggedIn;
      _connectSocket();
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (e) {
      return 'Could not reach the server. Please try again.';
    }
  }

  Future<String?> register({
    required String organizationName,
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    try {
      final data = await _api.post('/auth/register', {
        'organization_name': organizationName,
        'name': name,
        'email': email,
        'password': password,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
      }) as Map<String, dynamic>;
      await _api.setToken(data['token'] as String);
      user = AppUser.fromJson(data['user'] as Map<String, dynamic>);
      authStatus = AuthStatus.loggedIn;
      _connectSocket();
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (e) {
      return 'Could not reach the server. Please try again.';
    }
  }

  Future<void> logout() async {
    _socket.disconnect();
    await _api.clearToken();
    user = null;
    farms = [];
    devices = [];
    actuators = [];
    authStatus = AuthStatus.loggedOut;
    notifyListeners();
  }

  void _connectSocket() {
    final token = _api.token;
    if (token == null) return;
    _socket.connect(
      token,
      onActuatorStatus: (data) {
        final updated = Actuator.fromJson(data);
        final index = actuators.indexWhere((a) => a.id == updated.id);
        if (index == -1) {
          actuators.add(updated);
        } else {
          actuators[index] = updated;
        }
        notifyListeners();
      },
      onDeviceStatus: (data) {
        final deviceId = data['device_id'] as int;
        final index = devices.indexWhere((d) => d.id == deviceId);
        if (index == -1) return;
        devices[index] = devices[index].copyWith(
          status: data['status'] as String?,
          lastSeenAt: data['last_seen_at'] != null
              ? DateTime.tryParse(data['last_seen_at'] as String)
              : null,
        );
        notifyListeners();
      },
    );
  }

  @override
  void dispose() {
    _socket.disconnect();
    super.dispose();
  }

  Future<void> loadDashboard() async {
    isLoadingDashboard = true;
    dashboardError = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        _api.get('/farms'),
        _api.get('/devices'),
        _api.get('/actuators'),
      ]);

      farms = (results[0] as List)
          .map((j) => Farm.fromJson(j as Map<String, dynamic>))
          .toList();
      devices = (results[1] as List)
          .map((j) => Device.fromJson(j as Map<String, dynamic>))
          .toList();
      actuators = (results[2] as List)
          .map((j) => Actuator.fromJson(j as Map<String, dynamic>))
          .toList();
    } on UnauthorizedException {
      await logout();
    } on ApiException catch (e) {
      dashboardError = e.message;
    } catch (e) {
      dashboardError = 'Could not reach the server. The free-tier backend '
          'may be waking up — pull to refresh in a moment.';
    } finally {
      isLoadingDashboard = false;
      notifyListeners();
    }
  }

  /// Returns farms whose devices belong to a given farm id.
  List<Device> devicesForFarm(int farmId) =>
      devices.where((d) => d.farmId == farmId).toList();

  /// Returns actuators belonging to a given device id.
  List<Actuator> actuatorsForDevice(int deviceId) =>
      actuators.where((a) => a.deviceId == deviceId).toList();

  /// True if any actuator on this farm is currently ON.
  bool isFarmActive(int farmId) {
    final deviceIds =
        devices.where((d) => d.farmId == farmId).map((d) => d.id).toSet();
    return actuators.any((a) => deviceIds.contains(a.deviceId) && a.isOn);
  }

  Future<String?> updateFarm(
    int farmId, {
    required String name,
    String? location,
  }) async {
    final index = farms.indexWhere((f) => f.id == farmId);
    if (index == -1) return 'Farm not found';

    try {
      final data = await _api.put('/farms/$farmId', {
        'name': name,
        'location': location,
      });
      farms[index] = Farm.fromJson(data as Map<String, dynamic>);
      notifyListeners();
      return null;
    } on UnauthorizedException {
      await logout();
      return 'Session expired, please log in again';
    } on ApiException catch (e) {
      return e.message;
    } catch (e) {
      return 'Could not reach the server.';
    }
  }

  Future<String?> deleteFarm(int farmId) async {
    try {
      await _api.delete('/farms/$farmId');
      farms.removeWhere((f) => f.id == farmId);
      final deviceIds = devices
          .where((d) => d.farmId == farmId)
          .map((d) => d.id)
          .toSet();
      devices.removeWhere((d) => d.farmId == farmId);
      actuators.removeWhere((a) => deviceIds.contains(a.deviceId));
      notifyListeners();
      return null;
    } on UnauthorizedException {
      await logout();
      return 'Session expired, please log in again';
    } on ApiException catch (e) {
      return e.message;
    } catch (e) {
      return 'Could not reach the server.';
    }
  }

  Future<String?> toggleActuator(Actuator actuator) async {
    final newState = actuator.isOn ? 'off' : 'on';
    final index = actuators.indexWhere((a) => a.id == actuator.id);
    if (index == -1) return 'Actuator not found';

    // Optimistic update
    final previous = actuators[index];
    actuators[index] = actuator.copyWith(currentState: newState);
    notifyListeners();

    try {
      final data = await _api
          .post('/actuators/${actuator.id}/toggle', {'state': newState});
      actuators[index] =
          Actuator.fromJson(data as Map<String, dynamic>);
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      actuators[index] = previous; // revert
      notifyListeners();
      return e.message;
    } catch (e) {
      actuators[index] = previous; // revert
      notifyListeners();
      return 'Could not reach the server.';
    }
  }
}
