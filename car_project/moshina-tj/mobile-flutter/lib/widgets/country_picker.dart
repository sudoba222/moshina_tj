import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';

class CountryCode {
  final String flag;
  final String name;
  final String code;
  final String dialCode;

  const CountryCode({
    required this.flag,
    required this.name,
    required this.code,
    required this.dialCode,
  });

  static const List<CountryCode> all = [
    CountryCode(flag: '🇹🇯', name: 'Таджикистан', code: 'TJ', dialCode: '+992'),
    CountryCode(flag: '🇷🇺', name: 'Россия', code: 'RU', dialCode: '+7'),
    CountryCode(flag: '🇺🇿', name: 'Узбекистан', code: 'UZ', dialCode: '+998'),
    CountryCode(flag: '🇰🇿', name: 'Казахстан', code: 'KZ', dialCode: '+7'),
    CountryCode(flag: '🇰🇬', name: 'Кыргызстан', code: 'KG', dialCode: '+996'),
    CountryCode(flag: '🇺🇦', name: 'Украина', code: 'UA', dialCode: '+380'),
    CountryCode(flag: '🇦🇿', name: 'Азербайджан', code: 'AZ', dialCode: '+994'),
    CountryCode(flag: '🇦🇲', name: 'Армения', code: 'AM', dialCode: '+374'),
    CountryCode(flag: '🇬🇪', name: 'Грузия', code: 'GE', dialCode: '+995'),
    CountryCode(flag: '🇧🇾', name: 'Беларусь', code: 'BY', dialCode: '+375'),
    CountryCode(flag: '🇲🇩', name: 'Молдова', code: 'MD', dialCode: '+373'),
    CountryCode(flag: '🇹🇷', name: 'Турция', code: 'TR', dialCode: '+90'),
    CountryCode(flag: '🇩🇪', name: 'Германия', code: 'DE', dialCode: '+49'),
    CountryCode(flag: '🇬🇧', name: 'Великобритания', code: 'GB', dialCode: '+44'),
    CountryCode(flag: '🇺🇸', name: 'США', code: 'US', dialCode: '+1'),
    CountryCode(flag: '🇨🇳', name: 'Китай', code: 'CN', dialCode: '+86'),
    CountryCode(flag: '🇮🇳', name: 'Индия', code: 'IN', dialCode: '+91'),
    CountryCode(flag: '🇮🇷', name: 'Иран', code: 'IR', dialCode: '+98'),
    CountryCode(flag: '🇦🇫', name: 'Афганистан', code: 'AF', dialCode: '+93'),
    CountryCode(flag: '🇵🇰', name: 'Пакистан', code: 'PK', dialCode: '+92'),
  ];
}

class CountryPickerButton extends StatefulWidget {
  final CountryCode selected;
  final ValueChanged<CountryCode> onChanged;
  final AppColors c;

  const CountryPickerButton({
    super.key,
    required this.selected,
    required this.onChanged,
    required this.c,
  });

  @override
  State<CountryPickerButton> createState() => _CountryPickerButtonState();
}

class _CountryPickerButtonState extends State<CountryPickerButton> {
  void _showPicker() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: widget.c.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _CountryPickerSheet(
        c: widget.c,
        onSelected: (code) {
          Navigator.pop(ctx);
          widget.onChanged(code);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _showPicker,
      child: Container(
        height: 56,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: widget.c.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: widget.c.border, width: 1.2),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(widget.selected.flag, style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 6),
            Text(
              widget.selected.dialCode,
              style: GoogleFonts.outfit(
                color: widget.c.text,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 4),
            Icon(Icons.arrow_drop_down, color: widget.c.textMuted, size: 18),
          ],
        ),
      ),
    );
  }
}

class _CountryPickerSheet extends StatefulWidget {
  final AppColors c;
  final ValueChanged<CountryCode> onSelected;

  const _CountryPickerSheet({required this.c, required this.onSelected});

  @override
  State<_CountryPickerSheet> createState() => _CountryPickerSheetState();
}

class _CountryPickerSheetState extends State<_CountryPickerSheet> {
  final _searchCtrl = TextEditingController();
  List<CountryCode> _filtered = CountryCode.all;

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(() {
      final q = _searchCtrl.text.toLowerCase();
      setState(() {
        _filtered = CountryCode.all
            .where((c) =>
                c.name.toLowerCase().contains(q) ||
                c.dialCode.contains(q) ||
                c.code.toLowerCase().contains(q))
            .toList();
      });
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.c;
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.9,
      expand: false,
      builder: (ctx, scrollCtrl) {
        return Column(
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: c.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: _searchCtrl,
                autofocus: true,
                style: GoogleFonts.outfit(color: c.text, fontSize: 15),
                decoration: InputDecoration(
                  hintText: 'Поиск...',
                  hintStyle: GoogleFonts.outfit(color: c.textMuted, fontSize: 14),
                  prefixIcon: Icon(Icons.search, color: c.textMuted, size: 20),
                  filled: true,
                  fillColor: c.surface,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: c.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: c.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: c.accent, width: 1.5),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.builder(
                controller: scrollCtrl,
                itemCount: _filtered.length,
                itemBuilder: (ctx, i) {
                  final country = _filtered[i];
                  return InkWell(
                    onTap: () => widget.onSelected(country),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      child: Row(
                        children: [
                          Text(country.flag,
                              style: const TextStyle(fontSize: 24)),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              country.name,
                              style: GoogleFonts.outfit(
                                color: c.text,
                                fontSize: 15,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          Text(
                            country.dialCode,
                            style: GoogleFonts.outfit(
                              color: c.textMuted,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}
