class PostalLikeAddress {
  final String line1;
  final String? line2;
  final String city;
  final String state;
  final String pincode;

  PostalLikeAddress({
    required this.line1,
    this.line2,
    required this.city,
    required this.state,
    required this.pincode,
  });

  factory PostalLikeAddress.fromJson(Map<String, dynamic> json) {
    return PostalLikeAddress(
      line1: json['line1'] as String? ?? '',
      line2: json['line2'] as String?,
      city: json['city'] as String? ?? '',
      state: json['state'] as String? ?? '',
      pincode: json['pincode'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'line1': line1,
        if (line2 != null && line2!.isNotEmpty) 'line2': line2,
        'city': city,
        'state': state,
        'pincode': pincode,
      };

  String get oneLine =>
      '$line1${line2 != null && line2!.isNotEmpty ? ', $line2' : ''}, $city, $state – $pincode';

  bool get isEmpty => line1.isEmpty && city.isEmpty && state.isEmpty && pincode.isEmpty;
}

class EmergencyContact {
  final String name;
  final String phone;
  final String? relationship;

  EmergencyContact({required this.name, required this.phone, this.relationship});

  factory EmergencyContact.fromJson(Map<String, dynamic> json) {
    return EmergencyContact(
      name: json['name'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      relationship: json['relationship'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'phone': phone,
        if (relationship != null && relationship!.isNotEmpty) 'relationship': relationship,
      };

  bool get isEmpty => name.isEmpty && phone.isEmpty;
}

/// Email / push / SMS toggle for a single notification category.
class ChannelPrefs {
  final bool email;
  final bool push;
  final bool sms;

  const ChannelPrefs({this.email = false, this.push = false, this.sms = false});

  factory ChannelPrefs.fromJson(Map<String, dynamic> json) {
    return ChannelPrefs(
      email: json['email'] as bool? ?? false,
      push: json['push'] as bool? ?? false,
      sms: json['sms'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {'email': email, 'push': push, 'sms': sms};

  ChannelPrefs copyWith({bool? email, bool? push, bool? sms}) => ChannelPrefs(
        email: email ?? this.email,
        push: push ?? this.push,
        sms: sms ?? this.sms,
      );

  bool get anyOn => email || push || sms;

  /// Short status text like the reference app: "On: Email and Push", "Off", "On: SMS".
  String get statusLabel {
    final on = <String>[
      if (email) 'Email',
      if (push) 'Push',
      if (sms) 'SMS',
    ];
    if (on.isEmpty) return 'Off';
    return 'On: ${on.join(' and ')}';
  }
}

Map<String, ChannelPrefs> _parseNotificationPrefs(Map<String, dynamic>? json) {
  if (json == null) return {};
  return json.map((key, value) => MapEntry(key, ChannelPrefs.fromJson(value as Map<String, dynamic>)));
}

class AppUser {
  final int id;
  final int organizationId;
  final String name;
  final String email;
  final String? phone;
  final String role;
  // Explicit server-set flag: true = sees Farm/pump-control features
  // alongside Mandi; false = a Mandi-only marketplace buyer account.
  final bool farmUser;
  final DateTime? createdAt;
  final String? preferredFirstName;
  final PostalLikeAddress? residentialAddress;
  final PostalLikeAddress? postalAddress;
  final EmergencyContact? emergencyContact;
  final bool analyticsOptIn;
  final DateTime? deletionRequestedAt;
  final Map<String, ChannelPrefs> notificationPreferences;
  final String preferredPaymentMethod;

  AppUser({
    required this.id,
    required this.organizationId,
    required this.name,
    required this.email,
    this.phone,
    required this.role,
    this.farmUser = true,
    this.createdAt,
    this.preferredFirstName,
    this.residentialAddress,
    this.postalAddress,
    this.emergencyContact,
    this.analyticsOptIn = true,
    this.deletionRequestedAt,
    this.notificationPreferences = const {},
    this.preferredPaymentMethod = 'cod',
  });

  bool get deletionPending => deletionRequestedAt != null;

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as int,
      organizationId: json['organization_id'] as int,
      name: json['name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String?,
      role: json['role'] as String? ?? 'user',
      farmUser: json['farm_user'] as bool? ?? true,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
      preferredFirstName: json['preferred_first_name'] as String?,
      residentialAddress: json['residential_address'] != null
          ? PostalLikeAddress.fromJson(json['residential_address'] as Map<String, dynamic>)
          : null,
      postalAddress: json['postal_address'] != null
          ? PostalLikeAddress.fromJson(json['postal_address'] as Map<String, dynamic>)
          : null,
      emergencyContact: json['emergency_contact'] != null
          ? EmergencyContact.fromJson(json['emergency_contact'] as Map<String, dynamic>)
          : null,
      analyticsOptIn: json['analytics_opt_in'] as bool? ?? true,
      deletionRequestedAt: json['deletion_requested_at'] != null
          ? DateTime.tryParse(json['deletion_requested_at'] as String)
          : null,
      notificationPreferences: _parseNotificationPrefs(json['notification_preferences'] as Map<String, dynamic>?),
      preferredPaymentMethod: json['preferred_payment_method'] as String? ?? 'cod',
    );
  }
}
