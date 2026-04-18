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
      id: json['id'] as int? ?? 0,
      url: json['url'] as String? ?? '',
      isPrimary: json['is_primary'] as bool? ?? false,
    );
  }
}

class Listing {
  final int id;
  final String title;
  final String brand;
  final String model;
  final int year;
  final double price;
  final String currency;
  final int? mileage;
  final String city;
  final String listingType;
  final String status;
  final String? description;
  final List<ListingImage> images;
  final String? sellerName;
  final String? sellerPhone;
  final DateTime createdAt;
  final bool isFeatured;

  const Listing({
    required this.id,
    required this.title,
    required this.brand,
    required this.model,
    required this.year,
    required this.price,
    required this.currency,
    this.mileage,
    required this.city,
    required this.listingType,
    required this.status,
    this.description,
    required this.images,
    this.sellerName,
    this.sellerPhone,
    required this.createdAt,
    required this.isFeatured,
  });

  factory Listing.fromJson(Map<String, dynamic> json) {
    final imagesList = (json['images'] as List<dynamic>? ?? [])
        .map((e) => ListingImage.fromJson(e as Map<String, dynamic>))
        .toList();

    return Listing(
      id: json['id'] as int? ?? 0,
      title: json['title'] as String? ?? '',
      brand: json['brand'] as String? ?? '',
      model: json['model'] as String? ?? '',
      year: json['year'] as int? ?? 0,
      price: (json['price'] as num?)?.toDouble() ?? 0,
      currency: json['currency'] as String? ?? 'USD',
      mileage: json['mileage'] as int?,
      city: json['city'] as String? ?? '',
      listingType: json['listing_type'] as String? ?? 'sale',
      status: json['status'] as String? ?? 'active',
      description: json['description'] as String?,
      images: imagesList,
      sellerName: json['seller_name'] as String? ??
          (json['user'] as Map<String, dynamic>?)?['full_name'] as String?,
      sellerPhone: json['seller_phone'] as String? ??
          (json['user'] as Map<String, dynamic>?)?['phone'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String) ?? DateTime.now()
          : DateTime.now(),
      isFeatured: json['is_featured'] as bool? ?? false,
    );
  }

  String get firstImageUrl {
    if (images.isEmpty) return '';
    final primary = images.where((i) => i.isPrimary).firstOrNull;
    return primary?.url ?? images.first.url;
  }

  String get formattedPrice {
    final formatted = price.toInt().toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]} ',
        );
    return '$formatted $currency';
  }

  String get formattedMileage {
    if (mileage == null) return '';
    return mileage.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]} ',
        );
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
      total: json['total'] as int? ?? 0,
      page: json['page'] as int? ?? 1,
      pages: json['pages'] as int? ?? 1,
    );
  }
}
