class AppUser {
  final int id;
  final int organizationId;
  final String name;
  final String email;
  final String? phone;
  final String role;

  AppUser({
    required this.id,
    required this.organizationId,
    required this.name,
    required this.email,
    this.phone,
    required this.role,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as int,
      organizationId: json['organization_id'] as int,
      name: json['name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String?,
      role: json['role'] as String? ?? 'user',
    );
  }
}
