class User {
  final int id;
  final String? fullName;
  final String? phone;
  final String? email;
  final String? avatarUrl;
  final String role;
  final bool isActive;

  const User({
    required this.id,
    this.fullName,
    this.phone,
    this.email,
    this.avatarUrl,
    required this.role,
    required this.isActive,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as int? ?? 0,
      fullName: json['full_name'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      role: json['role'] as String? ?? 'user',
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  String get displayName => fullName ?? phone ?? email ?? 'User';
}
