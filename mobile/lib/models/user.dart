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

class AppUser {
  final int id;
  final int organizationId;
  final String name;
  final String email;
  final String? phone;
  final String role;
  final DateTime? createdAt;
  final String? preferredFirstName;
  final PostalLikeAddress? residentialAddress;
  final PostalLikeAddress? postalAddress;
  final EmergencyContact? emergencyContact;

  AppUser({
    required this.id,
    required this.organizationId,
    required this.name,
    required this.email,
    this.phone,
    required this.role,
    this.createdAt,
    this.preferredFirstName,
    this.residentialAddress,
    this.postalAddress,
    this.emergencyContact,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as int,
      organizationId: json['organization_id'] as int,
      name: json['name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String?,
      role: json['role'] as String? ?? 'user',
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
    );
  }
}
