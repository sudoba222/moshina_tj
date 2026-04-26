import 'package:flutter/foundation.dart';
import '../services/favorites_service.dart';

class FavoritesProvider extends ChangeNotifier {
  final FavoritesService _service;

  Set<String> _favoriteIds = {};

  FavoritesProvider(this._service) {
    _loadFromStorage();
  }

  Set<String> get favoriteIds => _favoriteIds;

  bool isFavorite(String id) => _favoriteIds.contains(id);

  Future<void> _loadFromStorage() async {
    final ids = await _service.getFavoriteIds();
    _favoriteIds = ids.toSet();
    notifyListeners();
  }

  Future<void> toggleFavorite(String id) async {
    // Optimistic update — UI responds instantly
    if (_favoriteIds.contains(id)) {
      _favoriteIds = Set.from(_favoriteIds)..remove(id);
    } else {
      _favoriteIds = Set.from(_favoriteIds)..add(id);
    }
    notifyListeners();
    // Persist asynchronously
    await _service.toggleFavorite(id);
  }
}
