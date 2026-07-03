import 'package:flutter/material.dart';
import '../services/recently_viewed_service.dart';

class RecentlyViewedProvider extends ChangeNotifier {
  List<Map<String, dynamic>> _items = [];

  List<Map<String, dynamic>> get items => _items;

  RecentlyViewedProvider() {
    _load();
  }

  Future<void> _load() async {
    _items = await RecentlyViewedService.load();
    notifyListeners();
  }

  Future<void> add(Map<String, dynamic> compact) async {
    await RecentlyViewedService.add(compact);
    _items = await RecentlyViewedService.load();
    notifyListeners();
  }
}
