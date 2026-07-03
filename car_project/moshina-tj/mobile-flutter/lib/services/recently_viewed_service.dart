import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

const _kKey = 'recently_viewed_v1';
const _kMax = 10;

class RecentlyViewedService {
  static Future<List<Map<String, dynamic>>> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kKey);
    if (raw == null) return [];
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list.cast<Map<String, dynamic>>();
    } catch (_) {
      return [];
    }
  }

  static Future<void> add(Map<String, dynamic> compact) async {
    final prefs = await SharedPreferences.getInstance();
    final items = await load();
    items.removeWhere((e) => e['id'] == compact['id']);
    items.insert(0, compact);
    if (items.length > _kMax) items.removeRange(_kMax, items.length);
    await prefs.setString(_kKey, jsonEncode(items));
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kKey);
  }
}
