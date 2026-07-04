import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
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
import '../screens/favorites_screen.dart';
import '../screens/otp_screen.dart';
import '../screens/edit_profile_screen.dart';
import '../screens/change_password_screen.dart';
import '../screens/dealer_detail_screen.dart';
import '../screens/notifications_screen.dart';
import '../screens/edit_listing_screen.dart';
import '../screens/support_screen.dart';
import '../screens/forgot_password_screen.dart';
import '../screens/privacy_policy_screen.dart';
import '../l10n/strings.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/badge_provider.dart';
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
    if (auth.isAuthenticated && (loc == '/login' || loc == '/register' || loc == '/otp')) {
      return '/';
    }
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
          path: '/favorites',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: FavoritesScreen(),
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
      path: '/forgot-password',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const ForgotPasswordScreen(),
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
    final badges = context.watch<BadgeProvider>();
    final c = context.colors;

    return Container(
      decoration: BoxDecoration(
        color: c.navBg,
        border: Border(top: BorderSide(color: c.border, width: 0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 60,
          child: Row(
            children: [
              _NavItem(
                index: 0,
                currentIndex: currentIndex,
                icon: Icons.home_outlined,
                activeIcon: Icons.home_rounded,
                label: t('nav.home', lang),
                onTap: () => context.go('/'),
                c: c,
              ),
              _NavItem(
                index: 1,
                currentIndex: currentIndex,
                icon: Icons.search_outlined,
                activeIcon: Icons.search_rounded,
                label: t('nav.catalog', lang),
                onTap: () => context.go('/catalog'),
                c: c,
              ),
              // ── Center FAB "Продать" ────────────────────────────────────────
              Expanded(
                child: GestureDetector(
                  onTap: () => context.go('/post'),
                  behavior: HitTestBehavior.opaque,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 52,
                        height: 32,
                        decoration: BoxDecoration(
                          color: c.accent,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: c.accent.withValues(alpha: 0.40),
                              blurRadius: 14,
                              spreadRadius: 0,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.add_rounded,
                          color: Colors.white,
                          size: 22,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        t('nav.post', lang),
                        style: GoogleFonts.outfit(
                          color: c.accent,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              _NavItem(
                index: 3,
                currentIndex: currentIndex,
                icon: Icons.chat_bubble_outline_rounded,
                activeIcon: Icons.chat_bubble_rounded,
                label: t('nav.chat', lang),
                onTap: () => context.go('/chat'),
                c: c,
                badge: badges.unreadMessages,
              ),
              _NavItem(
                index: 4,
                currentIndex: currentIndex,
                icon: Icons.person_outline_rounded,
                activeIcon: Icons.person_rounded,
                label: t('nav.profile', lang),
                onTap: () => context.go('/profile'),
                c: c,
                badge: badges.unreadNotifications,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final int index;
  final int currentIndex;
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final VoidCallback onTap;
  final AppColors c;
  final int badge;

  const _NavItem({
    required this.index,
    required this.currentIndex,
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.onTap,
    required this.c,
    this.badge = 0,
  });

  @override
  Widget build(BuildContext context) {
    final isActive = index == currentIndex;
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Badge(
              isLabelVisible: badge > 0,
              label: Text(badge > 99 ? '99+' : '$badge'),
              child: Icon(
                isActive ? activeIcon : icon,
                color: isActive ? c.accent : c.textMuted,
                size: 24,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: GoogleFonts.outfit(
                color: isActive ? c.accent : c.textMuted,
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w700 : FontWeight.w400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
