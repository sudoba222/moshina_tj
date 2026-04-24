class ListingImage {
  final int id;
  final String url;
  final bool isPrimary;

  const ListingImage({
    required this.id,
    required this.url,
    required this.isPrimary,
  });

  factory ListingImage.fromJson(Map<String, dynamic> json) {
    return ListingImage(
      id: (json['id'] as num?)?.toInt() ?? 0,
      url: json['url'] as String? ?? '',
      isPrimary: json['is_primary'] as bool? ?? false,
    );
  }
}

class Listing {
  final String id;
  final String brand;
  final String model;
  final int year;
  final double price;
  final String currency;
  final String listingType;
  final String city;
  final int? mileage;
  final String? fuel;
  final String? transmission;
  final String? bodyType;
  final String? color;
  final double? engineVolume;
  final String? driveType;
  final bool? customsCleared;
  final String? description;
  final bool isFeatured;
  final bool isNegotiable;
  final bool isDealerListing;
  final bool installmentAvailable;
  final String? availability;
  final String status;
  final String? categorySlug;
  final DateTime createdAt;
  final List<ListingImage> images;
  final int viewsCount;
  final String? userId;
  final String? sellerPhone;
  final String? sellerName;

  const Listing({
    required this.id,
    required this.brand,
    required this.model,
    required this.year,
    required this.price,
    required this.currency,
    required this.listingType,
    required this.city,
    this.mileage,
    this.fuel,
    this.transmission,
    this.bodyType,
    this.color,
    this.engineVolume,
    this.driveType,
    this.customsCleared,
    this.description,
    required this.isFeatured,
    required this.isNegotiable,
    required this.isDealerListing,
    required this.installmentAvailable,
    this.availability,
    required this.status,
    this.categorySlug,
    required this.createdAt,
    required this.images,
    required this.viewsCount,
    this.userId,
    this.sellerPhone,
    this.sellerName,
  });

  factory Listing.fromJson(Map<String, dynamic> json) {
    final imagesList = (json['images'] as List<dynamic>? ?? [])
        .map((e) => ListingImage.fromJson(e as Map<String, dynamic>))
        .toList();

    final userMap = json['user'] as Map<String, dynamic>?;

    return Listing(
      id: json['id']?.toString() ?? '',
      brand: json['brand'] as String? ?? '',
      model: json['model'] as String? ?? '',
      year: (json['year'] as num?)?.toInt() ?? 0,
      price: (json['price'] as num?)?.toDouble() ?? 0,
      currency: json['currency'] as String? ?? 'USD',
      listingType: json['listing_type'] as String? ??
          json['type'] as String? ??
          'sale',
      city: json['city'] as String? ?? '',
      mileage: (json['mileage'] as num?)?.toInt(),
      fuel: json['fuel'] as String?,
      transmission: json['transmission'] as String?,
      bodyType: json['body_type'] as String?,
      color: json['color'] as String?,
      engineVolume: (json['engine_volume'] as num?)?.toDouble(),
      driveType: json['drive_type'] as String?,
      customsCleared: json['customs_cleared'] as bool?,
      description: json['description'] as String?,
      isFeatured: json['is_featured'] as bool? ?? false,
      isNegotiable: json['is_negotiable'] as bool? ?? false,
      isDealerListing: json['is_dealer_listing'] as bool? ?? false,
      installmentAvailable: json['installment_available'] as bool? ?? false,
      availability: json['availability'] as String?,
      status: json['status'] as String? ?? 'active',
      categorySlug: json['category_slug'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String) ?? DateTime.now()
          : DateTime.now(),
      images: imagesList,
      viewsCount: (json['views_count'] as num?)?.toInt() ?? 0,
      userId: json['user_id']?.toString(),
      sellerPhone: json['seller_phone'] as String? ??
          userMap?['phone'] as String?,
      sellerName: json['seller_name'] as String? ??
          userMap?['full_name'] as String?,
    );
  }

  String get firstImageUrl {
    if (images.isEmpty) return '';
    final primary = images.where((i) => i.isPrimary).firstOrNull;
    return primary?.url ?? images.first.url;
  }

  /// Formats price as $15,000 (USD) or 15 000 сом (TJS)
  String formattedPrice(String lang) {
    if (currency == 'USD') {
      final int val = price.round();
      final s = val.toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (m) => '${m[1]},',
      );
      return '\$$s';
    }
    // TJS
    final int val = price.round();
    final s = val.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]} ',
    );
    final unit = lang == 'tj' ? 'сомонӣ' : 'сом';
    return '$s $unit';
  }

  /// Formats mileage as 150,000 км
  String get formattedMileage {
    if (mileage == null) return '';
    final m = mileage!;
    if (m >= 10000) {
      final formatted = m.toString().replaceAllMapped(
        RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
        (m2) => '${m2[1]},',
      );
      return '$formatted км';
    }
    return '$m км';
  }

  String formattedDate(String lang) {
    final now = DateTime.now();
    final diff = now.difference(createdAt).inDays;
    if (diff == 0) return lang == 'tj' ? 'Имрӯз' : 'Сегодня';
    if (diff == 1) return lang == 'tj' ? 'Дирӯз' : 'Вчера';
    if (diff < 7) {
      return lang == 'tj' ? '$diff рӯз пеш' : '$diff дн. назад';
    }
    const months = [
      '', 'янв.', 'фев.', 'мар.', 'апр.', 'май', 'июн.',
      'июл.', 'авг.', 'сен.', 'окт.', 'ноя.', 'дек.',
    ];
    return '${createdAt.day} ${months[createdAt.month]}';
  }
}

class PaginatedListings {
  final List<Listing> items;
  final int total;
  final int page;
  final int pages;

  const PaginatedListings({
    required this.items,
    required this.total,
    required this.page,
    required this.pages,
  });

  factory PaginatedListings.fromJson(Map<String, dynamic> json) {
    return PaginatedListings(
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => Listing.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: (json['total'] as num?)?.toInt() ?? 0,
      page: (json['page'] as num?)?.toInt() ?? 1,
      pages: (json['pages'] as num?)?.toInt() ?? 1,
    );
  }
}

class AppStats {
  final int listingsCount;
  final int dealersCount;
  final int citiesCount;

  const AppStats({
    required this.listingsCount,
    required this.dealersCount,
    required this.citiesCount,
  });

  factory AppStats.fromJson(Map<String, dynamic> json) {
    return AppStats(
      listingsCount: (json['listings_count'] as num?)?.toInt() ?? 0,
      dealersCount: (json['dealers_count'] as num?)?.toInt() ?? 0,
      citiesCount: (json['cities_count'] as num?)?.toInt() ?? 0,
    );
  }
}
