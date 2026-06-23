import 'package:flutter/foundation.dart';
import '../models/actuator.dart';
import '../models/alert_model.dart';
import '../models/device.dart';
import '../models/farm.dart';
import '../models/farm_diagram.dart';
import '../models/faq_topic.dart';
import '../models/legal_document.dart';
import '../models/notification_item.dart';
import '../models/order.dart';
import '../models/power_event.dart';
import '../models/product.dart';
import '../models/schedule.dart';
import '../models/user.dart';
import '../services/api_client.dart';
import '../services/feedback_service.dart';
import '../services/local_db.dart';
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
  List<Schedule> schedules = [];
  List<AlertModel> alerts = [];
  List<OrderModel> orders = [];
  List<NotificationItem> notifications = [];
  List<Product> products = [];
  List<Product> wishlist = [];
  Set<int> wishlistIds = {};
  Map<int, List<PowerEvent>> powerEvents = {}; // deviceId → events

  FarmDiagram? farmDiagram;
  int? farmDiagramFarmId; // which farm `farmDiagram` belongs to, so stale data isn't shown mid-fetch
  bool isLoadingFarmDiagram = false;

  List<LegalDocumentSummary> legalDocuments = [];
  List<FaqTopic> faqTopics = [];
  SupportContact? supportContact;
  bool isLoadingLegal = false;
  bool isLoadingSupport = false;

  bool isLoadingDashboard = false;
  bool isLoadingSchedules = false;
  bool isLoadingAlerts = false;
  bool isLoadingOrders = false;
  bool isLoadingNotifications = false;
  bool isLoadingProducts = false;
  String? dashboardError;
  String? schedulesError;
  String? alertsError;
  String? productsError;
  String? ordersError;
  String? notificationsError;

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
    schedules = [];
    alerts = [];
    orders = [];
    notifications = [];
    products = [];
    wishlist = [];
    wishlistIds = {};
    powerEvents = {};
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
        final previousState = index == -1 ? null : actuators[index].currentState;
        if (index == -1) {
          actuators.add(updated);
        } else {
          actuators[index] = updated;
        }
        // Fires for every transition regardless of who/what triggered it (this
        // phone, the dashboard, a schedule, automation, or a safety cutoff) so
        // the operator always feels/hears a motor turning on or off.
        if (previousState != null && previousState != updated.currentState) {
          if (updated.isOn) {
            FeedbackService.motorStarted();
          } else {
            FeedbackService.motorStopped();
          }
        }
        notifyListeners();
      },
      onDeviceStatus: (data) {
        final deviceId = data['device_id'] as int;
        final index = devices.indexWhere((d) => d.id == deviceId);
        if (index == -1) return;
        final previousStatus = devices[index].status;
        final newStatus = data['status'] as String?;
        devices[index] = devices[index].copyWith(
          status: newStatus,
          lastSeenAt: data['last_seen_at'] != null
              ? DateTime.tryParse(data['last_seen_at'] as String)
              : null,
        );
        // "Forceful" disconnect — the device dropped offline without a graceful
        // logout, e.g. a snapped wire or power loss to the controller itself.
        if (previousStatus != newStatus) {
          if (newStatus == 'offline') {
            FeedbackService.connectionLost();
          } else if (newStatus == 'online' && previousStatus == 'offline') {
            FeedbackService.connectionRestored();
          }
        }
        notifyListeners();
      },
      onPowerEvent: (data) {
        final eventType = data['event_type'] as String?;
        if (eventType == 'power_off') {
          FeedbackService.powerCut();
        } else if (eventType == 'power_on') {
          FeedbackService.powerRestored();
        }
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

  // ── Profile ────────────────────────────────────────────────────────────────
  Future<String?> updateProfile({
    String? name,
    String? phone,
    String? email,
    String? preferredFirstName,
    PostalLikeAddress? residentialAddress,
    PostalLikeAddress? postalAddress,
    EmergencyContact? emergencyContact,
    bool? analyticsOptIn,
    Map<String, ChannelPrefs>? notificationPreferences,
    String? preferredPaymentMethod,
  }) async {
    try {
      final data = await _api.put('/auth/me', {
        if (name != null) 'name': name,
        if (phone != null) 'phone': phone,
        if (email != null) 'email': email,
        if (preferredFirstName != null) 'preferred_first_name': preferredFirstName,
        if (residentialAddress != null) 'residential_address': residentialAddress.toJson(),
        if (postalAddress != null) 'postal_address': postalAddress.toJson(),
        if (emergencyContact != null) 'emergency_contact': emergencyContact.toJson(),
        if (analyticsOptIn != null) 'analytics_opt_in': analyticsOptIn,
        if (notificationPreferences != null)
          'notification_preferences': notificationPreferences.map((k, v) => MapEntry(k, v.toJson())),
        if (preferredPaymentMethod != null) 'preferred_payment_method': preferredPaymentMethod,
      });
      user = AppUser.fromJson(data as Map<String, dynamic>);
      notifyListeners();
      return null;
    } on UnauthorizedException {
      await logout();
      return 'Session expired, please log in again';
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      return 'Could not reach the server.';
    }
  }

  /// Updates a single notification category's channel toggles, merging with
  /// whatever preferences already exist locally.
  Future<String?> updateNotificationPref(String key, ChannelPrefs prefs) async {
    final merged = Map<String, ChannelPrefs>.from(user?.notificationPreferences ?? {});
    merged[key] = prefs;
    return updateProfile(notificationPreferences: merged);
  }

  Future<String?> requestDataExport() async {
    try {
      await _api.post('/auth/me/request-data-export');
      return null;
    } on UnauthorizedException {
      await logout();
      return 'Session expired, please log in again';
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      return 'Could not reach the server.';
    }
  }

  Future<String?> requestAccountDeletion() async {
    try {
      final data = await _api.post('/auth/me/request-deletion');
      user = AppUser.fromJson(data as Map<String, dynamic>);
      notifyListeners();
      return null;
    } on UnauthorizedException {
      await logout();
      return 'Session expired, please log in again';
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      return 'Could not reach the server.';
    }
  }

  Future<String?> cancelAccountDeletion() async {
    try {
      final data = await _api.post('/auth/me/cancel-deletion');
      user = AppUser.fromJson(data as Map<String, dynamic>);
      notifyListeners();
      return null;
    } on UnauthorizedException {
      await logout();
      return 'Session expired, please log in again';
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      return 'Could not reach the server.';
    }
  }

  // ── Schedules ──────────────────────────────────────────────────────────────
  Future<void> loadSchedules() async {
    isLoadingSchedules = true;
    schedulesError = null;
    notifyListeners();
    try {
      final data = await _api.get('/schedules');
      schedules = (data as List).map((j) => Schedule.fromJson(j as Map<String, dynamic>)).toList();
    } on UnauthorizedException {
      await logout();
    } on ApiException catch (e) {
      schedulesError = e.message;
    } catch (_) {
      schedulesError = 'Could not load schedules.';
    } finally {
      isLoadingSchedules = false;
      notifyListeners();
    }
  }

  Future<String?> createSchedule({
    required int actuatorId,
    required String name,
    required List<int> daysOfWeek,
    required String startTime,
    required int durationMinutes,
  }) async {
    try {
      final data = await _api.post('/schedules', {
        'actuator_id': actuatorId,
        'name': name,
        'days_of_week': daysOfWeek,
        'start_time': startTime,
        'duration_minutes': durationMinutes,
      });
      schedules.insert(0, Schedule.fromJson(data as Map<String, dynamic>));
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      return 'Could not create schedule.';
    }
  }

  Future<String?> toggleSchedule(Schedule schedule) async {
    try {
      final data = await _api.put('/schedules/${schedule.id}', {'is_active': !schedule.isActive});
      final updated = Schedule.fromJson(data as Map<String, dynamic>);
      final i = schedules.indexWhere((s) => s.id == schedule.id);
      if (i != -1) schedules[i] = updated;
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      return 'Could not update schedule.';
    }
  }

  Future<String?> deleteSchedule(int id) async {
    try {
      await _api.delete('/schedules/$id');
      schedules.removeWhere((s) => s.id == id);
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      return 'Could not delete schedule.';
    }
  }

  // ── Alerts ─────────────────────────────────────────────────────────────────
  Future<void> loadAlerts() async {
    isLoadingAlerts = true;
    alertsError = null;
    notifyListeners();
    try {
      final data = await _api.get('/alerts?limit=50');
      alerts = (data as List).map((j) => AlertModel.fromJson(j as Map<String, dynamic>)).toList();
    } on UnauthorizedException {
      await logout();
    } on ApiException catch (e) {
      alertsError = e.message;
    } catch (_) {
      alertsError = 'Could not load alerts.';
    } finally {
      isLoadingAlerts = false;
      notifyListeners();
    }
  }

  Future<String?> resolveAlert(int id) async {
    try {
      await _api.put('/alerts/$id/resolve', {});
      final i = alerts.indexWhere((a) => a.id == id);
      if (i != -1) alerts[i].isResolved = true;

      final ni = notifications.indexWhere((n) => n.isAlert && n.refId == id);
      if (ni != -1) {
        final n = notifications[ni];
        notifications[ni] = NotificationItem(
          id: n.id, type: n.type, refId: n.refId, title: n.title, message: n.message,
          severity: n.severity, status: 'resolved', createdAt: n.createdAt,
        );
      }
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      return 'Could not resolve alert.';
    }
  }

  // ── Notifications (unified feed: alerts + order updates + irrigation runs) ──
  Future<void> loadNotifications() async {
    isLoadingNotifications = true;
    notificationsError = null;
    notifyListeners();
    try {
      final data = await _api.get('/notifications');
      notifications = (data as List).map((j) => NotificationItem.fromJson(j as Map<String, dynamic>)).toList();
    } on UnauthorizedException {
      await logout();
    } on ApiException catch (e) {
      notificationsError = e.message;
    } catch (_) {
      notificationsError = 'Could not load notifications.';
    } finally {
      isLoadingNotifications = false;
      notifyListeners();
    }
  }

  // ── Products (real catalog) ──────────────────────────────────────────────────
  Future<void> loadProducts() async {
    isLoadingProducts = true;
    productsError = null;
    notifyListeners();
    try {
      final data = await _api.get('/products');
      products = (data as List).map((j) => Product.fromJson(j as Map<String, dynamic>)).toList();
    } on UnauthorizedException {
      await logout();
    } on ApiException catch (e) {
      productsError = e.message;
    } catch (_) {
      productsError = 'Could not load products.';
    } finally {
      isLoadingProducts = false;
      notifyListeners();
    }
  }

  Future<Product> fetchProduct(int id) async {
    final data = await _api.get('/products/$id');
    return Product.fromJson(data as Map<String, dynamic>);
  }

  Future<List<ProductReview>> fetchReviews(int productId) async {
    final data = await _api.get('/products/$productId/reviews');
    return (data as List).map((j) => ProductReview.fromJson(j as Map<String, dynamic>)).toList();
  }

  Future<String?> submitReview(int productId, int rating, String? comment) async {
    try {
      await _api.post('/products/$productId/reviews', {'rating': rating, 'comment': comment});
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (_) {
      return 'Could not submit review.';
    }
  }

  Future<List<String>> fetchCategories() async {
    final data = await _api.get('/shop-settings') as Map<String, dynamic>;
    return ((data['categories'] as List?) ?? []).cast<String>();
  }

  // ── Wishlist ───────────────────────────────────────────────────────────────
  Future<void> loadWishlist() async {
    try {
      final data = await _api.get('/products/wishlist/mine');
      wishlist = (data as List).map((j) => Product.fromJson(j as Map<String, dynamic>)).toList();
      wishlistIds = wishlist.map((p) => p.id).toSet();
      notifyListeners();
    } catch (_) {
      // Non-fatal — wishlist hearts just won't reflect saved state until retried.
    }
  }

  bool isWishlisted(int productId) => wishlistIds.contains(productId);

  Future<void> toggleWishlist(int productId) async {
    final wasWishlisted = wishlistIds.contains(productId);
    if (wasWishlisted) {
      wishlistIds.remove(productId);
      wishlist.removeWhere((p) => p.id == productId);
    } else {
      wishlistIds.add(productId);
    }
    notifyListeners();
    try {
      if (wasWishlisted) {
        await _api.delete('/products/$productId/wishlist');
      } else {
        await _api.post('/products/$productId/wishlist');
        await loadWishlist();
      }
    } catch (_) {
      // Revert optimistic update on failure.
      if (wasWishlisted) {
        wishlistIds.add(productId);
      } else {
        wishlistIds.remove(productId);
      }
      notifyListeners();
    }
  }

  // ── Coupons (admin-managed; saved per-user via user_saved_coupons) ───────────
  Future<List<Map<String, dynamic>>> fetchMyCoupons() async {
    final data = await _api.get('/shop-settings/my-coupons');
    return (data as List).cast<Map<String, dynamic>>();
  }

  /// Throws ApiException (with a user-facing message) if the code is invalid/expired.
  Future<Map<String, dynamic>> saveCoupon(String code) async {
    final data = await _api.post('/shop-settings/my-coupons', {'code': code});
    return data as Map<String, dynamic>;
  }

  /// Validates a coupon against a real cart subtotal (enforces min-order),
  /// returning { coupon, discount }. Throws ApiException if invalid.
  Future<Map<String, dynamic>> checkCoupon(String code, double subtotal) async {
    final data = await _api.post('/shop-settings/validate-coupon', {'code': code, 'subtotal': subtotal});
    return data as Map<String, dynamic>;
  }

  // ── Checkout ───────────────────────────────────────────────────────────────
  Future<OrderModel> placeOrder({
    required List<Map<String, dynamic>> items,
    required DeliveryAddress address,
    required String paymentMethod,
    required double subtotal,
    required double deliveryCharge,
    required double discount,
    required double total,
    String? couponCode,
  }) async {
    final data = await _api.post('/orders', {
      'items': items,
      'delivery_address': address.toJson(),
      'payment_method': paymentMethod,
      'subtotal': subtotal,
      'delivery_charge': deliveryCharge,
      'discount': discount,
      'total': total,
      if (couponCode != null) 'coupon_code': couponCode,
    });
    return OrderModel.fromJson({...data as Map<String, dynamic>, 'items': const []});
  }

  // ── Orders ─────────────────────────────────────────────────────────────────
  Future<void> loadOrders() async {
    isLoadingOrders = true;
    ordersError = null;
    notifyListeners();
    try {
      final data = await _api.get('/orders/mine');
      orders = (data as List).map((j) => OrderModel.fromJson(j as Map<String, dynamic>)).toList();
    } on UnauthorizedException {
      await logout();
    } on ApiException catch (e) {
      ordersError = e.message;
    } catch (_) {
      ordersError = 'Could not load orders.';
    } finally {
      isLoadingOrders = false;
      notifyListeners();
    }
  }

  // ── Analytics ──────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> fetchAnalytics(String range) async {
    final data = await _api.get('/analytics/overview?range=$range');
    return data as Map<String, dynamic>;
  }

  /// Returns per-day runtime breakdown with per-session ON→OFF times.
  /// Response shape: { "days": [ { date, label, total_hours, water_liters,
  ///   electricity_kwh, actuators: [ { id, name, hours, sessions: [{start, end}] } ] } ] }
  Future<Map<String, dynamic>> fetchDailyRuntime(int days) async {
    final data = await _api.get('/analytics/daily-runtime?days=$days');
    return data as Map<String, dynamic>;
  }

  // ── Power events ────────────────────────────────────────────────────────────

  Future<void> loadPowerEvents(int deviceId) async {
    if (powerEvents.containsKey(deviceId)) return;
    try {
      final data = await _api.get('/devices/$deviceId/power-events?days=7');
      powerEvents[deviceId] = (data as List)
          .map((j) => PowerEvent.fromJson(j as Map<String, dynamic>))
          .toList();
      notifyListeners();
    } catch (_) {
      powerEvents[deviceId] = [];
      notifyListeners();
    }
  }

  Future<String?> toggleActuator(Actuator actuator) async {
    final newState = actuator.isOn ? 'off' : 'on';
    final index = actuators.indexWhere((a) => a.id == actuator.id);
    if (index == -1) return 'Actuator not found';

    // Fire feedback for our own tap right away — the optimistic update below
    // changes currentState immediately, so by the time the socket echoes this
    // change back, onActuatorStatus's before/after diff would see no change
    // and never fire (that diff only catches changes from elsewhere: another
    // client, a schedule, automation, or a safety cutoff).
    if (newState == 'on') {
      FeedbackService.motorStarted();
    } else {
      FeedbackService.motorStopped();
    }

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

  /// Emergency "सर्व बंद" — turns off every actuator currently running across
  /// every farm, in parallel. Returns the number that failed to turn off
  /// (0 means everything stopped successfully).
  Future<int> emergencyStopAll() async {
    final running = actuators.where((a) => a.isOn).toList();
    if (running.isEmpty) return 0;
    await FeedbackService.emergencyStop();
    final results = await Future.wait(running.map(toggleActuator));
    return results.where((e) => e != null).length;
  }

  // ── Farm layout diagram (read-only on mobile; authored on the dashboard) ───
  Future<void> loadFarmDiagram(int farmId) async {
    farmDiagram = null;
    farmDiagramFarmId = farmId;
    isLoadingFarmDiagram = true;
    notifyListeners();
    try {
      final data = await _api.get('/farms/$farmId/diagram') as Map<String, dynamic>;
      if (farmDiagramFarmId != farmId) return; // a newer selection has since started loading
      farmDiagram = FarmDiagram.fromJson(data);
    } catch (_) {
      if (farmDiagramFarmId != farmId) return;
      farmDiagram = null;
    } finally {
      if (farmDiagramFarmId == farmId) isLoadingFarmDiagram = false;
      notifyListeners();
    }
  }

  void clearFarmDiagram() {
    farmDiagram = null;
    farmDiagramFarmId = null;
    notifyListeners();
  }

  // ── Legal & Support (backend is source of truth; local DB is offline cache) ─
  Future<void> loadLegalDocuments({String lang = 'en'}) async {
    isLoadingLegal = true;
    notifyListeners();
    try {
      final data = await _api.get('/legal/documents?lang=$lang') as List;
      await LocalDb.instance.saveLegalDocumentSummaries(data);
      legalDocuments = data
          .map((j) => LegalDocumentSummary.fromJson(j as Map<String, dynamic>))
          .toList();
    } catch (_) {
      final cached = await LocalDb.instance.getLegalDocumentSummaries();
      legalDocuments = cached.map((j) => LegalDocumentSummary.fromJson(j)).toList();
    } finally {
      isLoadingLegal = false;
      notifyListeners();
    }
  }

  Future<LegalDocument?> fetchLegalDocument(String slug, {String lang = 'en'}) async {
    try {
      final data = await _api.get('/legal/documents/$slug?lang=$lang') as Map<String, dynamic>;
      await LocalDb.instance.saveLegalDocument(data);
      return LegalDocument.fromJson(data);
    } catch (_) {
      final cached = await LocalDb.instance.getLegalDocument(slug);
      if (cached == null) return null;
      return LegalDocument.fromJson(cached);
    }
  }

  Future<void> loadSupportInfo({String lang = 'en'}) async {
    isLoadingSupport = true;
    notifyListeners();
    try {
      final contactData = await _api.get('/support/contact') as Map<String, dynamic>;
      final faqData = await _api.get('/support/faqs?lang=$lang') as List;
      await LocalDb.instance.saveSupportContact(contactData);
      await LocalDb.instance.saveFaqTopics(faqData);
      supportContact = SupportContact.fromJson(contactData);
      faqTopics = faqData.map((j) => FaqTopic.fromJson(j as Map<String, dynamic>)).toList();
    } catch (_) {
      final cachedContact = await LocalDb.instance.getSupportContact();
      if (cachedContact != null) supportContact = SupportContact.fromJson(cachedContact);
      final cachedFaqs = await LocalDb.instance.getFaqTopics();
      faqTopics = cachedFaqs.map((j) => FaqTopic.fromJson(j)).toList();
    } finally {
      isLoadingSupport = false;
      notifyListeners();
    }
  }
}
