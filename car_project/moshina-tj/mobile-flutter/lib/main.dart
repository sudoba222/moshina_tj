import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_native_splash/flutter_native_splash.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/favorites_provider.dart';
import 'providers/language_provider.dart';
import 'providers/listing_provider.dart';
import 'providers/theme_provider.dart';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'services/favorites_service.dart';
import 'theme/app_theme.dart';
import 'router/app_router.dart';

Future<void> main() async {
  final binding = WidgetsFlutterBinding.ensureInitialized();
  FlutterNativeSplash.preserve(widgetsBinding: binding);

  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // FLAG_SECURE is applied by MainActivity.onCreate on Android.
  // The channel below is available for runtime toggle if needed in the future.

  // Load token once at startup — eliminates secure storage hit on every request.
  final apiService = ApiService();
  try {
    await apiService.init();
  } catch (_) {
    // Secure storage unavailable on this device; continue without cached token.
  } finally {
    FlutterNativeSplash.remove();
  }
  runApp(TajcarApp(apiService: apiService));
}

class TajcarApp extends StatefulWidget {
  final ApiService apiService;

  const TajcarApp({super.key, required this.apiService});

  @override
  State<TajcarApp> createState() => _TajcarAppState();
}

class _TajcarAppState extends State<TajcarApp> {
  late final AuthService _authService;
  late final AuthProvider _authProvider;
  late final ListingProvider _listingProvider;
  late final LanguageProvider _languageProvider;
  late final ThemeProvider _themeProvider;
  late final FavoritesProvider _favoritesProvider;

  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _authService = AuthService(widget.apiService);
    _authProvider = AuthProvider(_authService);
    _router = makeAppRouter(_authProvider);
    _listingProvider = ListingProvider(widget.apiService);
    _languageProvider = LanguageProvider();
    _themeProvider = ThemeProvider();
    _favoritesProvider = FavoritesProvider(FavoritesService());
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiService>.value(value: widget.apiService),
        ChangeNotifierProvider<AuthProvider>.value(value: _authProvider),
        ChangeNotifierProvider<ListingProvider>.value(value: _listingProvider),
        ChangeNotifierProvider<LanguageProvider>.value(value: _languageProvider),
        ChangeNotifierProvider<ThemeProvider>.value(value: _themeProvider),
        ChangeNotifierProvider<FavoritesProvider>.value(value: _favoritesProvider),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, _) => MaterialApp.router(
          title: 'TajCar',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light(),
          darkTheme: AppTheme.dark(),
          themeMode: themeProvider.mode,
          routerConfig: _router,
        ),
      ),
    );
  }
}
