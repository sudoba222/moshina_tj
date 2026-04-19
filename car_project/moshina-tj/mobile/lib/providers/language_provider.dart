import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LanguageProvider extends ChangeNotifier {
  static const _key = 'app_lang';

  String _lang = 'ru';
  String get lang => _lang;

  LanguageProvider() {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_key);
    if (saved == 'ru' || saved == 'tj') {
      _lang = saved!;
      notifyListeners();
    }
  }

  Future<void> setLang(String lang) async {
    if (lang != 'ru' && lang != 'tj') return;
    _lang = lang;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, lang);
  }

  void toggle() => setLang(_lang == 'ru' ? 'tj' : 'ru');
}
