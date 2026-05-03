import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../screens/home_screen.dart';
import '../screens/catalog_screen.dart';
import '../screens/car_detail_screen.dart';
import '../screens/login_screen.dart';
import '../screens/register_screen.dart';
import '../screens/dashboard_screen.dart';
import '../screens/dealers_screen.dart';
import '../screens/post_screen.dart';
import '../screens/chat_list_screen.dart';
import '../screens/chat_screen.dart';
import '../screens/otp_screen.dart';
import '../screens/edit_profile_screen.dart';
import '../screens/change_password_screen.dart';
import '../screens/dealer_detail_screen.dart';
import '../screens/notifications_screen.dart';
import '../screens/edit_listing_screen.dart';
import '../screens/support_screen.dart';
import '../screens/privacy_policy_screen.dart';
import '../l10n/strings.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/language_provider.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

// Routes that require an authenticated user.
const _protectedPaths = [
  '/post',
  '/profile',
  '/chat',
  '/notifications',
  '/edit-profile',
  '/change-password',
  '/edit-listing',
];

GoRouter makeAppRouter(AuthProvider auth) => GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/',
  refreshListenable: auth,
  redirect: (context, state) {
    if (auth.status == AuthStatus.unknown) return null;
    final loc = state.matchedLocation;
    final isProtected = _protectedPaths.any((p) => loc.startsWith(p));
    if (isProtected && !auth.isAuthenticated) return '/login';
    return null;
  },
  routes: [
    ShellRoute(
      navigatorKey: _shellNavigatorKey,
      builder: (context, state, child) {
        return MainScaffold(location: state.uri.toString(), child: child);
      },
      routes: [
        GoRoute(
          path: '/',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: HomeScreen(),
          ),
        ),
        GoRoute(
          path: '/catalog',
          pageBuilder: (context, state) {
            final q = state.uri.queryParameters['q'];
            final type = state.uri.queryParameters['type'];
            final category = state.uri.queryParameters['category'];
            return NoTransitionPage(
              child: CatalogScreen(initialQuery: q, initialType: type, initialCategory: category),
            );
          },
        ),
        GoRoute(
          path: '/post',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: PostScreen(),
          ),
        ),
        GoRoute(
          path: '/profile',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: DashboardScreen(),
          ),
        ),
        GoRoute(
          path: '/dealers',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: DealersScreen(),
          ),
        ),
        GoRoute(
          path: '/chat',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: ChatListScreen(),
          ),
        ),
      ],
    ),
    GoRoute(
      path: '/car/:id',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) {
        final id = state.pathParameters['id'] ?? '';
        return CarDetailScreen(listingId: id);
      },
    ),
    GoRoute(
      path: '/chat/:id',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) {
        final convId = state.pathParameters['id'] ?? '';
        final extra = state.extra as Map<String, dynamic>? ?? {};
        return ChatScreen(convId: convId, convData: extra);
      },
    ),
    GoRoute(
      path: '/login',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/register',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(
      path: '/otp',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) {
        // Data passed via extra (never in query string) to avoid PII in logs.
        final p = state.extra as Map<String, dynamic>? ?? {};
        return OtpScreen(
          phone: p['phone'] as String?,
          email: p['email'] as String?,
          mode: p['mode'] as String? ?? 'login',
          name: p['name'] as String?,
        );
      },
    ),
    GoRoute(
      path: '/edit-profile',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const EditProfileScreen(),
    ),
    GoRoute(
      path: '/change-password',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const ChangePasswordScreen(),
    ),
    GoRoute(
      path: '/dealers/:id',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) =>
          DealerDetailScreen(dealerId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/notifications',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const NotificationsScreen(),
    ),
    GoRoute(
      path: '/edit-listing/:id',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) =>
          EditListingScreen(listingId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/support',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const SupportScreen(),
    ),
    GoRoute(
      path: '/privacy',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const PrivacyPolicyScreen(),
    ),
  ],
);

class MainScaffold extends StatelessWidget {
  final Widget child;
  final String location;

  const MainScaffold({
    super.key,
    required this.child,
    required this.location,
  });

  int _currentIndex(String loc) {
    if (loc.startsWith('/catalog')) return 1;
    if (loc.startsWith('/post')) return 2;
    if (loc.startsWith('/chat')) return 3;
    if (loc.startsWith('/profile')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = _currentIndex(location);
    return Scaffold(
      body: child,
      bottomNavigationBar: _BottomNav(currentIndex: currentIndex),
    );
  }
}

class _BottomNav extends StatelessWidget {
  final int currentIndex;

  const _BottomNav({required this.currentIndex});

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LanguageProvider>().lang;
    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: (i) {
        switch (i) {
          case 0:
            context.go('/');
          case 1:
            context.go('/catalog');
          case 2:
            context.go('/post');
          case 3:
            context.go('/chat');
          case 4:
            context.go('/profile');
        }
      },
      items: [
        BottomNavigationBarItem(
          icon: const Icon(Icons.home_outlined),
          activeIcon: const Icon(Icons.home),
          label: t('nav.home', lang),
        ),
        BottomNavigationBarItem(
          icon: const Icon(Icons.grid_view_outlined),
          activeIcon: const Icon(Icons.grid_view),
          label: t('nav.catalog', lang),
        ),
        BottomNavigationBarItem(
          icon: const Icon(Icons.add_circle_outline),
          activeIcon: const Icon(Icons.add_circle),
          label: t('nav.post', lang),
        ),
        BottomNavigationBarItem(
          icon: const Icon(Icons.chat_bubble_outline),
          activeIcon: const Icon(Icons.chat_bubble),
          label: t('nav.chat', lang),
        ),
        BottomNavigationBarItem(
          icon: const Icon(Icons.person_outline),
          activeIcon: const Icon(Icons.person),
          label: t('nav.profile', lang),
        ),
      ],
    );
  }
}
