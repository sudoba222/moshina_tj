class Dealer {
  final int id;
  final String name;
  final String? logoUrl;
  final String? city;
  final String? description;
  final bool isVerified;
  final int listingCount;
  final String? phone;

  const Dealer({
    required this.id,
    required this.name,
    this.logoUrl,
    this.city,
    this.description,
    required this.isVerified,
    required this.listingCount,
    this.phone,
  });

  factory Dealer.fromJson(Map<String, dynamic> json) {
    return Dealer(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: json['name'] as String? ?? '',
      logoUrl: json['logo_url'] as String?,
      city: json['city'] as String?,
      description: json['description'] as String?,
      isVerified: json['is_verified'] as bool? ?? false,
      listingCount: (json['listing_count'] as num?)?.toInt() ?? 0,
      phone: json['phone'] as String?,
    );
  }

  String get initials {
    if (name.isEmpty) return 'D';
    return name[0].toUpperCase();
  }
}
