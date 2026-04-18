import 'package:flutter/material.dart';
import '../models/listing.dart';
import '../services/api_service.dart';

class ListingProvider extends ChangeNotifier {
  final ApiService _api;

  List<Listing> _featured = [];
  List<Listing> _fresh = [];
  bool _featuredLoading = false;
  bool _freshLoading = false;
  String? _featuredError;
  String? _freshError;
  int _freshPage = 1;
  int _freshTotalPages = 1;
  bool _freshLoadingMore = false;

  List<Listing> get featured => _featured;
  List<Listing> get fresh => _fresh;
  bool get featuredLoading => _featuredLoading;
  bool get freshLoading => _freshLoading;
  String? get featuredError => _featuredError;
  String? get freshError => _freshError;
  bool get hasMoreFresh => _freshPage < _freshTotalPages;
  bool get freshLoadingMore => _freshLoadingMore;

  // Catalog state
  List<Listing> _catalogItems = [];
  bool _catalogLoading = false;
  String? _catalogError;
  int _catalogPage = 1;
  int _catalogTotalPages = 1;
  bool _catalogLoadingMore = false;
  Map<String, String> _filters = {};

  List<Listing> get catalogItems => _catalogItems;
  bool get catalogLoading => _catalogLoading;
  String? get catalogError => _catalogError;
  bool get hasMoreCatalog => _catalogPage < _catalogTotalPages;
  bool get catalogLoadingMore => _catalogLoadingMore;
  Map<String, String> get filters => _filters;

  ListingProvider(this._api);

  Future<void> loadFeatured() async {
    _featuredLoading = true;
    _featuredError = null;
    notifyListeners();
    try {
      final data = await _api.getRaw('/listings/featured');
      if (data is List) {
        _featured = data
            .map((e) => Listing.fromJson(e as Map<String, dynamic>))
            .toList();
      } else if (data is Map && data.containsKey('items')) {
        _featured = (data['items'] as List)
            .map((e) => Listing.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      _featuredError = 'Ошибка загрузки рекомендуемых';
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
    _freshLoading = refresh || _fresh.isEmpty;
    _freshError = null;
    notifyListeners();
    try {
      final data = await _api.getRaw(
        '/listings',
        queryParams: {'page': _freshPage, 'limit': 20},
      );
      final paginated = PaginatedListings.fromJson(data as Map<String, dynamic>);
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
        queryParams: {'page': _freshPage, 'limit': 20},
      );
      final paginated = PaginatedListings.fromJson(data as Map<String, dynamic>);
      _fresh.addAll(paginated.items);
      _freshTotalPages = paginated.pages;
    } catch (_) {
      _freshPage--;
    } finally {
      _freshLoadingMore = false;
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
      if (filters != null) _filters = filters;
    }
    _catalogLoading = refresh || _catalogItems.isEmpty;
    _catalogError = null;
    notifyListeners();
    try {
      final params = <String, dynamic>{
        'page': _catalogPage,
        'limit': 20,
        ..._filters,
      };
      final data = await _api.getRaw('/catalog', queryParams: params);
      final paginated = PaginatedListings.fromJson(data as Map<String, dynamic>);
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
        ..._filters,
      };
      final data = await _api.getRaw('/catalog', queryParams: params);
      final paginated = PaginatedListings.fromJson(data as Map<String, dynamic>);
      _catalogItems.addAll(paginated.items);
      _catalogTotalPages = paginated.pages;
    } catch (_) {
      _catalogPage--;
    } finally {
      _catalogLoadingMore = false;
      notifyListeners();
    }
  }

  Future<Listing?> getListingById(int id) async {
    try {
      final data = await _api.getRaw('/listings/$id');
      return Listing.fromJson(data as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }
}
