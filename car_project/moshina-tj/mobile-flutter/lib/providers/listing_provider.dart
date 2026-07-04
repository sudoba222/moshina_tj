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
  int _catalogTotal = 0;
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
  int get catalogTotal => _catalogTotal;
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
      final data = await _api.getRaw('/listings/featured');
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
        '/listings',
        queryParams: {'page': _freshPage, 'limit': 20, 'sort': 'newest'},
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
        '/listings',
        queryParams: {'page': _freshPage, 'limit': 20, 'sort': 'newest'},
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
      final q = _catalogFilters['q'];
      final dynamic data;
      if (q != null && q.isNotEmpty) {
        // Text search — use /search endpoint (returns all results, no pagination)
        data = await _api.getRaw('/search', queryParams: {'q': q, 'limit': 50});
        _catalogTotalPages = 1;
      } else {
        final params = <String, dynamic>{
          'page': _catalogPage,
          'limit': 20,
          ..._catalogFilters,
        };
        data = await _api.getRaw('/listings', queryParams: params);
      }
      final paginated = _toPaginated(data);
      if (refresh) {
        _catalogItems = paginated.items;
      } else {
        _catalogItems.addAll(paginated.items);
      }
      if (q == null || q.isEmpty) _catalogTotalPages = paginated.pages;
      _catalogTotal = paginated.total;
    } catch (e) {
      _catalogError = 'Ошибка загрузки каталога';
    } finally {
      _catalogLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMoreCatalog() async {
    // No pagination for text search results
    if (_catalogFilters.containsKey('q') && _catalogFilters['q']!.isNotEmpty) return;
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
      final data = await _api.getRaw('/listings', queryParams: params);
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
      final cleanId = id.trim().replaceAll(RegExp(r'[/\\]+$'), '');
      final data = await _api.getRaw('/listings/$cleanId');
      return Listing.fromJson(data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<List<Listing>> getRelatedListings(String id, {String? brand}) async {
    if (brand == null || brand.isEmpty) return [];
    try {
      final data = await _api.getRaw('/listings', queryParams: {'brand': brand, 'limit': 7});
      final paginated = _toPaginated(data);
      return paginated.items.where((l) => l.id != id).take(5).toList();
    } catch (_) {}
    return [];
  }
}
