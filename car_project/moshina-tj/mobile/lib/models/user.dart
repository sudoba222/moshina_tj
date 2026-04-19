class User {
  final int id;
  final String? fullName;
  final String? phone;
  final String? email;
  final String? avatarUrl;
  final String role;
  final bool isVerified;
  final bool isActive;

  const User({
    required this.id,
    this.fullName,
    this.phone,
    this.email,
    this.avatarUrl,
    required this.role,
    required this.isVerified,
    required this.isActive,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: (json['id'] as num?)?.toInt() ?? 0,
      fullName: json['full_name'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      role: json['role'] as String? ?? 'user',
      isVerified: json['is_verified'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  String get displayName => fullName ?? phone ?? email ?? 'User';

  String get initials {
    final name = displayName;
    if (name.isEmpty) return 'U';
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name[0].toUpperCase();
  }
}
