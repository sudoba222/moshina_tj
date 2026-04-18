class Dealer {
  final int id;
  final String name;
  final String? city;
  final String? logoUrl;
  final String? phone;
  final int listingCount;
  final bool isVerified;

  const Dealer({
    required this.id,
    required this.name,
    this.city,
    this.logoUrl,
    this.phone,
    required this.listingCount,
    required this.isVerified,
  });

  factory Dealer.fromJson(Map<String, dynamic> json) {
    return Dealer(
      id: json['id'] as int? ?? 0,
      name: json['name'] as String? ?? '',
      city: json['city'] as String?,
      logoUrl: json['logo_url'] as String?,
      phone: json['phone'] as String?,
      listingCount: json['listing_count'] as int? ?? 0,
      isVerified: json['is_verified'] as bool? ?? false,
    );
  }
}
