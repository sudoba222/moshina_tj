import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/language_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../l10n/strings.dart';

class EditListingScreen extends StatefulWidget {
  final String listingId;

  const EditListingScreen({super.key, required this.listingId});

  @override
  State<EditListingScreen> createState() => _EditListingScreenState();
}

class _EditListingScreenState extends State<EditListingScreen> {
  int _step = 0;
  bool _submitting = false;
  bool _loadingData = true;

  // Step 1
  String _type = 'sale';
  final _brandCtrl = TextEditingController();
  final _modelCtrl = TextEditingController();
  final _yearCtrl = TextEditingController();

  // Step 2
  final _priceCtrl = TextEditingController();
  String _currency = 'USD';
  bool _negotiable = false;
  final _mileageCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  String _condition = 'used';

  // Step 3
  String? _fuel;
  String? _transmission;
  String? _bodyType;
  final _colorCtrl = TextEditingController();
  final _engineCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  // Step 4
  late TextEditingController _contactCtrl;
  String _contactMethod = 'phone_and_chat';

  final _step1Key = GlobalKey<FormState>();
  final _step2Key = GlobalKey<FormState>();
  final _step4Key = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    _contactCtrl = TextEditingController(text: user?.phone ?? '');
    _loadListing();
  }

  @override
  void dispose() {
    _brandCtrl.dispose();
    _modelCtrl.dispose();
    _yearCtrl.dispose();
    _priceCtrl.dispose();
    _mileageCtrl.dispose();
    _cityCtrl.dispose();
    _colorCtrl.dispose();
    _engineCtrl.dispose();
    _descCtrl.dispose();
    _contactCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadListing() async {
    setState(() => _loadingData = true);
    try {
      final api = context.read<ApiService>();
      final data = await api.getRaw('/listings/${widget.listingId}');
      if (data is Map<String, dynamic>) {
        _prefill(data);
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingData = false);
    }
  }

  void _prefill(Map<String, dynamic> d) {
    _type = d['type'] as String? ?? _type;
    _brandCtrl.text = d['brand'] as String? ?? '';
    _modelCtrl.text = d['model'] as String? ?? '';
    _yearCtrl.text = d['year']?.toString() ?? '';
    _priceCtrl.text = d['price']?.toString() ?? '';
    _currency = d['currency'] as String? ?? 'USD';
    _negotiable = d['is_negotiable'] as bool? ?? false;
    _mileageCtrl.text = d['mileage']?.toString() ?? '';
    _cityCtrl.text = d['city'] as String? ?? '';
    _condition = d['condition'] as String? ?? 'used';
    _fuel = d['fuel'] as String?;
    _transmission = d['transmission'] as String?;
    _bodyType = d['body_type'] as String?;
    _colorCtrl.text = d['color'] as String? ?? '';
    _engineCtrl.text = d['engine_volume']?.toString() ?? '';
    _descCtrl.text = d['description'] as String? ?? '';
    _contactCtrl.text = d['contact_phone'] as String? ?? _contactCtrl.text;
    _contactMethod = d['contact_method'] as String? ?? _contactMethod;
  }

  Future<void> _submit() async {
    if (!_step4Key.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      final api = context.read<ApiService>();
      final body = <String, dynamic>{
        'type': _type,
        'brand': _brandCtrl.text.trim(),
        'model': _modelCtrl.text.trim(),
        'year': int.tryParse(_yearCtrl.text.trim()) ?? 2020,
        'price': double.tryParse(_priceCtrl.text.trim()) ?? 0,
        'currency': _currency,
        'is_negotiable': _negotiable,
        'city': _cityCtrl.text.trim(),
        'condition': _condition,
        'contact_phone': _contactCtrl.text.trim(),
        'contact_method': _contactMethod,
      };
      if (_mileageCtrl.text.trim().isNotEmpty) {
        body['mileage'] = int.tryParse(_mileageCtrl.text.trim());
      }
      if (_fuel != null) body['fuel'] = _fuel;
      if (_transmission != null) body['transmission'] = _transmission;
      if (_bodyType != null) body['body_type'] = _bodyType;
      if (_colorCtrl.text.trim().isNotEmpty) body['color'] = _colorCtrl.text.trim();
      if (_engineCtrl.text.trim().isNotEmpty) body['engine_volume'] = _engineCtrl.text.trim();
      if (_descCtrl.text.trim().isNotEmpty) body['description'] = _descCtrl.text.trim();

      await api.updateListing(widget.listingId, body);
      if (mounted) {
        final lang = context.read<LanguageProvider>().lang;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(t('edit.saved', lang)),
            backgroundColor: AppColors.colorSuccess,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: AppColors.colorError,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lang = context.watch<LanguageProvider>().lang;

    if (_loadingData) {
      return Scaffold(
        backgroundColor: c.bg,
        appBar: AppBar(
          backgroundColor: c.card,
          title: Text(t('edit.title', lang),
              style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: c.text)),
          leading: IconButton(
            icon: Icon(Icons.arrow_back_rounded, color: c.text),
            onPressed: () => context.pop(),
          ),
        ),
        body: Center(child: CircularProgressIndicator(color: c.accent)),
      );
    }

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.card,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_rounded, color: c.text),
          onPressed: () => context.pop(),
        ),
        title: Text(
          t('edit.title', lang),
          style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: c.text, fontSize: 18),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Divider(color: c.border, height: 1),
        ),
      ),
      body: Column(
        children: [
          _StepIndicator(step: _step, c: c, lang: lang),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: [
                _buildStep1(c, lang),
                _buildStep2(c, lang),
                _buildStep3(c, lang),
                _buildStep4(c, lang),
              ][_step],
            ),
          ),
          _buildNavButtons(c, lang),
        ],
      ),
    );
  }

  Widget _buildStep1(AppColors c, String lang) {
    return Form(
      key: _step1Key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(t('post.step1', lang), c),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _TypeChip(label: t('post.typeSale', lang), value: 'sale', selected: _type, onTap: (v) => setState(() => _type = v), c: c)),
              const SizedBox(width: 8),
              Expanded(child: _TypeChip(label: t('post.typeRent', lang), value: 'rent', selected: _type, onTap: (v) => setState(() => _type = v), c: c)),
              const SizedBox(width: 8),
              Expanded(child: _TypeChip(label: t('post.typeInstallment', lang), value: 'installment', selected: _type, onTap: (v) => setState(() => _type = v), c: c)),
            ],
          ),
          const SizedBox(height: 16),
          _field(controller: _brandCtrl, label: t('post.brand', lang), icon: Icons.directions_car_outlined, c: c,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Укажите марку' : null),
          const SizedBox(height: 14),
          _field(controller: _modelCtrl, label: t('post.model', lang), icon: Icons.drive_eta_outlined, c: c,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Укажите модель' : null),
          const SizedBox(height: 14),
          _field(
            controller: _yearCtrl,
            label: t('post.year', lang),
            icon: Icons.calendar_today_outlined,
            c: c,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            validator: (v) {
              final y = int.tryParse(v ?? '');
              if (y == null || y < 1900 || y > 2026) return '1900–2026';
              return null;
            },
          ),
        ],
      ),
    );
  }

  Widget _buildStep2(AppColors c, String lang) {
    return Form(
      key: _step2Key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(t('post.step2', lang), c),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _field(
                  controller: _priceCtrl,
                  label: t('post.price', lang),
                  icon: Icons.attach_money,
                  c: c,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))],
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Укажите цену' : null,
                ),
              ),
              const SizedBox(width: 10),
              _CurrencyToggle(currency: _currency, onChanged: (v) => setState(() => _currency = v), c: c),
            ],
          ),
          const SizedBox(height: 14),
          _SwitchRow(
            label: t('post.negotiable', lang),
            value: _negotiable,
            onChanged: (v) => setState(() => _negotiable = v),
            c: c,
          ),
          const SizedBox(height: 14),
          _field(controller: _cityCtrl, label: t('post.city', lang), icon: Icons.location_city_outlined, c: c,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Укажите город' : null),
          const SizedBox(height: 14),
          _field(
            controller: _mileageCtrl,
            label: t('post.mileage', lang),
            icon: Icons.speed_outlined,
            c: c,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(child: _TypeChip(label: t('post.conditionNew', lang), value: 'new', selected: _condition, onTap: (v) => setState(() => _condition = v), c: c)),
              const SizedBox(width: 8),
              Expanded(child: _TypeChip(label: t('post.conditionUsed', lang), value: 'used', selected: _condition, onTap: (v) => setState(() => _condition = v), c: c)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStep3(AppColors c, String lang) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle(t('post.step3', lang), c),
        const SizedBox(height: 16),
        _DropdownField(
          label: t('detail.fuel', lang),
          icon: Icons.local_gas_station_outlined,
          value: _fuel,
          items: const [
            DropdownMenuItem(value: 'petrol', child: Text('Бензин')),
            DropdownMenuItem(value: 'diesel', child: Text('Дизель')),
            DropdownMenuItem(value: 'electric', child: Text('Электро')),
            DropdownMenuItem(value: 'hybrid', child: Text('Гибрид')),
            DropdownMenuItem(value: 'gas', child: Text('Газ')),
          ],
          onChanged: (v) => setState(() => _fuel = v),
          c: c,
        ),
        const SizedBox(height: 14),
        _DropdownField(
          label: t('detail.transmission', lang),
          icon: Icons.settings_outlined,
          value: _transmission,
          items: const [
            DropdownMenuItem(value: 'automatic', child: Text('Автомат')),
            DropdownMenuItem(value: 'manual', child: Text('Механика')),
            DropdownMenuItem(value: 'cvt', child: Text('Вариатор')),
            DropdownMenuItem(value: 'robot', child: Text('Робот')),
          ],
          onChanged: (v) => setState(() => _transmission = v),
          c: c,
        ),
        const SizedBox(height: 14),
        _DropdownField(
          label: t('detail.body', lang),
          icon: Icons.directions_car_filled_outlined,
          value: _bodyType,
          items: const [
            DropdownMenuItem(value: 'sedan', child: Text('Седан')),
            DropdownMenuItem(value: 'suv', child: Text('Внедорожник')),
            DropdownMenuItem(value: 'hatchback', child: Text('Хэтчбек')),
            DropdownMenuItem(value: 'wagon', child: Text('Универсал')),
            DropdownMenuItem(value: 'coupe', child: Text('Купе')),
            DropdownMenuItem(value: 'pickup', child: Text('Пикап')),
            DropdownMenuItem(value: 'minivan', child: Text('Минивэн')),
            DropdownMenuItem(value: 'truck', child: Text('Грузовик')),
          ],
          onChanged: (v) => setState(() => _bodyType = v),
          c: c,
        ),
        const SizedBox(height: 14),
        _field(controller: _colorCtrl, label: t('post.color', lang), icon: Icons.palette_outlined, c: c),
        const SizedBox(height: 14),
        _field(controller: _engineCtrl, label: t('post.engine', lang), icon: Icons.engineering_outlined, c: c,
            keyboardType: const TextInputType.numberWithOptions(decimal: true)),
        const SizedBox(height: 14),
        TextFormField(
          controller: _descCtrl,
          maxLines: 5,
          style: TextStyle(color: context.colors.text),
          decoration: InputDecoration(
            labelText: t('post.description', lang),
            labelStyle: TextStyle(color: c.textMuted),
            alignLabelWithHint: true,
            prefixIcon: Padding(
              padding: const EdgeInsets.only(bottom: 60),
              child: Icon(Icons.notes_outlined, color: c.textMuted, size: 20),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: c.border, width: 1.2),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: c.accent, width: 1.8),
            ),
            filled: true,
            fillColor: c.card,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
          ),
        ),
      ],
    );
  }

  Widget _buildStep4(AppColors c, String lang) {
    return Form(
      key: _step4Key,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(t('post.step4', lang), c),
          const SizedBox(height: 16),
          _field(
            controller: _contactCtrl,
            label: t('post.contactPhone', lang),
            icon: Icons.phone_outlined,
            c: c,
            keyboardType: TextInputType.phone,
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Укажите телефон' : null,
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: c.card,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: c.border, width: 1.2),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Способ связи', style: TextStyle(color: c.textMuted, fontSize: 13)),
                const SizedBox(height: 10),
                _ContactMethodRow(
                  label: 'Телефон и чат', value: 'phone_and_chat',
                  selected: _contactMethod, onTap: (v) => setState(() => _contactMethod = v), c: c,
                ),
                const SizedBox(height: 6),
                _ContactMethodRow(
                  label: 'Только телефон', value: 'phone_only',
                  selected: _contactMethod, onTap: (v) => setState(() => _contactMethod = v), c: c,
                ),
                const SizedBox(height: 6),
                _ContactMethodRow(
                  label: 'Только чат', value: 'chat_only',
                  selected: _contactMethod, onTap: (v) => setState(() => _contactMethod = v), c: c,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavButtons(AppColors c, String lang) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      decoration: BoxDecoration(
        color: c.card,
        border: Border(top: BorderSide(color: c.border)),
      ),
      child: Row(
        children: [
          if (_step > 0) ...[
            Expanded(
              child: OutlinedButton(
                onPressed: () => setState(() => _step--),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: c.border),
                  foregroundColor: c.text,
                  minimumSize: const Size(0, 52),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(t('post.back', lang)),
              ),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: _submitting ? null : _onNext,
              style: ElevatedButton.styleFrom(
                backgroundColor: c.accent,
                minimumSize: const Size(0, 52),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _submitting
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(
                      _step < 3 ? t('post.next', lang) : t('edit.save', lang),
                      style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: Colors.white, fontSize: 15),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  void _onNext() {
    if (_step == 0) {
      if (_step1Key.currentState!.validate()) setState(() => _step = 1);
    } else if (_step == 1) {
      if (_step2Key.currentState!.validate()) setState(() => _step = 2);
    } else if (_step == 2) {
      setState(() => _step = 3);
    } else {
      _submit();
    }
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required AppColors c,
    TextInputType? keyboardType,
    List<TextInputFormatter>? inputFormatters,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      style: TextStyle(color: c.text),
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: c.textMuted),
        prefixIcon: Icon(icon, color: c.textMuted, size: 20),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: c.border, width: 1.2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: c.accent, width: 1.8),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Colors.red, width: 1.2),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Colors.red, width: 1.8),
        ),
        filled: true,
        fillColor: c.card,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      ),
    );
  }

  Widget _sectionTitle(String title, AppColors c) {
    return Text(
      title,
      style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w700, color: c.text, letterSpacing: -0.3),
    );
  }
}

// ── Reused widgets (mirrors post_screen.dart) ─────────────────────────────────

class _StepIndicator extends StatelessWidget {
  final int step;
  final AppColors c;
  final String lang;

  const _StepIndicator({required this.step, required this.c, required this.lang});

  @override
  Widget build(BuildContext context) {
    final steps = [
      t('post.step1', lang),
      t('post.step2', lang),
      t('post.step3', lang),
      t('post.step4', lang),
    ];
    return Container(
      color: c.card,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: List.generate(steps.length, (i) {
          final active = i == step;
          final done = i < step;
          return Expanded(
            child: Row(
              children: [
                Column(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: active || done ? c.accent : c.border,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: done
                            ? const Icon(Icons.check, size: 14, color: Colors.white)
                            : Text(
                                '${i + 1}',
                                style: TextStyle(
                                  color: active ? Colors.white : c.textMuted,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      steps[i],
                      style: TextStyle(
                        fontSize: 10,
                        color: active ? c.accent : c.textMuted,
                        fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                  ],
                ),
                if (i < steps.length - 1)
                  Expanded(
                    child: Container(
                      height: 1.5,
                      margin: const EdgeInsets.only(bottom: 16),
                      color: i < step ? c.accent : c.border,
                    ),
                  ),
              ],
            ),
          );
        }),
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  final String label;
  final String value;
  final String selected;
  final ValueChanged<String> onTap;
  final AppColors c;

  const _TypeChip({
    required this.label,
    required this.value,
    required this.selected,
    required this.onTap,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = selected == value;
    return GestureDetector(
      onTap: () => onTap(value),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? c.accent : c.card,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? c.accent : c.border, width: 1.2),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: isSelected ? Colors.white : c.textSecondary,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

class _CurrencyToggle extends StatelessWidget {
  final String currency;
  final ValueChanged<String> onChanged;
  final AppColors c;

  const _CurrencyToggle({required this.currency, required this.onChanged, required this.c});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: c.border, width: 1.2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: ['USD', 'TJS'].map((cur) {
          final sel = cur == currency;
          return GestureDetector(
            onTap: () => onChanged(cur),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              decoration: BoxDecoration(
                color: sel ? c.accent : Colors.transparent,
                borderRadius: BorderRadius.circular(9),
              ),
              child: Text(
                cur,
                style: TextStyle(
                  color: sel ? Colors.white : c.textSecondary,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _SwitchRow extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
  final AppColors c;

  const _SwitchRow({required this.label, required this.value, required this.onChanged, required this.c});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: c.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: c.border, width: 1.2),
      ),
      child: Row(
        children: [
          Icon(Icons.handshake_outlined, color: c.textMuted, size: 20),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: TextStyle(color: c.text, fontSize: 15))),
          Switch(value: value, activeThumbColor: c.accent, onChanged: onChanged),
        ],
      ),
    );
  }
}

class _DropdownField extends StatelessWidget {
  final String label;
  final IconData icon;
  final String? value;
  final List<DropdownMenuItem<String>> items;
  final ValueChanged<String?> onChanged;
  final AppColors c;

  const _DropdownField({
    required this.label,
    required this.icon,
    required this.value,
    required this.items,
    required this.onChanged,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<String>(
      value: value,
      items: items,
      onChanged: onChanged,
      style: TextStyle(color: c.text, fontSize: 15),
      dropdownColor: c.card,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: c.textMuted),
        prefixIcon: Icon(icon, color: c.textMuted, size: 20),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: c.border, width: 1.2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: c.accent, width: 1.8),
        ),
        filled: true,
        fillColor: c.card,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      ),
    );
  }
}

class _ContactMethodRow extends StatelessWidget {
  final String label;
  final String value;
  final String selected;
  final ValueChanged<String> onTap;
  final AppColors c;

  const _ContactMethodRow({
    required this.label,
    required this.value,
    required this.selected,
    required this.onTap,
    required this.c,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = selected == value;
    return GestureDetector(
      onTap: () => onTap(value),
      child: Row(
        children: [
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: isSelected ? c.accent : c.border, width: isSelected ? 2 : 1.5),
            ),
            child: isSelected
                ? Center(
                    child: Container(
                      width: 10, height: 10,
                      decoration: BoxDecoration(color: c.accent, shape: BoxShape.circle),
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 10),
          Text(label, style: TextStyle(color: c.text, fontSize: 14)),
        ],
      ),
    );
  }
}
