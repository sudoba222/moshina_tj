import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class LanguageProvider extends ChangeNotifier {
  static const _storage = FlutterSecureStorage();
  static const _key = 'app_lang';

  String _lang = 'ru';
  String get lang => _lang;

  LanguageProvider() {
    _load();
  }

  Future<void> _load() async {
    final saved = await _storage.read(key: _key);
    if (saved != null && (saved == 'ru' || saved == 'tj')) {
      _lang = saved;
      notifyListeners();
    }
  }

  Future<void> setLang(String lang) async {
    _lang = lang;
    await _storage.write(key: _key, value: lang);
    notifyListeners();
  }

  void toggle() {
    setLang(_lang == 'ru' ? 'tj' : 'ru');
  }
}
