import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Official TajCar.tj brand colors (from the logo).
class TajCarBrand {
  static const navy = Color(0xFF16294D);
  static const red = Color(0xFFE11D2A);
  static const navyLight = Color(0xFF24406E);
}

/// The TajCar.tj logo lockup — a stylized red sports-car silhouette above the
/// "TajCar.tj" wordmark (navy "Taj" + red "Car.tj") and tagline.
///
/// Recreated in Flutter so it scales crisply and needs no raster asset. Set
/// [onDark] true to render the wordmark in white for dark backgrounds.
class TajCarLogo extends StatelessWidget {
  final double carWidth;
  final double wordSize;
  final bool showTagline;
  final bool onDark;

  const TajCarLogo({
    super.key,
    this.carWidth = 150,
    this.wordSize = 40,
    this.showTagline = true,
    this.onDark = false,
  });

  @override
  Widget build(BuildContext context) {
    final tajColor = onDark ? Colors.white : TajCarBrand.navy;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Red car silhouette
        CustomPaint(
          size: Size(carWidth, carWidth * 0.46),
          painter: _CarPainter(),
        ),
        SizedBox(height: wordSize * 0.18),
        // Wordmark: "Taj" navy/white + "Car.tj" red
        RichText(
          text: TextSpan(
            style: GoogleFonts.poppins(
              fontSize: wordSize,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
              height: 1.0,
            ),
            children: [
              TextSpan(text: 'Taj', style: TextStyle(color: tajColor)),
              const TextSpan(text: 'Car.tj', style: TextStyle(color: TajCarBrand.red)),
            ],
          ),
        ),
        if (showTagline) ...[
          SizedBox(height: wordSize * 0.14),
          Text(
            'ONLINE CAR MARKETPLACE • TAJIKISTAN',
            style: GoogleFonts.poppins(
              color: onDark ? Colors.white70 : TajCarBrand.navy,
              fontSize: wordSize * 0.20,
              fontWeight: FontWeight.w600,
              letterSpacing: wordSize * 0.05,
            ),
          ),
        ],
      ],
    );
  }
}

/// Stroked red sports-car side profile with a road swoosh underneath —
/// echoes the brand logo's dynamic fastback coupe.
class _CarPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    // Work in a 100x46 space, scaled to the widget size.
    final s = w / 100.0;
    Offset p(double x, double y) => Offset(x * s, y * (h / 46.0));

    final stroke = Paint()
      ..color = TajCarBrand.red
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0 * s
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    // Sleek fastback coupe silhouette (one continuous top-and-nose line):
    // long low nose -> raked windshield -> low fastback roof -> tapered tail.
    final body = Path()
      ..moveTo(p(4, 33).dx, p(4, 33).dy)          // front bumper tip
      ..cubicTo(p(6, 27).dx, p(6, 27).dy, p(16, 25).dx, p(16, 25).dy, p(26, 24).dx, p(26, 24).dy) // hood
      ..cubicTo(p(38, 12).dx, p(38, 12).dy, p(56, 8).dx, p(56, 8).dy, p(70, 11).dx, p(70, 11).dy)  // windshield + roof peak
      ..cubicTo(p(80, 13).dx, p(80, 13).dy, p(88, 17).dx, p(88, 17).dy, p(95, 24).dx, p(95, 24).dy) // fastback rear glass
      ..cubicTo(p(97, 26).dx, p(97, 26).dy, p(97, 30).dx, p(97, 30).dy, p(93, 31).dx, p(93, 31).dy); // tail
    canvas.drawPath(body, stroke);

    // Beltline / lower body accent from nose toward the rear
    final belt = Path()
      ..moveTo(p(8, 32).dx, p(8, 32).dy)
      ..cubicTo(p(24, 30).dx, p(24, 30).dy, p(40, 30).dx, p(40, 30).dy, p(58, 30).dx, p(58, 30).dy)
      ..cubicTo(p(74, 30).dx, p(74, 30).dy, p(84, 31).dx, p(84, 31).dy, p(90, 32).dx, p(90, 32).dy);
    canvas.drawPath(belt, stroke..strokeWidth = 2.2 * s);

    // Side window (greenhouse) — short raked line under the roof
    final window = Path()
      ..moveTo(p(40, 22).dx, p(40, 22).dy)
      ..cubicTo(p(48, 14).dx, p(48, 14).dy, p(60, 12).dx, p(60, 12).dy, p(68, 14).dx, p(68, 14).dy);
    canvas.drawPath(window, stroke..strokeWidth = 2.4 * s);

    // Wheels — near-full circles with hub dot
    final wheelStroke = Paint()
      ..color = TajCarBrand.red
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0 * s
      ..strokeCap = StrokeCap.round;
    for (final cx in [26.0, 76.0]) {
      canvas.drawCircle(p(cx, 33), 7.5 * s, wheelStroke);
      canvas.drawCircle(p(cx, 33), 2.2 * s,
          Paint()..color = TajCarBrand.red..style = PaintingStyle.fill);
    }

    // Road swoosh under the car — motion line sweeping forward
    final road = Paint()
      ..color = TajCarBrand.red
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.4 * s
      ..strokeCap = StrokeCap.round;
    final swoosh = Path()
      ..moveTo(p(2, 41).dx, p(2, 41).dy)
      ..cubicTo(p(30, 45).dx, p(30, 45).dy, p(68, 45).dx, p(68, 45).dy, p(98, 40).dx, p(98, 40).dy);
    canvas.drawPath(swoosh, road);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
