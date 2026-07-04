import 'dart:math' as math;
import 'package:flutter/material.dart';

class SplashScreen extends StatefulWidget {
  final VoidCallback onComplete;
  const SplashScreen({super.key, required this.onComplete});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late final AnimationController _carCtrl;
  late final AnimationController _textCtrl;
  late final AnimationController _dotsCtrl;
  late final AnimationController _fadeCtrl;

  late final Animation<Offset> _carOffset;
  late final Animation<double> _textOpacity;
  late final Animation<double> _textSlide;
  late final Animation<double> _fadeOpacity;

  @override
  void initState() {
    super.initState();

    _carCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 850));
    _textCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 550));
    _dotsCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 700))..repeat();
    _fadeCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 400));

    _carOffset = Tween<Offset>(begin: const Offset(-2.0, 0), end: Offset.zero)
        .animate(CurvedAnimation(parent: _carCtrl, curve: Curves.easeOutCubic));

    _textOpacity = Tween<double>(begin: 0, end: 1)
        .animate(CurvedAnimation(parent: _textCtrl, curve: Curves.easeIn));
    _textSlide = Tween<double>(begin: 16, end: 0)
        .animate(CurvedAnimation(parent: _textCtrl, curve: Curves.easeOut));
    _fadeOpacity = Tween<double>(begin: 1, end: 0)
        .animate(CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeIn));

    _runSequence();
  }

  Future<void> _runSequence() async {
    await Future.delayed(const Duration(milliseconds: 150));
    if (!mounted) return;
    _carCtrl.forward();
    await Future.delayed(const Duration(milliseconds: 450));
    if (!mounted) return;
    _textCtrl.forward();
    await Future.delayed(const Duration(milliseconds: 1600));
    if (!mounted) return;
    _dotsCtrl.stop();
    await _fadeCtrl.forward();
    if (mounted) widget.onComplete();
  }

  @override
  void dispose() {
    _carCtrl.dispose();
    _textCtrl.dispose();
    _dotsCtrl.dispose();
    _fadeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _fadeCtrl,
      builder: (context, child) => Opacity(opacity: _fadeOpacity.value, child: child),
      child: Scaffold(
        backgroundColor: Colors.white,
        body: Column(
          children: [
            const Spacer(flex: 3),
            SlideTransition(
              position: _carOffset,
              child: const SizedBox(
                width: 280,
                height: 120,
                child: CustomPaint(painter: _CarPainter()),
              ),
            ),
            const SizedBox(height: 32),
            AnimatedBuilder(
              animation: _textCtrl,
              builder: (context, _) => Opacity(
                opacity: _textOpacity.value,
                child: Transform.translate(
                  offset: Offset(0, _textSlide.value),
                  child: RichText(
                    text: const TextSpan(
                      children: [
                        TextSpan(
                          text: 'Taj',
                          style: TextStyle(
                            fontSize: 42,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF191F28),
                            letterSpacing: -1.5,
                            height: 1,
                          ),
                        ),
                        TextSpan(
                          text: 'Car',
                          style: TextStyle(
                            fontSize: 42,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFFC83808),
                            letterSpacing: -1.5,
                            height: 1,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const Spacer(flex: 4),
            AnimatedBuilder(
              animation: _dotsCtrl,
              builder: (context, _) => _BouncingDots(progress: _dotsCtrl.value),
            ),
            const SizedBox(height: 60),
          ],
        ),
      ),
    );
  }
}

class _BouncingDots extends StatelessWidget {
  final double progress;
  const _BouncingDots({required this.progress});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(3, (i) {
        final phase = ((progress - i * 0.28) % 1.0).clamp(0.0, 1.0);
        final bounce = math.sin(phase * math.pi);
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          width: 7,
          height: 7,
          transform: Matrix4.translationValues(0, -bounce * 9, 0),
          decoration: BoxDecoration(
            color: Color.lerp(const Color(0xFFD0D5DE), const Color(0xFFC83808), bounce),
            shape: BoxShape.circle,
          ),
        );
      }),
    );
  }
}

class _CarPainter extends CustomPainter {
  const _CarPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    const red = Color(0xFFC83808);
    const redDark = Color(0xFFA02806);
    const glass = Color(0xFF1E2C3A);
    const tire = Color(0xFF191F28);
    const rim = Color(0xFF8A95A8);
    const headlight = Color(0xFFFDE68A);
    const taillight = Color(0xFFEF4444);

    canvas.drawOval(
      Rect.fromCenter(center: Offset(w * .50, h * .99), width: w * .75, height: h * .07),
      Paint()
        ..color = const Color(0xFF000000).withAlpha(18)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6),
    );

    final body = Path()
      ..moveTo(w * .07, h * .72)
      ..lineTo(w * .91, h * .72)
      ..quadraticBezierTo(w * .98, h * .72, w * .98, h * .60)
      ..lineTo(w * .88, h * .50)
      ..lineTo(w * .74, h * .17)
      ..lineTo(w * .30, h * .15)
      ..lineTo(w * .16, h * .37)
      ..lineTo(w * .07, h * .52)
      ..quadraticBezierTo(w * .03, h * .62, w * .07, h * .72)
      ..close();
    canvas.drawPath(body, Paint()..color = red);

    final glassBand = Path()
      ..moveTo(w * .19, h * .39)
      ..lineTo(w * .70, h * .19)
      ..lineTo(w * .76, h * .52)
      ..lineTo(w * .21, h * .55)
      ..close();
    canvas.drawPath(glassBand, Paint()..color = glass);

    canvas.drawLine(
      Offset(w * .47, h * .20), Offset(w * .46, h * .54),
      Paint()..color = red..strokeWidth = w * .025,
    );

    final windshield = Path()
      ..moveTo(w * .71, h * .18)
      ..lineTo(w * .86, h * .49)
      ..lineTo(w * .77, h * .52)
      ..lineTo(w * .70, h * .52)
      ..lineTo(w * .63, h * .22)
      ..close();
    canvas.drawPath(windshield, Paint()..color = glass);

    final rearGlass = Path()
      ..moveTo(w * .17, h * .38)
      ..lineTo(w * .20, h * .56)
      ..lineTo(w * .12, h * .54)
      ..lineTo(w * .08, h * .53)
      ..lineTo(w * .15, h * .36)
      ..close();
    canvas.drawPath(rearGlass, Paint()..color = glass);

    final bg = Paint()..color = Colors.white;
    canvas.drawCircle(Offset(w * .23, h * .72), w * .10, bg);
    canvas.drawCircle(Offset(w * .74, h * .72), w * .10, bg);

    canvas.drawRect(Rect.fromLTWH(w * .07, h * .62, w * .84, h * .10), Paint()..color = red);
    canvas.drawRect(Rect.fromLTWH(w * .06, h * .69, w * .86, h * .04), Paint()..color = redDark);

    _wheel(canvas, Offset(w * .23, h * .84), w * .085, tire, rim);
    _wheel(canvas, Offset(w * .74, h * .84), w * .085, tire, rim);

    final hl = Path()
      ..moveTo(w * .94, h * .53)
      ..lineTo(w * .98, h * .53)
      ..lineTo(w * .98, h * .60)
      ..lineTo(w * .92, h * .60)
      ..close();
    canvas.drawPath(hl, Paint()..color = headlight);

    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(w * .04, h * .50, w * .035, h * .12), const Radius.circular(2)),
      Paint()..color = taillight,
    );

    canvas.drawRRect(
      RRect.fromRectAndRadius(Rect.fromLTWH(w * .69, h * .34, w * .035, h * .05), const Radius.circular(2)),
      Paint()..color = tire,
    );
  }

  void _wheel(Canvas canvas, Offset c, double r, Color dark, Color silver) {
    canvas.drawCircle(c, r, Paint()..color = dark);
    canvas.drawCircle(c, r * .65, Paint()..color = silver);
    canvas.drawCircle(c, r * .22, Paint()..color = dark);
    for (int i = 0; i < 5; i++) {
      final a = i * 2 * math.pi / 5;
      canvas.drawLine(
        Offset(c.dx + math.cos(a) * r * .24, c.dy + math.sin(a) * r * .24),
        Offset(c.dx + math.cos(a) * r * .59, c.dy + math.sin(a) * r * .59),
        Paint()..color = const Color(0xFF3A4557)..strokeWidth = 1.8,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
