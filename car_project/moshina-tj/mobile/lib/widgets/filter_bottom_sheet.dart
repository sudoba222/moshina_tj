import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';

const _cities = [
  'Душанбе', 'Хуҷанд', 'Бохтар', 'Кӯлоб', 'Истаравшан',
  'Пенджикент', 'Вахш', 'Хорог', 'Турсунзода',
];
const _fuels = ['Бензин', 'Дизель', 'Газ', 'Электро', 'Гибрид'];
const _transmissions = ['Автомат', 'Механика', 'Вариатор'];
const _bodyTypes = [
  'sedan', 'suv', 'hatchback', 'minivan', 'pickup',
  'coupe', 'wagon', 'crossover', 'convertible', 'van',
];
const _brands = [
  'Toyota', 'Chevrolet', 'Hyundai', 'Kia', 'Honda', 'BMW',
  'Mercedes', 'Audi', 'Volkswagen', 'Skoda', 'Lada', 'Daewoo',
  'Nissan', 'Lexus', 'Haval', 'Chery', 'Geely', 'BYD',
  'Mitsubishi', 'Mazda', 'Opel', 'Ford', 'Peugeot', 'Renault',
  'Subaru', 'Suzuki', 'Isuzu', 'ВАЗ', 'ГАЗ', 'УАЗ',
];

class FilterBottomSheet extends StatefulWidget {
  final String lang;
  final Map<String, String> initialFilters;
  final void Function(Map<String, String> filters) onApply;

  const FilterBottomSheet({
    super.key,
    required this.lang,
    required this.initialFilters,
    required this.onApply,
  });

  @override
  State<FilterBottomSheet> createState() => _FilterBottomSheetState();
}

class _FilterBottomSheetState extends State<FilterBottomSheet> {
  late Map<String, String> _filters;

  final _yearFromCtrl = TextEditingController();
  final _yearToCtrl = TextEditingController();
  final _priceMinCtrl = TextEditingController();
  final _priceMaxCtrl = TextEditingController();
  final _mileageMaxCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _filters = Map.from(widget.initialFilters);
    _yearFromCtrl.text = _filters['year_from'] ?? '';
    _yearToCtrl.text = _filters['year_to'] ?? '';
    _priceMinCtrl.text = _filters['price_min'] ?? '';
    _priceMaxCtrl.text = _filters['price_max'] ?? '';
    _mileageMaxCtrl.text = _filters['mileage_max'] ?? '';
  }

  @override
  void dispose() {
    _yearFromCtrl.dispose();
    _yearToCtrl.dispose();
    _priceMinCtrl.dispose();
    _priceMaxCtrl.dispose();
    _mileageMaxCtrl.dispose();
    super.dispose();
  }

  void _reset() {
    setState(() {
      _filters = {};
      _yearFromCtrl.clear();
      _yearToCtrl.clear();
      _priceMinCtrl.clear();
      _priceMaxCtrl.clear();
      _mileageMaxCtrl.clear();
    });
  }

  void _apply() {
    // Sync text field values
    if (_yearFromCtrl.text.isNotEmpty) {
      _filters['year_from'] = _yearFromCtrl.text;
    } else {
      _filters.remove('year_from');
    }
    if (_yearToCtrl.text.isNotEmpty) {
      _filters['year_to'] = _yearToCtrl.text;
    } else {
      _filters.remove('year_to');
    }
    if (_priceMinCtrl.text.isNotEmpty) {
      _filters['price_min'] = _priceMinCtrl.text;
    } else {
      _filters.remove('price_min');
    }
    if (_priceMaxCtrl.text.isNotEmpty) {
      _filters['price_max'] = _priceMaxCtrl.text;
    } else {
      _filters.remove('price_max');
    }
    if (_mileageMaxCtrl.text.isNotEmpty) {
      _filters['mileage_max'] = _mileageMaxCtrl.text;
    } else {
      _filters.remove('mileage_max');
    }
    widget.onApply(_filters);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = widget.lang;

    return Container(
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          const SizedBox(height: 12),
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: c.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Row(
              children: [
                Text(
                  t('catalog.filters', lang),
                  style: TextStyle(
                    color: c.text,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const Spacer(),
                TextButton(
                  onPressed: _reset,
                  child: Text(
                    t('catalog.reset', lang),
                    style: TextStyle(color: c.textMuted, fontSize: 14),
                  ),
                ),
              ],
            ),
          ),
          Divider(color: c.border),
          // Content
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _FilterDropdown(
                    label: 'Марка',
                    value: _filters['brand'],
                    items: _brands,
                    colors: c,
                    onChanged: (v) => setState(() {
                      if (v == null) {
                        _filters.remove('brand');
                      } else {
                        _filters['brand'] = v;
                      }
                    }),
                  ),
                  const SizedBox(height: 14),
                  _FilterDropdown(
                    label: 'Город',
                    value: _filters['city'],
                    items: _cities,
                    colors: c,
                    onChanged: (v) => setState(() {
                      if (v == null) {
                        _filters.remove('city');
                      } else {
                        _filters['city'] = v;
                      }
                    }),
                  ),
                  const SizedBox(height: 14),
                  _FilterDropdown(
                    label: 'Топливо',
                    value: _filters['fuel'],
                    items: _fuels,
                    colors: c,
                    onChanged: (v) => setState(() {
                      if (v == null) {
                        _filters.remove('fuel');
                      } else {
                        _filters['fuel'] = v;
                      }
                    }),
                  ),
                  const SizedBox(height: 14),
                  _FilterDropdown(
                    label: 'КПП',
                    value: _filters['transmission'],
                    items: _transmissions,
                    colors: c,
                    onChanged: (v) => setState(() {
                      if (v == null) {
                        _filters.remove('transmission');
                      } else {
                        _filters['transmission'] = v;
                      }
                    }),
                  ),
                  const SizedBox(height: 14),
                  _FilterDropdown(
                    label: 'Кузов',
                    value: _filters['body_type'],
                    items: _bodyTypes,
                    colors: c,
                    onChanged: (v) => setState(() {
                      if (v == null) {
                        _filters.remove('body_type');
                      } else {
                        _filters['body_type'] = v;
                      }
                    }),
                  ),
                  const SizedBox(height: 14),
                  _RangeRow(
                    label: 'Год выпуска',
                    fromCtrl: _yearFromCtrl,
                    toCtrl: _yearToCtrl,
                    fromHint: 'от',
                    toHint: 'до',
                    colors: c,
                  ),
                  const SizedBox(height: 14),
                  _RangeRow(
                    label: 'Цена (\$)',
                    fromCtrl: _priceMinCtrl,
                    toCtrl: _priceMaxCtrl,
                    fromHint: 'от',
                    toHint: 'до',
                    colors: c,
                  ),
                  const SizedBox(height: 14),
                  _FilterLabel(label: 'Пробег макс. (км)', colors: c),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _mileageMaxCtrl,
                    keyboardType: TextInputType.number,
                    style: TextStyle(color: c.text),
                    decoration: InputDecoration(
                      hintText: 'например, 150000',
                      hintStyle: TextStyle(color: c.textMuted, fontSize: 14),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
          // Apply button
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: ElevatedButton(
                onPressed: _apply,
                child: Text(t('catalog.apply', lang),
                    style: GoogleFonts.outfit(
                        fontWeight: FontWeight.w700, fontSize: 15)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterLabel extends StatelessWidget {
  final String label;
  final AppColors colors;

  const _FilterLabel({required this.label, required this.colors});

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: TextStyle(
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}

class _FilterDropdown extends StatelessWidget {
  final String label;
  final String? value;
  final List<String> items;
  final AppColors colors;
  final void Function(String?) onChanged;

  const _FilterDropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.colors,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _FilterLabel(label: label, colors: colors),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: colors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: colors.border),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: value,
              isExpanded: true,
              hint: Text(
                'Любой',
                style: TextStyle(color: colors.textMuted, fontSize: 14),
              ),
              dropdownColor: colors.card,
              style: TextStyle(color: colors.text, fontSize: 14),
              icon: Icon(Icons.expand_more, color: colors.textMuted, size: 20),
              items: [
                DropdownMenuItem<String>(
                  value: null,
                  child: Text('Любой',
                      style:
                          TextStyle(color: colors.textMuted, fontSize: 14)),
                ),
                ...items.map(
                  (item) => DropdownMenuItem<String>(
                    value: item,
                    child: Text(item),
                  ),
                ),
              ],
              onChanged: onChanged,
            ),
          ),
        ),
      ],
    );
  }
}

class _RangeRow extends StatelessWidget {
  final String label;
  final TextEditingController fromCtrl;
  final TextEditingController toCtrl;
  final String fromHint;
  final String toHint;
  final AppColors colors;

  const _RangeRow({
    required this.label,
    required this.fromCtrl,
    required this.toCtrl,
    required this.fromHint,
    required this.toHint,
    required this.colors,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _FilterLabel(label: label, colors: colors),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: fromCtrl,
                keyboardType: TextInputType.number,
                style: TextStyle(color: colors.text),
                decoration: InputDecoration(
                  hintText: fromHint,
                  hintStyle:
                      TextStyle(color: colors.textMuted, fontSize: 14),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Text('—', style: TextStyle(color: colors.textMuted)),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: toCtrl,
                keyboardType: TextInputType.number,
                style: TextStyle(color: colors.text),
                decoration: InputDecoration(
                  hintText: toHint,
                  hintStyle:
                      TextStyle(color: colors.textMuted, fontSize: 14),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

void showFilterSheet({
  required BuildContext context,
  required String lang,
  required Map<String, String> initialFilters,
  required void Function(Map<String, String>) onApply,
}) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => DraggableScrollableSheet(
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (ctx, scrollCtrl) => FilterBottomSheet(
        lang: lang,
        initialFilters: initialFilters,
        onApply: onApply,
      ),
    ),
  );
}
