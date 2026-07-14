// Smoke test: the app widget builds and renders a frame without crashing.
//
// TajcarApp wires its own providers and router; we inject a plain ApiService
// (no network calls are awaited during the first frame).

import 'package:flutter_test/flutter_test.dart';

import 'package:tajcar/main.dart';
import 'package:tajcar/services/api_service.dart';

void main() {
  testWidgets('App builds and renders first frame', (WidgetTester tester) async {
    await tester.pumpWidget(TajcarApp(apiService: ApiService()));

    // The root app widget must be in the tree.
    expect(find.byType(TajcarApp), findsOneWidget);

    // Drain the splash screen's staged delays (150 + 450 + 1600 ms) so no
    // timers are pending when the framework tears the tree down.
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump(const Duration(seconds: 2));
    await tester.pump(const Duration(seconds: 2));
  });
}
