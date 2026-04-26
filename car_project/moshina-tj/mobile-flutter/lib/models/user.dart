class AppUser {
  final String id;
  final String? fullName;
  final String? phone;
  final String? email;
  final String? avatarUrl;
  final String role;
  final bool isVerified;
  final String? whatsapp;

  const AppUser({
    required this.id,
    this.fullName,
    this.phone,
    this.email,
    this.avatarUrl,
    required this.role,
    required this.isVerified,
    this.whatsapp,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id']?.toString() ?? '',
      fullName: json['full_name'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      role: json['role'] as String? ?? 'user',
      isVerified: json['is_verified'] as bool? ?? false,
      whatsapp: json['whatsapp_number'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'full_name': fullName,
    'phone': phone,
    'email': email,
    'avatar_url': avatarUrl,
    'role': role,
    'is_verified': isVerified,
    'whatsapp_number': whatsapp,
  };

  String get displayName => fullName ?? phone ?? email ?? 'User';

  String get initials {
    final name = displayName;
    if (name.isEmpty) return 'U';
    final parts = name.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    return name[0].toUpperCase();
  }
}
