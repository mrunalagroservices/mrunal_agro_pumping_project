/// A unified feed entry merging pump/farm alerts, order status updates, and
/// irrigation run completions — backed by GET /api/v1/notifications.
class NotificationItem {
  final String id; // e.g. "alert-12", "order-7", "run-3"
  final String type; // alert | order | irrigation
  final int refId;
  final String title; // English fallback (used when titleKey is null, e.g. a device name)
  final String message; // English fallback (used when messageKey is null)
  final String? titleKey;
  final Map<String, dynamic>? titleParams;
  final String? messageKey;
  final Map<String, dynamic>? messageParams;
  final String? severity; // info | warning | critical (alerts only)
  final String status; // ongoing/resolved (alerts), order status, or completed/aborted
  final DateTime createdAt;

  NotificationItem({
    required this.id,
    required this.type,
    required this.refId,
    required this.title,
    required this.message,
    this.titleKey,
    this.titleParams,
    this.messageKey,
    this.messageParams,
    this.severity,
    required this.status,
    required this.createdAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] as String,
      type: json['type'] as String,
      refId: json['ref_id'] as int,
      title: json['title'] as String? ?? '',
      message: json['message'] as String? ?? '',
      titleKey: json['title_key'] as String?,
      titleParams: json['title_params'] as Map<String, dynamic>?,
      messageKey: json['message_key'] as String?,
      messageParams: json['message_params'] as Map<String, dynamic>?,
      severity: json['severity'] as String?,
      status: json['status'] as String? ?? '',
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
    );
  }

  bool get isAlert => type == 'alert';
  bool get isOrder => type == 'order';
  bool get isIrrigation => type == 'irrigation';

  bool get isUnresolvedAlert => isAlert && status == 'ongoing';
  bool get isCriticalAlert => isAlert && severity == 'critical';
}
