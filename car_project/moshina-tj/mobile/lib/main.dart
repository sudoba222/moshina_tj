import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/language_provider.dart';
import 'providers/listing_provider.dart';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'theme/app_theme.dart';
import 'router/app_router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  runApp(const TajcarApp());
}

class TajcarApp extends StatefulWidget {
  const TajcarApp({super.key});

  @override
  State<TajcarApp> createState() => _TajcarAppState();
}

class _TajcarAppState extends State<TajcarApp> {
  late final ApiService _apiService;
  late final AuthService _authService;
  late final AuthProvider _authProvider;
  late final ListingProvider _listingProvider;
  late final LanguageProvider _languageProvider;
  bool _isDark = false;

  @override
  void initState() {
    super.initState();
    _apiService = ApiService();
    _authService = AuthService(_apiService);
    _authProvider = AuthProvider(_authService);
    _listingProvider = ListingProvider(_apiService);
    _languageProvider = LanguageProvider();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiService>.value(value: _apiService),
        ChangeNotifierProvider<AuthProvider>.value(value: _authProvider),
        ChangeNotifierProvider<ListingProvider>.value(value: _listingProvider),
        ChangeNotifierProvider<LanguageProvider>.value(
            value: _languageProvider),
      ],
      child: _ThemeWrapper(
        isDark: _isDark,
        onToggleTheme: (dark) => setState(() => _isDark = dark),
      ),
    );
  }
}

class _ThemeWrapper extends StatelessWidget {
  final bool isDark;
  final ValueChanged<bool> onToggleTheme;

  const _ThemeWrapper({required this.isDark, required this.onToggleTheme});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'MOSHINA.TJ',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: isDark ? ThemeMode.dark : ThemeMode.light,
      routerConfig: appRouter,
    );
  }
}
