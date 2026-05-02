import 'package:flutter/material.dart';
import '../models/listing.dart';
import '../services/api_service.dart';

class ListingProvider extends ChangeNotifier {
  final ApiService _api;

  // Featured listings for home screen
  List<Listing> _featured = [];
  bool _featuredLoading = false;
  String? _featuredError;

  // Fresh listings for home screen
  List<Listing> _fresh = [];
  bool _freshLoading = false;
  String? _freshError;
  int _freshPage = 1;
  int _freshTotalPages = 1;
  bool _freshLoadingMore = false;

  // Stats
  AppStats? _stats;
  bool _statsLoading = false;

  // Catalog
  List<Listing> _catalogItems = [];
  bool _catalogLoading = false;
  String? _catalogError;
  int _catalogPage = 1;
  int _catalogTotalPages = 1;
  bool _catalogLoadingMore = false;
  Map<String, String> _catalogFilters = {};

  List<Listing> get featured => _featured;
  bool get featuredLoading => _featuredLoading;
  String? get featuredError => _featuredError;

  List<Listing> get fresh => _fresh;
  bool get freshLoading => _freshLoading;
  String? get freshError => _freshError;
  bool get hasMoreFresh => _freshPage < _freshTotalPages;
  bool get freshLoadingMore => _freshLoadingMore;

  AppStats? get stats => _stats;
  bool get statsLoading => _statsLoading;

  List<Listing> get catalogItems => _catalogItems;
  bool get catalogLoading => _catalogLoading;
  String? get catalogError => _catalogError;
  bool get hasMoreCatalog => _catalogPage < _catalogTotalPages;
  bool get catalogLoadingMore => _catalogLoadingMore;
  Map<String, String> get catalogFilters => _catalogFilters;

  ListingProvider(this._api);

  // Safely convert any API response (Map, List, or null) into PaginatedListings.
  PaginatedListings _toPaginated(dynamic data) {
    if (data is Map<String, dynamic>) {
      return PaginatedListings.fromJson(data);
    }
    if (data is List) {
      return PaginatedListings(
        items: data
            .whereType<Map<String, dynamic>>()
            .map((e) => Listing.fromJson(e))
            .toList(),
        total: data.length,
        page: 1,
        pages: 1,
      );
    }
    return const PaginatedListings(items: [], total: 0, page: 1, pages: 1);
  }

  Future<void> loadFeatured() async {
    if (_featuredLoading) return;
    _featuredLoading = true;
    _featuredError = null;
    notifyListeners();
    try {
      final data = await _api.getRaw(
        '/catalog',
        queryParams: {'is_featured': 'true', 'limit': 10, 'status': 'active'},
      );
      final paginated = _toPaginated(data);
      _featured = paginated.items;
    } catch (_) {
      _featuredError = 'Ошибка загрузки';
    } finally {
      _featuredLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadFresh({bool refresh = false}) async {
    if (refresh) {
      _freshPage = 1;
      _fresh = [];
    }
    if (_freshLoading) return;
    _freshLoading = true;
    _freshError = null;
    notifyListeners();
    try {
      final data = await _api.getRaw(
        '/catalog',
        queryParams: {
          'page': _freshPage,
          'limit': 20,
          'status': 'active',
          'sort': 'newest',
        },
      );
      final paginated = _toPaginated(data);
      if (refresh) {
        _fresh = paginated.items;
      } else {
        _fresh.addAll(paginated.items);
      }
      _freshTotalPages = paginated.pages;
    } catch (e) {
      _freshError = 'Ошибка загрузки объявлений';
    } finally {
      _freshLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMoreFresh() async {
    if (_freshLoadingMore || !hasMoreFresh) return;
    _freshLoadingMore = true;
    _freshPage++;
    notifyListeners();
    try {
      final data = await _api.getRaw(
        '/catalog',
        queryParams: {
          'page': _freshPage,
          'limit': 20,
          'status': 'active',
          'sort': 'newest',
        },
      );
      final paginated = _toPaginated(data);
      _fresh.addAll(paginated.items);
      _freshTotalPages = paginated.pages;
    } catch (_) {
      _freshPage--;
    } finally {
      _freshLoadingMore = false;
      notifyListeners();
    }
  }

  Future<void> loadStats() async {
    if (_statsLoading || _stats != null) return;
    _statsLoading = true;
    notifyListeners();
    try {
      final data = await _api.getRaw('/stats');
      if (data is Map<String, dynamic>) {
        _stats = AppStats.fromJson(data);
      }
    } catch (_) {
      // Stats are non-critical; silently ignore
    } finally {
      _statsLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadCatalog({
    bool refresh = false,
    Map<String, String>? filters,
  }) async {
    if (refresh) {
      _catalogPage = 1;
      _catalogItems = [];
      if (filters != null) _catalogFilters = Map.from(filters);
    }
    if (_catalogLoading) return;
    _catalogLoading = true;
    _catalogError = null;
    notifyListeners();
    try {
      final params = <String, dynamic>{
        'page': _catalogPage,
        'limit': 20,
        ..._catalogFilters,
      };
      final data = await _api.getRaw('/catalog', queryParams: params);
      final paginated = _toPaginated(data);
      if (refresh) {
        _catalogItems = paginated.items;
      } else {
        _catalogItems.addAll(paginated.items);
      }
      _catalogTotalPages = paginated.pages;
    } catch (e) {
      _catalogError = 'Ошибка загрузки каталога';
    } finally {
      _catalogLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMoreCatalog() async {
    if (_catalogLoadingMore || !hasMoreCatalog) return;
    _catalogLoadingMore = true;
    _catalogPage++;
    notifyListeners();
    try {
      final params = <String, dynamic>{
        'page': _catalogPage,
        'limit': 20,
        ..._catalogFilters,
      };
      final data = await _api.getRaw('/catalog', queryParams: params);
      final paginated = _toPaginated(data);
      _catalogItems.addAll(paginated.items);
      _catalogTotalPages = paginated.pages;
    } catch (_) {
      _catalogPage--;
    } finally {
      _catalogLoadingMore = false;
      notifyListeners();
    }
  }

  Future<Listing?> getListingById(String id) async {
    try {
      final data = await _api.getRaw('/listings/$id');
      return Listing.fromJson(data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<List<Listing>> getRelatedListings(String id) async {
    try {
      final data = await _api.getRaw('/listings/$id/related');
      if (data is List) {
        return data
            .map((e) => Listing.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}
    return [];
  }
}
