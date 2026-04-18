import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';

class FilterBar extends StatefulWidget {
  final String lang;
  final Map<String, String> initialFilters;
  final ValueChanged<Map<String, String>> onApply;

  const FilterBar({
    super.key,
    required this.lang,
    required this.initialFilters,
    required this.onApply,
  });

  @override
  State<FilterBar> createState() => _FilterBarState();
}

class _FilterBarState extends State<FilterBar> {
  late String _listingType;
  late String _brand;
  late String _city;
  late String _priceMin;
  late String _priceMax;

  static const brands = [
    '', 'Toyota', 'Chevrolet', 'Hyundai', 'Kia', 'BMW', 'Mercedes-Benz',
    'Audi', 'Honda', 'Nissan', 'Volkswagen', 'Mitsubishi', 'Daewoo',
    'Opel', 'Ford', 'Mazda', 'Subaru', 'Lexus', 'ВАЗ/Lada', 'Другие',
  ];

  static const cities = [
    '', 'Душанбе', 'Худжанд', 'Куляб', 'Курган-Тюбе', 'Пенджикент',
    'Исфара', 'Кайраккум', 'Яван', 'Гиссар',
  ];

  @override
  void initState() {
    super.initState();
    _listingType = widget.initialFilters['listing_type'] ?? '';
    _brand = widget.initialFilters['brand'] ?? '';
    _city = widget.initialFilters['city'] ?? '';
    _priceMin = widget.initialFilters['price_min'] ?? '';
    _priceMax = widget.initialFilters['price_max'] ?? '';
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final lang = widget.lang;

    return Container(
      color: colors.surface,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            _TypeChip(
              label: t('all_types', lang),
              selected: _listingType.isEmpty,
              onTap: () => setState(() => _listingType = ''),
            ),
            const SizedBox(width: 8),
            _TypeChip(
              label: t('sale', lang),
              selected: _listingType == 'sale',
              onTap: () => setState(() => _listingType = 'sale'),
              color: context.appColors.accent,
            ),
            const SizedBox(width: 8),
            _TypeChip(
              label: t('rent', lang),
              selected: _listingType == 'rent',
              onTap: () => setState(() => _listingType = 'rent'),
              color: AppColors.rentBlue,
            ),
            const SizedBox(width: 8),
            _TypeChip(
              label: t('installment', lang),
              selected: _listingType == 'installment',
              onTap: () => setState(() => _listingType = 'installment'),
              color: AppColors.installmentOrange,
            ),
            const SizedBox(width: 12),
            _DropdownChip(
              value: _brand,
              items: brands,
              hint: t('any_brand', lang),
              onChanged: (v) => setState(() => _brand = v ?? ''),
            ),
            const SizedBox(width: 8),
            _DropdownChip(
              value: _city,
              items: cities,
              hint: t('any_city', lang),
              onChanged: (v) => setState(() => _city = v ?? ''),
            ),
            const SizedBox(width: 8),
            _FilterButton(
              lang: lang,
              onTap: _showPriceFilter,
              hasPriceFilter: _priceMin.isNotEmpty || _priceMax.isNotEmpty,
            ),
            const SizedBox(width: 8),
            _ApplyButton(
              lang: lang,
              onTap: _apply,
            ),
          ],
        ),
      ),
    );
  }

  void _showPriceFilter() {
    final minCtrl = TextEditingController(text: _priceMin);
    final maxCtrl = TextEditingController(text: _priceMax);
    final colors = context.appColors;
    final lang = widget.lang;

    showModalBottomSheet(
      context: context,
      backgroundColor: colors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(
            16, 16, 16, 16 + MediaQuery.of(ctx).viewInsets.bottom),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(t('price', lang),
                style: TextStyle(
                    color: colors.text,
                    fontWeight: FontWeight.w700,
                    fontSize: 16)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: minCtrl,
                    keyboardType: TextInputType.number,
                    style: TextStyle(color: colors.text),
                    decoration: InputDecoration(
                      labelText: t('price_from', lang),
                      labelStyle: TextStyle(color: colors.textMuted),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: maxCtrl,
                    keyboardType: TextInputType.number,
                    style: TextStyle(color: colors.text),
                    decoration: InputDecoration(
                      labelText: t('price_to', lang),
                      labelStyle: TextStyle(color: colors.textMuted),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _priceMin = minCtrl.text;
                  _priceMax = maxCtrl.text;
                });
                Navigator.pop(ctx);
                _apply();
              },
              child: Text(t('apply', lang)),
            ),
          ],
        ),
      ),
    );
  }

  void _apply() {
    final filters = <String, String>{};
    if (_listingType.isNotEmpty) filters['listing_type'] = _listingType;
    if (_brand.isNotEmpty) filters['brand'] = _brand;
    if (_city.isNotEmpty) filters['city'] = _city;
    if (_priceMin.isNotEmpty) filters['price_min'] = _priceMin;
    if (_priceMax.isNotEmpty) filters['price_max'] = _priceMax;
    widget.onApply(filters);
  }
}

class _TypeChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Color? color;

  const _TypeChip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final activeColor = color ?? colors.accent;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? activeColor : colors.bg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? activeColor : colors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : colors.textSecondary,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class _DropdownChip extends StatelessWidget {
  final String value;
  final List<String> items;
  final String hint;
  final ValueChanged<String?> onChanged;

  const _DropdownChip({
    required this.value,
    required this.items,
    required this.hint,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final hasValue = value.isNotEmpty;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: hasValue ? colors.accent.withValues(alpha: 0.1) : colors.bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: hasValue ? colors.accent : colors.border,
        ),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value.isEmpty ? null : value,
          hint: Text(hint,
              style: TextStyle(color: colors.textSecondary, fontSize: 13)),
          items: items
              .map((b) => DropdownMenuItem(
                    value: b,
                    child: Text(
                      b.isEmpty ? hint : b,
                      style: TextStyle(color: colors.text, fontSize: 13),
                    ),
                  ))
              .toList(),
          onChanged: onChanged,
          dropdownColor: colors.surface,
          icon: Icon(Icons.expand_more, color: colors.textMuted, size: 18),
          style: TextStyle(color: colors.text, fontSize: 13),
          isDense: true,
        ),
      ),
    );
  }
}

class _FilterButton extends StatelessWidget {
  final String lang;
  final VoidCallback onTap;
  final bool hasPriceFilter;

  const _FilterButton({
    required this.lang,
    required this.onTap,
    required this.hasPriceFilter,
  });

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: hasPriceFilter ? colors.accent.withValues(alpha: 0.1) : colors.bg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: hasPriceFilter ? colors.accent : colors.border,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.tune,
                size: 16,
                color: hasPriceFilter ? colors.accent : colors.textSecondary),
            const SizedBox(width: 4),
            Text(
              t('price', lang),
              style: TextStyle(
                color: hasPriceFilter ? colors.accent : colors.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ApplyButton extends StatelessWidget {
  final String lang;
  final VoidCallback onTap;

  const _ApplyButton({required this.lang, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: colors.accent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          t('apply', lang),
          style: const TextStyle(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
